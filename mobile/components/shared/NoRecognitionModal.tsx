import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { Button } from '../Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);

interface NoRecognitionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onManualEntry: () => void;
}

const stylesheet = StyleSheet.create(theme => {
  return {
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      marginBottom: theme.spacing.xxl,
    },
    modalContent: {
      width: MODAL_WIDTH,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.stoneSurface,
      gap: theme.spacing.md,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.emberOrange,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    message: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.regular,
      color: theme.colors.onSurface,
      lineHeight: 22,
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.xxs,
      marginTop: theme.spacing.sm,
    },
  };
});

export function NoRecognitionModal({ isVisible, onClose, onManualEntry }: NoRecognitionModalProps) {
  const theme = useAppTheme();
  const styles = stylesheet(theme);

  const slideAnim = useRef(new Animated.Value(500)).current;

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

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalContainer as ViewStyle} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <Pressable style={styles.modalContent as ViewStyle} onPress={e => e.stopPropagation()}>
            <Text style={styles.headerTitle as TextStyle}>Producto no detectado</Text>

            <Text style={styles.message as TextStyle}>
              No se pudo reconocer el producto. Intenta tomar una foto más clara o ingresa los datos
              manualmente.
            </Text>

            <View style={styles.actionRow as ViewStyle}>
              <Button
                title="Reintentar"
                onPress={onClose}
                variant="neutral"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title="Ingreso manual"
                onPress={() => {
                  onClose();
                  onManualEntry();
                }}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
