import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, Platform, StyleSheet } from 'react-native';
import { useAppTheme } from '../styles/theme';
import { useBCV } from '../store/bcvStore';
import { syncService } from '../services/syncService';
import { useNetwork } from '../hooks/useNetwork';
import { useGuestDataMigration } from '../hooks/useGuestDataMigration';
import { UNITY_GAME_ID } from '../lib/ads';
import { areAdsReady, ensureAdsInitialized } from '../lib/unityAds';
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

    const attempt = () => {
      if (cancelled) return;
      ensureAdsInitialized(UNITY_GAME_ID, __DEV__).catch(() => {
        // Ad SDK unavailable in this environment.
      });
    };

    attempt();

    // A failed init used to disable ads for the entire app run. Retry whenever
    // the app comes back to the foreground (e.g. network was down on launch).
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && !areAdsReady()) {
        attempt();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
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
