import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../styles/theme';
import { Input } from '../../components/shared/Input';
import { Button } from '../../components/Button';
import { signIn } from '../../lib/auth-client';
import { Toast } from '../../components/shared/Toast';
import { MaterialIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleLogin = async () => {
    setToast(null);
    if (!email.trim()) {
      setToast('Ingresa tu correo electrónico');
      return;
    }
    if (!password) {
      setToast('Ingresa tu contraseña');
      return;
    }

    setIsLoading(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setToast('Se necesita conexión a internet para iniciar sesión');
        return;
      }
      const result = await signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        setToast('Correo o contraseña incorrectos');
        return;
      }
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setToast(message);
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
    forgotPassword: {
      alignSelf: 'flex-end',
      paddingVertical: theme.spacing.xs,
    },
    forgotPasswordText: {
      color: theme.colors.secondaryText,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    footerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    link: {
      color: theme.colors.secondaryText,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <View style={styles.content}>
          <View style={styles.header}>
            <MaterialIcons name="lock" size={48} color={theme.colors.midnight} />
            <Text style={styles.title}>Iniciar Sesión</Text>
            <Text style={styles.subtitle}>Ingresa tus credenciales para continuar</Text>
          </View>

          <View style={styles.form}>
            <Input
              leadingIcon={
                <MaterialIcons name="mail-outline" size={20} color={theme.colors.textSecondary} />
              }
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
            />

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
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
              maxLength={20}
            />

            <Pressable
              onPress={() => router.push('/(onboarding)/forgot-password')}
              hitSlop={8}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Restablecer contraseña"
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <Button
              title="Iniciar Sesión"
              onPress={handleLogin}
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
              leadingIcon={<MaterialIcons name="login" size={20} color={theme.colors.onPrimary} />}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No tienes cuenta?{' '}
              <Text style={styles.link} onPress={() => router.push('/(onboarding)/register')}>
                Regístrate
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
      <Toast message={toast} onDismiss={() => setToast(null)} position="bottom" />
    </View>
  );
}
