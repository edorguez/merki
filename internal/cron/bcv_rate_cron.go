package cron

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/edorguez/merki/internal/server/services"
)

const (
	retryInterval = 10 * time.Minute
	// maxRetries covers a full day of attempts so a transient upstream outage does
	// not leave the rate stale until the next morning's run.
	maxRetries = int(24 * time.Hour / retryInterval)
)

func StartBCVRateCron(svc services.BCVRateService, log *zap.Logger) {
	ctx := context.Background()

	scrapeWithRetry(ctx, svc, log)

	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), 4, 0, 0, 0, now.Location())
		if !now.Before(next) {
			next = next.Add(24 * time.Hour)
		}
		duration := next.Sub(now)
		log.Info("next BCV scrape scheduled", zap.Time("at", next), zap.Duration("in", duration))

		select {
		case <-time.After(duration):
			scrapeWithRetry(ctx, svc, log)
		case <-ctx.Done():
			return
		}
	}
}

func scrapeWithRetry(ctx context.Context, svc services.BCVRateService, log *zap.Logger) {
	for i := 0; i < maxRetries; i++ {
		_, err := svc.ScrapeAndStore(ctx)
		if err == nil {
			log.Info("BCV scrape succeeded")
			return
		}

		if i < maxRetries-1 {
			logf := log.Warn
			if i == 0 {
				// First failure of a cycle is the signal that scraping broke
				// (upstream markup change, network issue); make it visible even in
				// setups that only ship error-level logs.
				logf = log.Error
			}
			logf("BCV scrape failed, retrying",
				zap.Int("attempt", i+1),
				zap.Int("max_retries", maxRetries),
				zap.Duration("retry_in", retryInterval),
				zap.Error(err),
			)

			select {
			case <-time.After(retryInterval):
			case <-ctx.Done():
				return
			}
		} else {
			log.Error("BCV scrape failed after all retries, giving up until next cycle",
				zap.Int("attempts", maxRetries),
				zap.Duration("retry_duration", time.Duration(maxRetries)*retryInterval),
				zap.Error(err),
			)
		}
	}
}
