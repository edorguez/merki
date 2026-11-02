import { useSyncExternalStore } from 'react';
import { areAdsReady, subscribeAdsReady } from '../../lib/unityAds';

const getSnapshot = () => areAdsReady();
const getServerSnapshot = () => false;

/**
 * Re-renders when the Unity Ads SDK finishes initializing. Ad views must not
 * mount before this is true, otherwise the load races the SDK boot and fails
 * silently on both platforms.
 */
export function useAdsReady(): boolean {
  return useSyncExternalStore(subscribeAdsReady, getSnapshot, getServerSnapshot);
}
