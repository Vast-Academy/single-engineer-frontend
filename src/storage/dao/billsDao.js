import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'bills';
const ITEMS_TABLE = 'bill_items';
const PAYMENTS_TABLE = 'payment_history';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class BillsDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async list({ limit = 50, offset = 0 } = {}) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE deleted = 0 ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return res.values || [];
    }

    async listByCustomer(customerId, { limit = 100, offset = 0 } = {}) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE deleted = 0 AND customer_id = ? ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`,
            [customerId, limit, offset]
        );
        return res.values || [];
    }

    async getById(id) {
        const res = await this.db.query(`SELECT * FROM ${TABLE} WHERE id = ? AND deleted = 0 LIMIT 1`, [id]);
        const bill = res.values?.[0];
        if (!bill) return null;
        bill.items = await this.getItemsByBill(id);
        bill.paymentHistory = await this.getPaymentsByBill(id);
        return bill;
    }

    async getItemsByBill(billId) {
        const res = await this.db.query(
            `SELECT * FROM ${ITEMS_TABLE} WHERE bill_id = ? AND deleted = 0 ORDER BY datetime(created_at) ASC`,
            [billId]
        );
        return res.values || [];
    }

    async getPaymentsByBill(billId) {
        const res = await this.db.query(
            `SELECT * FROM ${PAYMENTS_TABLE} WHERE bill_id = ? AND deleted = 0 ORDER BY datetime(paid_at) ASC`,
            [billId]
        );
        return res.values || [];
    }

    async upsertOne(bill) {
        const now = new Date().toISOString();
        const existing = await this.getById(bill.id);
        const updated_at = bill.updated_at || now;
        const created_at = bill.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'client_id', 'customer_id', 'bill_number', 'subtotal', 'discount', 'total_amount',
                    'received_payment', 'due_amount', 'payment_method', 'status', 'work_order_id', 'created_by',
                    'deleted', 'updated_at', 'created_at', 'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    bill.id,
                    safeVal(bill.client_id, bill.id),
                    safeVal(bill.customer_id, null),
                    bill.bill_number || '',
                    bill.subtotal || 0,
                    bill.discount || 0,
                    bill.total_amount || 0,
                    bill.received_payment || 0,
                    bill.due_amount || 0,
                    bill.payment_method || 'cash',
                    bill.status || 'pending',
                    safeVal(bill.work_order_id, null),
                    safeVal(bill.created_by, null),
                    bill.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    bill.pending_sync ? 1 : 0,
                    bill.sync_op || null,
                    bill.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.update(
                    `client_id = ?, customer_id = ?, bill_number = ?, subtotal = ?, discount = ?, total_amount = ?, received_payment = ?, due_amount = ?, payment_method = ?, status = ?, work_order_id = ?, created_by = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                    [
                        safeVal(bill.client_id, existing.client_id),
                        safeVal(bill.customer_id, existing.customer_id),
                        bill.bill_number || existing.bill_number || '',
                        bill.subtotal ?? existing.subtotal ?? 0,
                        bill.discount ?? existing.discount ?? 0,
                        bill.total_amount ?? existing.total_amount ?? 0,
                        bill.received_payment ?? existing.received_payment ?? 0,
                        bill.due_amount ?? existing.due_amount ?? 0,
                        bill.payment_method || existing.payment_method || 'cash',
                        bill.status || existing.status || 'pending',
                        safeVal(bill.work_order_id, existing.work_order_id ?? null),
                        safeVal(bill.created_by, existing.created_by ?? null),
                        bill.deleted ? 1 : 0,
                        updated_at,
                        bill.pending_sync ? 1 : 0,
                        bill.sync_op || null,
                        bill.sync_error || null,
                        bill.id
                    ],
                    'id = ?'
                );
            }
        }

        // Upsert items/payments
        if (Array.isArray(bill.items)) {
            for (const item of bill.items) {
                await this.upsertBillItem({ ...item, bill_id: bill.id });
            }
        }
        if (Array.isArray(bill.payment_history)) {
            for (const p of bill.payment_history) {
                await this.upsertPayment({ ...p, bill_id: bill.id });
            }
        }
    }

    async upsertBillItem(item) {
        const now = new Date().toISOString();
        const itemId = item.id || item._id || `${item.bill_id}-${item.itemId || item.item_id}-${item.serialNumber || ''}-${Math.random().toString(16).slice(2)}`;
        if (!item.bill_id) {
            console.warn('Skipping bill item with no bill_id', item);
            return;
        }
        const res = await this.db.query(`SELECT id, updated_at FROM ${ITEMS_TABLE} WHERE id = ? LIMIT 1`, [itemId]);
        const existing = res.values?.[0];
        const updated_at = item.updated_at || now;
        const created_at = item.created_at || now;

        if (!existing) {
            await this.db.run(
                `INSERT INTO ${ITEMS_TABLE} (
                    id, bill_id, item_type, item_id, item_name, serial_number, qty, price, purchase_price, amount,
                    deleted, updated_at, created_at, pending_sync, sync_op, sync_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    itemId,
                    item.bill_id,
                    item.itemType || item.item_type || '',
                    item.itemId || item.item_id || null,
                    item.itemName || item.item_name || '',
                    item.serialNumber || item.serial_number || null,
                    item.qty || 1,
                    item.price || 0,
                    item.purchasePrice || item.purchase_price || 0,
                    item.amount || 0,
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
                await this.db.run(
                    `UPDATE ${ITEMS_TABLE} SET
                        bill_id = ?, item_type = ?, item_id = ?, item_name = ?, serial_number = ?, qty = ?, price = ?, purchase_price = ?, amount = ?,
                        deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?
                     WHERE id = ?`,
                    [
                        item.bill_id,
                        item.itemType || item.item_type || '',
                        item.itemId || item.item_id || null,
                        item.itemName || item.item_name || '',
                        item.serialNumber || item.serial_number || null,
                        item.qty || 1,
                        item.price || 0,
                        item.purchasePrice || item.purchase_price || 0,
                        item.amount || 0,
                        item.deleted ? 1 : 0,
                        updated_at,
                        item.pending_sync ? 1 : 0,
                        item.sync_op || null,
                        item.sync_error || null,
                        itemId
                    ]
                );
            }
        }
    }

    async upsertPayment(payment) {
        const now = new Date().toISOString();
        const payId = payment.id || payment._id || `${payment.bill_id}-pay-${Math.random().toString(16).slice(2)}`;
        if (!payment.bill_id) {
            console.warn('Skipping payment with no bill_id', payment);
            return;
        }
        const res = await this.db.query(`SELECT id, updated_at FROM ${PAYMENTS_TABLE} WHERE id = ? LIMIT 1`, [payId]);
        const existing = res.values?.[0];
        const updated_at = payment.updated_at || now;
        const created_at = payment.created_at || now;

        if (!existing) {
            await this.db.run(
                `INSERT INTO ${PAYMENTS_TABLE} (
                    id, bill_id, amount, paid_at, note, deleted, updated_at, created_at, pending_sync, sync_op, sync_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    payId,
                    payment.bill_id,
                    payment.amount || 0,
                    payment.paid_at || payment.paidAt || now,
                    payment.note || '',
                    payment.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    payment.pending_sync ? 1 : 0,
                    payment.sync_op || null,
                    payment.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.db.run(
                    `UPDATE ${PAYMENTS_TABLE} SET
                        bill_id = ?, amount = ?, paid_at = ?, note = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?
                     WHERE id = ?`,
                    [
                        payment.bill_id,
                        payment.amount || 0,
                        payment.paid_at || payment.paidAt || now,
                        payment.note || '',
                        payment.deleted ? 1 : 0,
                        updated_at,
                        payment.pending_sync ? 1 : 0,
                        payment.sync_op || null,
                        payment.sync_error || null,
                        payId
                    ]
                );
            }
        }
    }

    async upsertMany(bills) {
        for (const b of bills) {
            const billId = b._id || b.id;
            if (!billId) {
                console.warn('Skipping bill with no id/_id', b);
                continue;
            }
            const customerFromPayload = b.customer && typeof b.customer === 'object'
                ? (b.customer._id || b.customer.id)
                : b.customer;
            const mapped = {
                id: billId,
                client_id: b.client_id,
                customer_id: customerFromPayload || b.customer_id || b.customerId || null,
                bill_number: b.billNumber || b.bill_number,
                subtotal: b.subtotal ?? 0,
                discount: b.discount ?? 0,
                total_amount: b.totalAmount || b.total_amount || 0,
                received_payment: b.receivedPayment || b.received_payment || 0,
                due_amount: b.dueAmount || b.due_amount || 0,
                payment_method: b.paymentMethod || b.payment_method || 'cash',
                status: b.status || 'pending',
                work_order_id: b.workOrderId || b.work_order_id || null,
                created_by: b.createdBy || b.created_by || null,
                deleted: b.deleted || false,
                updated_at: b.updatedAt || b.updated_at,
                created_at: b.createdAt || b.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null,
                items: b.items,
                payment_history: b.paymentHistory || b.payment_history
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(bill) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id', 'client_id', 'customer_id', 'bill_number', 'subtotal', 'discount', 'total_amount',
                'received_payment', 'due_amount', 'payment_method', 'status', 'work_order_id', 'created_by',
                'deleted', 'updated_at', 'created_at', 'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                bill.id,
                bill.client_id || bill.id,
                bill.customer_id,
                bill.bill_number || '',
                bill.subtotal || 0,
                bill.discount || 0,
                bill.total_amount || 0,
                bill.received_payment || 0,
                bill.due_amount || 0,
                bill.payment_method || 'cash',
                bill.status || 'pending',
                bill.work_order_id || null,
                bill.created_by || null,
                bill.deleted ? 1 : 0,
                bill.updated_at || now,
                bill.created_at || now,
                1,
                bill.sync_op || 'create',
                bill.sync_error || null
            ]
        );

        if (Array.isArray(bill.items)) {
            for (const item of bill.items) {
                await this.upsertBillItem({ ...item, bill_id: bill.id, pending_sync: 1, sync_op: 'create' });
            }
        }
        if (Array.isArray(bill.payment_history)) {
            for (const p of bill.payment_history) {
                await this.upsertPayment({ ...p, bill_id: bill.id, pending_sync: 1, sync_op: 'create' });
            }
        }
    }

    async markPendingPayment(billId, payment) {
        const now = new Date().toISOString();
        const payId = payment.id || payment._id || `${billId}-pay-${Math.random().toString(16).slice(2)}`;
        await this.upsertPayment({
            ...payment,
            id: payId,
            bill_id: billId,
            pending_sync: 1,
            sync_op: 'update',
            updated_at: now
        });

        // update bill totals locally
        const bill = await this.getById(billId);
        if (bill) {
            const updatedReceived = (bill.received_payment || 0) + (payment.amount || 0);
            const updatedDue = Math.max(0, (bill.total_amount || 0) - updatedReceived);
            const status = updatedDue === 0 ? 'paid' : 'partial';
            await this.update(
                'received_payment = ?, due_amount = ?, status = ?, pending_sync = 1, sync_op = \'update\', sync_error = NULL, updated_at = ?',
                [updatedReceived, updatedDue, status, now, billId],
                'id = ?'
            );
        }
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

    async getDueTotalsByCustomerIds(customerIds = []) {
        if (!customerIds.length) return {};
        // Build a parameterized IN clause
        const placeholders = customerIds.map(() => '?').join(',');
        const query = `
            SELECT customer_id, SUM(due_amount) as total_due
            FROM ${TABLE}
            WHERE deleted = 0 AND customer_id IN (${placeholders})
            GROUP BY customer_id
        `;
        const res = await this.db.query(query, customerIds);
        const map = {};
        (res.values || []).forEach(row => {
            map[row.customer_id] = row.total_due || 0;
        });
        return map;
    }
}

let billsDao;

export const getBillsDao = async () => {
    if (billsDao) return billsDao;
    const db = await initStorage();
    billsDao = new BillsDao(db);
    return billsDao;
};

export default getBillsDao;
