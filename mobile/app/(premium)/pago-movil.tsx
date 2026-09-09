import { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../styles/theme';
import { createCardStyles } from '../../styles/cards';
import { createInputStyles } from '../../styles/inputs';
import { Input } from '../../components/shared/Input';
import { Button } from '../../components/Button';
import { TopAppBar } from '../../components/shared/TopAppBar';
import { Toast } from '../../components/shared/Toast';
import { PickerField } from '../../components/shared/PickerField';
import type { PickerOption } from '../../components/shared/PickerField';
import { AmountInput } from '../../components/shared/AmountInput';
import { useAuth } from '../../store/authStore';
import { useBCV } from '../../store/bcvStore';
import { createPayment } from '../../services/paymentService';

const MY_PAYMENT_INFO = {
  phone: '0412-1234567',
  identification: 'V-12345678',
  bankName: 'Banco de Venezuela',
} as const;

const CI_PREFIXES = ['V', 'E', 'P', 'J', 'G', 'R'] as const;

const BANKS = [
  { code: '0102', name: 'BANCO DE VENEZUELA' },
  { code: '0104', name: 'BANCO VENEZOLANO DE CREDITO' },
  { code: '0105', name: 'BANCO MERCANTIL' },
  { code: '0108', name: 'BBVA PROVINCIAL' },
  { code: '0114', name: 'BANCARIBE' },
  { code: '0115', name: 'BANCO EXTERIOR' },
  { code: '0128', name: 'BANCO CARONI' },
  { code: '0134', name: 'BANESCO' },
  { code: '0137', name: 'BANCO SOFITASA' },
  { code: '0138', name: 'BANCO PLAZA' },
  { code: '0146', name: 'BANGENTE' },
  { code: '0151', name: 'BANCO FONDO COMUN' },
  { code: '0156', name: '100% BANCO' },
  { code: '0157', name: 'DELSUR BANCO UNIVERSAL' },
  { code: '0163', name: 'BANCO DEL TESORO' },
  { code: '0168', name: 'BANCRECER' },
  { code: '0169', name: 'R4 BANCO MICROFINANCIERO C.A.' },
  { code: '0171', name: 'BANCO ACTIVO' },
  { code: '0172', name: 'BANCAMIGA BANCO UNIVERSAL, C.A.' },
  { code: '0173', name: 'BANCO INTERNACIONAL DE DESARROLLO' },
  { code: '0174', name: 'BANPLUS' },
  { code: '0175', name: 'BANCO DIGITAL DE LOS TRABAJADORES, BANCO UNIVERSAL' },
  { code: '0177', name: 'BANFANB' },
  { code: '0178', name: 'N58 BANCO DIGITAL BANCO MICROFINANCIERO S A' },
  { code: '0191', name: 'BANCO NACIONAL DE CREDITO' },
] as const;

const CI_OPTIONS: PickerOption[] = CI_PREFIXES.map(p => ({ label: p, value: p }));

const BANK_OPTIONS: PickerOption[] = BANKS.map(b => ({
  label: `${b.code} - ${b.name}`,
  value: `${b.code} - ${b.name}`,
}));

const formatBs = (amount: number): string => {
  const [intPart, decPart] = amount.toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInt},${decPart}`;
};

export default function PagoMovilScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rate: bcvRate } = useBCV();
  const cardStyles = useMemo(() => createCardStyles(theme), [theme]);

  const { billing, usdPrice, periodLabel } = useLocalSearchParams<{
    billing: string;
    usdPrice: string;
    periodLabel: string;
  }>();

  const usdValue = parseFloat(usdPrice || '0');
  const bsValue = usdValue * (bcvRate?.usdRate ?? 0);

  const [userCI, setUserCI] = useState('');
  const [ciPrefix, setCiPrefix] = useState('V');
  const [userBank, setUserBank] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const amountBsRef = useRef<number | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleDateFieldPress = () => {
    if (!paymentDate) {
      const today = new Date();
      setSelectedDate(today);
      setPaymentDate(
        today.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setPaymentDate(
        date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
      clearFieldError('date');
    }
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!ciPrefix || !userCI.trim()) errors.ci = 'required';
    if (!userBank) errors.bank = 'required';
    if (!paymentDate) errors.date = 'required';
    if (!amountBsRef.current || amountBsRef.current <= 0) errors.amount = 'required';
    if (!referenceNumber.trim()) errors.reference = 'required';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast('Completa todos los campos obligatorios');
      return;
    }

    const monthsMap: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      annual: 12,
    };

    const [day, month, year] = paymentDate.split('/');
    const paidAt = new Date(+year, +month - 1, +day).toISOString();
    try {
      await createPayment(
        {
          numberOfMonths: monthsMap[billing] || 1,
          referenceNumber: referenceNumber.trim(),
          bankName: userBank,
          amountBs: amountBsRef.current ?? 0,
          amountUsd: usdValue,
          priceBcv: bcvRate?.usdRate ?? 0,
          identification: `${ciPrefix}${userCI.trim()}`,
          isDiscount: false,
          paidAt,
        },
        user?.id
      );
      router.replace('/(premium)/payment-pending');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error al procesar el pago');
    }
  };

  const styles = useMemo(() => {
    const inputStyles = createInputStyles(theme);
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      scrollContent: {
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        paddingBottom: 180,
      },
      summaryCard: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.stoneSurface,
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      summaryLeft: {
        gap: 2,
      },
      summaryPlan: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.midnight,
      },
      summaryRate: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.regular,
        color: theme.colors.ash,
      },
      summaryRight: {
        alignItems: 'flex-end',
        gap: 2,
      },
      summaryUsd: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.midnight,
      },
      summaryBs: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.meadowGreen,
      },
      card: {
        ...cardStyles.base,
        borderRadius: 24,
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      },
      sectionLabel: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
      },
      infoTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.midnight,
      },
      infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      infoLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.ash,
      },
      infoValue: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.midnight,
      },
      infoAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.stoneSurface,
      },
      infoAmountLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.midnight,
      },
      infoAmountValue: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.midnight,
      },
      inputGroup: {
        gap: theme.spacing.sm,
      },
      label: {
        fontSize: theme.typography.fontSize.xxs,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: theme.spacing.sm,
      },
      dateInput: {
        ...inputStyles.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      inputError: inputStyles.error,
      noteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: 24,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: theme.colors.stoneSurface,
        padding: theme.spacing.md,
      },
      noteText: {
        flex: 1,
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.ash,
        lineHeight: 18,
      },
      noteTextBold: {
        color: theme.colors.black,
        fontWeight: theme.typography.fontWeight.bold,
      },
      footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderTopWidth: 1,
        borderTopColor: theme.colors.stoneSurface,
        padding: theme.spacing.lg,
      },
    });
  }, [theme, cardStyles]);

  return (
    <View style={styles.container}>
      <TopAppBar title="Pago Móvil" onBackPress={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryPlan}>{periodLabel}</Text>
            <Text style={styles.summaryRate}>
              Tasa BCV: {formatBs(bcvRate?.usdRate ?? 0)} Bs/USD
            </Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryUsd}>${usdPrice}</Text>
            <Text style={styles.summaryBs}>{formatBs(bsValue)} Bs</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Datos del pago</Text>

          <View style={styles.infoHeader}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.colors.meadowGreen + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="bolt" size={20} color={theme.colors.meadowGreen} />
            </View>
            <Text style={styles.infoTitle}>Pago Móvil</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>{MY_PAYMENT_INFO.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cédula</Text>
            <Text style={styles.infoValue}>{MY_PAYMENT_INFO.identification}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Banco</Text>
            <Text style={styles.infoValue}>{MY_PAYMENT_INFO.bankName}</Text>
          </View>

          <View style={styles.infoAmountRow}>
            <Text style={styles.infoAmountLabel}>Monto</Text>
            <Text style={styles.infoAmountValue}>{formatBs(bsValue)} Bs</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Completa tus datos</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cédula / RIF *</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ width: 90 }}>
                <PickerField
                  selectedValue={ciPrefix}
                  onValueChange={value => {
                    setCiPrefix(value);
                    clearFieldError('ci');
                  }}
                  options={CI_OPTIONS}
                  error={!!fieldErrors.ci}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  placeholder="12345678"
                  value={userCI}
                  onChangeText={text => {
                    setUserCI(text.replace(/\D/g, ''));
                    clearFieldError('ci');
                  }}
                  keyboardType="number-pad"
                  maxLength={9}
                  error={!!fieldErrors.ci}
                />
              </View>
            </View>
          </View>

          <PickerField
            label="Banco de origen *"
            selectedValue={userBank}
            onValueChange={value => {
              setUserBank(value);
              clearFieldError('bank');
            }}
            options={BANK_OPTIONS}
            error={!!fieldErrors.bank}
            placeholder="Selecciona un banco..."
            search
            searchPlaceholder="Buscar banco..."
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha del pago *</Text>
            <Pressable
              style={[styles.dateInput, fieldErrors.date && styles.inputError]}
              onPress={handleDateFieldPress}
            >
              <Text
                style={!paymentDate ? { color: theme.colors.ash } : { color: theme.colors.text }}
              >
                {paymentDate || 'Selecciona la fecha...'}
              </Text>
              <MaterialIcons name="calendar-today" size={20} color={theme.colors.ash} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto en Bs *</Text>
            <AmountInput
              value={amountBsRef.current}
              onValueChange={val => {
                amountBsRef.current = val;
                clearFieldError('amount');
              }}
              placeholder="0,00"
              error={!!fieldErrors.amount}
            />
          </View>

          <Input
            label="Nro. de referencia *"
            placeholder="000000"
            value={referenceNumber}
            onChangeText={text => {
              setReferenceNumber(text.replace(/\D/g, ''));
              clearFieldError('reference');
            }}
            keyboardType="number-pad"
            maxLength={50}
            error={!!fieldErrors.reference}
          />
        </View>

        <View style={styles.noteContainer}>
          <MaterialIcons name="info-outline" size={18} color={theme.colors.ash} />
          <Text style={styles.noteText}>
            Recuerda realizar el pago con el <Text style={styles.noteTextBold}>MONTO EXACTO</Text>{' '}
            indicado y enviar el número de referencia
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <Button title="Enviar comprobante" onPress={handleSubmit} size="md" fullWidth />
      </View>

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
            }}
            onPress={() => setShowDatePicker(false)}
          >
            <View
              style={{
                backgroundColor: theme.colors.surfaceContainerLowest,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderCurve: 'continuous',
                paddingTop: theme.spacing.lg,
                paddingBottom: insets.bottom + theme.spacing.lg,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  paddingHorizontal: theme.spacing.lg,
                  marginBottom: theme.spacing.md,
                }}
              >
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.meadowGreen,
                    }}
                  >
                    OK
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                locale="es-ES"
              />
            </View>
          </Pressable>
        </Modal>
      )}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
