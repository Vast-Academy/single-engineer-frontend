import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'stock_history';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class StockHistoryDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async listByItem(itemId, { limit = 50, offset = 0 } = {}) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE item_id = ? AND deleted = 0 ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`,
            [itemId, limit, offset]
        );
        return res.values || [];
    }

    async upsertOne(entry) {
        const now = new Date().toISOString();
        const id = entry.id || entry._id || `${entry.item_id}-stock-${Math.random().toString(16).slice(2)}`;
        if (!entry.item_id) {
            console.warn('Skipping stock history with no item_id', entry);
            return;
        }
        const existingRes = await this.db.query(`SELECT id, updated_at FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
        const existing = existingRes.values?.[0];
        const updated_at = entry.updated_at || now;
        const created_at = entry.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'item_id', 'qty', 'added_at', 'deleted', 'updated_at', 'created_at',
                    'client_id', 'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    id,
                    entry.item_id,
                    entry.qty || 0,
                    entry.added_at || entry.addedAt || now,
                    entry.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    entry.client_id || id,
                    entry.pending_sync ? 1 : 0,
                    entry.sync_op || null,
                    entry.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.update(
                    `item_id = ?, qty = ?, added_at = ?, deleted = ?, updated_at = ?, client_id = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                    [
                        entry.item_id,
                        entry.qty || 0,
                        entry.added_at || entry.addedAt || now,
                        entry.deleted ? 1 : 0,
                        updated_at,
                        entry.client_id || existing.client_id,
                        entry.pending_sync ? 1 : 0,
                        entry.sync_op || null,
                        entry.sync_error || null,
                        id
                    ],
                    'id = ?'
                );
            }
        }
    }

    async upsertMany(entries) {
        for (const e of entries) {
            if (!e.item_id && !e.itemId) {
                console.warn('Skipping stock history with no item_id', e);
                continue;
            }
            const mapped = {
                id: e._id || e.id,
                item_id: e.item_id || e.itemId,
                qty: e.qty || 0,
                added_at: e.added_at || e.addedAt || null,
                deleted: e.deleted || false,
                updated_at: e.updatedAt || e.updated_at,
                created_at: e.createdAt || e.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(entry) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id', 'item_id', 'qty', 'added_at', 'deleted', 'updated_at', 'created_at',
                'client_id', 'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                entry.id,
                entry.item_id,
                entry.qty || 0,
                entry.added_at || now,
                entry.deleted ? 1 : 0,
                entry.updated_at || now,
                entry.created_at || now,
                entry.client_id || entry.id,
                1,
                entry.sync_op || 'create',
                entry.sync_error || null
            ]
        );
    }

    async markPendingDelete(id) {
        const now = new Date().toISOString();
        await this.update(
            'deleted = 1, pending_sync = 1, sync_op = \'delete\', sync_error = NULL, updated_at = ?',
            [now, id],
            'id = ?'
        );
    }

    async markSynced(localId, serverId) {
        await this.update(
            'id = ?, pending_sync = 0, sync_op = NULL, sync_error = NULL',
            [serverId || localId, localId],
            'id = ?'
        );
    }

    async markSyncError(id, message) {
        await this.update(
            'sync_error = ?, pending_sync = 1',
            [message || 'Sync error', id],
            'id = ?'
        );
    }

    async getPending() {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE pending_sync = 1 ORDER BY datetime(updated_at) ASC`
        );
        return res.values || [];
    }
}

let stockDao;

export const getStockHistoryDao = async () => {
    if (stockDao) return stockDao;
    const db = await initStorage();
    stockDao = new StockHistoryDao(db);
    return stockDao;
};

export default getStockHistoryDao;
