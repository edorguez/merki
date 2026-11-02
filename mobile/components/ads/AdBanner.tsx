import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsPremium } from '../../store/authStore';
import { BANNER_PLACEMENT_ID } from '../../lib/ads';
import { UnityBannerView } from '../../lib/unityAds';
import { useAdsReady } from './useAdsReady';

const BANNER_HEIGHT = 50;

type AdStatus = 'pending' | 'loaded' | 'failed';

/**
 * Standard 320x50 Unity banner rendered bare (no card or chrome) and centered
 * inside the available width. The native view stays mounted — but collapsed and
 * invisible — until `onAdLoaded` fires, so no space is reserved when fill is
 * missing.
 */
export function AdBanner() {
  const { isPremium, isResolved } = useIsPremium();
  const isAdsReady = useAdsReady();
  const [status, setStatus] = useState<AdStatus>('pending');

  const handleAdLoaded = useCallback(() => setStatus('loaded'), []);
  const handleAdError = useCallback(() => setStatus('failed'), []);

  if (isPremium || !isResolved || !isAdsReady) {
    return null;
  }

  const isVisible = status === 'loaded';

  return (
    <View
      style={[styles.wrapper, isVisible ? null : styles.hidden]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <UnityBannerView
        placementId={BANNER_PLACEMENT_ID}
        style={styles.banner}
        onAdLoaded={handleAdLoaded}
        onAdError={handleAdError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: BANNER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Out of the flex flow while loading/failed so it adds no space nor gap,
  // yet still gives the native banner a real 320x50 frame to load into.
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  banner: {
    width: '100%',
    height: BANNER_HEIGHT,
  },
});
