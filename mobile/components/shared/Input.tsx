import { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { createInputStyles } from '../../styles/inputs';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: boolean;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

const stylesheet = StyleSheet.create(theme => {
  const inputStyles = createInputStyles(theme);
  return {
    container: {
      gap: theme.spacing.xs,
    },
    field: {
      ...inputStyles.base,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fieldError: inputStyles.error,
    fieldFocused: inputStyles.focused,
    leadingIcon: {
      marginRight: theme.spacing.sm,
    },
    trailingAction: {
      marginLeft: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      padding: 0,
    },
    label: {
      fontSize: theme.typography.fontSize.xxs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    },
    errorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
      marginLeft: theme.spacing.sm,
    },
  };
});

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    errorText,
    leadingIcon,
    trailingAction,
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const theme = useAppTheme();
  const styles = stylesheet(theme);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container as ViewStyle, containerStyle]}>
      {label ? <Text style={styles.label as TextStyle}>{label}</Text> : null}
      <View
        style={[
          styles.field as ViewStyle,
          error && (styles.fieldError as ViewStyle),
          isFocused && !error && (styles.fieldFocused as ViewStyle),
        ]}
      >
        {leadingIcon ? <View style={styles.leadingIcon as ViewStyle}>{leadingIcon}</View> : null}
        <TextInput
          ref={ref}
          style={[styles.input as TextStyle, inputStyle]}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {trailingAction ? (
          <View style={styles.trailingAction as ViewStyle}>{trailingAction}</View>
        ) : null}
      </View>
      {errorText ? <Text style={styles.errorText as TextStyle}>{errorText}</Text> : null}
    </View>
  );
});
