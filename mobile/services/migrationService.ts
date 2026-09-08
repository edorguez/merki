import { getDb } from '../lib/local/database';
import { cartRepository } from '../lib/local/repositories/cartRepository';
import { cartProductRepository } from '../lib/local/repositories/cartProductRepository';
import { syncQueue } from '../lib/local/syncQueue';
import { syncService } from './syncService';
import { toCents } from '../utils/priceUtils';
import { SYNC_ACTIONS, SYNC_TABLES } from '../types/sync';

export const migrationService = {
  async migrateGuestData(
    oldUserId: string,
    newUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const unsyncedCarts = (await cartRepository.getAll(oldUserId)).filter(
        cart => cart.syncedAt === null && cart.id.startsWith('local_')
      );

      const database = await getDb();
      await database.runAsync('UPDATE carts SET user_id = ? WHERE user_id = ?', [
        newUserId,
        oldUserId,
      ]);
      await database.runAsync('UPDATE supermarkets SET user_id = ? WHERE user_id = ?', [
        newUserId,
        oldUserId,
      ]);
      await syncQueue.rewriteUserId(oldUserId, newUserId);

      for (const cart of unsyncedCarts) {
        const alreadyQueued = await syncQueue.hasPendingOp(SYNC_TABLES.CARTS, cart.id);
        if (alreadyQueued) continue;

        const isCustom = cart.supermarketId.startsWith('local_');
        await syncQueue.enqueue(SYNC_TABLES.CARTS, SYNC_ACTIONS.INSERT, cart.id, {
          id: cart.id,
          supermarketId: isCustom ? undefined : cart.supermarketId,
          newSupermarket: isCustom ? { name: cart.supermarketName } : undefined,
          hasBudget: cart.hasBudget,
          budgetBs: cart.hasBudget ? toCents(cart.budgetBs) : null,
          budgetUsd: cart.hasBudget ? toCents(cart.budgetUsd) : null,
          userId: newUserId,
        });

        // Carry the cart's products so migrated carts are not empty.
        const products = await cartProductRepository.getByCartId(cart.id);
        for (const product of products) {
          const productAlreadyQueued = await syncQueue.hasPendingOp(
            SYNC_TABLES.CART_PRODUCTS,
            product.id
          );
          if (productAlreadyQueued) continue;

          await syncQueue.enqueue(SYNC_TABLES.CART_PRODUCTS, SYNC_ACTIONS.INSERT, product.id, {
            id: product.id,
            cartId: cart.id,
            supermarketId: cart.supermarketId,
            name: product.name,
            priceUsd: toCents(product.priceUsd),
            priceBs: toCents(product.priceBs),
            quantity: product.quantity,
            isManualEntry: product.isManualEntry,
            imageUrl: product.imageUrl || null,
            userId: newUserId,
          });
        }
      }

      await syncService.syncAll(newUserId);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Migration failed',
      };
    }
  },
};
