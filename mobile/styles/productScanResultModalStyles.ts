import { StyleSheet, Dimensions } from 'react-native';
import { AppTheme } from './theme';
import { createInputStyles } from './inputs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);

export function createProductScanResultModalStyles(theme: AppTheme) {
  const inputStyles = createInputStyles(theme);
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      marginBottom: theme.spacing.xxl,
    },
    modalContent: {
      width: MODAL_WIDTH,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    titleContainer: {
      flex: 1,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primaryText,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: theme.spacing.xs,
    },
    productName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurface,
      lineHeight: 24,
      letterSpacing: theme.typography.letterSpacing.lg,
    },
    verifiedBadge: {
      backgroundColor: theme.colors.meadowGreen + '20',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    captureImageWrap: {
      width: '100%',
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      backgroundColor: '#000',
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
      marginBottom: theme.spacing.md,
    },
    captureImage: {
      width: '100%',
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 16,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    priceColumn: {
      flex: 1,
    },
    priceLabel: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.outline,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.xs,
      letterSpacing: 1,
    },
    priceBs: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.onSurface,
      letterSpacing: theme.typography.letterSpacing.lg,
    },
    priceUsd: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primaryText,
      letterSpacing: theme.typography.letterSpacing.lg,
    },
    divider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.stoneSurface,
      marginBottom: theme.spacing.xs,
    },
    quantitySection: {
      ...inputStyles.quantitySection,
      marginBottom: theme.spacing.md,
    },
    quantityControls: inputStyles.quantityControls,
    quantityButton: inputStyles.quantityButton,
    quantityButtonPressedDecrement: inputStyles.quantityButtonPressedDecrement,
    quantityButtonPressedIncrement: inputStyles.quantityButtonPressedIncrement,
    quantityNumber: inputStyles.quantityNumber,
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.xxs,
      marginTop: theme.spacing.sm,
    },
  });
}
