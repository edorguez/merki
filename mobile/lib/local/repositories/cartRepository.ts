import { getDb, generateLocalId } from '../database';

export interface LocalCart {
  id: string;
  supermarketId: string;
  supermarketName: string;
  userId?: string;
  isActive: boolean;
  hasBudget: boolean;
  budgetBs: number;
  budgetUsd: number;
  totalEstimatedBs: number | null;
  totalEstimatedUsd: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncedAt: string | null;
}

export interface LocalCartWithProducts extends LocalCart {
  products: LocalCartProduct[];
}

export interface LocalCartProduct {
  id: string;
  cartId: string;
  productId: string | null;
  name: string;
  priceBs: number;
  priceUsd: number;
  quantity: number;
  isManualEntry: boolean;
  imageUrl: string | null;
  supermarket: string;
  createdAt: string;
  updatedAt: string;
}

// expo-sqlite returns rows keyed by snake_case column names; alias them so the
// camelCase interface fields are populated.
const CART_COLUMNS = `id, supermarket_id AS supermarketId, supermarket_name AS supermarketName, user_id AS userId, is_active AS isActive, has_budget AS hasBudget, budget_bs AS budgetBs, budget_usd AS budgetUsd, total_estimated_bs AS totalEstimatedBs, total_estimated_usd AS totalEstimatedUsd, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt, synced_at AS syncedAt`;

export const CART_PRODUCT_COLUMNS = `id, cart_id AS cartId, product_id AS productId, name, price_bs AS priceBs, price_usd AS priceUsd, quantity, is_manual_entry AS isManualEntry, image_url AS imageUrl, supermarket, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`;

export const cartRepository = {
  async getAll(userId?: string): Promise<LocalCart[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<LocalCart>(
      `SELECT ${CART_COLUMNS} FROM carts WHERE deleted_at IS NULL ${
        userId ? 'AND user_id = ?' : ''
      } ORDER BY created_at DESC`,
      userId ? [userId] : []
    );
    return rows.map(r => ({
      ...r,
      isActive: Boolean(r.isActive),
      hasBudget: Boolean(r.hasBudget),
    }));
  },

  async getById(id: string): Promise<LocalCartWithProducts | null> {
    const database = await getDb();
    const cart = await database.getFirstAsync<LocalCart>(
      `SELECT ${CART_COLUMNS} FROM carts WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!cart) return null;

    const products = await database.getAllAsync<LocalCartProduct>(
      `SELECT ${CART_PRODUCT_COLUMNS} FROM cart_products WHERE cart_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
      [id]
    );

    return {
      ...cart,
      isActive: Boolean(cart.isActive),
      hasBudget: Boolean(cart.hasBudget),
      products: products.map(p => ({
        ...p,
        isManualEntry: Boolean(p.isManualEntry),
      })),
    };
  },

  async upsert(cart: {
    id?: string;
    supermarketId: string;
    supermarketName: string;
    userId?: string;
    isActive?: boolean;
    hasBudget?: boolean;
    budgetBs: number;
    budgetUsd: number;
  }): Promise<LocalCart> {
    const database = await getDb();
    const id = cart.id || generateLocalId();
    const now = new Date().toISOString();

    const existing = await database.getFirstAsync<LocalCart>(
      `SELECT ${CART_COLUMNS} FROM carts WHERE id = ?`,
      [id]
    );

    if (existing) {
      await database.runAsync(
        `UPDATE carts SET
          supermarket_id = ?, supermarket_name = ?, is_active = ?, has_budget = ?,
          budget_bs = ?, budget_usd = ?,
          total_estimated_bs = ?, total_estimated_usd = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          cart.supermarketId,
          cart.supermarketName,
          cart.isActive !== false ? 1 : 0,
          cart.hasBudget !== false ? 1 : 0,
          cart.budgetBs,
          cart.budgetUsd,
          existing.totalEstimatedBs,
          existing.totalEstimatedUsd,
          now,
          id,
        ]
      );
    } else {
      await database.runAsync(
        `INSERT INTO carts (id, supermarket_id, supermarket_name, user_id, is_active, has_budget, budget_bs, budget_usd, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          cart.supermarketId,
          cart.supermarketName,
          cart.userId || null,
          cart.isActive !== false ? 1 : 0,
          cart.hasBudget !== false ? 1 : 0,
          cart.budgetBs,
          cart.budgetUsd,
          now,
          now,
        ]
      );
    }

    return (await this.getById(id))!;
  },

  async update(id: string, updates: Partial<LocalCart>): Promise<void> {
    const database = await getDb();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.hasBudget !== undefined) {
      fields.push('has_budget = ?');
      values.push(updates.hasBudget ? 1 : 0);
    }
    if (updates.budgetBs !== undefined) {
      fields.push('budget_bs = ?');
      values.push(updates.budgetBs);
    }
    if (updates.budgetUsd !== undefined) {
      fields.push('budget_usd = ?');
      values.push(updates.budgetUsd);
    }
    if (updates.totalEstimatedBs !== undefined) {
      fields.push('total_estimated_bs = ?');
      values.push(updates.totalEstimatedBs);
    }
    if (updates.totalEstimatedUsd !== undefined) {
      fields.push('total_estimated_usd = ?');
      values.push(updates.totalEstimatedUsd);
    }
    if (updates.syncedAt !== undefined) {
      fields.push('synced_at = ?');
      values.push(updates.syncedAt);
    }
    if (updates.supermarketName !== undefined) {
      fields.push('supermarket_name = ?');
      values.push(updates.supermarketName);
    }
    if (updates.supermarketId !== undefined) {
      fields.push('supermarket_id = ?');
      values.push(updates.supermarketId);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 1) {
      await database.runAsync(
        `UPDATE carts SET ${fields.join(', ')} WHERE id = ?`,
        values as (string | number | null)[]
      );
    }
  },

  async delete(id: string): Promise<void> {
    const database = await getDb();
    const now = new Date().toISOString();
    await database.runAsync('UPDATE carts SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id,
    ]);
    await database.runAsync('UPDATE cart_products SET deleted_at = ? WHERE cart_id = ?', [now, id]);
  },

  async getActive(userId?: string): Promise<LocalCart[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<LocalCart>(
      `SELECT ${CART_COLUMNS} FROM carts WHERE is_active = 1 AND deleted_at IS NULL ${
        userId ? 'AND user_id = ?' : ''
      } ORDER BY created_at DESC`,
      userId ? [userId] : []
    );
    return rows.map(r => ({
      ...r,
      isActive: true,
      hasBudget: Boolean(r.hasBudget),
    }));
  },

  async markSynced(localId: string, serverId: string): Promise<void> {
    const database = await getDb();
    const now = new Date().toISOString();
    await database.runAsync(`UPDATE cart_products SET cart_id = ? WHERE cart_id = ?`, [
      serverId,
      localId,
    ]);
    await database.runAsync(`UPDATE carts SET id = ?, synced_at = ?, updated_at = ? WHERE id = ?`, [
      serverId,
      now,
      now,
      localId,
    ]);
  },

  async replaceId(oldId: string, newId: string): Promise<void> {
    const database = await getDb();
    await database.runAsync('UPDATE cart_products SET cart_id = ? WHERE cart_id = ?', [
      newId,
      oldId,
    ]);
    await database.runAsync('UPDATE carts SET id = ?, updated_at = ? WHERE id = ?', [
      newId,
      new Date().toISOString(),
      oldId,
    ]);
  },
};
