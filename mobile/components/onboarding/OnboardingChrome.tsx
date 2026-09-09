import { type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useSegments, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../styles/theme';
import { Button } from '../Button';
import { ProgressBar } from '../shared/ProgressBar';

const STEP_ROUTES = ['step-1', 'step-2', 'step-3', 'step-4'] as const;
const TOTAL_STEPS = 4;
const BACK_BUTTON_SIZE = 40;

const NEXT_ROUTE: Record<(typeof STEP_ROUTES)[number], Href> = {
  'step-1': '/(onboarding)/step-2',
  'step-2': '/(onboarding)/step-3',
  'step-3': '/(onboarding)/step-4',
  'step-4': '/(onboarding)/login-choice',
};

interface OnboardingChromeProps {
  children: ReactNode;
}

export function OnboardingChrome({ children }: OnboardingChromeProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const segments = useSegments();
  const route = segments[segments.length - 1] as string;

  const stepIndex = STEP_ROUTES.indexOf(route as (typeof STEP_ROUTES)[number]) + 1;
  const isStep = stepIndex > 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    hidden: {
      display: 'none',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      height: theme.spacing.lg + BACK_BUTTON_SIZE,
    },
    headerSpacer: {
      width: BACK_BUTTON_SIZE,
    },
    backButton: {
      width: BACK_BUTTON_SIZE,
      height: BACK_BUTTON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.full,
    },
    stepLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    progressWrap: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    stage: {
      flex: 1,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
  });

  const hiddenStyle = isStep ? null : styles.hidden;

  return (
    <View style={styles.container}>
      <View style={[styles.header, hiddenStyle]}>
        {stepIndex > 1 ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={styles.stepLabel}>
          Paso {stepIndex} de {TOTAL_STEPS}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.progressWrap, hiddenStyle]}>
        <ProgressBar progress={(stepIndex / TOTAL_STEPS) * 100} height={5} />
      </View>

      <View style={styles.stage}>{children}</View>

      <View style={[styles.footer, hiddenStyle]}>
        <Button
          title="Siguiente"
          onPress={() => router.push(NEXT_ROUTE[route as (typeof STEP_ROUTES)[number]])}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}
