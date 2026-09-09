import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useAppTheme } from '../../styles/theme';
import { Button } from '../Button';
import { createProductScanResultModalStyles } from '../../styles/productScanResultModalStyles';
import { MaterialIcons } from '@expo/vector-icons';

interface ProductScanResultModalProps {
  isVisible: boolean;
  onClose: () => void;
  productName: string;
  priceBs: number;
  priceUsd: number;
  imageUri: string;
  imageAspectRatio: number;
  onAddToCart: (quantity: number) => void;
}

export function ProductScanResultModal({
  isVisible,
  onClose,
  productName,
  priceBs,
  priceUsd,
  imageUri,
  imageAspectRatio,
  onAddToCart,
}: ProductScanResultModalProps) {
  const theme = useAppTheme();
  const styles = createProductScanResultModalStyles(theme);

  const [quantity, setQuantity] = useState(1);

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const formatPriceBs = (price: number) => {
    return `Bs. ${price.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPriceUsd = (price: number) => {
    return `$${price.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (isVisible) {
      setQuantity(1);
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

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalContainer as ViewStyle} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <Pressable style={styles.modalContent as ViewStyle} onPress={e => e.stopPropagation()}>
            <View style={styles.headerRow as ViewStyle}>
              <View style={styles.titleContainer as ViewStyle}>
                <Text style={styles.subtitle as TextStyle}>Producto Detectado</Text>
                <Text style={styles.productName as TextStyle}>{productName}</Text>
              </View>
              <View style={styles.verifiedBadge as ViewStyle}>
                <MaterialIcons name="verified" size={24} color={theme.colors.meadowGreen} />
              </View>
            </View>

            <View style={styles.captureImageWrap as ViewStyle}>
              <Image
                source={{ uri: imageUri }}
                style={[styles.captureImage as ImageStyle, { aspectRatio: imageAspectRatio }]}
                contentFit="cover"
                transition={150}
                cachePolicy="none"
              />
            </View>

            <View style={styles.priceRow as ViewStyle}>
              <View style={styles.priceColumn as ViewStyle}>
                <Text style={styles.priceLabel as TextStyle}>Bolívares</Text>
                <Text style={styles.priceBs as TextStyle}>{formatPriceBs(priceBs)}</Text>
              </View>
              <View style={styles.divider as ViewStyle} />
              <View style={styles.priceColumn as ViewStyle}>
                <Text style={styles.priceLabel as TextStyle}>Dólares</Text>
                <Text style={styles.priceUsd as TextStyle}>{formatPriceUsd(priceUsd)}</Text>
              </View>
            </View>

            <View style={styles.quantitySection as ViewStyle}>
              <Text style={styles.priceLabel as TextStyle}>Cantidad</Text>
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

            <View style={styles.actionRow as ViewStyle}>
              <Button
                title="Reintentar"
                onPress={onClose}
                variant="neutral"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title="Añadir"
                onPress={() => {
                  onAddToCart(quantity);
                  onClose();
                }}
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
