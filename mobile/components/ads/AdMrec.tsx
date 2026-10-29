import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../styles/theme';
import { useIsPremium } from '../../store/authStore';
import { BANNER_PLACEMENT_ID } from '../../lib/ads';
import { UnityBannerView } from '../../lib/unityAds';

/**
 * In-feed ad card. Unity Ads has no native format, so the feeds use a 300x250
 * MREC rendered inside the same card container the native ads used before.
 */
export function AdMrec() {
  const theme = useAppTheme();
  const { isPremium, isResolved } = useIsPremium();

  if (isPremium || !isResolved) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      alignItems: 'center',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
      borderCurve: 'continuous',
      padding: theme.spacing.md,
    },
    mrec: {
      width: 300,
      height: 250,
    },
  });

  return (
    <View style={styles.container}>
      <UnityBannerView placementId={BANNER_PLACEMENT_ID} adSize="mrec" style={styles.mrec} />
    </View>
  );
}
