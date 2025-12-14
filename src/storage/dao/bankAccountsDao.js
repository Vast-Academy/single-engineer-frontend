import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'bank_accounts';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class BankAccountsDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async list({ limit = 100, offset = 0 } = {}) {
        const res = await this.db.query(
            `SELECT * FROM ${TABLE} WHERE deleted = 0 ORDER BY datetime(updated_at) DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return res.values || [];
    }

    async upsertOne(account) {
        const now = new Date().toISOString();
        const existing = await this.getById(account.id);
        const updated_at = account.updated_at || now;
        const created_at = account.created_at || now;

        if (!existing) {
            await this.insert(
                [
                    'id', 'client_id', 'bank_name', 'account_number', 'ifsc_code', 'account_holder_name',
                    'upi_id', 'is_primary', 'created_by', 'deleted', 'updated_at', 'created_at',
                    'pending_sync', 'sync_op', 'sync_error'
                ],
                [
                    account.id,
                    safeVal(account.client_id, account.id),
                    account.bank_name || '',
                    account.account_number || '',
                    account.ifsc_code || '',
                    account.account_holder_name || '',
                    account.upi_id || '',
                    account.is_primary ? 1 : 0,
                    safeVal(account.created_by, null),
                    account.deleted ? 1 : 0,
                    updated_at,
                    created_at,
                    account.pending_sync ? 1 : 0,
                    account.sync_op || null,
                    account.sync_error || null
                ]
            );
        } else {
            const incomingIsNewer = !existing.updated_at || updated_at >= existing.updated_at;
            if (incomingIsNewer) {
                await this.update(
                    `client_id = ?, bank_name = ?, account_number = ?, ifsc_code = ?, account_holder_name = ?, upi_id = ?, is_primary = ?, created_by = ?, deleted = ?, updated_at = ?, pending_sync = ?, sync_op = ?, sync_error = ?`,
                    [
                        safeVal(account.client_id, existing.client_id),
                        account.bank_name || existing.bank_name || '',
                        account.account_number || existing.account_number || '',
                        account.ifsc_code || existing.ifsc_code || '',
                        account.account_holder_name || existing.account_holder_name || '',
                        account.upi_id || existing.upi_id || '',
                        account.is_primary ? 1 : 0,
                        safeVal(account.created_by, existing.created_by ?? null),
                        account.deleted ? 1 : 0,
                        updated_at,
                        account.pending_sync ? 1 : 0,
                        account.sync_op || null,
                        account.sync_error || null,
                        account.id
                    ],
                    'id = ?'
                );
            }
        }
    }

    async upsertMany(accounts) {
        for (const acc of accounts) {
            const accId = acc._id || acc.id;
            if (!accId) {
                console.warn('Skipping bank account with no id/_id', acc);
                continue;
            }
            const mapped = {
                id: accId,
                client_id: acc.client_id,
                bank_name: acc.bankName || acc.bank_name || '',
                account_number: acc.accountNumber || acc.account_number || '',
                ifsc_code: acc.ifscCode || acc.ifsc_code || '',
                account_holder_name: acc.accountHolderName || acc.account_holder_name || '',
                upi_id: acc.upiId || acc.upi_id || '',
                is_primary: acc.isPrimary || acc.is_primary,
                created_by: acc.createdBy || acc.created_by || null,
                deleted: acc.deleted || false,
                updated_at: acc.updatedAt || acc.updated_at,
                created_at: acc.createdAt || acc.created_at,
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            };
            await this.upsertOne(mapped);
        }
    }

    async insertLocal(account) {
        const now = new Date().toISOString();
        await this.insert(
            [
                'id', 'client_id', 'bank_name', 'account_number', 'ifsc_code', 'account_holder_name',
                'upi_id', 'is_primary', 'created_by', 'deleted', 'updated_at', 'created_at',
                'pending_sync', 'sync_op', 'sync_error'
            ],
            [
                account.id,
                safeVal(account.client_id, account.id),
                account.bank_name || '',
                account.account_number || '',
                account.ifsc_code || '',
                account.account_holder_name || '',
                account.upi_id || '',
                account.is_primary ? 1 : 0,
                safeVal(account.created_by, null),
                account.deleted ? 1 : 0,
                account.updated_at || now,
                account.created_at || now,
                1,
                account.sync_op || 'create',
                account.sync_error || null
            ]
        );
    }

    async markPendingUpdate(id, updates, syncOp = 'update') {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];
        const map = {
            bank_name: 'bank_name',
            account_number: 'account_number',
            ifsc_code: 'ifsc_code',
            account_holder_name: 'account_holder_name',
            upi_id: 'upi_id',
            is_primary: 'is_primary'
        };
        Object.entries(map).forEach(([key, col]) => {
            if (updates[key] !== undefined) {
                fields.push(`${col} = ?`);
                params.push(updates[key]);
            }
        });
        fields.push('pending_sync = 1', `sync_op = '${syncOp}'`, 'sync_error = NULL', 'updated_at = ?');
        params.push(now, id);
        await this.update(fields.join(', '), params, 'id = ?');
    }

    async markPendingSetPrimary(id) {
        const now = new Date().toISOString();
        await this.update(
            'is_primary = 1, pending_sync = 1, sync_op = \'set_primary\', sync_error = NULL, updated_at = ?',
            [now, id],
            'id = ?'
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

let bankDao;

export const getBankAccountsDao = async () => {
    if (bankDao) return bankDao;
    const db = await initStorage();
    bankDao = new BankAccountsDao(db);
    return bankDao;
};

export default getBankAccountsDao;
