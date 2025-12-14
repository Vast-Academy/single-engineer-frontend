import SummaryApi from '../../common';
import { getCustomersDao } from '../dao/customersDao';
import { apiClient } from '../../utils/apiClient';

const normalizeCustomerForPayload = (customer) => ({
    customerName: customer.customer_name,
    phoneNumber: customer.phone_number,
    whatsappNumber: customer.whatsapp_number || '',
    address: customer.address || ''
});

// Push pending customer changes using existing CRUD APIs
// If directCreate payload provided, skip pending queue and create immediately on server
export const pushCustomers = async ({ directCreate } = {}) => {
    const dao = await getCustomersDao();

    // Direct create path (online-only)
    if (directCreate) {
        const response = await apiClient(SummaryApi.addCustomer.url, {
            method: SummaryApi.addCustomer.method,
            body: JSON.stringify(directCreate)
        });
        const data = await response.json();
        if (data.success && data.customer?._id) {
            return { createdCustomer: data.customer };
        }
        throw new Error(data.message || 'Create failed');
    }

    const pending = await dao.getPending();

    for (const c of pending) {
        try {
            if (c.sync_op === 'create') {
                const payload = normalizeCustomerForPayload(c);
                const response = await apiClient(SummaryApi.addCustomer.url, {
                    method: SummaryApi.addCustomer.method,
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success && data.customer?._id) {
                    await dao.markSynced(c.id, data.customer._id);
                } else {
                    throw new Error(data.message || 'Create failed');
                }
            } else if (c.sync_op === 'update') {
                if (c.id && c.id.startsWith('client-')) {
                    await dao.markSyncError(c.id, 'Waiting for server id to update');
                    continue;
                }
                // Updates require a server id; if id equals client_id and no server id yet, skip for now
                const serverId = c.id;
                const payload = normalizeCustomerForPayload(c);

                const response = await apiClient(`${SummaryApi.updateCustomer.url}/${serverId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success) {
                    await dao.markSynced(c.id, serverId);
                } else {
                    throw new Error(data.message || 'Update failed');
                }
            } else if (c.sync_op === 'delete') {
                if (c.id && c.id.startsWith('client-')) {
                    await dao.markSyncError(c.id, 'Waiting for server id to delete');
                    continue;
                }
                const serverId = c.id;
                const response = await apiClient(`${SummaryApi.deleteCustomer.url}/${serverId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.success) {
                    await dao.markSynced(c.id, serverId);
                } else {
                    throw new Error(data.message || 'Delete failed');
                }
            }
        } catch (error) {
            console.error('Customer push error:', error);
            await dao.markSyncError(c.id, error.message);
        }
    }
};

export default {
    pushCustomers
};
