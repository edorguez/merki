import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { CameraView, Camera } from 'expo-camera';
import { useAppTheme } from '../../styles/theme';
import { createScanStyles } from '../../styles/scanStyles';
import { TopAppBar } from '../../components/shared/TopAppBar';
import { ProductScanResultModal } from '../../components/shared/ProductScanResultModal';
import { ManualEntryModal } from '../../components/shared/ManualEntryModal';
import { NoRecognitionModal } from '../../components/shared/NoRecognitionModal';
import { WaveText } from '../../components/shared/WaveText';
import { usePulse } from '../../hooks/animations';
import { useCartStore } from '../../store/cartStore';
import { useAuth } from '../../store/authStore';
import { useBCV } from '../../store/bcvStore';
import { addCartProduct } from '../../services/cartService';
import { Toast } from '../../components/shared/Toast';
import { scanImage, preprocessImage } from '../../lib/ocr';
import { useInterstitialAd } from '../../components/ads/useInterstitialAd';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import { MaterialIcons } from '@expo/vector-icons';

const SCAN_COUNT_KEY = '@merki/scan_count';

// Clamps a crop rectangle to the photo bounds.
function clampCrop(
  originX: number,
  originY: number,
  width: number,
  height: number,
  photoW: number,
  photoH: number
): { originX: number; originY: number; width: number; height: number } {
  const ox = Math.max(0, Math.min(originX, photoW - 1));
  const oy = Math.max(0, Math.min(originY, photoH - 1));
  const w = Math.max(1, Math.min(width, photoW - ox));
  const h = Math.max(1, Math.min(height, photoH - oy));
  return { originX: ox, originY: oy, width: w, height: h };
}

export default function ScanScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = createScanStyles(theme);
  const { activeCartId, carts, addProductToCart } = useCartStore();
  const { user } = useAuth();
  const { rate: exchangeRate } = useBCV();
  const { show: showInterstitialAd } = useInterstitialAd();
  const scanCountRef = useRef(0);
  const scanCountLoadedRef = useRef(false);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    name: string;
    priceBs: number;
    priceUsd: number;
    confidence?: number;
    imageUri?: string;
    imageAspectRatio?: number;
  } | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const [showNoRecognition, setShowNoRecognition] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  const cameraLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const middleRowLayoutRef = useRef<{ x: number; y: number } | null>(null);
  const scanAreaLayoutRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleCameraLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    cameraLayoutRef.current = { width, height };
  };

  const handleMiddleRowLayout = (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    middleRowLayoutRef.current = { x, y };
  };

  const handleScanAreaLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    scanAreaLayoutRef.current = { x, y, width, height };
  };

  const dotPulse = usePulse({ min: 0.3, max: 1, duration: 900 });
  const cornerPulse = usePulse({ min: 0.7, max: 1, duration: 1200 });

  const activeCart = activeCartId ? carts.find(c => c.id === activeCartId) : null;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const value = await safeGetItem(SCAN_COUNT_KEY);
      const parsed = value ? parseInt(value, 10) : 0;
      if (!Number.isNaN(parsed)) {
        scanCountRef.current = parsed;
      }
      scanCountLoadedRef.current = true;
    })();
  }, []);

  const startScanning = async () => {
    if (isScanning || !cameraRef.current) return;

    setIsScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: false,
        exif: false,
        shutterSound: false,
      });

      const camLayout = cameraLayoutRef.current;
      const middleRowLayout = middleRowLayoutRef.current;
      const scanLayout = scanAreaLayoutRef.current;

      const camW = camLayout?.width ?? 0;
      const camH = camLayout?.height ?? 0;
      const relX = Math.max(0, (middleRowLayout?.x ?? 0) + (scanLayout?.x ?? 0));
      const relY = Math.max(0, (middleRowLayout?.y ?? 0) + (scanLayout?.y ?? 0));
      const scanW = scanLayout?.width ?? 0;
      const scanH = scanLayout?.height ?? 0;

      let processedUri: string;
      const validMeasure = camW > 0 && camH > 0 && scanW > 0 && scanH > 0;

      if (validMeasure) {
        // The camera already returns the photo upright (matching the preview),
        // so no manual rotation is applied. The preview fits the feed inside the
        // container (FIT_CENTER with black bars on Android when ratio is 16:9,
        // aspect-fill crop on iOS). Map the scan box through the same fit so the
        // crop is exactly what the user framed.
        const photoW = photo.width;
        const photoH = photo.height;
        const fitMode = Platform.OS === 'android';
        const previewScale = fitMode
          ? Math.min(camW / photoW, camH / photoH)
          : Math.max(camW / photoW, camH / photoH);
        const gapX = fitMode
          ? (camW - photoW * previewScale) / 2
          : -(photoW * previewScale - camW) / 2;
        const gapY = fitMode
          ? (camH - photoH * previewScale) / 2
          : -(photoH * previewScale - camH) / 2;

        const originX = Math.round((relX - gapX) / previewScale);
        const originY = Math.round((relY - gapY) / previewScale);
        const width = Math.round(scanW / previewScale);
        const height = Math.round(scanH / previewScale);

        console.log('[SCAN] crop', {
          photoW,
          photoH,
          cam: { camW, camH },
          scan: { relX, relY, scanW, scanH },
          previewScale,
          gapX,
          gapY,
          originX,
          originY,
          width,
          height,
        });

        // Clamp to the photo bounds so we never read outside the image.
        const {
          originX: ox,
          originY: oy,
          width: w,
          height: h,
        } = clampCrop(originX, originY, width, height, photoW, photoH);

        processedUri = await preprocessImage(photo.uri, {
          originX: ox,
          originY: oy,
          width: w,
          height: h,
        });
      } else {
        // Never fall back to the full image: that would read text outside the
        // scan rectangle. Use a center crop instead.
        console.warn('[SCAN] layout not ready (center crop)', {
          camLayout,
          middleRowLayout,
          scanLayout,
        });
        const w = Math.round(photo.width * 0.6);
        const h = Math.round(photo.height * 0.6);
        const ox = Math.max(0, Math.round((photo.width - w) / 2));
        const oy = Math.max(0, Math.round((photo.height - h) / 2));
        processedUri = await preprocessImage(photo.uri, {
          originX: ox,
          originY: oy,
          width: w,
          height: h,
        });
      }

      const result = await scanImage(processedUri);

      if (result.warning || !result.productName || !result.price || result.price === 0) {
        setShowNoRecognition(true);
      } else {
        setScanResult({
          name: result.productName,
          priceBs: result.priceBs,
          priceUsd: result.priceUsd,
          confidence: result.confidence,
          imageUri: processedUri,
          imageAspectRatio: scanW > 0 && scanH > 0 ? scanW / scanH : 1.8,
        });
      }
    } catch (error) {
      console.error('OCR scanning failed:', error);
      setShowNoRecognition(true);
    } finally {
      setIsScanning(false);
      scanCountRef.current += 1;
      const count = scanCountRef.current;
      safeSetItem(SCAN_COUNT_KEY, String(count));
      if (count % 10 === 0) {
        showInterstitialAd();
      }
    }
  };

  const handleAddToCart = async (quantity: number) => {
    if (!scanResult || !activeCart || !user?.id) return;

    const name = scanResult.name.slice(0, 100).trim();
    const priceBs = scanResult.priceBs;
    const priceUsd = scanResult.priceUsd;
    const rate = exchangeRate?.usdRate ?? 0;

    if (!name) {
      setToast({ message: 'Nombre de producto inválido', isError: true });
      return;
    }
    if (priceBs <= 0 && priceUsd <= 0) {
      setToast({ message: 'Precio inválido', isError: true });
      return;
    }
    if (priceBs < 0 || priceUsd < 0) {
      setToast({ message: 'Precio inválido', isError: true });
      return;
    }
    if (!rate && rate !== 0) {
      setToast({
        message: 'Tasa de cambio no disponible. Se usará 0 como referencia.',
        isError: false,
      });
    }

    try {
      const result = await addCartProduct(
        {
          cartId: activeCart.id,
          supermarketId: activeCart.supermarketId,
          name,
          priceUsd,
          priceBs,
          priceBcv: rate || 0,
          quantity,
          isManualEntry: false,
        },
        user.id
      );

      addProductToCart(activeCart.id, {
        id: result.id,
        productId: result.productId,
        name: result.name,
        priceBs: result.priceBs,
        priceUsd: result.priceUsd,
        quantity: result.quantity,
        supermarket: activeCart.supermarket,
        productImageUrl: result.imageUrl || undefined,
      });

      setScanResult(null);
      setToast({ message: 'Producto agregado exitosamente', isError: false });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al agregar producto',
        isError: true,
      });
    }
  };

  const handleManualSubmit = async (
    name: string,
    priceBs: number,
    priceUsd: number,
    priceBcv: number,
    quantity: number
  ) => {
    if (!activeCart || !user?.id) return;

    const trimmed = name.trim().slice(0, 100);

    if (!trimmed) {
      setToast({ message: 'Nombre de producto requerido', isError: true });
      return;
    }
    if (priceBs <= 0 && priceUsd <= 0) {
      setToast({ message: 'Ingresa un precio válido', isError: true });
      return;
    }
    if (priceBs < 0 || priceUsd < 0) {
      setToast({ message: 'Precio inválido', isError: true });
      return;
    }
    if (priceBcv <= 0) {
      setToast({
        message: 'Tasa de cambio no disponible. Se usará 0 como referencia.',
        isError: false,
      });
    }

    try {
      const result = await addCartProduct(
        {
          cartId: activeCart.id,
          supermarketId: activeCart.supermarketId,
          name: trimmed,
          priceUsd,
          priceBs,
          priceBcv,
          quantity,
          isManualEntry: true,
        },
        user.id
      );

      addProductToCart(activeCart.id, {
        id: result.id,
        productId: result.productId,
        name: result.name,
        priceBs: result.priceBs,
        priceUsd: result.priceUsd,
        quantity: result.quantity,
        supermarket: activeCart.supermarket,
        productImageUrl: result.imageUrl || undefined,
      });

      setShowManualEntry(false);
      setToast({ message: 'Producto agregado exitosamente', isError: false });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al agregar producto',
        isError: true,
      });
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => (current === 'back' ? 'front' : 'back'));
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Sin acceso a la cámara</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.colors.emberOrange, marginTop: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopAppBar logo onBackPress={() => router.back()} />

      <View onLayout={handleCameraLayout} style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={cameraType}
          ratio="16:9"
          autofocus="off"
        />

        <View style={styles.overlayPanels} pointerEvents="none">
          <View style={[styles.overlayTint, { flex: 0.8 }]} />

          <View onLayout={handleMiddleRowLayout} style={styles.overlayMiddleRow}>
            <View style={[styles.overlayTint, { flex: 1 }]} />

            <Animated.View onLayout={handleScanAreaLayout} style={[styles.scanArea, cornerPulse]}>
              <View style={[styles.cornerLine, styles.cornerVertical, { top: 0, left: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerHorizontal, { top: 0, left: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerVertical, { top: 0, right: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerHorizontal, { top: 0, right: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerVertical, { bottom: 0, left: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerHorizontal, { bottom: 0, left: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerVertical, { bottom: 0, right: 0 }]} />
              <View style={[styles.cornerLine, styles.cornerHorizontal, { bottom: 0, right: 0 }]} />
            </Animated.View>

            <View style={[styles.overlayTint, { flex: 1 }]} />
          </View>

          <View style={[styles.overlayTint, { flex: 1 }]} />
        </View>

        {isScanning ? (
          <View style={styles.statusContainer}>
            <Animated.View
              style={[styles.statusDot, { backgroundColor: theme.colors.emberOrange }, dotPulse]}
            />
            <WaveText text="Escaneando..." style={styles.statusText} />
          </View>
        ) : (
          <Text style={styles.hintText}>
            Apunta a la etiqueta del producto y mantén tu teléfono vertical
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.floatingCameraButton,
            { backgroundColor: theme.colors.emberOrange },
            pressed ? { opacity: 0.8 } : null,
            isScanning ? { opacity: 0.4 } : null,
          ]}
          onPress={startScanning}
          disabled={isScanning}
        >
          <MaterialIcons name="photo-camera" size={40} color="#fff" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.flipCameraButton,
            pressed ? { opacity: 0.6 } : null,
            isScanning ? { opacity: 0.4 } : null,
          ]}
          onPress={toggleCameraType}
          disabled={isScanning}
        >
          <MaterialIcons name="flip-camera-ios" size={28} color="#fff" />
        </Pressable>
      </View>

      <ProductScanResultModal
        isVisible={!!scanResult}
        onClose={() => setScanResult(null)}
        productName={scanResult?.name || ''}
        priceBs={scanResult?.priceBs || 0}
        priceUsd={scanResult?.priceUsd || 0}
        imageUri={scanResult?.imageUri || ''}
        imageAspectRatio={scanResult?.imageAspectRatio ?? 1.8}
        onAddToCart={handleAddToCart}
      />

      <NoRecognitionModal
        isVisible={showNoRecognition}
        onClose={() => setShowNoRecognition(false)}
        onManualEntry={() => {
          setShowNoRecognition(false);
          setShowManualEntry(true);
        }}
      />

      <ManualEntryModal
        isVisible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleManualSubmit}
      />

      <Toast
        message={toast?.message ?? null}
        isError={toast?.isError ?? true}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}
