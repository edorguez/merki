import { View, Text, Animated } from 'react-native';
import { useAppTheme } from '../../styles/theme';
import { createHomeStyles } from '../../styles/homeStyles';
import { Input } from '../shared/Input';
import { SupermarketCarousel } from './SupermarketCarousel';
import type { SupermarketOption } from '../../services/supermarketService';

interface SupermarketSelectorProps {
  supermarkets: SupermarketOption[];
  customMarketName: string;
  fieldErrors: Record<string, string>;
  renderCustomMarket: boolean;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  onSupermarketSelect: (id: string) => void;
  onCustomMarketChange: (text: string) => void;
}

export function SupermarketSelector({
  supermarkets,
  customMarketName,
  fieldErrors,
  renderCustomMarket,
  fadeAnim,
  slideAnim,
  onSupermarketSelect,
  onCustomMarketChange,
}: SupermarketSelectorProps) {
  const theme = useAppTheme();
  const styles = createHomeStyles(theme);

  return (
    <View>
      <Text style={styles.supermarketLabel}>Supermercado</Text>
      <SupermarketCarousel supermarkets={supermarkets} onSelect={onSupermarketSelect} />

      {renderCustomMarket ? (
        <Animated.View
          style={[
            styles.customMarketContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View>
            <Input
              label="Nombre del Supermercado"
              placeholder="Ej. Plan Suarez"
              value={customMarketName}
              onChangeText={onCustomMarketChange}
              error={!!fieldErrors.customMarketName}
              errorText={fieldErrors.customMarketName || undefined}
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
