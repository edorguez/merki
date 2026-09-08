export interface User {
  id: string;
  email: string;
  authProvider: 'email' | 'google' | 'guest';
  isPremium: boolean;
  isAnonymous: boolean;
  premiumUntil?: Date;
  lastSyncAt?: Date;
}

export interface Supermarket {
  id: string;
  name: string;
  chain?: string;
  isCustom: boolean;
}

export interface ApiSupermarketResponse {
  id: string;
  name: string;
  isCustom: boolean;
  imageUrl: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  category?: string;
  isWeightBased: boolean;
}

export interface Price {
  id: string;
  productId: string;
  supermarketId: string;
  priceBolivares: number;
  priceUsd: number;
  reportedBy: string;
  confidenceScore: number;
  reportsCount: number;
  capturedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  supermarketId: string;
  status: 'active' | 'completed' | 'archived';
  budgetBs: number;
  budgetUsd: number;
  totalEstimatedBs: number;
  totalEstimatedUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartProduct {
  id: string;
  cartId: string;
  productId: string;
  priceSnapshotBs: number;
  priceSnapshotUsd: number;
  quantity: number;
  isManualEntry: boolean;
  productImageUrl?: string;
  addedAt: Date;
  updatedAt: Date;
}

export interface ApiCartResponse {
  id: string;
  supermarketId: string;
  supermarketName: string;
  userId: string;
  isActive: boolean;
  hasBudget: boolean;
  budgetBs: number | null;
  budgetUsd: number | null;
  totalEstimatedBs: number | null;
  totalEstimatedUsd: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCartProductResponse {
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

export interface ApiCartDetailResponse {
  id: string;
  supermarketId: string;
  supermarketName: string;
  userId: string;
  isActive: boolean;
  hasBudget: boolean;
  budgetBs: number | null;
  budgetUsd: number | null;
  totalEstimatedBs: number | null;
  totalEstimatedUsd: number | null;
  createdAt: string;
  updatedAt: string;
  products: ApiCartProductResponse[];
}

export interface BCVRateResponse {
  id: string;
  usdRate: number;
  eurRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
