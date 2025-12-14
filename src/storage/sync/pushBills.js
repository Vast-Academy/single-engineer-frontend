import SummaryApi from '../../common';
import { getBillsDao } from '../dao/billsDao';
import { apiClient } from '../../utils/apiClient';

const buildCreatePayload = (bill) => ({
    customerId: bill.customer_id,
    discount: bill.discount || 0,
    receivedPayment: bill.received_payment || 0,
    paymentMethod: bill.payment_method || 'cash',
    workOrderId: bill.work_order_id || null,
    items: (bill.items || []).map(item => ({
        itemType: item.item_type,
        itemId: item.item_id,
        serialNumber: item.serial_number,
        qty: item.qty || 1
    }))
});

export const pushBills = async () => {
    const dao = await getBillsDao();
    const pending = await dao.getPending();

    for (const b of pending) {
        try {
            if (b.sync_op === 'create') {
                const full = await dao.getById(b.id);
                const payload = buildCreatePayload({ ...b, items: full?.items || [] });

                const response = await apiClient(SummaryApi.createBill.url, {
                    method: SummaryApi.createBill.method,
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success && data.bill?._id) {
                    await dao.markSynced(b.id, data.bill._id);
                } else {
                    throw new Error(data.message || 'Bill create failed');
                }
            } else if (b.sync_op === 'update') {
                if (b.id.startsWith('bill-') || b.id.startsWith('client-')) {
                    await dao.markSyncError(b.id, 'Waiting for server id to update bill');
                    continue;
                }
                // For now, handle only payment updates via paymentHistory entries
                const full = await dao.getById(b.id);
                const pendingPayments = (full?.paymentHistory || []).filter(p => p.pending_sync === 1);
                for (const pay of pendingPayments) {
                    const response = await apiClient(`${SummaryApi.updateBillPayment.url}/${b.id}/payment`, {
                        method: 'PUT',
                        body: JSON.stringify({ amount: pay.amount, note: pay.note || '' })
                    });
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.message || 'Payment update failed');
                    }
                }
                await dao.markSynced(b.id, b.id);
            } else if (b.sync_op === 'delete') {
                if (b.id.startsWith('bill-') || b.id.startsWith('client-')) {
                    await dao.markSyncError(b.id, 'Waiting for server id to delete');
                    continue;
                }
                // No delete endpoint in existing SummaryApi; skip for now
                await dao.markSyncError(b.id, 'Delete not supported via sync yet');
            }
        } catch (error) {
            console.error('Bill push error:', error);
            await dao.markSyncError(b.id, error.message);
        }
    }
};

export default {
    pushBills
};
