import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { createHistoryStyles } from '../../styles/historyStyles';
import { HeroSection } from '../../components/history/HeroSection';
import { HistoryCard } from '../../components/history/HistoryCard';
import { useAppTheme } from '../../styles/theme';
import { useAuth } from '../../store/authStore';
import { getCarts } from '../../services/historyService';
import { getCartIcon, getCartColorKey } from '../../utils/iconUtils';
import { formatDate } from '../../utils/dateUtils';
import type { ApiCartResponse } from '../../types';
import { EmptyCartsState } from '../../components/shared/EmptyCartsState';
import { FadeIn } from '../../components/shared/FadeIn';
import { Skeleton } from '../../components/shared/Skeleton';
import { MaterialIcons } from '@expo/vector-icons';
import { MERKI_LOGO } from '../../constants/images';
import { AdNative } from '../../components/ads/AdNative';

const AD_AFTER_PRODUCTS = 3;

function calcBudgetUsage(cart: ApiCartResponse): { usage: number; exceeded: boolean } {
  if (!cart.hasBudget) {
    return { usage: 0, exceeded: false };
  }
  const budgetBs = cart.budgetBs ?? 0;
  const budgetUsd = cart.budgetUsd ?? 0;
  if (budgetBs > 0 && cart.totalEstimatedBs !== null) {
    const raw = Math.round((cart.totalEstimatedBs / budgetBs) * 100);
    return { usage: Math.min(raw, 100), exceeded: raw > 100 };
  }
  if (budgetUsd > 0 && cart.totalEstimatedUsd !== null) {
    const raw = Math.round((cart.totalEstimatedUsd / budgetUsd) * 100);
    return { usage: Math.min(raw, 100), exceeded: raw > 100 };
  }
  return { usage: 0, exceeded: false };
}

function getStatus(isActive: boolean): string {
  return isActive ? 'Activo' : 'Completado';
}

export default function HistoryTab() {
  const theme = useAppTheme();
  const styles = createHistoryStyles(theme);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [carts, setCarts] = useState<ApiCartResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const fetchCarts = useCallback(async () => {
    if (!user?.id && !user?.userId) {
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await getCarts(user?.id || user?.userId);
      setCarts(data);
      setIsOfflineData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial');
      setIsOfflineData(true);
      const data = await getCarts(user?.id || user?.userId);
      setCarts(data);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.userId]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthLoading) return;
      fetchCarts();
    }, [isAuthLoading, fetchCarts])
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchCarts();
  }, [fetchCarts]);

  const renderCart = (cart: ApiCartResponse, index: number) => {
    const { usage, exceeded } = calcBudgetUsage(cart);
    const colorKey = getCartColorKey(cart.id) as keyof typeof theme.colors;
    const budgetBs = cart.budgetBs ?? 0;
    const budgetUsd = cart.budgetUsd ?? 0;
    const totalBs = budgetBs.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const totalUsd = `$ ${budgetUsd.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return (
      <FadeIn key={cart.id} delay={index * 70} distance={12}>
        <HistoryCard
          storeName={cart.supermarketName}
          date={formatDate(cart.createdAt)}
          icon={getCartIcon(cart.id)}
          iconColor={theme.colors[colorKey]}
          status={getStatus(cart.isActive)}
          totalBs={totalBs}
          totalUsd={totalUsd}
          hasBudget={cart.hasBudget}
          budgetUsage={usage}
          exceeded={exceeded}
          onPress={() => router.push({ pathname: '/(cart)/[id]', params: { id: cart.id } })}
        />
      </FadeIn>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={MERKI_LOGO} style={styles.headerLogo} resizeMode="contain" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        <FadeIn>
          <HeroSection
            title="Historial de Compras"
            subtitle="Revisa tus gastos pasados y optimiza tu presupuesto."
          />
        </FadeIn>

        {isOfflineData && (
          <Text
            style={{ fontSize: 10, color: theme.colors.ash, textAlign: 'center', marginBottom: 8 }}
          >
            Datos locales sin conexión
          </Text>
        )}

        {error ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="error-outline" size={48} color={theme.colors.coralRed} />
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.coralRed, marginTop: theme.spacing.md },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : isLoading && carts.length === 0 ? (
          <View style={styles.historyList}>
            {[0, 1, 2].map(i => (
              <Skeleton key={i} height={104} radius={10} />
            ))}
          </View>
        ) : (
          <>
            <View style={styles.historyList}>
              {carts.slice(0, AD_AFTER_PRODUCTS).map(renderCart)}
            </View>

            {carts.length > 0 ? <AdNative /> : null}

            {carts.length > AD_AFTER_PRODUCTS ? (
              <View style={styles.historyList}>
                {carts.slice(AD_AFTER_PRODUCTS).map(renderCart)}
              </View>
            ) : null}

            <FadeIn delay={300} distance={12}>
              <EmptyCartsState
                text={carts.length > 0 ? 'Fin del historial actual' : 'Aún no tienes carritos'}
              />
            </FadeIn>

            {carts.length === 0 ? <AdNative /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
