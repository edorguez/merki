import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { createCardStyles } from '../../styles/cards';
import { Button } from '../Button';
import { MaterialIcons } from '@expo/vector-icons';

interface PremiumActiveCardProps {
  premiumUntil?: string | null;
  onUpgradePress?: () => void;
}

function getDaysRemaining(premiumUntil: string): number {
  const expiry = new Date(premiumUntil);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(premiumUntil: string): string {
  const d = new Date(premiumUntil);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const stylesheet = StyleSheet.create(theme => {
  const cardStyles = createCardStyles(theme);
  return {
    card: {
      ...cardStyles.base,
      padding: theme.spacing.xl,
      marginVertical: theme.spacing.lg,
      boxShadow: `${theme.shadows.soft}, color(display-p3 0.94902 0.941176 0.929412) 0px 0px 0px 1px inset`,
    },
    content: {
      gap: theme.spacing.md,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.meadowGreen,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.white,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    daysText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.charcoalPrimary,
      letterSpacing: theme.typography.letterSpacing.xl,
    },
    expiresText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.ash,
    },
  };
});

export function PremiumActiveCard({ premiumUntil, onUpgradePress }: PremiumActiveCardProps) {
  const theme = useAppTheme();
  const styles = stylesheet(theme);

  if (!premiumUntil) {
    return null;
  }

  const days = getDaysRemaining(premiumUntil);
  const expires = formatDate(premiumUntil);

  return (
    <View style={styles.card as ViewStyle}>
      <View style={styles.content as ViewStyle}>
        <View style={styles.badge as ViewStyle}>
          <MaterialIcons name="check-circle" size={14} color={theme.colors.white} />
          <Text style={styles.badgeText as TextStyle}>Premium activo</Text>
        </View>
        <Text style={styles.daysText as TextStyle}>
          Te quedan {days} {days === 1 ? 'día' : 'días'} de Premium
        </Text>
        <Text style={styles.expiresText as TextStyle}>Tu suscripción vence el {expires}</Text>
        <Button
          title="Extender premium"
          onPress={onUpgradePress}
          size="md"
          fullWidth
          style={{ marginTop: theme.spacing.sm }}
        />
      </View>
    </View>
  );
}
