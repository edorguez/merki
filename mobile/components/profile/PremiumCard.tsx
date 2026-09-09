import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { createCardStyles } from '../../styles/cards';
import { Button } from '../Button';
import { MaterialIcons } from '@expo/vector-icons';

interface PremiumCardProps {
  onUpgradePress?: () => void;
}

interface PremiumFeature {
  variant: 'check' | 'chip';
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

const stylesheet = StyleSheet.create(theme => {
  const cardStyles = createCardStyles(theme);
  return {
    card: {
      ...cardStyles.base,
      padding: theme.spacing.xl,
      marginVertical: theme.spacing.lg,
    },
    content: {
      gap: theme.spacing.md,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.sunburstYellow,
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.midnight,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    headline: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.charcoalPrimary,
      letterSpacing: theme.typography.letterSpacing.lg,
      lineHeight: 26,
    },
    subtext: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.graphite,
      letterSpacing: theme.typography.letterSpacing.md,
      lineHeight: 22,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    featureText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.graphite,
      letterSpacing: theme.typography.letterSpacing.sm,
      flexShrink: 1,
    },
    featureChip: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.sunburstYellow,
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
});

const premiumFeatures: PremiumFeature[] = [
  { variant: 'check', icon: 'check-circle', label: 'Sin publicidad en la app' },
  { variant: 'chip', icon: 'stars', label: 'Acceso a futuras funciones' },
];

export function PremiumCard({ onUpgradePress }: PremiumCardProps) {
  const theme = useAppTheme();
  const styles = stylesheet(theme);

  return (
    <View style={styles.card as ViewStyle}>
      <View style={styles.content as ViewStyle}>
        <View style={styles.badge as ViewStyle}>
          <MaterialIcons name="star" size={14} color={theme.colors.midnight} />
          <Text style={styles.badgeText as TextStyle}>Premium</Text>
        </View>

        <Text style={styles.headline as TextStyle}>¿Cansado de ver publicidad?</Text>
        <Text style={styles.subtext as TextStyle}>
          Concéntrate en tu lista, no en la publicidad.
        </Text>

        {premiumFeatures.map((feature, index) => (
          <View key={index} style={styles.feature as ViewStyle}>
            {feature.variant === 'check' ? (
              <MaterialIcons name={feature.icon} size={20} color={theme.colors.meadowGreen} />
            ) : (
              <View style={styles.featureChip as ViewStyle}>
                <MaterialIcons name={feature.icon} size={14} color={theme.colors.white} />
              </View>
            )}
            <Text style={styles.featureText as TextStyle}>{feature.label}</Text>
          </View>
        ))}

        <Button
          title="Hazte Premium"
          onPress={onUpgradePress}
          size="md"
          fullWidth
          style={{ marginTop: theme.spacing.sm }}
        />
      </View>
    </View>
  );
}
