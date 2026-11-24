import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsPremium } from '../../store/authStore';
import { INTERSTITIAL_PLACEMENT_ID } from '../../lib/ads';
import { loadInterstitial, showInterstitial } from '../../lib/unityAds';
import { useAdsReady } from './useAdsReady';

const MAX_LOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;

export function useInterstitialAd() {
  const { isPremium, isResolved } = useIsPremium();
  const isAdsReady = useAdsReady();
  const loadedRef = useRef(false);
  const cancelledRef = useRef(false);
  // Bumped when the app returns to the foreground without a preloaded ad, so
  // the load effect runs again instead of staying empty for the whole session
  // after three failed attempts (low fill at launch, network hiccup, etc.).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && !loadedRef.current) {
        setReloadKey(key => key + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    // Skip until premium status and the SDK are both resolved.
    if (isPremium || !isResolved || !isAdsReady) {
      loadedRef.current = false;
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const attemptLoad = async () => {
      attempts += 1;
      try {
        const loaded = await loadInterstitial(INTERSTITIAL_PLACEMENT_ID);
        if (cancelledRef.current) return;
        if (loaded) {
          loadedRef.current = true;
          return;
        }
      } catch {
        if (cancelledRef.current) return;
      }

      loadedRef.current = false;

      // Unity recommends retrying a failed load instead of waiting for the next
      // trigger; without it, low fill on iOS means the ad never shows at all.
      if (attempts < MAX_LOAD_ATTEMPTS) {
        timer = setTimeout(attemptLoad, RETRY_DELAY_MS);
      }
    };

    attemptLoad();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [isPremium, isResolved, isAdsReady, reloadKey]);

  const show = useCallback(async (): Promise<void> => {
    // Bail out if the user became premium after the ad was loaded.
    if (isPremium) {
      return;
    }

    // Nothing preloaded (or the preload failed): try once before giving up so a
    // single failed load does not silence every later trigger.
    if (!loadedRef.current) {
      try {
        loadedRef.current = await loadInterstitial(INTERSTITIAL_PLACEMENT_ID);
      } catch {
        loadedRef.current = false;
      }
    }

    if (!loadedRef.current) {
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
