import { apiPost } from './api';
import { syncQueue } from '../lib/local/syncQueue';
import { cartRepository } from '../lib/local/repositories/cartRepository';
import { cartProductRepository } from '../lib/local/repositories/cartProductRepository';
import { supermarketRepository } from '../lib/local/repositories/supermarketRepository';
import { useCartStore } from '../store/cartStore';
import type { ApiResponse } from '../types';
import {
  SYNC_ACTIONS,
  SYNC_TABLES,
  type SyncAction,
  type SyncOperation,
  type SyncResponse,
  type SyncTable,
} from '../types/sync';

let isSyncing = false;
let isFlushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function isNetworkReachable(): Promise<boolean> {
  try {
    const network = await import('expo-network');
    const state = await network.getNetworkStateAsync();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

// Drains the sync queue without blocking callers. Keeps going while work was
// enqueued mid-sync, but never spins forever on repeated failures.
async function drainQueue(userId?: string): Promise<void> {
  if (isFlushing) return;
  if (!(await isNetworkReachable())) return;

  isFlushing = true;
  try {
    for (let i = 0; i < 5; i++) {
      const { synced, failed } = await syncService.syncAll(userId);
      if (failed > 0 || synced === 0) break;
      const pending = await syncQueue.getPendingCount();
      if (pending === 0) break;
    }
  } finally {
    isFlushing = false;
  }
}

export const syncService = {
  async syncAll(userId?: string): Promise<{
    synced: number;
    failed: number;
    serverVersions: Record<string, Record<string, unknown>>;
  }> {
    if (isSyncing) return { synced: 0, failed: 0, serverVersions: {} };
    isSyncing = true;

    try {
      const t0 = Date.now();
      await syncQueue.resetStuck();
      await syncQueue.clearFailed();
      const pending = await syncQueue.getPending(50);
      console.log('[syncService] syncAll start', { ops: pending.length, t: Date.now() - t0 });

      if (pending.length === 0) {
        return { synced: 0, failed: 0, serverVersions: {} };
      }

      const operations: SyncOperation[] = pending.map(item => ({
        table: item.tableName,
        action: item.action,
        payload: JSON.parse(item.payload),
        timestamp: new Date(item.createdAt).getTime(),
        localId: item.localId,
      }));

      for (const item of pending) {
        await syncQueue.markSyncing(item.id);
      }

      let synced = 0;
      let failed = 0;
      const serverVersions: Record<string, Record<string, unknown>> = {};

      try {
        const response = await apiPost<ApiResponse<SyncResponse>>('/sync', userId, { operations });
        const results = response.data?.results ?? [];

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const item = pending[i];
          if (!item) continue;

          if (result.success) {
            await syncQueue.markCompleted(item.id);

            if (result.serverVersion) {
              await handleServerVersion(item, result.serverVersion);
              serverVersions[item.localId] = result.serverVersion;
            }

            synced++;
          } else {
            console.warn('[syncService] op failed', {
              table: item.tableName,
              action: item.action,
              localId: item.localId,
              error: result.error,
            });
            await syncQueue.markFailed(item.id, result.error || 'Unknown error');
            failed++;
          }
        }

        // Defensive: if the server returned fewer results than ops sent, fail the
        // remaining ops so they are retried instead of being dropped.
        for (let i = results.length; i < pending.length; i++) {
          await syncQueue.markFailed(pending[i].id, 'no result from server');
          failed++;
        }
      } catch (err) {
        console.warn('[syncService] syncAll request error', err);
        for (const item of pending) {
          await syncQueue.markFailed(item.id, 'sync_error');
        }
        failed = pending.length;
      }

      console.log('[syncService] syncAll done', {
        ops: pending.length,
        synced,
        failed,
        ms: Date.now() - t0,
      });
      return { synced, failed, serverVersions };
    } finally {
      isSyncing = false;
    }
  },

  async enqueueAndSync(
    table: SyncTable,
    action: SyncAction,
    localId: string,
    payload: Record<string, unknown>,
    userId?: string
  ): Promise<Record<string, unknown> | undefined> {
    await syncQueue.enqueue(table, action, localId, payload);

    try {
      const t0 = Date.now();
      const network = await import('expo-network');
      const state = await network.getNetworkStateAsync();
      console.log('[syncService] enqueueAndSync', {
        table,
        action,
        localId,
        networkMs: Date.now() - t0,
        connected: state.isConnected,
        reachable: state.isInternetReachable,
      });
      if (state.isConnected && state.isInternetReachable !== false) {
        const result = await this.syncAll(userId);
        return result.serverVersions[localId];
      }
    } catch {
      // offline, will sync later
    }

    return undefined;
  },

  async getPendingCount(): Promise<number> {
    return syncQueue.getPendingCount();
  },

  // Queue a mutation without touching the network. Callers return to the UI
  // immediately; the op is flushed in the background.
  async enqueue(
    table: SyncTable,
    action: SyncAction,
    localId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await syncQueue.enqueue(table, action, localId, payload);
  },

  // Fire-and-forget flush so mutations never block on the network. Debounced to
  // coalesce bursts, then drains the queue when connectivity allows.
  flushInBackground(userId?: string): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void drainQueue(userId);
    }, 300);
  },

  isSyncing(): boolean {
    return isSyncing;
  },
};

async function handleServerVersion(
  item: { tableName: SyncTable; localId: string; action: SyncAction },
  serverVersion: Record<string, unknown>
): Promise<void> {
  const serverId = serverVersion.id as string;
  if (!serverId) return;

  if (item.tableName === SYNC_TABLES.CARTS && item.action === SYNC_ACTIONS.INSERT) {
    await cartRepository.replaceId(item.localId, serverId);
    reconcileCartId(item.localId, serverId);
  }

  if (item.tableName === SYNC_TABLES.SUPERMARKETS && item.action === SYNC_ACTIONS.INSERT) {
    await supermarketRepository.replaceId(item.localId, serverId);
  }

  if (item.tableName === SYNC_TABLES.CART_PRODUCTS && item.action === SYNC_ACTIONS.INSERT) {
    const serverProductId = serverVersion.productId as string | undefined;
    await cartProductRepository.replaceId(item.localId, serverId, serverProductId);
    reconcileCartProductId(item.localId, serverId, serverProductId);
  }
}

// After a cart is synced, the server assigns its own id. Reconcile the zustand
// store (and active cart) so subsequent product ops target the server cart.
function reconcileCartId(localId: string, serverId: string): void {
  const { carts, activeCartId, updateCart, setActiveCart } = useCartStore.getState();
  if (carts.some(cart => cart.id === localId)) {
    updateCart(localId, { id: serverId });
    if (activeCartId === localId) {
      setActiveCart(serverId);
    }
  }
}

// After a cart product is synced, the server assigns its own id. Reconcile the
// zustand store so subsequent update/delete ops target the server cart product.
function reconcileCartProductId(localId: string, serverId: string, serverProductId?: string): void {
  const { carts, updateCart } = useCartStore.getState();
  for (const cart of carts) {
    if (!cart.products.some(p => p.id === localId)) continue;
    const products = cart.products.map(p =>
      p.id === localId ? { ...p, id: serverId, productId: serverProductId || p.productId } : p
    );
    console.log('[syncService] reconcileCartProductId', {
      cartId: cart.id,
      localId,
      serverId,
      serverProductId,
    });
    updateCart(cart.id, { products });
    break;
  }
}
