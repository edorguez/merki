import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCartStore, type Cart, type CartProduct } from '../../store/cartStore';
import { useAppTheme } from '../../styles/theme';
import { createButtonStyles } from '../../styles/buttons';
import { createCartDetailStyles } from '../../styles/cartDetailStyles';
import { ProductCard } from '../../components/cart/ProductCard';
import { BudgetSummary } from '../../components/cart/BudgetSummary';
import { SupermarketHeader } from '../../components/cart/SupermarketHeader';
import { TopAppBar } from '../../components/shared/TopAppBar';
import { BottomSheetModal } from '../../components/shared/BottomSheetModal';
import { ActionSheetModal } from '../../components/shared/ActionSheetModal';
import { FadeIn } from '../../components/shared/FadeIn';
import { Skeleton } from '../../components/shared/Skeleton';
import { Toast } from '../../components/shared/Toast';
import { ProductForm } from '../../components/cart/ProductForm';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import {
  getCartDetail,
  addCartProduct,
  updateCartProduct,
  updateCartProductQuantity,
  deleteCartProduct,
  checkoutCart,
} from '../../services/cartService';
import { useAuth } from '../../store/authStore';
import { useInterstitialAd } from '../../components/ads/useInterstitialAd';
import { AdBanner } from '../../components/ads/AdBanner';
import type { ApiCartDetailResponse } from '../../types';

export default function CartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const buttonStyles = createButtonStyles(theme);
  const {
    carts,
    addCart,
    addProductToCart,
    setActiveCart,
    updateProduct,
    updateProductQuantity,
    removeProductFromCart,
    completeCart,
  } = useCartStore();
  const { user } = useAuth();
  const { show: showInterstitialAd } = useInterstitialAd();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [isLoadingFromApi, setIsLoadingFromApi] = useState(false);
  const [, setIsSubmitting] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCompleteCartSheet, setShowCompleteCartSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CartProduct | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CartProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setActiveCart(id);
  }, [id, setActiveCart]);

  useEffect(() => {
    if (!id || !user?.id) return;

    const exists = carts.some(c => c.id === id);
    if (!exists) {
      setIsLoadingFromApi(true);
      getCartDetail(id, user.id)
        .then((apiCart: ApiCartDetailResponse) => {
          addCart({
            id: apiCart.id,
            name: apiCart.supermarketName,
            supermarket: apiCart.supermarketName,
            supermarketId: apiCart.supermarketId,
            products: apiCart.products.map(product => ({
              id: product.id,
              productId: product.productId,
              name: product.name,
              priceBs: product.priceBs,
              priceUsd: product.priceUsd,
              quantity: product.quantity,
              supermarket: apiCart.supermarketName,
              productImageUrl: product.imageUrl || undefined,
            })),
            totalBs: apiCart.totalEstimatedBs ?? 0,
            totalUsd: apiCart.totalEstimatedUsd ?? 0,
            hasBudget: apiCart.hasBudget,
            budgetBs: apiCart.budgetBs ?? 0,
            budgetUsd: apiCart.budgetUsd ?? 0,
          });
        })
        .catch(() => {})
        .finally(() => setIsLoadingFromApi(false));
    }
  }, [id, user?.id, addCart, carts]);

  const handleScanPress = () => {
    router.push('/(cart)/scan');
  };

  const handleAddProduct = async (product: {
    name: string;
    priceBs: number;
    priceUsd: number;
    priceBcv: number;
    quantity: number;
    supermarket: string;
  }) => {
    if (!cart || !user?.id) return;

    setShowAddProduct(false);

    setIsSubmitting(true);
    try {
      const result = await addCartProduct(
        {
          cartId: cart.id,
          supermarketId: cart.supermarketId,
          name: product.name,
          priceUsd: product.priceUsd,
          priceBs: product.priceBs,
          priceBcv: product.priceBcv,
          quantity: product.quantity,
          isManualEntry: true,
        },
        user.id
      );

      addProductToCart(cart.id, {
        id: result.id,
        productId: result.productId,
        name: result.name,
        priceBs: result.priceBs,
        priceUsd: result.priceUsd,
        quantity: result.quantity,
        supermarket: product.supermarket,
        productImageUrl: result.imageUrl || undefined,
      });
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error al agregar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async (product: {
    name: string;
    priceBs: number;
    priceUsd: number;
    priceBcv: number;
    quantity: number;
    supermarket: string;
  }) => {
    if (!cart || !editingProduct || !user?.id) return;

    setIsSubmitting(true);
    try {
      const result = await updateCartProduct(
        editingProduct.id,
        {
          cartId: cart.id,
          name: product.name,
          priceUsd: product.priceUsd,
          priceBs: product.priceBs,
          priceBcv: product.priceBcv,
          quantity: product.quantity,
        },
        user.id
      );

      updateProduct(cart.id, editingProduct.id, {
        name: result.name,
        priceBs: result.priceBs,
        priceUsd: result.priceUsd,
        quantity: result.quantity,
        supermarket: product.supermarket,
      });

      setShowEditModal(false);
      setEditingProduct(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Error al editar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartRef = useRef<Cart | null>(null);
  const userRef = useRef(user);

  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuantityChange = useCallback((productId: string, newQuantity: number) => {
    const c = cartRef.current;
    const u = userRef.current;
    if (!c || !u) return;

    updateProductQuantity(c.id, productId, newQuantity);

    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(async () => {
      try {
        await updateCartProductQuantity(
          productId,
          { cartProductId: productId, cartId: c.id, quantity: newQuantity },
          u.id
        );
      } catch {
        // silent — already committed locally
      }
    }, 800);
  }, []);

  const handleMenuPress = useCallback((productId: string) => {
    const product = cartRef.current?.products.find(p => p.id === productId) ?? null;
    setSelectedProduct(product);
    setShowActionSheet(true);
  }, []);

  const cart = carts.find((c: Cart) => c.id === id);
  cartRef.current = cart ?? null;
  userRef.current = user;
  console.log('[cart-detail] render', {
    id,
    found: !!cart,
    totalBs: cart?.totalBs,
    productCount: cart?.products.length,
    storeCartCount: carts.length,
  });

  if (!cart) {
    if (isLoadingFromApi) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <Skeleton height={96} radius={theme.borderRadius.md} />
          <Skeleton height={160} radius={theme.borderRadius.md} />
          <Skeleton height={80} radius={theme.borderRadius.md} />
          <Skeleton height={80} radius={theme.borderRadius.md} />
        </View>
      );
    }
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text>Cart not found</Text>
      </View>
    );
  }

  const totalBs = cart.totalBs || 0;
  const totalUsd = cart.totalUsd || 0;
  const budgetBs = cart.budgetBs;
  const budgetUsd = cart.budgetUsd;
  const hasBudget = cart.hasBudget;

  const styles = createCartDetailStyles(theme);

  return (
    <View style={styles.container}>
      <TopAppBar logo onBackPress={() => router.back()} />
      <View style={styles.headerContainer}>
        <View style={styles.supermarketHeaderContainer}>
          <SupermarketHeader
            cartId={cart.id}
            supermarket={cart.supermarket}
            productCount={cart.products.length}
          />
        </View>
        <BudgetSummary
          totalBs={totalBs}
          totalUsd={totalUsd}
          budgetBs={budgetBs}
          budgetUsd={budgetUsd}
          hasBudget={hasBudget}
        />
      </View>

      <AdBanner />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>Productos en Carrito</Text>
        <View style={styles.productList}>
          {cart.products.length > 0 ? (
            cart.products.map((product: CartProduct, index: number) => (
              <FadeIn key={product.id} delay={index * 50} distance={12}>
                <ProductCard
                  id={product.id}
                  name={product.name}
                  priceBs={product.priceBs}
                  priceUsd={product.priceUsd}
                  quantity={product.quantity}
                  productImageUrl={product.productImageUrl}
                  cartId={cart.id}
                  onMenuPress={handleMenuPress}
                  onQuantityChange={handleQuantityChange}
                />
              </FadeIn>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={{ width: 96, height: 96 }}>
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: theme.colors.outline + '20',
                    borderRadius: theme.borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons
                    name="shopping-bag"
                    size={theme.iconSize.xxxl}
                    color={theme.colors.outline}
                  />
                </View>
              </View>
              <Text style={styles.emptyStateText}>Sin productos</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonBarContainer}>
        <View style={styles.buttonBar}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && buttonStyles.pressed]}
            onPress={() => setShowAddProduct(true)}
            accessibilityRole="button"
            accessibilityLabel="Agregar producto"
          >
            <MaterialIcons name="add" size={theme.iconSize.xs} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Agregar</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.buttonCircleComplete,
              pressed && { backgroundColor: theme.colors.secondaryPressed },
            ]}
            onPress={() => setShowCompleteCartSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Completar Carrito"
          >
            <MaterialCommunityIcons
              name="cart-check"
              size={theme.iconSize.lg}
              color={theme.colors.white}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && buttonStyles.pressed]}
            onPress={handleScanPress}
            accessibilityRole="button"
            accessibilityLabel="Escanear producto"
          >
            <MaterialIcons name="camera-alt" size={theme.iconSize.xs} color={theme.colors.white} />
            <Text style={styles.buttonText}>Escanear</Text>
          </Pressable>
        </View>
      </View>

      <BottomSheetModal
        isVisible={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Agregar Producto"
        showBackButton={true}
      >
        {cart && <ProductForm onSubmit={handleAddProduct} supermarket={cart.supermarket} />}
      </BottomSheetModal>

      <BottomSheetModal
        isVisible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        title="Editar Producto"
        showBackButton={true}
      >
        {cart && editingProduct && (
          <ProductForm
            onSubmit={handleEditProduct}
            supermarket={cart.supermarket}
            initialData={editingProduct}
          />
        )}
      </BottomSheetModal>

      <ActionSheetModal
        isVisible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedProduct(null);
        }}
        options={[
          {
            label: 'Editar',
            icon: 'edit',
            color: theme.colors.midnight,
            onPress: () => {
              setEditingProduct(selectedProduct);
              setShowEditModal(true);
            },
          },
          {
            label: 'Eliminar',
            icon: 'delete',
            color: theme.colors.error,
            onPress: async () => {
              if (!selectedProduct || !cart || !user?.id) return;
              setIsSubmitting(true);
              try {
                await deleteCartProduct(selectedProduct.id, user.id);
                removeProductFromCart(cart.id, selectedProduct.id);
                setShowActionSheet(false);
                setSelectedProduct(null);
              } catch (err) {
                setToast(err instanceof Error ? err.message : 'Error al eliminar producto');
              } finally {
                setIsSubmitting(false);
              }
            },
          },
        ]}
      />

      <ActionSheetModal
        isVisible={showCompleteCartSheet}
        onClose={() => setShowCompleteCartSheet(false)}
        options={[
          {
            label: 'Sí, completar carrito',
            icon: 'check-circle',
            color: theme.colors.success,
            onPress: async () => {
              if (!cart || !user?.id) return;
              setIsSubmitting(true);
              try {
                await checkoutCart(cart.id, user.id);
                completeCart(cart.id);
                setShowCompleteCartSheet(false);
                await showInterstitialAd();
                router.push('/(cart)/checkout-success');
              } catch (err) {
                setToast(err instanceof Error ? err.message : 'Error al completar carrito');
              } finally {
                setIsSubmitting(false);
              }
            },
          },
          {
            label: 'Cancelar',
            icon: 'cancel',
            color: theme.colors.outline,
            onPress: () => setShowCompleteCartSheet(false),
          },
        ]}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
