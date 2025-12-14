import SummaryApi from '../../common';
import { initStorage } from '..';
import { getCustomersDao } from '../dao/customersDao';
import { apiGet } from '../../utils/apiClient';

const METADATA_KEY = 'customers_last_pull';

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

// Pull customers from backend and upsert into SQLite
export const pullCustomersFromBackend = async () => {
    const db = await initStorage();
    const customersDao = await getCustomersDao();

    // Fetch all customers in one go (existing API paginates; we fetch with high limit)
    const url = `${SummaryApi.getAllCustomers.url}?page=1&limit=5000`;

    const response = await apiGet(url);

    if (!response.ok) {
        throw new Error(`Customers pull failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.customers)) {
        throw new Error('Customers pull returned invalid payload');
    }

    await customersDao.upsertMany(data.customers);
    await setMetadata(db, METADATA_KEY, new Date().toISOString());
};

// Check if we need to pull (e.g., first load)
export const ensureCustomersPulled = async () => {
    const db = await initStorage();
    const lastPull = await getMetadata(db, METADATA_KEY);
    if (!lastPull) {
        await pullCustomersFromBackend();
    }
};

export default {
    pullCustomersFromBackend,
    ensureCustomersPulled
};
