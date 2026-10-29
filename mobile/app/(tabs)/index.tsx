import { View, ScrollView, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { createHomeStyles } from '../../styles/homeStyles';
import { CreateCartSection } from '../../components/home/CreateCartSection';
import { BCVRateCard } from '../../components/home/BCVRateCard';
import type { BCVRateRef } from '../../store/bcvStore';
import {
  LatestCartsSection,
  type LatestCartsSectionRef,
} from '../../components/home/LatestCartsSection';
import { TipCard } from '../../components/home/TipCard';
import { Toast } from '../../components/shared/Toast';
import { FadeIn } from '../../components/shared/FadeIn';
import { AdMrec } from '../../components/ads/AdMrec';
import { useAppTheme } from '../../styles/theme';
import { useAuth } from '../../store/authStore';
import { savingsTips } from '../../utils/tips';
import { MERKI_LOGO } from '../../constants/images';

export default function HomeTab() {
  const theme = useAppTheme();
  const styles = createHomeStyles(theme);
  const { user } = useAuth();
  const router = useRouter();
  const cartsRef = useRef<LatestCartsSectionRef>(null);
  const bcvRef = useRef<BCVRateRef>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  useFocusEffect(
    useCallback(() => {
      setCurrentTipIndex(Math.floor(Math.random() * savingsTips.length));
    }, [])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([cartsRef.current?.refresh(), bcvRef.current?.refresh()]);
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleCartCreated = useCallback(
    (id: string) => {
      router.push({ pathname: '/(cart)/[id]', params: { id } });
      cartsRef.current?.refresh();
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <Toast message={toast} onDismiss={dismissToast} />
      <View style={styles.header}>
        <Image source={MERKI_LOGO} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <FadeIn delay={0}>
          <CreateCartSection userId={user?.id} onCartCreated={handleCartCreated} />
        </FadeIn>

        <FadeIn delay={90}>
          <BCVRateCard ref={bcvRef} />
        </FadeIn>

        <FadeIn delay={135}>
          <AdMrec />
        </FadeIn>

        <FadeIn delay={180}>
          <LatestCartsSection ref={cartsRef} userId={user?.id} />
        </FadeIn>

        <FadeIn delay={270} key={currentTipIndex}>
          <View style={styles.section}>
            <TipCard title="Tip de Ahorro" text={savingsTips[currentTipIndex]} />
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}
