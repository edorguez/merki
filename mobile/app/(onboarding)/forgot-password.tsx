import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../styles/theme';
import { Input } from '../../components/shared/Input';
import { Button } from '../../components/Button';
import { requestPasswordReset } from '../../lib/auth-client';
import { Toast } from '../../components/shared/Toast';
import { MaterialIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setToast(null);
    if (!email.trim()) {
      setToast('Ingresa tu correo electrónico');
      return;
    }

    setIsLoading(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setToast('Se necesita conexión a internet para enviar el enlace');
        return;
      }
      const result = await requestPasswordReset({
        email: email.trim(),
        redirectTo: 'merki://reset-password',
      });
      if (result.error) {
        setToast('No pudimos enviar el enlace. Inténtalo de nuevo.');
        return;
      }
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar el enlace';
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
    success: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
    },
    successIcon: {
      color: theme.colors.meadowGreen,
    },
    successText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
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
            <MaterialIcons name="lock-reset" size={48} color={theme.colors.midnight} />
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.subtitle}>
              Te enviaremos un enlace a tu correo para restablecerla
            </Text>
          </View>

          {sent ? (
            <View style={styles.success}>
              <MaterialIcons name="mark-email-read" size={40} color={styles.successIcon.color} />
              <Text style={styles.successText}>
                Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu
                contraseña.
              </Text>
            </View>
          ) : (
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

              <Button
                title="Enviar enlace"
                onPress={handleSend}
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
                leadingIcon={<MaterialIcons name="mail" size={20} color={theme.colors.onPrimary} />}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Recordaste tu contraseña?{' '}
              <Text style={styles.link} onPress={() => router.replace('/(onboarding)/login')}>
                Inicia sesión
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
      <Toast message={toast} onDismiss={() => setToast(null)} position="bottom" />
    </View>
  );
}
