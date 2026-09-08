import { apiGet, apiPost } from './api';
import { cartRepository } from '../lib/local/repositories/cartRepository';
import { cartProductRepository } from '../lib/local/repositories/cartProductRepository';
import { syncService } from './syncService';
import { generateLocalId } from '../lib/local/database';
import type {
  ApiCartDetailResponse,
  ApiCartResponse,
  ApiCartProductResponse,
  ApiResponse,
} from '../types';
import {
  toCents,
  fromCents,
  toCentsNullable,
  fromCentsNullable,
  transformPrices,
} from '../utils/priceUtils';
import { SYNC_ACTIONS, SYNC_TABLES } from '../types/sync';

export interface CreateCartParams {
  supermarketId?: string;
  newSupermarket?: { name: string };
  hasBudget: boolean;
  budgetBs: number | null;
  budgetUsd: number | null;
}

export interface CreateCartResponse {
  id: string;
  supermarketId: string;
  userId: string;
  isActive: boolean;
  hasBudget: boolean;
  budgetBs: number;
  budgetUsd: number;
  totalEstimatedBs: number | null;
  totalEstimatedUsd: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddCartProductParams {
  cartId: string;
  supermarketId: string;
  name: string;
  barcode?: string | null;
  isWeightBased?: boolean;
  priceUsd: number;
  priceBs: number;
  priceBcv?: number;
  imageUrl?: string | null;
  quantity: number;
  isManualEntry?: boolean;
}

export interface UpdateCartProductParams {
  cartId: string;
  name: string;
  barcode?: string | null;
  isWeightBased?: boolean;
  priceUsd: number;
  priceBs: number;
  priceBcv?: number;
  imageUrl?: string | null;
  quantity: number;
}

export interface UpdateCartProductQuantityParams {
  cartProductId: string;
  cartId: string;
  quantity: number;
}

export interface CartProductResponse {
  id: string;
  cartId: string;
  productId: string;
  name: string;
  priceBs: number;
  priceUsd: number;
  imageUrl: string | null;
  quantity: number;
  isManualEntry: boolean;
  createdAt: string;
  updatedAt: string;
}

function transformCartDetail(response: ApiCartDetailResponse): ApiCartDetailResponse {
  return {
    ...response,
    budgetBs: fromCentsNullable(response.budgetBs),
    budgetUsd: fromCentsNullable(response.budgetUsd),
    totalEstimatedBs:
      response.totalEstimatedBs !== null ? fromCents(response.totalEstimatedBs) : null,
    totalEstimatedUsd:
      response.totalEstimatedUsd !== null ? fromCents(response.totalEstimatedUsd) : null,
    products: response.products.map(
      (p: ApiCartProductResponse) => transformPrices(p) as ApiCartProductResponse
    ),
  };
}

export async function getCartDetail(
  cartId: string,
  userId?: string
): Promise<ApiCartDetailResponse> {
  try {
    const response = await apiGet<ApiResponse<ApiCartDetailResponse>>(`/carts/${cartId}`, userId);
    if (response.success) {
      await cartRepository.upsert({
        id: response.data.id,
        supermarketId: response.data.supermarketId,
        supermarketName: response.data.supermarketName,
        userId,
        isActive: response.data.isActive,
        hasBudget: response.data.hasBudget,
        budgetBs: fromCents(response.data.budgetBs ?? 0),
        budgetUsd: fromCents(response.data.budgetUsd ?? 0),
      });

      for (const product of response.data.products) {
        await cartProductRepository.upsert({
          id: product.id,
          cartId: product.cartId,
          productId: product.productId,
          name: product.name,
          priceBs: fromCents(product.priceBs),
          priceUsd: fromCents(product.priceUsd),
          quantity: product.quantity,
          isManualEntry: product.isManualEntry,
          imageUrl: product.imageUrl,
        });
      }
    }
    return transformCartDetail(response.data);
  } catch {
    const localCart = await cartRepository.getById(cartId);
    if (localCart) {
      return {
        id: localCart.id,
        supermarketId: localCart.supermarketId,
        supermarketName: localCart.supermarketName,
        userId: localCart.userId || '',
        isActive: localCart.isActive,
        hasBudget: localCart.hasBudget,
        budgetBs: localCart.hasBudget ? localCart.budgetBs : null,
        budgetUsd: localCart.hasBudget ? localCart.budgetUsd : null,
        totalEstimatedBs: localCart.totalEstimatedBs,
        totalEstimatedUsd: localCart.totalEstimatedUsd,
        createdAt: localCart.createdAt,
        updatedAt: localCart.updatedAt,
        products: localCart.products.map(p => ({
          id: p.id,
          cartId: p.cartId,
          productId: p.productId || '',
          name: p.name,
          priceBs: p.priceBs,
          priceUsd: p.priceUsd,
          imageUrl: p.imageUrl,
          quantity: p.quantity,
          isManualEntry: p.isManualEntry,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      };
    }
    throw new Error('Error al obtener el carrito');
  }
}

async function recalcCartTotals(cartId: string): Promise<void> {
  try {
    const t0 = Date.now();
    const { totalBs, totalUsd } = await cartProductRepository.getCartTotals(cartId);
    await cartRepository.update(cartId, {
      totalEstimatedBs: totalBs,
      totalEstimatedUsd: totalUsd,
    });
    console.log('[cartService] recalcCartTotals', {
      cartId,
      totalBs,
      totalUsd,
      ms: Date.now() - t0,
    });
  } catch (err) {
    console.warn('Error al recalcular los totales del carrito', err);
  }
}

export async function createCart(
  params: CreateCartParams,
  userId?: string
): Promise<CreateCartResponse> {
  const t0 = Date.now();
  const localCart = await cartRepository.upsert({
    supermarketId: params.supermarketId || generateLocalId(),
    supermarketName: params.newSupermarket?.name || "Plaza's",
    userId,
    hasBudget: params.hasBudget,
    budgetBs: params.budgetBs ?? 0,
    budgetUsd: params.budgetUsd ?? 0,
  });

  const now = new Date().toISOString();

  const t1 = Date.now();
  const serverVersion = await syncService.enqueueAndSync(
    SYNC_TABLES.CARTS,
    SYNC_ACTIONS.INSERT,
    localCart.id,
    {
      id: localCart.id,
      supermarketId: params.supermarketId,
      newSupermarket: params.newSupermarket,
      hasBudget: params.hasBudget,
      budgetBs: toCentsNullable(params.budgetBs),
      budgetUsd: toCentsNullable(params.budgetUsd),
      budgetBsRaw: params.budgetBs,
      budgetUsdRaw: params.budgetUsd,
      userId,
    },
    userId
  );
  console.log('[cartService] createCart', {
    cartId: localCart.id,
    serverId: serverVersion?.id,
    hasBudget: params.hasBudget,
    upsertMs: t1 - t0,
    syncMs: Date.now() - t1,
    totalMs: Date.now() - t0,
  });

  const cartId = (serverVersion?.id as string) || localCart.id;

  return {
    id: cartId,
    supermarketId: params.supermarketId || localCart.supermarketId,
    userId: userId || '',
    isActive: true,
    hasBudget: params.hasBudget,
    budgetBs: params.budgetBs ?? 0,
    budgetUsd: params.budgetUsd ?? 0,
    totalEstimatedBs: null,
    totalEstimatedUsd: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function addCartProduct(
  params: AddCartProductParams,
  userId?: string
): Promise<CartProductResponse> {
  const t0 = Date.now();
  const localProduct = await cartProductRepository.upsert({
    cartId: params.cartId,
    name: params.name,
    priceBs: params.priceBs,
    priceUsd: params.priceUsd,
    quantity: params.quantity,
    isManualEntry: params.isManualEntry ?? true,
    imageUrl: params.imageUrl,
    supermarket: params.supermarketId,
  });

  const t1 = Date.now();
  const serverVersion = await syncService.enqueueAndSync(
    SYNC_TABLES.CART_PRODUCTS,
    SYNC_ACTIONS.INSERT,
    localProduct.id,
    {
      id: localProduct.id,
      cartId: params.cartId,
      supermarketId: params.supermarketId,
      name: params.name,
      priceUsd: toCents(params.priceUsd),
      priceBs: toCents(params.priceBs),
      priceBcv: params.priceBcv !== undefined ? toCents(params.priceBcv) : 0,
      quantity: params.quantity,
      isManualEntry: params.isManualEntry ?? true,
      barcode: params.barcode || null,
      isWeightBased: params.isWeightBased,
      imageUrl: params.imageUrl || null,
      userId,
    },
    userId
  );

  const t2 = Date.now();
  await recalcCartTotals(params.cartId);
  console.log('[cartService] addCartProduct', {
    cartId: params.cartId,
    productId: localProduct.id,
    serverId: serverVersion?.id,
    upsertMs: t1 - t0,
    syncMs: t2 - t1,
    recalcMs: Date.now() - t2,
    totalMs: Date.now() - t0,
  });

  const now = new Date().toISOString();
  return {
    id: (serverVersion?.id as string) || localProduct.id,
    cartId: params.cartId,
    productId: (serverVersion?.productId as string) || localProduct.id,
    name: params.name,
    priceBs: params.priceBs,
    priceUsd: params.priceUsd,
    imageUrl: params.imageUrl || null,
    quantity: params.quantity,
    isManualEntry: params.isManualEntry ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCartProduct(
  cartProductId: string,
  params: UpdateCartProductParams,
  userId?: string
): Promise<CartProductResponse> {
  await cartProductRepository.update(cartProductId, {
    name: params.name,
    priceBs: params.priceBs,
    priceUsd: params.priceUsd,
    quantity: params.quantity,
    imageUrl: params.imageUrl || null,
  });

  await syncService.enqueueAndSync(
    SYNC_TABLES.CART_PRODUCTS,
    SYNC_ACTIONS.UPDATE,
    cartProductId,
    {
      id: cartProductId,
      cartId: params.cartId,
      name: params.name,
      priceUsd: toCents(params.priceUsd),
      priceBs: toCents(params.priceBs),
      quantity: params.quantity,
      userId,
    },
    userId
  );

  await recalcCartTotals(params.cartId);

  const now = new Date().toISOString();
  return {
    id: cartProductId,
    cartId: params.cartId,
    productId: cartProductId,
    name: params.name,
    priceBs: params.priceBs,
    priceUsd: params.priceUsd,
    imageUrl: params.imageUrl || null,
    quantity: params.quantity,
    isManualEntry: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCartProductQuantity(
  cartProductId: string,
  params: UpdateCartProductQuantityParams,
  userId?: string
): Promise<CartProductResponse> {
  await cartProductRepository.updateQuantity(cartProductId, params.quantity);

  await syncService.enqueueAndSync(
    SYNC_TABLES.CART_PRODUCTS,
    SYNC_ACTIONS.UPDATE,
    cartProductId,
    {
      id: cartProductId,
      cartId: params.cartId,
      quantity: params.quantity,
      userId,
    },
    userId
  );

  await recalcCartTotals(params.cartId);

  return {
    id: cartProductId,
    cartId: params.cartId,
    productId: cartProductId,
    name: '',
    priceBs: 0,
    priceUsd: 0,
    imageUrl: null,
    quantity: params.quantity,
    isManualEntry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function transformCartResponse(response: ApiCartResponse): ApiCartResponse {
  return {
    ...response,
    budgetBs: fromCentsNullable(response.budgetBs),
    budgetUsd: fromCentsNullable(response.budgetUsd),
    totalEstimatedBs:
      response.totalEstimatedBs !== null ? fromCents(response.totalEstimatedBs) : null,
    totalEstimatedUsd:
      response.totalEstimatedUsd !== null ? fromCents(response.totalEstimatedUsd) : null,
  };
}

export async function checkoutCart(cartId: string, userId?: string): Promise<ApiCartResponse> {
  try {
    const response = await apiPost<ApiResponse<ApiCartResponse>>(
      `/carts/${cartId}/checkout`,
      userId
    );
    if (response.success) {
      await cartRepository.update(cartId, { isActive: false });
    }
    return transformCartResponse(response.data);
  } catch {
    await cartRepository.update(cartId, { isActive: false });

    await syncService.enqueueAndSync(
      SYNC_TABLES.CARTS,
      SYNC_ACTIONS.UPDATE,
      cartId,
      { id: cartId, isActive: false, checkout: true, userId },
      userId
    );

    return {
      id: cartId,
      supermarketId: '',
      supermarketName: '',
      userId: userId || '',
      isActive: false,
      hasBudget: false,
      budgetBs: 0,
      budgetUsd: 0,
      totalEstimatedBs: null,
      totalEstimatedUsd: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function deleteCartProduct(cartProductId: string, userId?: string): Promise<void> {
  const existing = await cartProductRepository.getById(cartProductId);
  await cartProductRepository.delete(cartProductId);

  await syncService.enqueueAndSync(
    SYNC_TABLES.CART_PRODUCTS,
    SYNC_ACTIONS.DELETE,
    cartProductId,
    { id: cartProductId, userId },
    userId
  );

  if (existing) {
    await recalcCartTotals(existing.cartId);
  }
}
