import { View, Text, AppState, type ViewStyle, type TextStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { createCardStyles } from '../../styles/cards';
import { useCountUp, usePulse } from '../../hooks/animations';
import { useBCV, type BCVRateRef } from '../../store/bcvStore';
import { formatDate } from '../../utils/dateUtils';
import { Skeleton } from '../shared/Skeleton';
import { Button } from '../Button';
import Animated from 'react-native-reanimated';

const stylesheet = StyleSheet.create(theme => {
  const cardStyles = createCardStyles(theme);
  return {
    card: {
      ...cardStyles.base,
      backgroundColor: theme.colors.surfaceContainerLow,
      padding: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.meadowGreen,
      gap: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    titleBox: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    indicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.meadowGreen,
    },
    headerLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    rateRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.xs,
    },
    rateValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primaryText,
      letterSpacing: theme.typography.letterSpacing.xl,
    },
    rateLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.graphite,
    },
    eurRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.xs,
    },
    eurValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.ash,
    },
    eurLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.smoke,
    },
    dateText: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.smoke,
      textAlign: 'right',
    },
    loadingContainer: {
      ...cardStyles.base,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
    },
  };
});

export const BCVRateCard = forwardRef<BCVRateRef, object>((_props, ref) => {
  const theme = useAppTheme();
  const styles = stylesheet(theme);
  const { rate, isLoading, error, refresh, loadRate } = useBCV();
  const appStateRef = useRef(AppState.currentState);

  const usdText = useCountUp({ value: rate?.usdRate ?? 0, prefix: 'Bs. ' });
  const eurText = useCountUp({ value: rate?.eurRate ?? 0, prefix: 'Bs. ' });
  const indicatorPulse = usePulse({ min: 0.5, max: 1, duration: 1400 });

  useFocusEffect(
    useCallback(() => {
      loadRate();
    }, [loadRate])
  );

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        loadRate();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [loadRate]);

  if (error && !rate) {
    return (
      <View style={styles.card as ViewStyle}>
        <View style={styles.header as ViewStyle}>
          <View
            style={[styles.indicator as ViewStyle, { backgroundColor: theme.colors.emberOrange }]}
          />
          <View style={styles.titleBox as ViewStyle}>
            <Text style={styles.headerLabel as TextStyle}>Tasa BCV</Text>
          </View>
        </View>
        <Text style={{ color: theme.colors.emberOrange, fontSize: theme.typography.fontSize.sm }}>
          Tasa BCV no disponible
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button
            title="Reintentar"
            variant="outline"
            size="small"
            onPress={() => loadRate(true)}
          />
        </View>
      </View>
    );
  }

  if (isLoading && !rate) {
    return (
      <View style={[styles.loadingContainer as ViewStyle, { gap: theme.spacing.sm }]}>
        <Skeleton height={14} radius={6} width="55%" />
        <Skeleton height={24} radius={6} width="75%" />
        <Skeleton height={12} radius={6} width="40%" />
      </View>
    );
  }

  if (!rate) return null;

  return (
    <View style={styles.card as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <Animated.View style={[styles.indicator as ViewStyle, indicatorPulse]} />
        <View style={styles.titleBox as ViewStyle}>
          <Text style={styles.headerLabel as TextStyle}>Tasa BCV</Text>
          {rate.createdAt && (
            <Text style={styles.dateText as TextStyle}>
              {`Datos del ${formatDate(rate.createdAt)}`}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rateRow as ViewStyle}>
        <Text style={styles.rateLabel as TextStyle}>1 USD</Text>
        <Text style={styles.rateLabel as TextStyle}>{'\u2248'}</Text>
        <Text style={styles.rateValue as TextStyle}>{usdText}</Text>
      </View>

      <View style={styles.eurRow as ViewStyle}>
        <Text style={styles.eurLabel as TextStyle}>1 EUR</Text>
        <Text style={styles.eurLabel as TextStyle}>{'\u2248'}</Text>
        <Text style={styles.eurValue as TextStyle}>{eurText}</Text>
      </View>
    </View>
  );
});

BCVRateCard.displayName = 'BCVRateCard';
