// Web stub for the local Unity Ads module. Ads are mobile-only: every API is a no-op.
import { createElement } from 'react';
import { View } from 'react-native';

export const UnityBannerView = (_props: {
  placementId?: string;
  adSize?: string;
  style?: unknown;
}) => createElement(View, null);

export function initializeAds(_gameId: string, _testMode: boolean): Promise<boolean> {
  return Promise.resolve(false);
}

export function isInitialized(): boolean {
  return false;
}

export function loadInterstitial(_placementId: string): Promise<boolean> {
  return Promise.resolve(false);
}

export function showInterstitial(_placementId: string): Promise<boolean> {
  return Promise.resolve(false);
}
