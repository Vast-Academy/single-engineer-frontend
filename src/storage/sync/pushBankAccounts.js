import SummaryApi from '../../common';
import { getBankAccountsDao } from '../dao/bankAccountsDao';
import { apiClient } from '../../utils/apiClient';

const normalizePayload = (acc) => ({
    bankName: acc.bank_name,
    accountNumber: acc.account_number,
    ifscCode: acc.ifsc_code,
    accountHolderName: acc.account_holder_name,
    upiId: acc.upi_id,
    isPrimary: !!acc.is_primary
});

export const pushBankAccounts = async () => {
    const dao = await getBankAccountsDao();
    const pending = await dao.getPending();

    for (const acc of pending) {
        try {
            if (acc.sync_op === 'create') {
                const payload = normalizePayload(acc);
                const res = await apiClient(SummaryApi.addBankAccount.url, {
                    method: SummaryApi.addBankAccount.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success && data.bankAccount?._id) {
                    await dao.markSynced(acc.id, data.bankAccount._id);
                } else {
                    throw new Error(data.message || 'Bank account create failed');
                }
            } else if (acc.sync_op === 'update') {
                if (acc.id.startsWith('client-')) {
                    await dao.markSyncError(acc.id, 'Waiting for server id to update');
                    continue;
                }
                const payload = normalizePayload(acc);
                const res = await apiClient(`${SummaryApi.updateBankAccount.url}/${acc.id}`, {
                    method: SummaryApi.updateBankAccount.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    await dao.markSynced(acc.id, acc.id);
                } else {
                    throw new Error(data.message || 'Bank account update failed');
                }
            } else if (acc.sync_op === 'delete') {
                if (acc.id.startsWith('client-')) {
                    await dao.markSyncError(acc.id, 'Waiting for server id to delete');
                    continue;
                }
                const res = await apiClient(`${SummaryApi.deleteBankAccount.url}/${acc.id}`, {
                    method: SummaryApi.deleteBankAccount.method
                });
                const data = await res.json();
                if (data.success) {
                    await dao.markSynced(acc.id, acc.id);
                } else {
                    throw new Error(data.message || 'Bank account delete failed');
                }
            } else if (acc.sync_op === 'set_primary') {
                if (acc.id.startsWith('client-')) {
                    await dao.markSyncError(acc.id, 'Waiting for server id to set primary');
                    continue;
                }
                const res = await apiClient(`${SummaryApi.setPrimaryBankAccount.url}/${acc.id}/primary`, {
                    method: SummaryApi.setPrimaryBankAccount.method
                });
                const data = await res.json();
                if (data.success) {
                    await dao.markSynced(acc.id, acc.id);
                } else {
                    throw new Error(data.message || 'Set primary failed');
                }
            }
        } catch (err) {
            console.error('Push bank account error:', err);
            await dao.markSyncError(acc.id, err.message);
        }
    }
};

export default {
    pushBankAccounts
};
