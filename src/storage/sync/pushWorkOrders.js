import SummaryApi from '../../common';
import { getWorkOrdersDao } from '../dao/workOrdersDao';
import { apiClient } from '../../utils/apiClient';

const normalizeWorkOrder = (wo) => ({
    customerId: wo.customer_id,
    note: wo.note,
    scheduleDate: wo.schedule_date,
    hasScheduledTime: !!wo.has_scheduled_time,
    scheduleTime: wo.schedule_time,
    status: wo.status
});

export const pushWorkOrders = async () => {
    const dao = await getWorkOrdersDao();
    const pending = await dao.getPending();

    for (const wo of pending) {
        try {
            if (wo.sync_op === 'create') {
                const payload = normalizeWorkOrder(wo);
                const response = await apiClient(SummaryApi.createWorkOrder.url, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success && data.workOrder?._id) {
                    await dao.markSynced(wo.id, data.workOrder._id);
                } else {
                    throw new Error(data.message || 'Work order create failed');
                }
            } else if (wo.sync_op === 'update') {
                if (wo.id.startsWith('client-')) {
                    await dao.markSyncError(wo.id, 'Waiting for server id to update');
                    continue;
                }
                const payload = normalizeWorkOrder(wo);
                const response = await apiClient(`${SummaryApi.updateWorkOrder.url}/${wo.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success) {
                    await dao.markSynced(wo.id, wo.id);
                } else {
                    throw new Error(data.message || 'Work order update failed');
                }
            } else if (wo.sync_op === 'delete') {
                if (wo.id.startsWith('client-')) {
                    await dao.markSyncError(wo.id, 'Waiting for server id to delete');
                    continue;
                }
                const response = await apiClient(`${SummaryApi.deleteWorkOrder.url}/${wo.id}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.success) {
                    await dao.markSynced(wo.id, wo.id);
                } else {
                    throw new Error(data.message || 'Work order delete failed');
                }
            }
        } catch (error) {
            console.error('Work order push error:', error);
            await dao.markSyncError(wo.id, error.message);
        }
    }
};

export default {
    pushWorkOrders
};
