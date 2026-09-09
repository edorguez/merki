import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../styles/theme';
import { Button } from '../../components/Button';
import { useScaleIn, useFadeSlideIn, useHeartbeat } from '../../hooks/animations';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const iconEnter = useScaleIn({ delay: 150 });
  const heartbeat = useHeartbeat();
  const titleEnter = useFadeSlideIn({ delay: 300, distance: 12 });
  const subtitleEnter = useFadeSlideIn({ delay: 420, distance: 12 });
  const buttonEnter = useFadeSlideIn({ delay: 540, distance: 12 });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: insets.bottom,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.meadowGreen + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xxl,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View style={iconEnter}>
        <Animated.View style={[styles.iconContainer, heartbeat]}>
          <MaterialCommunityIcons name="check-circle" size={64} color={theme.colors.meadowGreen} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.title, titleEnter]}>
        Tu carrito fue completado con éxito
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, subtitleEnter]}>
        Todo listo para tu próxima visita al supermercado
      </Animated.Text>
      <Animated.View style={buttonEnter}>
        <Button
          title="Ir al Inicio"
          onPress={() => router.replace('/(tabs)')}
          size="lg"
          fullWidth
          style={{ maxWidth: 300, alignSelf: 'center' }}
        />
      </Animated.View>
    </View>
  );
}
