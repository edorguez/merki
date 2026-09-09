import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';

export function createCartDetailStyles(theme: AppTheme) {
  const buttonBarHeight = theme.sizes.circleButton + theme.spacing.lg * 2;
  const scrollContentPaddingBottom = buttonBarHeight + theme.spacing.md;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerContainer: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      paddingHorizontal: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.stoneSurface,
    },
    supermarketHeaderContainer: {
      paddingTop: theme.spacing.sm,
    },
    scrollView: {
      flex: 1,
      paddingTop: theme.spacing.sm,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: scrollContentPaddingBottom,
    },
    productList: {
      gap: theme.spacing.xxs,
    },
    sectionHeader: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.md,
      letterSpacing: theme.typography.letterSpacing.lg,
    },
    emptyState: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.4,
    },
    emptyStateText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.md,
    },
    buttonBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.surfaceContainerLowest,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
    },
    buttonBar: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      position: 'relative',
    },
    buttonCircle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: theme.borderRadius.full,
    },
    buttonCircleComplete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.sizes.circleButton,
      height: theme.sizes.circleButton,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.full,
      borderWidth: 2,
      borderColor: theme.colors.white,
      position: 'absolute',
      top: -theme.spacing.xs,
      left: '50%',
      marginLeft: -(theme.sizes.circleButton / 2),
      zIndex: 10,
    },
  });
}
