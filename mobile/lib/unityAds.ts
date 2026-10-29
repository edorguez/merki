import { requireNativeModule, requireNativeView } from 'expo';

type UnityAdsNativeModule = {
  initialize(gameId: string, testMode: boolean): Promise<boolean>;
  isInitialized(): boolean;
  loadInterstitial(placementId: string): Promise<boolean>;
  showInterstitial(placementId: string): Promise<boolean>;
};

const nativeModule = requireNativeModule<UnityAdsNativeModule>('UnityAds');

/**
 * Native banner view. `adSize` accepts `banner` (320x50) or `mrec` (300x250).
 */
export const UnityBannerView = requireNativeView('UnityAds', 'UnityBannerView');

export function initializeAds(gameId: string, testMode: boolean): Promise<boolean> {
  return nativeModule.initialize(gameId, testMode);
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
