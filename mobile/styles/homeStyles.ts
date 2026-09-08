import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';
import { createButtonStyles } from './buttons';
import { createCardStyles } from './cards';

export function createHomeStyles(theme: AppTheme) {
  const buttonStyles = createButtonStyles(theme);
  const cardStyles = createCardStyles(theme);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.xl,
    },
    header: {
      backgroundColor: theme.colors.surfaceContainerLowest + 'cc',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    headerLogo: {
      height: 24,
      aspectRatio: 1380 / 664,
    },
    section: {
      gap: theme.spacing.lg,
    },
    card: {
      ...cardStyles.base,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    supermarketLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    customMarketContainer: {
      marginTop: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.fontSize.xs,
    },
    budgetRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    budgetFields: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    budgetSwapSide: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    budgetLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.xs,
    },
    budgetInputWrapper: {
      position: 'relative',
    },
    budgetSymbol: {
      position: 'absolute',
      left: theme.spacing.md,
      top: '50%',
      transform: [{ translateY: -8 }],
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurfaceVariant,
    },

    budgetSwapButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xs,
    },
    budgetToggleLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.onSurface,
    },
    toggleTrack: {
      width: 50,
      height: 30,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      justifyContent: 'center',
    },
    toggleThumb: {
      position: 'absolute',
      top: 2,
      left: 0,
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    primaryButton: {
      ...buttonStyles.base,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.onPrimary,
    },
    primaryButtonOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.white,
      opacity: 0,
    },
    cartCardsContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
  });
}
