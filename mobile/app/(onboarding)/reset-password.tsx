import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../../styles/theme';
import { Input } from '../../components/shared/Input';
import { Button } from '../../components/Button';
import { resetPassword } from '../../lib/auth-client';
import { Toast } from '../../components/shared/Toast';
import { MaterialIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const theme = useAppTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  const handleReset = async () => {
    setToast(null);
    if (!token) {
      setToast({ message: 'El enlace no es válido o ha expirado', isError: true });
      return;
    }
    if (!password) {
      setToast({ message: 'Ingresa una nueva contraseña', isError: true });
      return;
    }
    if (password.length < 8) {
      setToast({ message: 'La contraseña debe tener al menos 8 caracteres', isError: true });
      return;
    }
    if (password !== confirmPassword) {
      setToast({ message: 'Las contraseñas no coinciden', isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setToast({
          message: 'Se necesita conexión a internet para restablecer tu contraseña',
          isError: true,
        });
        return;
      }
      const result = await resetPassword({ newPassword: password, token });
      if (result.error) {
        setToast({
          message: 'El enlace no es válido o ha expirado. Solicita uno nuevo.',
          isError: true,
        });
        return;
      }
      setToast({
        message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.',
        isError: false,
      });
      setTimeout(() => {
        router.replace('/(onboarding)/login');
      }, 1200);
    } catch {
      setToast({
        message: 'Error al restablecer la contraseña. Inténtalo de nuevo.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    backButton: {
      padding: theme.spacing.md,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flexGrow: 1,
      paddingTop: theme.spacing.xxl,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      gap: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      letterSpacing: theme.typography.letterSpacing.xl,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    form: {
      gap: theme.spacing.md,
    },
    invalid: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
    },
    invalidText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  if (!token) {
    return (
      <View style={styles.container}>
        <View style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
          <Pressable
            onPress={() => router.replace('/(onboarding)/login')}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={[styles.content, { flex: 1, justifyContent: 'center' }]}>
          <View style={styles.invalid}>
            <MaterialIcons name="error-outline" size={48} color={theme.colors.coralRed} />
            <Text style={styles.invalidText}>
              El enlace no es válido o ha expirado. Solicita uno nuevo desde la pantalla de inicio
              de sesión.
            </Text>
            <Button
              title="Ir a Iniciar Sesión"
              onPress={() => router.replace('/(onboarding)/login')}
              size="lg"
              style={{ alignSelf: 'center' }}
              leadingIcon={<MaterialIcons name="login" size={20} color={theme.colors.onPrimary} />}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <View style={styles.content}>
          <View style={styles.header}>
            <MaterialIcons name="lock-reset" size={48} color={theme.colors.midnight} />
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>Ingresa una contraseña nueva para tu cuenta</Text>
          </View>

          <View style={styles.form}>
            <Input
              leadingIcon={
                <MaterialIcons name="lock-outline" size={20} color={theme.colors.textSecondary} />
              }
              trailingAction={
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              }
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
              maxLength={20}
            />

            <Input
              leadingIcon={
                <MaterialIcons name="lock-outline" size={20} color={theme.colors.textSecondary} />
              }
              trailingAction={
                <Pressable
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <MaterialIcons
                    name={showConfirm ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              }
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              editable={!isLoading}
              maxLength={20}
            />

            <Button
              title="Restablecer contraseña"
              onPress={handleReset}
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
              leadingIcon={
                <MaterialIcons name="vpn-key" size={20} color={theme.colors.onPrimary} />
              }
            />
          </View>
        </View>
      </ScrollView>
      <Toast
        message={toast?.message ?? null}
        isError={toast?.isError ?? true}
        onDismiss={() => setToast(null)}
        position="bottom"
      />
    </View>
  );
}
