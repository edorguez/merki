package services

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gocolly/colly/v2"
	"go.uber.org/zap"

	"github.com/edorguez/merki/internal/server/models"
	"github.com/edorguez/merki/internal/server/repository"
	apperrors "github.com/edorguez/merki/pkg/core/errors"
)

type BCVRateService interface {
	GetLatestRate(ctx context.Context) (*models.BCVRate, error)
	ScrapeAndStore(ctx context.Context) (*models.BCVRate, error)
}

const (
	bcvURL = "https://www.bcv.org.ve"

	// staleAfter is how old the stored rate may be before GetLatestRate tries to
	// refresh it on demand. The cron stores a rate every morning, so anything
	// older than this means a scrape cycle was missed and the data served to
	// clients would otherwise silently rot.
	staleAfter = 26 * time.Hour

	// scrapeThrottle bounds how often on-demand refreshes can hit the BCV site
	// when it is down or its markup changed, so a broken scrape cannot turn into
	// one upstream request per API call.
	scrapeThrottle = 10 * time.Minute

	scrapeTimeout = 20 * time.Second
)

var bcvAllowedDomains = []string{"www.bcv.org.ve", "bcv.org.ve"}

type bcvRateService struct {
	repo repository.BCVRateRepository
	log  *zap.Logger

	// scrapeMu guards on-demand scrapes triggered by GetLatestRate so concurrent
	// requests don't all hit the upstream site at once.
	scrapeMu sync.Mutex
	// lastAttempt holds the UnixNano timestamp of the last scrape attempt (by the
	// cron or on demand) so on-demand refreshes can be throttled.
	lastAttempt atomic.Int64

	// url and allowedDomains are overridable in tests.
	url            string
	allowedDomains []string
}

func NewBCVRateService(repo repository.BCVRateRepository, log *zap.Logger) BCVRateService {
	return &bcvRateService{
		repo:           repo,
		log:            log,
		url:            bcvURL,
		allowedDomains: bcvAllowedDomains,
	}
}

func (s *bcvRateService) scrapeURL() string {
	if s.url != "" {
		return s.url
	}
	return bcvURL
}

func (s *bcvRateService) GetLatestRate(ctx context.Context) (*models.BCVRate, error) {
	rate, err := s.repo.GetLatest(ctx)
	if err != nil && !errors.Is(err, apperrors.ErrNotFound) {
		return nil, err
	}

	if rate != nil && time.Since(rate.CreatedAt) < staleAfter {
		return rate, nil
	}

	// The stored rate is missing (fresh DB after a migration or a failed scrape)
	// or stale (the daily cron stopped working). Try a refresh on demand; losing
	// the refresh is only fatal when there is nothing to serve.
	fresh, scrapeErr := s.scrapeOnDemand(ctx)
	if scrapeErr == nil {
		return fresh, nil
	}

	if rate != nil {
		s.log.Warn("BCV on-demand refresh failed, serving stale rate",
			zap.Time("rate_created_at", rate.CreatedAt),
			zap.Error(scrapeErr),
		)
		return rate, nil
	}

	return nil, scrapeErr
}

// scrapeOnDemand refreshes the stored rate, at most once per scrapeThrottle, and
// serializes with other on-demand callers via scrapeMu.
func (s *bcvRateService) scrapeOnDemand(ctx context.Context) (*models.BCVRate, error) {
	s.scrapeMu.Lock()
	defer s.scrapeMu.Unlock()

	// Another request may have refreshed the rate while we waited for the lock.
	if rate, err := s.repo.GetLatest(ctx); err == nil && time.Since(rate.CreatedAt) < staleAfter {
		return rate, nil
	}

	if last := s.lastAttempt.Load(); last != 0 {
		if since := time.Since(time.Unix(0, last)); since < scrapeThrottle {
			return nil, fmt.Errorf("scrape throttled: last attempt %s ago", since.Round(time.Second))
		}
	}

	scrapeCtx, cancel := context.WithTimeout(ctx, scrapeTimeout)
	defer cancel()

	return s.ScrapeAndStore(scrapeCtx)
}

func (s *bcvRateService) ScrapeAndStore(ctx context.Context) (*models.BCVRate, error) {
	s.lastAttempt.Store(time.Now().UnixNano())

	rate, err := s.scrape(ctx)
	if err != nil {
		return nil, fmt.Errorf("scrape failed: %w", err)
	}

	if err := s.repo.Upsert(ctx, rate); err != nil {
		return nil, fmt.Errorf("upsert failed: %w", err)
	}

	s.log.Info("BCV rates scraped and stored",
		zap.Int64("usd_rate", rate.UsdRate),
		zap.Int64("eur_rate", rate.EurRate),
	)

	return rate, nil
}

func (s *bcvRateService) scrape(ctx context.Context) (*models.BCVRate, error) {
	opts := []colly.CollectorOption{
		colly.UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
	}
	if len(s.allowedDomains) > 0 {
		opts = append(opts, colly.AllowedDomains(s.allowedDomains...))
	}

	c := colly.NewCollector(opts...)

	c.WithTransport(&http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	})

	rate := &models.BCVRate{}
	var scrapeErr error

	c.OnHTML("#dolar .strong-tb", func(e *colly.HTMLElement) {
		if scrapeErr != nil {
			return
		}
		val, err := parseRate(e.Text)
		if err != nil {
			scrapeErr = fmt.Errorf("parse USD rate: %w", err)
			return
		}
		rate.UsdRate = val
	})

	c.OnHTML("#euro .strong-tb", func(e *colly.HTMLElement) {
		if scrapeErr != nil {
			return
		}
		val, err := parseRate(e.Text)
		if err != nil {
			scrapeErr = fmt.Errorf("parse EUR rate: %w", err)
			return
		}
		rate.EurRate = val
	})

	c.OnError(func(_ *colly.Response, err error) {
		scrapeErr = fmt.Errorf("colly request: %w", err)
	})

	if err := c.Visit(s.scrapeURL()); err != nil {
		return nil, fmt.Errorf("visit %s: %w", s.scrapeURL(), err)
	}

	c.Wait()

	if scrapeErr != nil {
		return nil, scrapeErr
	}

	if rate.UsdRate == 0 || rate.EurRate == 0 {
		return nil, fmt.Errorf("incomplete scrape: usd=%d eur=%d", rate.UsdRate, rate.EurRate)
	}

	return rate, nil
}

// parseRate converts a BCV-formatted rate into cents. BCV renders values in
// Spanish notation: "." separates thousands and "," is the decimal separator
// (e.g. "911,62430000" or "1.009,34130871").
func parseRate(text string) (int64, error) {
	raw := strings.TrimSpace(text)
	normalized := raw
	if strings.Contains(raw, ",") {
		normalized = strings.ReplaceAll(raw, ".", "")
		normalized = strings.ReplaceAll(normalized, ",", ".")
	}

	val, err := strconv.ParseFloat(normalized, 64)
	if err != nil {
		return 0, fmt.Errorf("parse float %q: %w", raw, err)
	}
	if val <= 0 {
		return 0, fmt.Errorf("non-positive rate %q", raw)
	}
	return int64(math.Round(val * 100)), nil
}
