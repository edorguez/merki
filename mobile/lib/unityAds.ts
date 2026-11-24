import { requireNativeModule, requireNativeView } from 'expo';

type UnityAdsNativeModule = {
  initialize(gameId: string, testMode: boolean): Promise<boolean>;
  isInitialized(): boolean;
  loadInterstitial(placementId: string): Promise<boolean>;
  showInterstitial(placementId: string): Promise<boolean>;
};

const nativeModule = requireNativeModule<UnityAdsNativeModule>('UnityAds');

/**
 * Native banner view (standard 320x50). `onAdLoaded` fires when the creative is
 * ready; `onAdError` fires when loading definitively failed.
 */
export const UnityBannerView = requireNativeView('UnityAds', 'UnityBannerView');

let initPromise: Promise<boolean> | null = null;
let ready = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

export function initializeAds(gameId: string, testMode: boolean): Promise<boolean> {
  return nativeModule.initialize(gameId, testMode);
}

/**
 * Initializes the SDK once per app run. Every caller shares the same promise, so
 * ads components can wait for readiness instead of racing the SDK boot. A failed
 * attempt is not cached: the next caller — or the foreground retry in the root
 * layout — gets a fresh attempt instead of ads staying dead for the whole run.
 */
export function ensureAdsInitialized(gameId: string, testMode: boolean): Promise<boolean> {
  if (!initPromise) {
    initPromise = initializeAds(gameId, testMode)
      .then(initialized => {
        ready = initialized;
        if (!initialized) {
          initPromise = null;
        }
        notify();
        return initialized;
      })
      .catch(() => {
        ready = false;
        initPromise = null;
        notify();
        return false;
      });
  }
  return initPromise;
}

/** True once the SDK finished initializing successfully. */
export function areAdsReady(): boolean {
  return ready;
}

export function subscribeAdsReady(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function isInitialized(): boolean {
  return nativeModule.isInitialized();
}

export function loadInterstitial(placementId: string): Promise<boolean> {
  return nativeModule.loadInterstitial(placementId);
}

export function showInterstitial(placementId: string): Promise<boolean> {
  return nativeModule.showInterstitial(placementId);
}
