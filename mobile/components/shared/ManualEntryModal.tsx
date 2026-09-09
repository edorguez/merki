import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Keyboard,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useAppTheme } from '../../styles/theme';
import { Button } from '../Button';
import { Input } from './Input';
import { createManualEntryModalStyles } from '../../styles/manualEntryModalStyles';
import { AmountInput } from './AmountInput';
import { useBCV } from '../../store/bcvStore';
import { MaterialIcons } from '@expo/vector-icons';

interface ManualEntryModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    priceBs: number,
    priceUsd: number,
    priceBcv: number,
    quantity: number
  ) => void;
}

export function ManualEntryModal({ isVisible, onClose, onSubmit }: ManualEntryModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createManualEntryModalStyles(theme), [theme]);
  const { rate: exchangeRate } = useBCV();
  const EXCHANGE_RATE = exchangeRate?.usdRate ?? 55;

  const [name, setName] = useState('');
  const [topCurrency, setTopCurrency] = useState<'BS' | 'USD'>('BS');
  const [bsAmount, setBsAmount] = useState<number | null>(null);
  const [usdAmount, setUsdAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const isBsEditable = topCurrency === 'BS';

  const handleBsChange = useCallback(
    (value: number | null) => {
      setBsAmount(value);
      setUsdAmount(value != null && value > 0 ? value / EXCHANGE_RATE : null);
    },
    [EXCHANGE_RATE]
  );

  const handleUsdChange = useCallback(
    (value: number | null) => {
      setUsdAmount(value);
      setBsAmount(value != null && value > 0 ? value * EXCHANGE_RATE : null);
    },
    [EXCHANGE_RATE]
  );

  const handleSubmit = () => {
    setError(null);

    if (!name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    if (!exchangeRate) {
      setError('Tasa de cambio no disponible. Verifica tu conexión.');
      return;
    }

    const priceBs = isBsEditable ? (bsAmount ?? 0) : (usdAmount ?? 0) * EXCHANGE_RATE;
    const priceUsd = isBsEditable ? (bsAmount ?? 0) / EXCHANGE_RATE : (usdAmount ?? 0);

    if (priceBs <= 0 && priceUsd <= 0) {
      setError('Ingresa un precio válido');
      return;
    }

    if (priceBs < 0 || priceUsd < 0) {
      setError('Precio inválido');
      return;
    }

    onSubmit(name.trim().slice(0, 100), priceBs, priceUsd, exchangeRate.usdRate, quantity);
  };

  const slideAnim = useRef(new Animated.Value(500)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const translateY = Animated.add(slideAnim, keyboardOffset);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  useEffect(() => {
    if (isVisible) {
      setName('');
      setTopCurrency('BS');
      setBsAmount(null);
      setUsdAmount(null);
      setError(null);
      setQuantity(1);
    }
  }, [isVisible]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      Animated.timing(keyboardOffset, {
        toValue: -e.endCoordinates.height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardOffset]);

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalContainer as ViewStyle} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          <Pressable style={styles.modalContent as ViewStyle} onPress={e => e.stopPropagation()}>
            <Text style={styles.headerTitle as TextStyle}>Ingreso Manual</Text>

            <View style={styles.inputGroup as ViewStyle}>
              <Input
                label="Nombre del Producto"
                value={name}
                onChangeText={setName}
                placeholder="Ej: Harina Pan"
                maxLength={100}
              />
            </View>

            <View style={styles.quantitySection as ViewStyle}>
              <Text style={styles.label as TextStyle}>Cantidad</Text>
              <View style={styles.quantityControls as ViewStyle}>
                <Pressable
                  style={({ pressed }) => [
                    styles.quantityButton as ViewStyle,
                    { backgroundColor: theme.colors.surfaceContainerHigh },
                    pressed && (styles.quantityButtonPressedDecrement as ViewStyle),
                  ]}
                  onPress={decrementQuantity}
                >
                  <MaterialIcons name="remove" size={24} color={theme.colors.primary} />
                </Pressable>
                <Text style={styles.quantityNumber as TextStyle}>{quantity}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.quantityButton as ViewStyle,
                    { backgroundColor: theme.colors.primary },
                    pressed && (styles.quantityButtonPressedIncrement as ViewStyle),
                  ]}
                  onPress={incrementQuantity}
                >
                  <MaterialIcons name="add" size={24} color={theme.colors.white} />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup as ViewStyle}>
              <Text style={styles.label as TextStyle}>Precio</Text>
              <View style={styles.priceRow as ViewStyle}>
                <View style={styles.priceInputWrapper as ViewStyle}>
                  <AmountInput
                    value={isBsEditable ? bsAmount : usdAmount}
                    onValueChange={isBsEditable ? handleBsChange : handleUsdChange}
                    placeholder={isBsEditable ? 'Bs. 0,00' : '$ 0,00'}
                  />
                </View>
                <Pressable
                  style={[
                    styles.currencyToggle as ViewStyle,
                    styles.currencyToggleActive as ViewStyle,
                  ]}
                  onPress={() => setTopCurrency(current => (current === 'BS' ? 'USD' : 'BS'))}
                >
                  <Text
                    style={[
                      styles.currencyToggleText as TextStyle,
                      styles.currencyToggleTextActive as TextStyle,
                    ]}
                  >
                    {topCurrency}
                  </Text>
                </Pressable>
              </View>
            </View>
            {error && <Text style={styles.errorText as TextStyle}>{error}</Text>}

            <View style={styles.actionRow as ViewStyle}>
              <Button
                title="Cancelar"
                onPress={onClose}
                variant="neutral"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title="Añadir"
                onPress={handleSubmit}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                leadingIcon={
                  <MaterialIcons name="add-circle" size={20} color={theme.colors.onPrimary} />
                }
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
