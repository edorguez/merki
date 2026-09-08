import { forwardRef, useState, useCallback, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { HistoryCard } from '../history/HistoryCard';
import { SectionHeader } from '../shared/SectionHeader';
import { HorizontalScrollWithIndicators } from '../shared/HorizontalScrollWithIndicators';
import { EmptyCartsState } from '../shared/EmptyCartsState';
import { getCarts } from '../../services/historyService';
import { getCartIcon, getCartColorKey } from '../../utils/iconUtils';
import { formatDate } from '../../utils/dateUtils';
import { useAppTheme } from '../../styles/theme';
import { createHomeStyles } from '../../styles/homeStyles';
import type { ApiCartResponse } from '../../types';

export interface LatestCartsSectionRef {
  refresh: () => Promise<void>;
}

interface LatestCartsSectionProps {
  userId?: string;
}

export const LatestCartsSection = forwardRef<LatestCartsSectionRef, LatestCartsSectionProps>(
  ({ userId }, ref) => {
    const theme = useAppTheme();
    const styles = createHomeStyles(theme);
    const router = useRouter();
    const [recentCarts, setRecentCarts] = useState<ApiCartResponse[]>([]);

    const fetchCarts = useCallback(async () => {
      if (!userId) return;
      const data = await getCarts(userId, 5);
      setRecentCarts(data);
    }, [userId]);

    useImperativeHandle(
      ref,
      () => ({
        refresh: fetchCarts,
      }),
      [fetchCarts]
    );

    useFocusEffect(
      useCallback(() => {
        let mounted = true;
        const load = async () => {
          if (!userId) return;
          try {
            const data = await getCarts(userId, 5);
            if (mounted) setRecentCarts(data);
          } catch {
            // silently fail — section won't render carts
          }
        };
        load();
        return () => {
          mounted = false;
        };
      }, [userId])
    );

    const handleViewAll = useCallback(() => {
      router.push({ pathname: '/history' });
    }, [router]);

    const handleCartPress = useCallback(
      (id: string) => {
        router.push({ pathname: '/(cart)/[id]', params: { id } });
      },
      [router]
    );

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

    return (
      <View style={styles.section}>
        <SectionHeader title="Últimos Carritos" linkText="Ver todos" onLinkPress={handleViewAll} />

        {recentCarts.length > 0 ? (
          <HorizontalScrollWithIndicators contentContainerStyle={styles.cartCardsContainer}>
            {recentCarts.map(cart => {
              const { usage, exceeded } = calcBudgetUsage(cart);
              const colorKey = getCartColorKey(cart.id) as keyof typeof theme.colors;
              const budgetBs = cart.budgetBs ?? 0;
              const budgetUsd = cart.budgetUsd ?? 0;

              return (
                <HistoryCard
                  key={cart.id}
                  storeName={cart.supermarketName}
                  date={formatDate(cart.createdAt)}
                  icon={getCartIcon(cart.id)}
                  iconColor={theme.colors[colorKey]}
                  status={cart.isActive ? 'Activo' : 'Completado'}
                  statusIconOnly
                  totalBs={budgetBs.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  totalUsd={`$ ${budgetUsd.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                  hasBudget={cart.hasBudget}
                  budgetUsage={usage}
                  exceeded={exceeded}
                  hideAmounts
                  style={{ width: 280 }}
                  onPress={() => handleCartPress(cart.id)}
                />
              );
            })}
          </HorizontalScrollWithIndicators>
        ) : (
          <EmptyCartsState text="Aún no tienes carritos" compact />
        )}
      </View>
    );
  }
);

LatestCartsSection.displayName = 'LatestCartsSection';
