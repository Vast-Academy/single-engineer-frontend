import SummaryApi from '../../common';
import { initStorage } from '..';
import { getBillsDao } from '../dao/billsDao';
import { apiClient } from '../../utils/apiClient';

const METADATA_KEY = 'bills_last_pull';

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

export const pullBillsFromBackend = async () => {
    const db = await initStorage();
    const dao = await getBillsDao();

    const response = await apiClient(`${SummaryApi.getAllBills.url}`, {
        method: SummaryApi.getAllBills.method
    });

    if (!response.ok) {
        throw new Error(`Bills pull failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.bills)) {
        throw new Error('Bills pull returned invalid payload');
    }

    await dao.upsertMany(data.bills);
    await setMetadata(db, METADATA_KEY, new Date().toISOString());
};

export const ensureBillsPulled = async () => {
    const db = await initStorage();
    const last = await getMetadata(db, METADATA_KEY);
    if (!last) {
        await pullBillsFromBackend();
    }
};

export default {
    pullBillsFromBackend,
    ensureBillsPulled
};
