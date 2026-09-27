import { Stack, useRouter } from 'expo-router';
import { useAppTheme } from '../../styles/theme';
import { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import * as Network from 'expo-network';
import { MaterialIcons } from '@expo/vector-icons';

export default function PremiumLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Premium purchase is not offered on iOS (no In-App Purchase).
    if (Platform.OS === 'ios') {
      router.replace('/(tabs)/profile');
      return;
    }
    Network.getNetworkStateAsync().then(state => {
      const connected = state.isConnected ?? true;
      setIsOnline(connected);
      if (!connected) {
        router.replace('/(tabs)/profile');
      }
    });
  }, [router]);

  if (Platform.OS === 'ios') {
    return null;
  }

  if (!isOnline) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <MaterialIcons name="wifi-off" size={48} color={theme.colors.ash} />
        <Text
          style={{
            marginTop: theme.spacing.md,
            fontSize: theme.typography.fontSize.md,
            color: theme.colors.textSecondary,
            textAlign: 'center',
          }}
        >
          Se necesita conexión a internet para acceder a esta sección
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="plans" />
      <Stack.Screen name="pago-movil" />
      <Stack.Screen name="payment-pending" />
    </Stack>
  );
}
