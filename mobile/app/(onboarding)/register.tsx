import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../styles/theme';
import { Input } from '../../components/shared/Input';
import { Button } from '../../components/Button';
import { signUp } from '../../lib/auth-client';
import { Toast } from '../../components/shared/Toast';
import { MaterialIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleRegister = async () => {
    setToast(null);
    if (!name.trim()) {
      setToast('Ingresa tu nombre');
      return;
    }
    if (name.trim().length > 20) {
      setToast('El nombre debe tener máximo 20 caracteres');
      return;
    }
    if (!email.trim()) {
      setToast('Ingresa tu correo electrónico');
      return;
    }
    if (!password) {
      setToast('Ingresa una contraseña');
      return;
    }
    if (password.length < 8) {
      setToast('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setToast('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setToast('Se necesita conexión a internet para crear la cuenta');
        return;
      }
      const result = await signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      if (result.error) {
        setToast('Error al crear la cuenta');
        return;
      }
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta';
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
            <MaterialIcons name="person-add" size={48} color={theme.colors.midnight} />
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Regístrate para guardar tu historial y más</Text>
          </View>

          <View style={styles.form}>
            <Input
              leadingIcon={
                <MaterialIcons name="person-outline" size={20} color={theme.colors.textSecondary} />
              }
              placeholder="Nombre (máx. 20 caracteres)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
              maxLength={20}
            />

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
              placeholder="Contraseña (mín. 8 caracteres)"
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
            />

            <Button
              title="Crear Cuenta"
              onPress={handleRegister}
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
              leadingIcon={
                <MaterialIcons name="person-add" size={20} color={theme.colors.onPrimary} />
              }
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Ya tienes cuenta?{' '}
              <Text style={styles.link} onPress={() => router.push('/(onboarding)/login')}>
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
