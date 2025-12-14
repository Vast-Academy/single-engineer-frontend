import SummaryApi from '../../common';
import { getItemsDao } from '../dao/itemsDao';
import { getServicesDao } from '../dao/servicesDao';
import { getSerialNumbersDao } from '../dao/serialNumbersDao';
import { getStockHistoryDao } from '../dao/stockHistoryDao';
import { apiClient } from '../../utils/apiClient';

const normalizeItemPayload = (item) => ({
    itemType: item.item_type,
    itemName: item.item_name,
    unit: item.unit,
    warranty: item.warranty,
    mrp: item.mrp,
    purchasePrice: item.purchase_price,
    salePrice: item.sale_price
});

const pushItems = async () => {
    const itemsDao = await getItemsDao();
    const pending = await itemsDao.getPending();

    for (const it of pending) {
        try {
            if (it.sync_op === 'create') {
                const payload = normalizeItemPayload(it);
                const res = await apiClient(SummaryApi.addItem.url, {
                    method: SummaryApi.addItem.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success && data.item?._id) {
                    await itemsDao.markSynced(it.id, data.item._id);
                } else {
                    throw new Error(data.message || 'Item create failed');
                }
            } else if (it.sync_op === 'update') {
                if (it.id.startsWith('client-')) {
                    await itemsDao.markSyncError(it.id, 'Waiting for server id to update');
                    continue;
                }
                const payload = normalizeItemPayload(it);
                const res = await apiClient(`${SummaryApi.updateItem.url}/${it.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    await itemsDao.markSynced(it.id, it.id);
                } else {
                    throw new Error(data.message || 'Item update failed');
                }
            } else if (it.sync_op === 'delete') {
                if (it.id.startsWith('client-')) {
                    await itemsDao.markSyncError(it.id, 'Waiting for server id to delete');
                    continue;
                }
                const res = await apiClient(`${SummaryApi.deleteItem.url}/${it.id}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.success) {
                    await itemsDao.markSynced(it.id, it.id);
                } else {
                    throw new Error(data.message || 'Item delete failed');
                }
            }
        } catch (err) {
            console.error('Push item error:', err);
            await itemsDao.markSyncError(it.id, err.message);
        }
    }
};

const pushServices = async () => {
    const servicesDao = await getServicesDao();
    const pending = await servicesDao.getPending();

    for (const svc of pending) {
        try {
            if (svc.sync_op === 'create') {
                const payload = { serviceName: svc.service_name, servicePrice: svc.service_price };
                const res = await apiClient(SummaryApi.addService.url, {
                    method: SummaryApi.addService.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success && data.service?._id) {
                    await servicesDao.markSynced(svc.id, data.service._id);
                } else {
                    throw new Error(data.message || 'Service create failed');
                }
            } else if (svc.sync_op === 'update') {
                if (svc.id.startsWith('client-')) {
                    await servicesDao.markSyncError(svc.id, 'Waiting for server id to update');
                    continue;
                }
                const payload = { serviceName: svc.service_name, servicePrice: svc.service_price };
                const res = await apiClient(`${SummaryApi.updateService.url}/${svc.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    await servicesDao.markSynced(svc.id, svc.id);
                } else {
                    throw new Error(data.message || 'Service update failed');
                }
            } else if (svc.sync_op === 'delete') {
                if (svc.id.startsWith('client-')) {
                    await servicesDao.markSyncError(svc.id, 'Waiting for server id to delete');
                    continue;
                }
                const res = await apiClient(`${SummaryApi.deleteService.url}/${svc.id}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.success) {
                    await servicesDao.markSynced(svc.id, svc.id);
                } else {
                    throw new Error(data.message || 'Service delete failed');
                }
            }
        } catch (err) {
            console.error('Push service error:', err);
            await servicesDao.markSyncError(svc.id, err.message);
        }
    }
};

// For now, serials/stock changes are part of item stock update flows; we treat them via items push
const pushSerials = async () => {
    const serialDao = await getSerialNumbersDao();
    const pending = await serialDao.getPending();
    if (!pending.length) return;

    // Group serials by item
    const byItem = pending.reduce((acc, sn) => {
        if (sn.item_id && sn.item_id.startsWith('client-')) {
            serialDao.markSyncError(sn.id, 'Waiting for item sync');
            return acc;
        }
        acc[sn.item_id] = acc[sn.item_id] || [];
        acc[sn.item_id].push(sn);
        return acc;
    }, {});

    for (const [itemId, serials] of Object.entries(byItem)) {
        try {
            const serialNumbers = serials.map(s => s.serial_no);
            const res = await apiClient(`${SummaryApi.updateStock.url}/${itemId}/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serialNumbers })
            });
            const data = await res.json();
            if (data.success) {
                for (const sn of serials) {
                    await serialDao.markSynced(sn.id, sn.id);
                }
            } else {
                throw new Error(data.message || 'Serial push failed');
            }
        } catch (err) {
            console.error('Push serials error:', err);
            for (const sn of serials) {
                await serialDao.markSyncError(sn.id, err.message);
            }
        }
    }
};

const pushStockHistory = async () => {
    const stockDao = await getStockHistoryDao();
    const pending = await stockDao.getPending();
    if (!pending.length) return;

    const byItem = pending.reduce((acc, sh) => {
        if (sh.item_id && sh.item_id.startsWith('client-')) {
            stockDao.markSyncError(sh.id, 'Waiting for item sync');
            return acc;
        }
        acc[sh.item_id] = acc[sh.item_id] || [];
        acc[sh.item_id].push(sh);
        return acc;
    }, {});

    for (const [itemId, entries] of Object.entries(byItem)) {
        // For qty stock additions, batch sum
        const qtyToAdd = entries.reduce((sum, e) => sum + (e.qty || 0), 0);
        if (qtyToAdd === 0) {
            for (const e of entries) await stockDao.markSynced(e.id, e.id);
            continue;
        }
        try {
            const res = await apiClient(`${SummaryApi.updateStock.url}/${itemId}/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stockQty: qtyToAdd })
            });
            const data = await res.json();
            if (data.success) {
                for (const e of entries) {
                    await stockDao.markSynced(e.id, e.id);
                }
            } else {
                throw new Error(data.message || 'Stock push failed');
            }
        } catch (err) {
            console.error('Push stock history error:', err);
            for (const e of entries) await stockDao.markSyncError(e.id, err.message);
        }
    }
};

export const pushInventory = async () => {
    await pushItems();
    await pushServices();
    await pushSerials();
    await pushStockHistory();
};

export default {
    pushInventory
};
