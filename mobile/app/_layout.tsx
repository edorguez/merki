import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, StyleSheet } from 'react-native';
import { useAppTheme } from '../styles/theme';
import { useBCV } from '../store/bcvStore';
import { syncService } from '../services/syncService';
import { useNetwork } from '../hooks/useNetwork';
import { useGuestDataMigration } from '../hooks/useGuestDataMigration';
import '../styles/unistylesConfigured';

export default function RootLayout() {
  const theme = useAppTheme();
  useBCV();
  useGuestDataMigration();
  const { subscribeToReconnect } = useNetwork();

  useEffect(() => {
    syncService.syncAll();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      try {
        if (Platform.OS === 'ios') {
          const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
          await requestTrackingPermissionsAsync();
        }
      } catch {
        // ATT permission is best-effort; the ad SDK still initializes below.
      } finally {
        if (!cancelled) {
          try {
            const { MobileAds } = await import('react-native-google-mobile-ads');
            await MobileAds().initialize();
          } catch {
            // Ad SDK unavailable in this environment.
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToReconnect(() => {
      syncService.syncAll();
    });
    return unsub;
  }, [subscribeToReconnect]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(cart)" />
          <Stack.Screen name="(premium)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
