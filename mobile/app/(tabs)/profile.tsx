import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { profileStyles } from '../../styles/profileStyles';
import { Avatar } from '../../components/profile/Avatar';
import { PremiumCard } from '../../components/profile/PremiumCard';
import { PremiumActiveCard } from '../../components/profile/PremiumActiveCard';
import { AnonymousPromptCard } from '../../components/profile/AnonymousPromptCard';
import { DeleteAccountModal } from '../../components/profile/DeleteAccountModal';
import { Toast } from '../../components/shared/Toast';
import { FadeIn } from '../../components/shared/FadeIn';
import { useAppTheme } from '../../styles/theme';
import { useAuth } from '../../store/authStore';
import { getPaymentsByUser, PENDING_STATUS_ID } from '../../services/paymentService';
import { useState, useEffect } from 'react';
import * as Network from 'expo-network';
import { MERKI_LOGO } from '../../constants/images';
import { AdBanner } from '../../components/ads/AdBanner';

export default function ProfileTab() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();
  const isPremium = user?.isPremium || false;
  const styles = profileStyles(theme);
  const [isOnline, setIsOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    Network.getNetworkStateAsync().then(state => {
      setIsOnline(state.isConnected ?? true);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(onboarding)/step-1');
  };

  const openDeleteModal = () => {
    if (!isOnline) {
      setToast('Se necesita conexión a internet para eliminar tu cuenta');
      return;
    }
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleteModalVisible(false);
      router.replace('/(onboarding)/step-1');
    } catch {
      setIsDeleteModalVisible(false);
      setToast('No se pudo eliminar tu cuenta. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpgrade = async () => {
    if (Platform.OS === 'ios') {
      setToast('La compra de Premium estará disponible próximamente en iOS');
      return;
    }
    if (!isOnline) {
      setToast('Se necesita conexión a internet para gestionar tu suscripción');
      return;
    }
    try {
      const pendingPayments = await getPaymentsByUser(user!.userId!, PENDING_STATUS_ID);
      if (pendingPayments.length > 0) {
        router.push('/(premium)/payment-pending');
      } else {
        router.push('/(premium)/plans');
      }
    } catch {
      router.push('/(premium)/plans');
    }
  };

  const handleCreateAccount = () => {
    router.push('/(onboarding)/login-choice');
  };

  return (
    <View style={styles.container as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <Image source={MERKI_LOGO} style={styles.headerLogo as ImageStyle} resizeMode="contain" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content as ViewStyle, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <>
          <FadeIn delay={0}>
            <View style={styles.profileHeader as ViewStyle}>
              <Avatar uri={user?.image || undefined} />

              {!user?.isAnonymous ? (
                <Text style={styles.profileName as TextStyle}>{user?.name || 'Usuario'}</Text>
              ) : (
                <Text style={styles.profileName as TextStyle}>Usuario Anónimo</Text>
              )}

              {!user?.isAnonymous && (
                <Text style={styles.profileEmail as TextStyle}>{user?.email || ''}</Text>
              )}
            </View>
          </FadeIn>

          <FadeIn delay={120} distance={12}>
            {user?.isAnonymous ? (
              <AnonymousPromptCard onLoginPress={handleCreateAccount} />
            ) : isPremium ? (
              <PremiumActiveCard premiumUntil={user?.premiumUntil} onUpgradePress={handleUpgrade} />
            ) : (
              <PremiumCard onUpgradePress={handleUpgrade} />
            )}
          </FadeIn>

          <View>
            <AdBanner />
          </View>

          {!user?.isAnonymous && (
            <FadeIn delay={220} distance={12}>
              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton as ViewStyle,
                  pressed && (styles.logoutButtonPressed as ViewStyle),
                ]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText as TextStyle}>Cerrar Sesión</Text>
              </Pressable>
            </FadeIn>
          )}

          {user && !user.isAnonymous && (
            <FadeIn delay={300} distance={8}>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteAccountLink as ViewStyle,
                  pressed && (styles.deleteAccountLinkPressed as ViewStyle),
                ]}
                onPress={openDeleteModal}
              >
                <MaterialIcons name="delete-outline" size={14} color={theme.colors.outline} />
                <Text style={styles.deleteAccountText as TextStyle}>Eliminar cuenta</Text>
              </Pressable>
            </FadeIn>
          )}
        </>

        <Text style={styles.versionText as TextStyle}>
          Merki v{Constants.expoConfig?.version || '2.4.0'}
        </Text>
      </ScrollView>
      <DeleteAccountModal
        isVisible={isDeleteModalVisible}
        isDeleting={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalVisible(false);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
