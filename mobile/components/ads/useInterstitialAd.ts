import { useCallback, useEffect, useRef } from 'react';
import { useIsPremium } from '../../store/authStore';
import { INTERSTITIAL_PLACEMENT_ID } from '../../lib/ads';
import { loadInterstitial, showInterstitial } from '../../lib/unityAds';

export function useInterstitialAd() {
  const { isPremium, isResolved } = useIsPremium();
  const loadedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (isPremium || !isResolved) {
      loadedRef.current = false;
      return;
    }

    loadInterstitial(INTERSTITIAL_PLACEMENT_ID)
      .then(loaded => {
        if (!cancelledRef.current) {
          loadedRef.current = loaded;
        }
      })
      .catch(() => {
        loadedRef.current = false;
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [isPremium, isResolved]);

  const show = useCallback(async (): Promise<void> => {
    // Bail out if the user became premium after the ad was loaded.
    if (isPremium || !loadedRef.current) {
      return;
    }

    loadedRef.current = false;
    try {
      await showInterstitial(INTERSTITIAL_PLACEMENT_ID);
    } catch {
      // Ignore show failures; the next trigger will retry.
    }

    // Preload the next interstitial for the following trigger.
    try {
      const loaded = await loadInterstitial(INTERSTITIAL_PLACEMENT_ID);
      if (!cancelledRef.current) {
        loadedRef.current = loaded;
      }
    } catch {
      loadedRef.current = false;
    }
  }, [isPremium]);

  return { show };
}
