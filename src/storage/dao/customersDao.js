import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'customers';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class CustomersDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async list({ search = '', limit = 50, offset = 0 } = {}) {
        const clauses = ['deleted = 0'];
        const params = [];

        if (search) {
            clauses.push('(customer_name LIKE ? OR phone_number LIKE ?)');
            const pattern = `%${search}%`;
            params.push(pattern, pattern);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const query = `
            SELECT *
            FROM ${TABLE}
            ${where}
            ORDER BY datetime(updated_at) DESC
            LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const res = await this.db.query(query, params);
        return res.values || [];
    }

    async getById(id) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE id = ? AND deleted = 0 LIMIT 1`,
            [id]
        );
        return res.values?.[0] || null;
    }

    async upsertOne(customer) {
        const now = new Date().toISOString();
        const existing = await this.getById(customer.id);
        const updated_at = customer.updated_at || now;
        const created_at = customer.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id',
                    'client_id',
                    'customer_name',
                    'phone_number',
                    'whatsapp_number',
                    'address',
                    'created_by',
                    'deleted',
                    'updated_at',
                    'created_at',
                    'pending_sync',
                    'sync_op',
                    'sync_error'
                ],
                [
                    customer.id,
                    safeVal(customer.client_id, customer.id),
                    customer.customer_name || '',
                    customer.phone_number || '',
                    customer.whatsapp_number || '',
                    customer.address || '',
                    safeVal(customer.created_by, null),
                    customer.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    customer.pending_sync ? 1 : 0,
                    customer.sync_op || null,
                    customer.sync_error || null
                ]
            );
            return;
        }

        // Only overwrite if incoming is newer or equal
        const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
        if (incomingIsNewer) {
            await this.update(
                `client_id = ?, customer_name = ?, phone_number = ?, whatsapp_number = ?, address = ?, created_by = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                [
                    customer.client_id || null,
                    customer.customer_name || '',
                    customer.phone_number || '',
                    customer.whatsapp_number || '',
                    customer.address || '',
                    safeVal(customer.created_by, existing.created_by ?? null),
                    customer.deleted ? 1 : 0,
                    updated_at,
                    customer.pending_sync ? 1 : 0,
                    customer.sync_op || null,
                    customer.sync_error || null,
                    customer.id
                ],
                'id = ?'
            );
        }
    }

    async upsertMany(customers) {
        for (const c of customers) {
            const customerId = c._id || c.id;
            if (!customerId) {
                console.warn('Skipping customer with no id/_id', c);
                continue;
            }
            // Map backend fields to local schema if needed
            const mapped = {
                id: customerId,
                client_id: c.client_id,
                customer_name: c.customerName || c.customer_name || '',
                phone_number: c.phoneNumber || c.phone_number || '',
                whatsapp_number: c.whatsappNumber || c.whatsapp_number || '',
                address: c.address || '',
                created_by: c.createdBy || c.created_by || null,
                deleted: c.deleted || false,
                updated_at: c.updatedAt || c.updated_at,
                created_at: c.createdAt || c.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(customer) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id',
                'client_id',
                'customer_name',
                'phone_number',
                'whatsapp_number',
                'address',
                'created_by',
                'deleted',
                'updated_at',
                'created_at',
                'pending_sync',
                'sync_op',
                'sync_error'
            ],
            [
                customer.id,
                customer.client_id || customer.id,
                customer.customer_name || '',
                customer.phone_number || '',
                customer.whatsapp_number || '',
                customer.address || '',
                customer.created_by || null,
                customer.deleted ? 1 : 0,
                customer.updated_at || now,
                customer.created_at || now,
                1, // pending
                'create',
                null
            ]
        );
    }

    async markPendingUpdate(id, updates) {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];

        if (updates.customer_name !== undefined) {
            fields.push('customer_name = ?'); params.push(updates.customer_name);
        }
        if (updates.phone_number !== undefined) {
            fields.push('phone_number = ?'); params.push(updates.phone_number);
        }
        if (updates.whatsapp_number !== undefined) {
            fields.push('whatsapp_number = ?'); params.push(updates.whatsapp_number);
        }
        if (updates.address !== undefined) {
            fields.push('address = ?'); params.push(updates.address);
        }

        fields.push('pending_sync = 1', 'sync_op = \'update\'', 'sync_error = NULL', 'updated_at = ?');
        params.push(now);
        params.push(id);

        const setClause = fields.join(', ');
        await this.update(setClause, params, 'id = ?');
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

let customersDao;

export const getCustomersDao = async () => {
    if (customersDao) return customersDao;
    const db = await initStorage();
    customersDao = new CustomersDao(db);
    return customersDao;
};

export default getCustomersDao;
