import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'items';
const SERIAL_TABLE = 'serial_numbers';
const STOCK_TABLE = 'stock_history';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class ItemsDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async list({ limit = 50, offset = 0 } = {}) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE deleted = 0 ORDER BY datetime(updated_at) DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return res.values || [];
    }

    async getById(id) {
        const res = await this.db.query(`SELECT * FROM ${TABLE} WHERE id = ? AND deleted = 0 LIMIT 1`, [id]);
        const item = res.values?.[0];
        if (!item) return null;
        item.serialNumbers = await this.getSerialsByItem(id);
        item.stockHistory = await this.getStockHistoryByItem(id);
        return item;
    }

    async getSerialsByItem(itemId) {
        const res = await this.db.query(
            `SELECT * FROM ${SERIAL_TABLE} WHERE item_id = ? AND deleted = 0 ORDER BY datetime(created_at) DESC`,
            [itemId]
        );
        return res.values || [];
    }

    async getStockHistoryByItem(itemId) {
        const res = await this.db.query(
            `SELECT * FROM ${STOCK_TABLE} WHERE item_id = ? AND deleted = 0 ORDER BY datetime(created_at) DESC`,
            [itemId]
        );
        return res.values || [];
    }

    async upsertOne(item) {
        const now = new Date().toISOString();
        const existingRes = await this.db.query(`SELECT id, updated_at FROM ${TABLE} WHERE id = ? LIMIT 1`, [item.id]);
        const existing = existingRes.values?.[0];
        const updated_at = item.updated_at || now;
        const created_at = item.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'client_id', 'item_type', 'item_name', 'unit', 'warranty', 'mrp', 'purchase_price',
                    'sale_price', 'stock_qty', 'created_by', 'deleted', 'updated_at', 'created_at',
                    'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    item.id,
                    safeVal(item.client_id, item.id),
                    item.item_type || 'generic',
                    item.item_name || '',
                    item.unit || '',
                    safeVal(item.warranty, ''),
                    item.mrp || 0,
                    item.purchase_price || 0,
                    item.sale_price || 0,
                    item.stock_qty || 0,
                    safeVal(item.created_by, null),
                    item.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    item.pending_sync ? 1 : 0,
                    item.sync_op || null,
                    item.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.update(
                    `client_id = ?, item_type = ?, item_name = ?, unit = ?, warranty = ?, mrp = ?, purchase_price = ?, sale_price = ?, stock_qty = ?, created_by = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                    [
                        safeVal(item.client_id, existing.client_id),
                        item.item_type || existing.item_type || 'generic',
                        item.item_name || existing.item_name || '',
                        item.unit || existing.unit || '',
                        safeVal(item.warranty, existing.warranty ?? ''),
                        item.mrp ?? existing.mrp ?? 0,
                        item.purchase_price ?? existing.purchase_price ?? 0,
                        item.sale_price ?? existing.sale_price ?? 0,
                        item.stock_qty ?? existing.stock_qty ?? 0,
                        item.created_by || existing.created_by || null,
                        item.deleted ? 1 : 0,
                        updated_at,
                        item.pending_sync ? 1 : 0,
                        item.sync_op || null,
                        item.sync_error || null,
                        item.id
                    ],
                    'id = ?'
                );
            }
        }

        if (Array.isArray(item.serialNumbers)) {
            for (const sn of item.serialNumbers) {
                await this.upsertSerial({ ...sn, item_id: item.id });
            }
        }
        if (Array.isArray(item.stockHistory)) {
            for (const sh of item.stockHistory) {
                await this.upsertStockHistory({ ...sh, item_id: item.id });
            }
        }
    }

    async upsertMany(items) {
        for (const it of items) {
            const itemId = it._id || it.id;
            if (!itemId) {
                console.warn('Skipping item with no id/_id', it);
                continue;
            }
            const mapped = {
                id: itemId,
                client_id: it.client_id,
                item_type: it.itemType || it.item_type || 'generic',
                item_name: it.itemName || it.item_name || '',
                unit: it.unit || '',
                warranty: it.warranty || '',
                mrp: it.mrp || 0,
                purchase_price: it.purchasePrice || it.purchase_price || 0,
                sale_price: it.salePrice || it.sale_price || 0,
                stock_qty: it.stockQty || it.stock_qty || 0,
                created_by: it.createdBy || it.created_by || null,
                deleted: it.deleted || false,
                updated_at: it.updatedAt || it.updated_at,
                created_at: it.createdAt || it.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null,
                serialNumbers: it.serialNumbers,
                stockHistory: it.stockHistory
            };
            await this.upsertOne(mapped);
        }
    }

    async upsertSerial(serial) {
        const now = new Date().toISOString();
        const serialNo = serial.serialNo || serial.serial_no;

        if (!serial.item_id || !serialNo) {
            console.warn('Skipping serial with no item_id or serial_no', serial);
            return;
        }

        // FIXED: Check by serial_no first to avoid UNIQUE constraint violation
        const existingBySerial = await this.db.query(
            `SELECT id, updated_at FROM ${SERIAL_TABLE} WHERE serial_no = ? AND deleted = 0 LIMIT 1`,
            [serialNo]
        );
        const existing = existingBySerial.values?.[0];

        const id = existing?.id || serial.id || serial._id || `${serial.item_id}-sn-${serialNo}`;
        const updated_at = serial.updated_at || now;
        const created_at = serial.created_at || now;

        if (!existing) {
            // INSERT new serial
            await this.db.run(
                `INSERT INTO ${SERIAL_TABLE} (
                    id, item_id, serial_no, status, customer_name, bill_number, added_at,
                    deleted, updated_at, created_at, client_id, pending_sync, sync_op, sync_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    serial.item_id,
                    serialNo,
                    serial.status || 'available',
                    serial.customer_name || serial.customerName || null,
                    serial.bill_number || serial.billNumber || null,
                    serial.added_at || serial.addedAt || now,
                    serial.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    serial.client_id || id,
                    serial.pending_sync ? 1 : 0,
                    serial.sync_op || null,
                    serial.sync_error || null
                ]
            );
        } else {
            // UPDATE existing serial
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.db.run(
                    `UPDATE ${SERIAL_TABLE} SET
                        item_id = ?, serial_no = ?, status = ?, customer_name = ?, bill_number = ?, added_at = ?,
                        deleted = ?, updated_at = ?, client_id = ?, pending_sync = ?, sync_op = ?, sync_error = ?
                     WHERE id = ?`,
                    [
                        serial.item_id,
                        serialNo,
                        serial.status || 'available',
                        serial.customer_name || serial.customerName || null,
                        serial.bill_number || serial.billNumber || null,
                        serial.added_at || serial.addedAt || now,
                        serial.deleted ? 1 : 0,
                        updated_at,
                        serial.client_id || existing.client_id || id,
                        serial.pending_sync ? 1 : 0,
                        serial.sync_op || null,
                        serial.sync_error || null,
                        id
                    ]
                );
            }
        }
    }

    async upsertStockHistory(entry) {
        const now = new Date().toISOString();
        const id = entry.id || entry._id || `${entry.item_id}-stock-${Math.random().toString(16).slice(2)}`;
        if (!entry.item_id) {
            console.warn('Skipping stock history with no item_id', entry);
            return;
        }
        const existingRes = await this.db.query(`SELECT id, updated_at FROM ${STOCK_TABLE} WHERE id = ? LIMIT 1`, [id]);
        const existing = existingRes.values?.[0];
        const updated_at = entry.updated_at || now;
        const created_at = entry.created_at || now;

        if (!existing) {
            await this.db.run(
                `INSERT INTO ${STOCK_TABLE} (
                    id, item_id, qty, added_at, deleted, updated_at, created_at, client_id, pending_sync, sync_op, sync_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                await this.db.run(
                    `UPDATE ${STOCK_TABLE} SET
                        item_id = ?, qty = ?, added_at = ?, deleted = ?, updated_at = ?, client_id = ?, pending_sync = ?, sync_op = ?, sync_error = ?
                     WHERE id = ?`,
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
                    ]
                );
            }
        }
    }

    async insertLocal(item) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id', 'client_id', 'item_type', 'item_name', 'unit', 'warranty', 'mrp', 'purchase_price',
                'sale_price', 'stock_qty', 'created_by', 'deleted', 'updated_at', 'created_at',
                'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                item.id,
                item.client_id || item.id,
                item.item_type,
                item.item_name,
                item.unit,
                item.warranty,
                item.mrp,
                item.purchase_price,
                item.sale_price,
                item.stock_qty || 0,
                item.created_by || null,
                item.deleted ? 1 : 0,
                item.updated_at || now,
                item.created_at || now,
                1,
                item.sync_op || 'create',
                item.sync_error || null
            ]
        );
    }

    async markPendingUpdate(id, updates) {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];
        const map = {
            item_name: 'item_name',
            unit: 'unit',
            warranty: 'warranty',
            mrp: 'mrp',
            purchase_price: 'purchase_price',
            sale_price: 'sale_price',
            stock_qty: 'stock_qty'
        };
        Object.entries(map).forEach(([key, col]) => {
            if (updates[key] !== undefined) {
                fields.push(`${col} = ?`);
                params.push(updates[key]);
            }
        });
        fields.push('pending_sync = 1', 'sync_op = \'update\'', 'sync_error = NULL', 'updated_at = ?');
        params.push(now, id);
        await this.update(fields.join(', '), params, 'id = ?');
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

let itemsDao;

export const getItemsDao = async () => {
    if (itemsDao) return itemsDao;
    const db = await initStorage();
    itemsDao = new ItemsDao(db);
    return itemsDao;
};

export default getItemsDao;
