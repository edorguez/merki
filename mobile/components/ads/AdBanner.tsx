import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useIsPremium } from '../../store/authStore';
import { BANNER_PLACEMENT_ID } from '../../lib/ads';
import { UnityBannerView } from '../../lib/unityAds';
import { useAdsReady } from './useAdsReady';

const BANNER_HEIGHT = 50;

type AdStatus = 'pending' | 'loaded' | 'failed';

/**
 * Standard 320x50 Unity banner rendered bare (no card or chrome) and centered
 * inside the available width.
 *
 * While the ad is loading (or after it definitively failed) the wrapper
 * collapses to zero height, so no space is reserved when fill is missing.
 *
 * Visibility is expressed with height/opacity only — never with `position`.
 * React Native keeps absolutely-positioned children at the end of the parent's
 * child list, so flipping a view between absolute and relative re-inserts it in
 * the Android view hierarchy; that detaches the native banner view and destroys
 * the already-loaded creative (leaving an empty slot).
 *
 * The native view is only mounted while the screen is focused: Unity supports a
 * single banner per placement, and inactive tab screens stay mounted, so two
 * live banners would destroy each other on every tab switch.
 */
export function AdBanner() {
  const { isPremium, isResolved } = useIsPremium();
  const isAdsReady = useAdsReady();
  const isFocused = useIsFocused();
  const [status, setStatus] = useState<AdStatus>('pending');

  // Unmounting the native view tears the banner down; reset the state while
  // hidden so a stale 'loaded'/'failed' never leaks into the next visit (a
  // stale 'loaded' would paint an empty strip until the new banner lands).
  useEffect(() => {
    if (!isFocused) {
      setStatus('pending');
    }
  }, [isFocused]);

  const handleAdLoaded = useCallback(() => setStatus('loaded'), []);
  const handleAdError = useCallback(() => setStatus('failed'), []);

  if (isPremium || !isResolved || !isAdsReady || !isFocused) {
    return null;
  }

  const isVisible = status === 'loaded';

  return (
    <View
      style={[styles.wrapper, isVisible ? styles.visible : styles.collapsed]}
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
    alignItems: 'center',
    justifyContent: 'center',
    // The banner paints outside its bounds on iOS unless clipped; with the
    // wrapper collapsed this keeps the loading creative invisible.
    overflow: 'hidden',
  },
  visible: {
    height: BANNER_HEIGHT,
  },
  // Collapsed while loading/failed so the slot adds no space nor gap, but the
  // native view stays mounted so Unity can load. Never use position: absolute
  // here — see the component comment.
  collapsed: {
    height: 0,
    opacity: 0,
  },
  banner: {
    width: '100%',
    height: BANNER_HEIGHT,
  },
});
