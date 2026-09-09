import { AppTheme } from './theme';

export function createInputStyles(theme: AppTheme) {
  return {
    base: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
      borderRadius: theme.borderRadius.md,
      borderCurve: 'continuous' as const,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      boxShadow: theme.shadows.soft,
    },
    error: {
      borderColor: theme.colors.error,
    },
    focused: {
      borderColor: theme.colors.focus,
    },
    right: {
      textAlign: 'right' as const,
    },
    quantitySection: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
      borderRadius: theme.borderRadius.md,
      borderCurve: 'continuous' as const,
      padding: theme.spacing.sm,
      boxShadow: theme.shadows.soft,
    },
    quantityControls: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      gap: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.xs,
    },
    quantityButton: {
      width: theme.sizes.quantityButton,
      height: theme.sizes.quantityButton,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    quantityButtonPressedDecrement: {
      transform: [{ scale: 1.1 }],
      backgroundColor: theme.colors.surfaceContainerHighest,
    },
    quantityButtonPressedIncrement: {
      transform: [{ scale: 1.1 }],
      backgroundColor: theme.colors.primaryPressed,
    },
    quantityNumber: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      minWidth: theme.spacing.xl,
      textAlign: 'center' as const,
      color: theme.colors.onSurface,
    },
  };
}
