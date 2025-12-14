import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'serial_numbers';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class SerialNumbersDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async listByItem(itemId) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE item_id = ? AND deleted = 0 ORDER BY datetime(created_at) DESC`,
            [itemId]
        );
        return res.values || [];
    }

    async getBySerial(serialNo) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE serial_no = ? AND deleted = 0 LIMIT 1`,
            [serialNo]
        );
        return res.values?.[0] || null;
    }

    async upsertOne(sn) {
        const now = new Date().toISOString();
        const id = sn.id || sn._id || `${sn.item_id}-sn-${sn.serial_no || sn.serialNo || Math.random().toString(16).slice(2)}`;
        if (!sn.item_id) {
            console.warn('Skipping serial with no item_id', sn);
            return;
        }
        const existingRes = await this.db.query(`SELECT id, updated_at FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
        const existing = existingRes.values?.[0];
        const updated_at = sn.updated_at || now;
        const created_at = sn.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'item_id', 'serial_no', 'status', 'customer_name', 'bill_number', 'added_at',
                    'deleted', 'updated_at', 'created_at', 'client_id', 'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    id,
                    sn.item_id,
                    sn.serial_no || sn.serialNo || '',
                    sn.status || 'available',
                    sn.customer_name || sn.customerName || null,
                    sn.bill_number || sn.billNumber || null,
                    sn.added_at || sn.addedAt || now,
                    sn.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    sn.client_id || id,
                    sn.pending_sync ? 1 : 0,
                    sn.sync_op || null,
                    sn.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.update(
                    `item_id = ?, serial_no = ?, status = ?, customer_name = ?, bill_number = ?, added_at = ?, deleted = ?, updated_at = ?, client_id = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                    [
                        sn.item_id,
                        sn.serial_no || sn.serialNo || '',
                        sn.status || 'available',
                        sn.customer_name || sn.customerName || null,
                        sn.bill_number || sn.billNumber || null,
                        sn.added_at || sn.addedAt || now,
                        sn.deleted ? 1 : 0,
                        updated_at,
                        sn.client_id || existing.client_id,
                        sn.pending_sync ? 1 : 0,
                        sn.sync_op || null,
                        sn.sync_error || null,
                        id
                    ],
                    'id = ?'
                );
            }
        }
    }

    async upsertMany(serials) {
        const now = new Date().toISOString();
        for (const sn of serials) {
            const serialId = sn._id || sn.id;
            if (!sn.item_id && !sn.itemId) {
                console.warn('Skipping serial with no item_id', sn);
                continue;
            }
            const mapped = {
                id: serialId,
                item_id: sn.item_id || sn.itemId,
                serial_no: sn.serial_no || sn.serialNo || '',
                status: sn.status || 'available',
                customer_name: sn.customer_name || sn.customerName || null,
                bill_number: sn.bill_number || sn.billNumber || null,
                added_at: sn.added_at || sn.addedAt || now,
                deleted: sn.deleted || false,
                updated_at: sn.updatedAt || sn.updated_at,
                created_at: sn.createdAt || sn.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(sn) {
        const now = new Date().toISOString();
        if (!sn.item_id) {
            console.warn('Skipping serial insert with no item_id', sn);
            return;
        }
        await this.insert(
            [
                'id', 'item_id', 'serial_no', 'status', 'customer_name', 'bill_number', 'added_at',
                'deleted', 'updated_at', 'created_at', 'client_id', 'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                sn.id,
                sn.item_id,
                sn.serial_no || '',
                sn.status || 'available',
                sn.customer_name || null,
                sn.bill_number || null,
                sn.added_at || now,
                sn.deleted ? 1 : 0,
                sn.updated_at || now,
                sn.created_at || now,
                sn.client_id || sn.id,
                1,
                sn.sync_op || 'create',
                sn.sync_error || null
            ]
        );
    }

    async markPendingUpdate(id, updates) {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];
        const map = {
            status: 'status',
            customer_name: 'customer_name',
            bill_number: 'bill_number'
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

    async markPendingUpdateBySerial(serialNo, updates) {
        const existing = await this.getBySerial(serialNo);
        if (!existing) {
            console.warn('Serial not found:', serialNo);
            return;
        }
        await this.markPendingUpdate(existing.id, updates);
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

let serialDao;

export const getSerialNumbersDao = async () => {
    if (serialDao) return serialDao;
    const db = await initStorage();
    serialDao = new SerialNumbersDao(db);
    return serialDao;
};

export default getSerialNumbersDao;
