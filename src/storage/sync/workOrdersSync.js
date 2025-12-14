import SummaryApi from '../../common';
import { initStorage } from '..';
import { getWorkOrdersDao } from '../dao/workOrdersDao';
import { apiClient } from '../../utils/apiClient';

const METADATA_KEY = 'work_orders_last_pull';

const setMetadata = async (db, key, value) => {
    await db.run(
        `INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        [key, value, new Date().toISOString()]
    );
};

const getMetadata = async (db, key) => {
    const res = await db.query('SELECT value FROM metadata WHERE key = ? LIMIT 1', [key]);
    return res.values?.[0]?.value || null;
};

export const pullWorkOrdersFromBackend = async () => {
    const db = await initStorage();
    const dao = await getWorkOrdersDao();

    const results = [];

    const fetchAndCollect = async (url, method = 'GET') => {
        const response = await apiClient(url, { method });
        if (!response.ok) throw new Error(`Work orders pull failed: ${response.status}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.workOrders)) {
            results.push(...data.workOrders);
        }
    };

    // Pull pending and completed separately
    await fetchAndCollect(`${SummaryApi.getPendingWorkOrders.url}?page=1&limit=5000`, SummaryApi.getPendingWorkOrders.method);
    await fetchAndCollect(`${SummaryApi.getCompletedWorkOrders.url}?page=1&limit=5000`, SummaryApi.getCompletedWorkOrders.method);

    await dao.upsertMany(results);
    await setMetadata(db, METADATA_KEY, new Date().toISOString());
};

export const ensureWorkOrdersPulled = async () => {
    const db = await initStorage();
    const last = await getMetadata(db, METADATA_KEY);
    if (!last) {
        await pullWorkOrdersFromBackend();
    }
};

export default {
    pullWorkOrdersFromBackend,
    ensureWorkOrdersPulled
};
