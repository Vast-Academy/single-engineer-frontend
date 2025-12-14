import SummaryApi from '../../common';
import { getItemsDao } from '../dao/itemsDao';
import { getServicesDao } from '../dao/servicesDao';
import { apiClient } from '../../utils/apiClient';

const fetchJSON = async (url, method = 'GET') => {
    const res = await apiClient(url, { method });
    if (!res.ok) throw new Error(`Inventory pull failed: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Inventory pull error');
    return data;
};

export const pullInventory = async () => {
    const itemsDao = await getItemsDao();
    const servicesDao = await getServicesDao();

    // Pull items (page through)
    let page = 1;
    const limit = 200;
    let hasMore = true;
    while (hasMore) {
        const data = await fetchJSON(`${SummaryApi.getAllItems.url}?page=${page}&limit=${limit}`, SummaryApi.getAllItems.method);
        if (Array.isArray(data.items)) {
            await itemsDao.upsertMany(data.items);
        }
        if (data.pagination && typeof data.pagination.hasMore === 'boolean') {
            hasMore = data.pagination.hasMore;
            page = (data.pagination.currentPage || page) + 1;
        } else {
            hasMore = false;
        }
    }

    // Pull services (page through)
    page = 1;
    hasMore = true;
    while (hasMore) {
        const data = await fetchJSON(`${SummaryApi.getAllServices.url}?page=${page}&limit=${limit}`, SummaryApi.getAllServices.method);
        if (Array.isArray(data.services)) {
            await servicesDao.upsertMany(data.services);
        }
        if (data.pagination && typeof data.pagination.hasMore === 'boolean') {
            hasMore = data.pagination.hasMore;
            page = (data.pagination.currentPage || page) + 1;
        } else {
            hasMore = false;
        }
    }
};

export default {
    pullInventory
};
