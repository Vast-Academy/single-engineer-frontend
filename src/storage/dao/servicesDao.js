import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'services';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class ServicesDao extends BaseDao {
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
        return res.values?.[0] || null;
    }

    async upsertOne(service) {
        const now = new Date().toISOString();
        const existing = await this.getById(service.id);
        const updated_at = service.updated_at || now;
        const created_at = service.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'client_id', 'service_name', 'service_price', 'created_by', 'deleted',
                    'updated_at', 'created_at', 'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    service.id,
                    safeVal(service.client_id, service.id),
                    service.service_name || '',
                    service.service_price || 0,
                    safeVal(service.created_by, null),
                    service.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    service.pending_sync ? 1 : 0,
                    service.sync_op || null,
                    service.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.update(
                    `client_id = ?, service_name = ?, service_price = ?, created_by = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                    [
                        safeVal(service.client_id, existing.client_id),
                        service.service_name || existing.service_name || '',
                        service.service_price ?? existing.service_price ?? 0,
                        safeVal(service.created_by, existing.created_by ?? null),
                        service.deleted ? 1 : 0,
                        updated_at,
                        service.pending_sync ? 1 : 0,
                        service.sync_op || null,
                        service.sync_error || null,
                        service.id
                    ],
                    'id = ?'
                );
            }
        }
    }

    async upsertMany(services) {
        for (const s of services) {
            const serviceId = s._id || s.id;
            if (!serviceId) {
                console.warn('Skipping service with no id/_id', s);
                continue;
            }
            const mapped = {
                id: serviceId,
                client_id: s.client_id,
                service_name: s.serviceName || s.service_name || '',
                service_price: s.servicePrice || s.service_price || 0,
                created_by: s.createdBy || s.created_by || null,
                deleted: s.deleted || false,
                updated_at: s.updatedAt || s.updated_at,
                created_at: s.createdAt || s.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(service) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id', 'client_id', 'service_name', 'service_price', 'created_by', 'deleted',
                'updated_at', 'created_at', 'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                service.id,
                service.client_id || service.id,
                service.service_name,
                service.service_price,
                service.created_by || null,
                service.deleted ? 1 : 0,
                service.updated_at || now,
                service.created_at || now,
                1,
                service.sync_op || 'create',
                service.sync_error || null
            ]
        );
    }

    async markPendingUpdate(id, updates) {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];
        if (updates.service_name !== undefined) { fields.push('service_name = ?'); params.push(updates.service_name); }
        if (updates.service_price !== undefined) { fields.push('service_price = ?'); params.push(updates.service_price); }
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

let servicesDao;

export const getServicesDao = async () => {
    if (servicesDao) return servicesDao;
    const db = await initStorage();
    servicesDao = new ServicesDao(db);
    return servicesDao;
};

export default getServicesDao;
