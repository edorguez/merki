import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { createCardStyles } from '../../styles/cards';
import { useCountUp } from '../../hooks/animations';
import { ProgressBar } from '../shared/ProgressBar';
import { MaterialIcons } from '@expo/vector-icons';
import { useBCV } from '../../store/bcvStore';

interface BudgetSummaryProps {
  totalBs: number;
  totalUsd: number;
  hasBudget: boolean;
  budgetBs: number;
  budgetUsd: number;
}

const stylesheet = StyleSheet.create(theme => {
  const cardStyles = createCardStyles(theme);
  return {
    container: {
      ...cardStyles.base,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    limitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xxs,
    },
    limitRowColumn: {
      flexDirection: 'column',
      gap: 2,
      marginBottom: theme.spacing.xxs,
      alignItems: 'flex-start',
    },
    limitLabel: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.onSurfaceVariant,
    },
    limitUsd: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurfaceVariant,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: theme.spacing.xs,
    },
    totalLeft: {
      flex: 1,
    },
    totalLabel: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.xxs,
    },
    totalAmountRow: {
      flexDirection: 'column',
      gap: 2,
    },
    totalBs: {
      fontSize: 24,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurface,
    },
    totalUsd: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurface,
    },
    progressBarContainer: {
      marginBottom: theme.spacing.xxs,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.coralRed + '08',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.coralRed + '20',
    },
    warningText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.error,
    },
  };
});

export function BudgetSummary({
  totalBs,
  totalUsd,
  hasBudget,
  budgetBs,
  budgetUsd,
}: BudgetSummaryProps) {
  const theme = useAppTheme();
  const styles = stylesheet(theme);
  const { rate: bcvRate } = useBCV();

  const budgetAvailable = hasBudget && budgetBs > 0;
  const isOverBudget = budgetAvailable ? totalBs > budgetBs : false;
  const overBudgetAmount = budgetAvailable ? Math.max(0, totalBs - budgetBs) : 0;
  const progressPercentage = budgetAvailable ? Math.min(100, (totalBs / budgetBs) * 100) : 0;
  const exchangeRate =
    budgetAvailable && budgetUsd > 0 ? budgetUsd / budgetBs : (bcvRate?.usdRate ?? 55);
  const overBudgetUsd = overBudgetAmount * exchangeRate;
  const limitLabelText = `LÍMITE: Bs. ${budgetBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
  const isLongBudget = limitLabelText.length > 22;

  const totalBsText = useCountUp({ value: totalBs, prefix: 'Bs. ' });
  const totalUsdText = useCountUp({ value: totalUsd, prefix: '($ ', suffix: ')' });

  return (
    <View style={styles.container as ViewStyle}>
      {budgetAvailable ? (
        <View
          style={[
            styles.limitRow as ViewStyle,
            isLongBudget && (styles.limitRowColumn as ViewStyle),
          ]}
        >
          <Text style={styles.limitLabel as TextStyle}>{limitLabelText}</Text>
          <Text style={styles.limitUsd as TextStyle}>
            (${' '}
            {budgetUsd.toLocaleString('es-VE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            )
          </Text>
        </View>
      ) : null}

      <View style={styles.totalRow as ViewStyle}>
        <View style={styles.totalLeft as ViewStyle}>
          <Text style={styles.totalLabel as TextStyle}>TOTAL ACUMULADO</Text>
          <View style={styles.totalAmountRow as ViewStyle}>
            <Text style={styles.totalBs as TextStyle}>{totalBsText}</Text>
            <Text style={styles.totalUsd as TextStyle}>{totalUsdText}</Text>
          </View>
        </View>
      </View>

      {budgetAvailable ? (
        <View style={styles.progressBarContainer as ViewStyle}>
          <ProgressBar
            progress={progressPercentage}
            color={isOverBudget ? theme.colors.error : theme.colors.midnight}
            backgroundColor={theme.colors.surfaceContainer}
            height={8}
          />
        </View>
      ) : null}

      {isOverBudget ? (
        <View style={styles.warningContainer as ViewStyle}>
          <MaterialIcons name="warning" size={theme.iconSize.sm} color={theme.colors.error} />
          <Text style={styles.warningText as TextStyle}>
            Excedido por Bs.{' '}
            {overBudgetAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / $
            {overBudgetUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
