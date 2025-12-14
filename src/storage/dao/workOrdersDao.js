import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'work_orders';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class WorkOrdersDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async list({ status, limit = 50, offset = 0 } = {}) {
        const clauses = ['deleted = 0'];
        const params = [];

        if (status) {
            clauses.push('status = ?');
            params.push(status);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} ${where} ORDER BY datetime(schedule_date) ASC, schedule_time ASC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return res.values || [];
    }

    async getById(id) {
        const res = await this.db.query(`SELECT * FROM ${TABLE} WHERE id = ? AND deleted = 0 LIMIT 1`, [id]);
        return res.values?.[0] || null;
    }

    async upsertOne(order) {
        const now = new Date().toISOString();
        const existing = await this.getById(order.id);
        const updated_at = order.updated_at || now;
        const created_at = order.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'client_id', 'customer_id', 'work_order_number', 'note', 'schedule_date',
                    'has_scheduled_time', 'schedule_time', 'status', 'completed_at',
                    'notification_sent', 'bill_id', 'created_by', 'deleted',
                    'updated_at', 'created_at', 'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    order.id,
                    safeVal(order.client_id, order.id),
                    safeVal(order.customer_id, null),
                    order.work_order_number || '',
                    order.note || '',
                    safeVal(order.schedule_date, null),
                    order.has_scheduled_time ? 1 : 0,
                    order.schedule_time || '',
                    order.status || 'pending',
                    safeVal(order.completed_at, null),
                    order.notification_sent ? 1 : 0,
                    safeVal(order.bill_id, null),
                    safeVal(order.created_by, null),
                    order.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    order.pending_sync ? 1 : 0,
                    order.sync_op || null,
                    order.sync_error || null
                ]
            );
            return;
        }

        const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
        if (incomingIsNewer) {
            await this.update(
                `client_id = ?, customer_id = ?, work_order_number = ?, note = ?, schedule_date = ?, has_scheduled_time = ?, schedule_time = ?, status = ?, completed_at = ?, notification_sent = ?, bill_id = ?, created_by = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                [
                    safeVal(order.client_id, existing.client_id),
                    safeVal(order.customer_id, existing.customer_id),
                    order.work_order_number || existing.work_order_number || '',
                    order.note ?? existing.note ?? '',
                    safeVal(order.schedule_date, existing.schedule_date ?? null),
                    order.has_scheduled_time ? 1 : 0,
                    order.schedule_time || existing.schedule_time || '',
                    order.status || existing.status || 'pending',
                    safeVal(order.completed_at, null),
                    order.notification_sent ? 1 : 0,
                    safeVal(order.bill_id, existing.bill_id ?? null),
                    safeVal(order.created_by, existing.created_by ?? null),
                    order.deleted ? 1 : 0,
                    updated_at,
                    order.pending_sync ? 1 : 0,
                    order.sync_op || null,
                    order.sync_error || null,
                    order.id
                ],
                'id = ?'
            );
        }
    }

    async upsertMany(workOrders) {
        for (const w of workOrders) {
            const workOrderId = w._id || w.id;
            if (!workOrderId) {
                console.warn('Skipping work order with no id/_id', w);
                continue;
            }
            const mapped = {
                id: workOrderId,
                client_id: safeVal(w.client_id, workOrderId),
                customer_id: (w.customer && (w.customer._id || w.customer.id)) || w.customer_id || null,
                work_order_number: w.workOrderNumber || w.work_order_number || '',
                note: safeVal(w.note, ''),
                schedule_date: w.scheduleDate || w.schedule_date || null,
                has_scheduled_time: w.hasScheduledTime || w.has_scheduled_time,
                schedule_time: w.scheduleTime || w.schedule_time || '',
                status: w.status || 'pending',
                completed_at: w.completedAt || w.completed_at || null,
                notification_sent: w.notificationSent || w.notification_sent || 0,
                bill_id: (w.bill && (w.bill._id || w.bill.id)) || w.billId || w.bill_id || null,
                created_by: w.createdBy || w.created_by || null,
                deleted: w.deleted || false,
                updated_at: w.updatedAt || w.updated_at,
                created_at: w.createdAt || w.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(order) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id', 'client_id', 'customer_id', 'work_order_number', 'note', 'schedule_date',
                'has_scheduled_time', 'schedule_time', 'status', 'completed_at',
                'notification_sent', 'bill_id', 'created_by', 'deleted',
                'updated_at', 'created_at', 'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                order.id,
                order.client_id || order.id,
                order.customer_id || null,
                order.work_order_number || '',
                order.note || '',
                order.schedule_date || null,
                order.has_scheduled_time ? 1 : 0,
                order.schedule_time || '',
                order.status || 'pending',
                order.completed_at || null,
                order.notification_sent ? 1 : 0,
                order.bill_id || null,
                order.created_by || null,
                order.deleted ? 1 : 0,
                order.updated_at || now,
                order.created_at || now,
                1,
                order.sync_op || 'create',
                null
            ]
        );
    }

    async markPendingUpdate(id, updates) {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];

        const map = {
            note: 'note',
            schedule_date: 'schedule_date',
            has_scheduled_time: 'has_scheduled_time',
            schedule_time: 'schedule_time',
            status: 'status',
            completed_at: 'completed_at',
            bill_id: 'bill_id'
        };

        Object.entries(map).forEach(([key, column]) => {
            if (updates[key] !== undefined) {
                fields.push(`${column} = ?`);
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

    async countByStatus(status) {
        const res = await this.db.query(
            `SELECT COUNT(*) as count FROM ${TABLE} WHERE status = ? AND deleted = 0`,
            [status]
        );
        return res.values?.[0]?.count || 0;
    }
}

let workOrdersDao;

export const getWorkOrdersDao = async () => {
    if (workOrdersDao) return workOrdersDao;
    const db = await initStorage();
    workOrdersDao = new WorkOrdersDao(db);
    return workOrdersDao;
};

export default getWorkOrdersDao;
