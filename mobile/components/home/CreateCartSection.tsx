import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Animated, LayoutAnimation, type TextStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { BudgetFields } from './BudgetFields';
import { SupermarketSelector } from './SupermarketSelector';
import { createHomeStyles } from '../../styles/homeStyles';
import { useAppTheme } from '../../styles/theme';
import { Button } from '../Button';
import { Skeleton } from '../shared/Skeleton';
import { useCartStore } from '../../store/cartStore';
import { getAllSupermarkets } from '../../services/supermarketService';
import { createCart } from '../../services/cartService';

import { validateName, sanitizeName } from '../../utils/validation';
import { useBCV } from '../../store/bcvStore';
import type { SupermarketOption } from '../../services/supermarketService';

interface CreateCartSectionProps {
  userId?: string;
  onCartCreated: (cartId: string) => void;
}

export function CreateCartSection({ userId, onCartCreated }: CreateCartSectionProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createHomeStyles(theme), [theme]);

  const [supermarkets, setSupermarkets] = useState<SupermarketOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetBs, setBudgetBs] = useState<number | null>(null);
  const [budgetUsd, setBudgetUsd] = useState<number | null>(null);
  const [topCurrency, setTopCurrency] = useState<'BS' | 'USD'>('BS');
  const { rate } = useBCV();
  const exchangeRate = rate?.usdRate ?? 0;
  const [customMarketName, setCustomMarketName] = useState('');
  const [showCustomMarket, setShowCustomMarket] = useState(false);
  const [renderCustomMarket, setRenderCustomMarket] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withBudget, setWithBudget] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const toggleAnim = useRef(new Animated.Value(1)).current;
  const trackAnim = useRef(new Animated.Value(1)).current;

  const resetOnFocusRef = useRef(false);

  const resetForm = useCallback(() => {
    setWithBudget(true);
    setBudgetBs(null);
    setBudgetUsd(null);
    setCustomMarketName('');
    setShowCustomMarket(false);
    setFieldErrors({});
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (resetOnFocusRef.current) {
        resetOnFocusRef.current = false;
        resetForm();
      }
    }, [resetForm])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(toggleAnim, {
        toValue: withBudget ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(trackAnim, {
        toValue: withBudget ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [withBudget, toggleAnim, trackAnim]);

  const handleToggleBudget = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWithBudget(prev => !prev);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getAllSupermarkets(userId);
        if (!mounted) return;
        if (data.length > 0) {
          data[0].selected = true;
        }
        setSupermarkets(data);
      } catch {
        const localData = await getAllSupermarkets(userId);
        if (!mounted) return;
        if (localData.length > 0) {
          localData[0].selected = true;
        }
        setSupermarkets(localData);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const bsEditable = topCurrency === 'BS';

  useEffect(() => {
    if (showCustomMarket) {
      setRenderCustomMarket(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setRenderCustomMarket(false);
    }
  }, [showCustomMarket, fadeAnim, slideAnim]);

  const { addCart, setActiveCart } = useCartStore();

  const handleSupermarketSelect = (id: string) => {
    setSupermarkets(prev =>
      prev.map(s => ({
        ...s,
        selected: s.id === id,
      }))
    );
    if (id === 'other') {
      setShowCustomMarket(true);
    } else {
      setShowCustomMarket(false);
    }
  };

  const handleToggleCurrency = () => {
    setTopCurrency(prev => (prev === 'BS' ? 'USD' : 'BS'));
  };

  const handleBsBudgetChange = useCallback(
    (value: number | null) => {
      setBudgetBs(value);
      setBudgetUsd(value != null && exchangeRate > 0 ? value / exchangeRate : null);
      setFieldErrors(prev => {
        if (!prev.budgetBs) return prev;
        const next = { ...prev };
        delete next.budgetBs;
        return next;
      });
    },
    [exchangeRate]
  );

  const handleUsdBudgetChange = useCallback(
    (value: number | null) => {
      setBudgetUsd(value);
      setBudgetBs(value != null && exchangeRate > 0 ? value * exchangeRate : null);
      setFieldErrors(prev => {
        if (!prev.budgetUsd) return prev;
        const next = { ...prev };
        delete next.budgetUsd;
        return next;
      });
    },
    [exchangeRate]
  );

  const handleCustomMarketChange = (text: string) => {
    setCustomMarketName(text);
    setFieldErrors(prev => {
      if (!prev.customMarketName) return prev;
      const next = { ...prev };
      delete next.customMarketName;
      return next;
    });
  };

  const handleStartList = async () => {
    const errors: Record<string, string> = {};

    const selectedSupermarket = supermarkets.find(s => s.selected);
    if (!selectedSupermarket) {
      errors.supermarket = 'Selecciona un supermercado';
    }

    let finalName: string | undefined;
    let finalSupermarketId: string | undefined;
    if (selectedSupermarket?.id === 'other') {
      const nameErr = validateName(customMarketName);
      if (nameErr) {
        errors.customMarketName = nameErr;
      } else {
        finalName = sanitizeName(customMarketName);
      }
    } else if (selectedSupermarket) {
      finalSupermarketId = selectedSupermarket.id;
      finalName = selectedSupermarket.name;
    }

    const hasBudget = withBudget;
    const bsAmount = budgetBs ?? 0;
    const usdAmount = budgetUsd ?? 0;

    if (hasBudget) {
      if (bsEditable) {
        if (bsAmount <= 0) {
          errors.budgetBs = 'Ingresa un presupuesto en Bolívares';
        }
      } else {
        if (usdAmount <= 0) {
          errors.budgetUsd = 'Ingresa un presupuesto en USD';
        }
      }

      if (exchangeRate <= 0) {
        errors.budgetBs = 'Tasa BCV no disponible, intenta de nuevo';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    let finalBs = bsAmount;
    let finalUsd = usdAmount;

    if (hasBudget) {
      if (bsEditable && finalBs > 0 && finalUsd <= 0) {
        finalUsd = finalBs / exchangeRate;
      } else if (!bsEditable && finalUsd > 0 && finalBs <= 0) {
        finalBs = finalUsd * exchangeRate;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await createCart(
        {
          supermarketId: finalSupermarketId,
          newSupermarket: finalSupermarketId ? undefined : { name: finalName || '' },
          hasBudget,
          budgetBs: hasBudget ? finalBs : null,
          budgetUsd: hasBudget ? finalUsd : null,
        },
        userId
      );

      const cartName = `${finalName || "Plaza's"} - ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;

      addCart({
        id: result.id,
        name: cartName,
        supermarket: finalName || "Plaza's",
        supermarketId: result.supermarketId,
        products: [],
        totalBs: 0,
        totalUsd: 0,
        hasBudget: result.hasBudget,
        budgetBs: result.budgetBs,
        budgetUsd: result.budgetUsd,
      });
      setActiveCart(result.id);
      resetOnFocusRef.current = true;
      onCartCreated(result.id);

      const updatedMarkets = await getAllSupermarkets(userId);
      setSupermarkets(updatedMarkets);
    } catch {
      console.error('Error al crear el carrito');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={[styles.card, { gap: theme.spacing.md }]}>
          <Skeleton height={96} radius={10} />
          <Skeleton height={48} radius={10} />
          <Skeleton height={48} radius={10} />
        </View>
      </View>
    );
  }

  const trackColor = trackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surfaceContainer, theme.colors.primary],
  });
  const thumbTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24],
  });

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <SupermarketSelector
          supermarkets={supermarkets}
          customMarketName={customMarketName}
          fieldErrors={fieldErrors}
          renderCustomMarket={renderCustomMarket}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
          onSupermarketSelect={handleSupermarketSelect}
          onCustomMarketChange={handleCustomMarketChange}
        />

        <View style={styles.budgetToggleRow}>
          <Text style={styles.budgetToggleLabel}>Crear con presupuesto</Text>
          <Pressable
            onPress={handleToggleBudget}
            accessibilityRole="switch"
            accessibilityState={{ checked: withBudget }}
            accessibilityLabel="Crear con presupuesto"
            hitSlop={8}
          >
            <Animated.View
              style={[
                styles.toggleTrack,
                {
                  backgroundColor: trackColor,
                  borderColor: trackColor,
                },
              ]}
            >
              <Animated.View
                style={[styles.toggleThumb, { transform: [{ translateX: thumbTranslate }] }]}
              />
            </Animated.View>
          </Pressable>
        </View>

        {withBudget ? (
          <>
            <BudgetFields
              topCurrency={topCurrency}
              budgetBs={budgetBs}
              budgetUsd={budgetUsd}
              fieldErrors={fieldErrors}
              onBsChange={handleBsBudgetChange}
              onUsdChange={handleUsdBudgetChange}
              onToggleCurrency={handleToggleCurrency}
            />

            {fieldErrors.budgetBs || fieldErrors.budgetUsd ? (
              <Text style={styles.errorText as TextStyle}>
                {fieldErrors.budgetBs || fieldErrors.budgetUsd}
              </Text>
            ) : null}
          </>
        ) : null}

        {fieldErrors.supermarket ? (
          <Text style={styles.errorText as TextStyle}>{fieldErrors.supermarket}</Text>
        ) : null}

        <Button
          title="Comenzar Lista"
          onPress={handleStartList}
          size="md"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leadingIcon={
            <MaterialIcons name="play-circle-outline" size={24} color={theme.colors.onPrimary} />
          }
        />
      </View>
    </View>
  );
}
