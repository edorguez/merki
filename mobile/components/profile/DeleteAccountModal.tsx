import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { StyleSheet } from '../../styles/createStyleSheet';
import { useAppTheme } from '../../styles/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '../shared/Input';

const CONFIRM_PHRASE = 'eliminar';

interface DeleteAccountModalProps {
  isVisible: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const stylesheet = StyleSheet.create(theme => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.error,
  },
  body: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  warningList: {
    gap: theme.spacing.xs,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  cancelText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.onSurface,
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.onPrimary,
  },
}));

const WARNINGS = [
  'Tu cuenta y todos tus datos personales se eliminarán de forma permanente.',
  // Premium is not part of the iOS app (no In-App Purchase).
  ...(Platform.OS === 'ios'
    ? ['Perderás tu historial y todos tus datos.']
    : ['Perderás tu suscripción Premium y su historial.']),
  'Esta acción es irreversible y no podrás recuperar tu cuenta.',
];

export function DeleteAccountModal({
  isVisible,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const theme = useAppTheme();
  const styles = stylesheet(theme);
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    if (isVisible) {
      setPhrase('');
    }
  }, [isVisible]);

  const confirmed = phrase.trim() === CONFIRM_PHRASE;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop as ViewStyle}>
        <View style={styles.card as ViewStyle}>
          <View style={styles.header as ViewStyle}>
            <MaterialIcons name="warning" size={24} color={theme.colors.error} />
            <Text style={styles.title as TextStyle}>Eliminar cuenta</Text>
          </View>

          <Text style={styles.body as TextStyle}>
            Tu cuenta será eliminada de forma permanente e irreversible. Se eliminará toda tu
            información y dejarás de tener acceso a tu cuenta. Esta acción no se puede deshacer.
          </Text>

          <View style={styles.warningList as ViewStyle}>
            {WARNINGS.map(warning => (
              <View key={warning} style={styles.warningItem as ViewStyle}>
                <Text style={styles.warningText as TextStyle}>{`• ${warning}`}</Text>
              </View>
            ))}
          </View>

          <Input
            label={'Escribe "eliminar" para confirmar'}
            value={phrase}
            onChangeText={setPhrase}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDeleting}
          />

          <View style={styles.actions as ViewStyle}>
            <Pressable
              style={({ pressed }) => [
                styles.button as ViewStyle,
                styles.cancelButton as ViewStyle,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelText as TextStyle}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button as ViewStyle,
                styles.confirmButton as ViewStyle,
                !confirmed && (styles.confirmButtonDisabled as ViewStyle),
                pressed && confirmed && { opacity: 0.85 },
              ]}
              onPress={onConfirm}
              disabled={!confirmed || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.confirmText as TextStyle}>Eliminar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
