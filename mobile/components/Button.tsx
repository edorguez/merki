import { type ReactNode } from 'react';
import { Text, ActivityIndicator, type ViewStyle, type StyleProp } from 'react-native';
import { useAppTheme } from '../styles/theme';
import { createButtonStyles } from '../styles/buttons';
import { PressableScale } from './shared/PressableScale';

type Variant = 'primary' | 'secondary' | 'outline' | 'neutral' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  isLoading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useAppTheme();
  const buttonStyles = createButtonStyles(theme);

  const variantStyles: Record<Variant, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.graphite,
    },
    neutral: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  const sizeStyles: Record<Size, ViewStyle> = {
    sm: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    md: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    lg: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
  };

  const sizeText: Record<Size, number> = {
    sm: theme.typography.fontSize.xs,
    md: theme.typography.fontSize.sm,
    lg: theme.typography.fontSize.sm,
  };

  const textColor: Record<Variant, string> = {
    primary: theme.colors.onPrimary,
    secondary: theme.colors.onSecondary,
    outline: theme.colors.graphite,
    neutral: theme.colors.onSurfaceVariant,
    ghost: theme.colors.emberOrange,
  };

  const disabledOpacity = disabled || isLoading ? { opacity: 0.6 } : {};

  const containerStyle: ViewStyle = {
    ...buttonStyles.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: fullWidth ? ('100%' as const) : undefined,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...disabledOpacity,
  };

  const spinnerColor =
    variant === 'outline'
      ? theme.colors.graphite
      : variant === 'neutral'
        ? theme.colors.onSurfaceVariant
        : variant === 'ghost'
          ? theme.colors.emberOrange
          : variant === 'secondary'
            ? theme.colors.onSecondary
            : theme.colors.onPrimary;

  return (
    <PressableScale
      style={[containerStyle, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leadingIcon}
          <Text
            style={{
              fontSize: sizeText[size],
              fontWeight: theme.typography.fontWeight.medium as '500',
              color: textColor[variant],
            }}
          >
            {title}
          </Text>
          {trailingIcon}
        </>
      )}
    </PressableScale>
  );
}
