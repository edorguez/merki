import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../styles/theme';
import { createCardStyles } from '../../styles/cards';
import { useCountUp } from '../../hooks/animations';
import { FadeIn } from '../../components/shared/FadeIn';
import { TopAppBar } from '../../components/shared/TopAppBar';
import { Button } from '../../components/Button';

type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

interface BillingOption {
  id: BillingPeriod;
  label: string;
  price: number;
  periodLabel: string;
  savingsPercent: number | null;
}

const BILLING_OPTIONS: BillingOption[] = [
  {
    id: 'monthly',
    label: 'Mensual',
    price: 3.99,
    periodLabel: 'Cada mes',
    savingsPercent: null,
  },
  {
    id: 'quarterly',
    label: '3 Meses',
    price: 9.99,
    periodLabel: 'Cada 3 meses',
    savingsPercent: 17,
  },
  {
    id: 'annual',
    label: 'Anual',
    price: 29.99,
    periodLabel: 'Cada año',
    savingsPercent: 37,
  },
];

const PREMIUM_FEATURES = ['Sin publicidad en la app', 'Acceso a futuras funciones'];

export default function PlansScreen() {
  const theme = useAppTheme();
  const cardStyles = createCardStyles(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const selected = BILLING_OPTIONS.find(b => b.id === billingPeriod)!;

  const priceText = useCountUp({ value: selected.price, prefix: '$', duration: 500 });

  const getPerUnit = (option: BillingOption) => {
    if (option.id === 'monthly') return null;
    const perMonth = option.id === 'quarterly' ? option.price / 3 : option.price / 12;
    return `$${perMonth.toFixed(2)}/mes`;
  };

  const handleSubmit = () => {
    router.push({
      pathname: '/(premium)/pago-movil',
      params: {
        billing: billingPeriod,
        usdPrice: selected.price.toFixed(2),
        periodLabel: selected.periodLabel,
      },
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      gap: theme.spacing.xl,
      paddingBottom: 180,
    },
    headerSection: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.lg,
    },
    starIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.sunburstYellow + '30',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.midnight,
      letterSpacing: theme.typography.letterSpacing.xl,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.ash,
    },
    pillsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.stoneSurface,
      borderRadius: theme.borderRadius.full,
      padding: 4,
    },
    pill: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.full,
      gap: 2,
    },
    pillSelected: {
      backgroundColor: theme.colors.primary,
    },
    pillLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.midnight,
    },
    pillLabelSelected: {
      color: theme.colors.onPrimary,
    },
    pillSavings: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.meadowGreen,
    },
    pillSavingsSelected: {
      color: theme.colors.onPrimary,
    },
    card: {
      ...cardStyles.base,
      borderRadius: 24,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    priceRow: {
      alignItems: 'center',
      gap: 2,
    },
    priceAmount: {
      fontSize: 36,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.midnight,
      letterSpacing: -1,
    },
    pricePeriod: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.ash,
    },
    perUnitText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.meadowGreen,
      textAlign: 'center',
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.stoneSurface,
    },
    featuresSection: {
      gap: theme.spacing.md,
    },
    featuresTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.midnight,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    featureText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderTopWidth: 1,
      borderTopColor: theme.colors.stoneSurface,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <TopAppBar title="Premium" onBackPress={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeIn>
          <View style={styles.headerSection}>
            <View style={styles.starIconContainer}>
              <MaterialIcons name="stars" size={24} color={theme.colors.sunburstYellow} />
            </View>
            <Text style={styles.headerTitle}>Hazte Premium</Text>
            <Text style={styles.headerSubtitle}>Elige tu plan de pago</Text>
          </View>
        </FadeIn>

        <FadeIn delay={120} distance={12}>
          <View style={styles.pillsContainer}>
            {BILLING_OPTIONS.map(option => {
              const isSelected = billingPeriod === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => setBillingPeriod(option.id)}
                >
                  <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FadeIn>

        <FadeIn delay={240} distance={12}>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>{priceText}</Text>
              <Text style={styles.pricePeriod}>{selected.periodLabel}</Text>
            </View>

            {getPerUnit(selected) ? (
              <Text style={styles.perUnitText}>Oferta de {getPerUnit(selected)}</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Incluye:</Text>
              {PREMIUM_FEATURES.map((feature, i) => (
                <FadeIn key={i} delay={320 + i * 90} distance={10}>
                  <View style={styles.featureRow}>
                    <MaterialIcons name="check-circle" size={20} color={theme.colors.meadowGreen} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                </FadeIn>
              ))}
            </View>
          </View>
        </FadeIn>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <Button
          title={`Suscribirse por $${selected.price.toFixed(2)}`}
          onPress={handleSubmit}
          size="md"
          fullWidth
        />
      </View>
    </View>
  );
}
