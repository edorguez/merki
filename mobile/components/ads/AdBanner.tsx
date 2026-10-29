import { StyleSheet, View } from 'react-native';
import { useIsPremium } from '../../store/authStore';
import { BANNER_PLACEMENT_ID } from '../../lib/ads';
import { UnityBannerView } from '../../lib/unityAds';

export function AdBanner() {
  const { isPremium, isResolved } = useIsPremium();

  if (isPremium || !isResolved) {
    return null;
  }

  return (
    <View style={styles.container}>
      <UnityBannerView placementId={BANNER_PLACEMENT_ID} adSize="banner" style={styles.banner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  banner: {
    width: 320,
    height: 50,
  },
});
