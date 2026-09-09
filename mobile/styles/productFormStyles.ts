import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';
import { createInputStyles } from './inputs';

export function createProductFormStyles(theme: AppTheme) {
  const inputStyles = createInputStyles(theme);
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: theme.spacing.lg,
    },
    illustrationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    iconContainer: {
      width: theme.sizes.formIcon,
      height: theme.sizes.formIcon,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.stoneSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      color: theme.colors.secondary,
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurface,
      letterSpacing: theme.typography.letterSpacing.lg,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
    },
    inputGroup: {
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    },
    quantitySection: inputStyles.quantitySection,
    quantityControls: inputStyles.quantityControls,
    quantityButton: inputStyles.quantityButton,
    quantityButtonPressedDecrement: inputStyles.quantityButtonPressedDecrement,
    quantityButtonPressedIncrement: inputStyles.quantityButtonPressedIncrement,
    quantityNumber: inputStyles.quantityNumber,
    priceInputContainer: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    priceInputWrapper: {
      position: 'relative',
    },
    currencySymbol: {
      position: 'absolute',
      left: theme.spacing.md,
      top: '50%',
      transform: [{ translateY: -theme.spacing.xs }],
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurfaceVariant,
    },
    syncContainer: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      alignSelf: 'center',
    },
    syncButton: {
      width: theme.sizes.iconButton,
      height: theme.sizes.iconButton,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
      marginLeft: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    buttonContainer: {
      marginTop: 'auto',
    },
  });
}
