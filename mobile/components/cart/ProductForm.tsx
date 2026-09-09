import {
  View,
  Text,
  TextInput,
  Pressable,
  type ViewStyle,
  type TextStyle,
  LayoutAnimation,
} from 'react-native';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppTheme } from '../../styles/theme';
import { AmountInput } from '../shared/AmountInput';
import { Input } from '../shared/Input';
import { Button } from '../Button';
import { MaterialIcons } from '@expo/vector-icons';
import { createProductFormStyles } from '../../styles/productFormStyles';
import { useBCV } from '../../store/bcvStore';

interface ProductFormProps {
  onSubmit: (product: {
    name: string;
    priceBs: number;
    priceUsd: number;
    priceBcv: number;
    quantity: number;
    supermarket: string;
  }) => void;
  supermarket: string;
  initialData?: {
    name: string;
    priceBs: number;
    priceUsd: number;
    quantity: number;
    supermarket: string;
  };
}

export function ProductForm({ onSubmit, supermarket, initialData }: ProductFormProps) {
  const theme = useAppTheme();
  const { rate: exchangeRate } = useBCV();
  const EXCHANGE_RATE = exchangeRate?.usdRate ?? 0;
  const styles = useMemo(() => createProductFormStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [bsPrice, setBsPrice] = useState<number | null>(null);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [topCurrency, setTopCurrency] = useState<'BS' | 'USD'>('BS');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bsEditable = topCurrency === 'BS';

  const bsInputRef = useRef<TextInput>(null);
  const usdInputRef = useRef<TextInput>(null);
  const prevTopCurrency = useRef(topCurrency);

  useEffect(() => {
    if (prevTopCurrency.current !== topCurrency) {
      const timer = setTimeout(() => {
        if (topCurrency === 'BS') {
          bsInputRef.current?.focus();
        } else {
          usdInputRef.current?.focus();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
    prevTopCurrency.current = topCurrency;
  }, [topCurrency]);

  // Initialize form with initialData
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setQuantity(initialData.quantity);
      setBsPrice(initialData.priceBs);
      setUsdPrice(initialData.priceUsd);
      setTopCurrency('BS');
      setErrors({});
    }
  }, [initialData]);

  const clearFieldError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleBsPriceChange = useCallback(
    (value: number | null) => {
      setBsPrice(value);
      setUsdPrice(value != null && EXCHANGE_RATE > 0 ? value / EXCHANGE_RATE : null);
      clearFieldError('bsPrice');
    },
    [EXCHANGE_RATE]
  );

  const handleUsdPriceChange = useCallback(
    (value: number | null) => {
      setUsdPrice(value);
      setBsPrice(value != null && EXCHANGE_RATE > 0 ? value * EXCHANGE_RATE : null);
      clearFieldError('usdPrice');
    },
    [EXCHANGE_RATE]
  );

  const toggleEditableCurrency = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTopCurrency(prev => (prev === 'BS' ? 'USD' : 'BS'));
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!exchangeRate) {
      newErrors.price = 'Tasa de cambio no disponible. Verifica tu conexión.';
      setErrors(newErrors);
      return false;
    }

    if (!name.trim()) {
      newErrors.name = 'El nombre del producto es requerido';
    } else if (name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    const bsValue = bsPrice ?? 0;
    const usdValue = usdPrice ?? 0;

    if (bsValue <= 0 && usdValue <= 0) {
      newErrors.price = 'Ingresa un precio en Bs. o USD';
    } else if (bsEditable && bsValue <= 0) {
      newErrors.bsPrice = 'Ingresa un precio válido mayor a 0';
    } else if (!bsEditable && usdValue <= 0) {
      newErrors.usdPrice = 'Ingresa un precio válido mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const bsValue = bsPrice ?? 0;
    const usdValue = usdPrice ?? 0;

    let finalBs = bsValue;
    let finalUsd = usdValue;

    if (finalBs <= 0 && finalUsd > 0) {
      finalBs = finalUsd * EXCHANGE_RATE;
    } else if (finalUsd <= 0 && finalBs > 0) {
      finalUsd = finalBs / EXCHANGE_RATE;
    }

    onSubmit({
      name: name.trim(),
      priceBs: finalBs,
      priceUsd: finalUsd,
      priceBcv: exchangeRate?.usdRate ?? 0,
      quantity,
      supermarket,
    });

    // Reset form
    setName('');
    setQuantity(1);
    setBsPrice(null);
    setUsdPrice(null);
    setTopCurrency('BS');
    setErrors({});
  };

  const getSyncIconColor = () => {
    return bsEditable ? theme.colors.primary : theme.colors.primary;
  };

  const buttonTitle = initialData ? 'Editar Producto' : 'Agregar Producto';

  return (
    <View style={styles.container as ViewStyle}>
      {/* Illustration Row */}
      <View style={styles.illustrationRow as ViewStyle}>
        <View style={styles.iconContainer as ViewStyle}>
          <MaterialIcons
            name="shopping-bag"
            size={theme.iconSize.xxl}
            color={theme.colors.secondary}
            style={styles.icon as TextStyle}
          />
        </View>
        <View>
          <Text style={styles.title as TextStyle}>Detalles del Producto</Text>
          <Text style={styles.subtitle as TextStyle}>Ingresa la información para tu carrito</Text>
        </View>
      </View>

      {/* Product Name Input */}
      <View style={styles.inputGroup as ViewStyle}>
        <Input
          label="Nombre del Producto"
          placeholder="Ej. Harina Pan"
          value={name}
          onChangeText={text => {
            setName(text);
            setErrors(prev => ({ ...prev, name: '' }));
          }}
          maxLength={100}
          error={!!errors.name}
          errorText={errors.name || undefined}
        />
      </View>

      {/* Quantity Section */}
      <View style={styles.inputGroup as ViewStyle}>
        <Text style={styles.label as TextStyle}>Cantidad</Text>
        <View style={styles.quantitySection as ViewStyle}>
          <View style={styles.quantityControls as ViewStyle}>
            <Pressable
              style={({ pressed }) => [
                styles.quantityButton as ViewStyle,
                { backgroundColor: theme.colors.surfaceContainerHigh },
                pressed && (styles.quantityButtonPressedDecrement as ViewStyle),
              ]}
              onPress={decrementQuantity}
            >
              <MaterialIcons name="remove" size={theme.iconSize.lg} color={theme.colors.primary} />
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
              <MaterialIcons name="add" size={theme.iconSize.lg} color={theme.colors.white} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Currency Inputs */}
      <View>
        {topCurrency === 'BS' ? (
          <>
            {/* BS Input (Top) */}
            <View style={styles.priceInputContainer as ViewStyle}>
              <Text style={styles.label as TextStyle}>Precio en Bolívares (Bs)</Text>
              <View style={styles.priceInputWrapper as ViewStyle}>
                <AmountInput
                  ref={bsInputRef}
                  value={bsPrice}
                  onValueChange={handleBsPriceChange}
                  placeholder="0,00"
                />
                <Text style={styles.currencySymbol as TextStyle}>Bs.</Text>
              </View>
              {errors.bsPrice && (
                <Text style={styles.errorText as TextStyle}>{errors.bsPrice}</Text>
              )}
            </View>

            {/* Sync Icon */}
            <View style={styles.syncContainer as ViewStyle}>
              <Pressable
                style={({ pressed }) => [
                  styles.syncButton as ViewStyle,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={toggleEditableCurrency}
              >
                <MaterialIcons
                  name="swap-vert"
                  size={theme.iconSize.md}
                  color={getSyncIconColor()}
                  style={{ transform: [{ rotate: '0deg' }] }}
                />
              </Pressable>
            </View>

            {/* USD Input (Bottom) */}
            <View style={styles.priceInputContainer as ViewStyle}>
              <Text style={styles.label as TextStyle}>Precio en Dólares ($)</Text>
              <View style={styles.priceInputWrapper as ViewStyle}>
                <AmountInput
                  value={usdPrice}
                  onValueChange={() => {}}
                  placeholder="0,00"
                  editable={false}
                />
                <Text style={styles.currencySymbol as TextStyle}>$</Text>
              </View>
              {errors.usdPrice && (
                <Text style={styles.errorText as TextStyle}>{errors.usdPrice}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* USD Input (Top) */}
            <View style={styles.priceInputContainer as ViewStyle}>
              <Text style={styles.label as TextStyle}>Precio en Dólares ($)</Text>
              <View style={styles.priceInputWrapper as ViewStyle}>
                <AmountInput
                  ref={usdInputRef}
                  value={usdPrice}
                  onValueChange={handleUsdPriceChange}
                  placeholder="0,00"
                />
                <Text style={styles.currencySymbol as TextStyle}>$</Text>
              </View>
              {errors.usdPrice && (
                <Text style={styles.errorText as TextStyle}>{errors.usdPrice}</Text>
              )}
            </View>

            {/* Sync Icon */}
            <View style={styles.syncContainer as ViewStyle}>
              <Pressable
                style={({ pressed }) => [
                  styles.syncButton as ViewStyle,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={toggleEditableCurrency}
              >
                <MaterialIcons
                  name="swap-vert"
                  size={theme.iconSize.md}
                  color={getSyncIconColor()}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Pressable>
            </View>

            {/* BS Input (Bottom) */}
            <View style={styles.priceInputContainer as ViewStyle}>
              <Text style={styles.label as TextStyle}>Precio en Bolívares (Bs)</Text>
              <View style={styles.priceInputWrapper as ViewStyle}>
                <AmountInput
                  value={bsPrice}
                  onValueChange={() => {}}
                  placeholder="0,00"
                  editable={false}
                />
                <Text style={styles.currencySymbol as TextStyle}>Bs.</Text>
              </View>
              {errors.bsPrice && (
                <Text style={styles.errorText as TextStyle}>{errors.bsPrice}</Text>
              )}
            </View>
          </>
        )}

        {errors.price && <Text style={styles.errorText as TextStyle}>{errors.price}</Text>}
      </View>

      {/* Action Button */}
      <View style={styles.buttonContainer as ViewStyle}>
        <Button title={buttonTitle} onPress={handleSubmit} variant="primary" size="lg" fullWidth />
      </View>

      <View style={{ height: 120 }} />
    </View>
  );
}
