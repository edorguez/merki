import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartProduct {
  id: string;
  productId: string;
  name: string;
  priceBs: number;
  priceUsd: number;
  quantity: number;
  supermarket: string;
  productImageUrl?: string;
}

export interface Cart {
  id: string;
  name: string;
  supermarket: string;
  supermarketId: string;
  products: CartProduct[];
  totalBs: number;
  totalUsd: number;
  hasBudget: boolean;
  budgetBs: number;
  budgetUsd: number;
  createdAt: string;
  completed?: boolean;
  completedAt?: string;
}

interface CartState {
  carts: Cart[];
  activeCartId: string | null;
  isLoading: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  setPendingSyncCount: (count: number) => void;
  setLastSyncedAt: (date: string) => void;
  addCart: (cart: Omit<Cart, 'createdAt'>) => void;
  updateCart: (id: string, updates: Partial<Cart>) => void;
  deleteCart: (id: string) => void;
  setActiveCart: (id: string | null) => void;
  addProductToCart: (cartId: string, product: CartProduct | Omit<CartProduct, 'id'>) => void;
  removeProductFromCart: (cartId: string, productId: string) => void;
  updateProductQuantity: (cartId: string, productId: string, newQuantity: number) => void;
  updateProduct: (cartId: string, productId: string, updates: Partial<CartProduct>) => void;
  completeCart: (id: string) => void;
}

const storage = createJSONStorage(() => AsyncStorage);

export const useCartStore = create<CartState>()(
  persist(
    set => ({
      carts: [],
      activeCartId: null,
      isLoading: false,
      pendingSyncCount: 0,
      lastSyncedAt: null,

      setPendingSyncCount: count => set({ pendingSyncCount: count }),
      setLastSyncedAt: date => set({ lastSyncedAt: date }),

      addCart: cart =>
        set(state => ({
          carts: [
            ...state.carts,
            {
              ...cart,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateCart: (id, updates) =>
        set(state => ({
          carts: state.carts.map(cart => (cart.id === id ? { ...cart, ...updates } : cart)),
        })),
      deleteCart: id =>
        set(state => ({
          carts: state.carts.filter(cart => cart.id !== id),
          activeCartId: state.activeCartId === id ? null : state.activeCartId,
        })),
      setActiveCart: id => set({ activeCartId: id }),
      addProductToCart: (cartId, product) =>
        set(state => ({
          carts: state.carts.map(cart =>
            cart.id === cartId
              ? {
                  ...cart,
                  products: [
                    ...cart.products,
                    { ...product, id: (product as CartProduct).id || Date.now().toString() },
                  ],
                  totalBs: cart.totalBs + product.priceBs * product.quantity,
                  totalUsd: cart.totalUsd + product.priceUsd * product.quantity,
                }
              : cart
          ),
        })),
      removeProductFromCart: (cartId, productId) =>
        set(state => ({
          carts: state.carts.map(cart => {
            if (cart.id !== cartId) return cart;

            const productToRemove = cart.products.find(p => p.id === productId);
            if (!productToRemove) return cart;

            return {
              ...cart,
              products: cart.products.filter(p => p.id !== productId),
              totalBs: cart.totalBs - productToRemove.priceBs * productToRemove.quantity,
              totalUsd: cart.totalUsd - productToRemove.priceUsd * productToRemove.quantity,
            };
          }),
        })),
      updateProductQuantity: (cartId, productId, newQuantity) =>
        set(state => {
          const target = state.carts.find(c => c.id === cartId);
          const idx = target?.products.findIndex(p => p.id === productId) ?? -1;
          console.log('[store] updateProductQuantity', {
            cartId,
            productId,
            newQuantity,
            found: idx !== -1,
            cartTotalBs: target?.totalBs,
            oldQty: idx !== -1 ? target!.products[idx].quantity : undefined,
            priceBs: idx !== -1 ? target!.products[idx].priceBs : undefined,
          });
          return {
            carts: state.carts.map(cart => {
              if (cart.id !== cartId) return cart;

              const productIdx = cart.products.findIndex(p => p.id === productId);
              if (productIdx === -1) return cart;

              const oldProduct = cart.products[productIdx];
              const quantityDiff = newQuantity - oldProduct.quantity;
              const newTotalBs = cart.totalBs + oldProduct.priceBs * quantityDiff;
              const newTotalUsd = cart.totalUsd + oldProduct.priceUsd * quantityDiff;

              const updatedProducts = [...cart.products];
              updatedProducts[productIdx] = { ...oldProduct, quantity: newQuantity };

              return {
                ...cart,
                products: updatedProducts,
                totalBs: newTotalBs,
                totalUsd: newTotalUsd,
              };
            }),
          };
        }),
      updateProduct: (cartId, productId, updates) =>
        set(state => ({
          carts: state.carts.map(cart => {
            if (cart.id !== cartId) return cart;

            const idx = cart.products.findIndex(p => p.id === productId);
            if (idx === -1) return cart;

            const oldProduct = cart.products[idx];
            const newProduct = { ...oldProduct, ...updates };

            const oldContributionBs = oldProduct.priceBs * oldProduct.quantity;
            const oldContributionUsd = oldProduct.priceUsd * oldProduct.quantity;
            const newContributionBs = newProduct.priceBs * newProduct.quantity;
            const newContributionUsd = newProduct.priceUsd * newProduct.quantity;

            const totalBsDiff = newContributionBs - oldContributionBs;
            const totalUsdDiff = newContributionUsd - oldContributionUsd;

            const updatedProducts = [...cart.products];
            updatedProducts[idx] = newProduct;

            return {
              ...cart,
              products: updatedProducts,
              totalBs: cart.totalBs + totalBsDiff,
              totalUsd: cart.totalUsd + totalUsdDiff,
            };
          }),
        })),
      completeCart: id =>
        set(state => ({
          carts: state.carts.map(cart =>
            cart.id === id
              ? { ...cart, completed: true, completedAt: new Date().toISOString() }
              : cart
          ),
        })),
    }),
    {
      name: '@merki_cart_store',
      version: 2,
      storage,
      partialize: state => ({
        carts: state.carts,
        activeCartId: state.activeCartId,
        lastSyncedAt: state.lastSyncedAt,
      }),
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        if (state.carts && Array.isArray(state.carts)) {
          for (const cart of state.carts as Array<Record<string, unknown>>) {
            if (cart.createdAt instanceof Date) {
              cart.createdAt = (cart.createdAt as Date).toISOString();
            }
            if (cart.completedAt instanceof Date) {
              cart.completedAt = (cart.completedAt as Date).toISOString();
            }
            if (typeof cart.hasBudget !== 'boolean') {
              cart.hasBudget = true;
            }
          }
        }
        return persisted as CartState;
      },
    }
  )
);
