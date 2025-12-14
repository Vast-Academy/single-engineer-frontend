import { ensureBillsPulled, pullBillsFromBackend } from './billsSync';
import { pullCustomersFromBackend } from './customersSync';
import { pullWorkOrdersFromBackend } from './workOrdersSync';
import { pullInventory } from './inventorySync';
import { pullBankAccounts } from './bankAccountsSync';
import { pullDashboardMetrics } from './dashboardMetricsSync';
import { getCustomersDao, getBillsDao, getWorkOrdersDao, getItemsDao } from '../dao';
import syncAuthGate from '../../utils/syncAuthGate';

// Check if DB is empty (key tables)
export const isDatabaseEmpty = async () => {
    const [customersDao, billsDao, workOrdersDao, itemsDao] = await Promise.all([
        getCustomersDao(),
        getBillsDao(),
        getWorkOrdersDao(),
        getItemsDao()
    ]);
    const checks = await Promise.all([
        customersDao.list({ limit: 1, offset: 0 }),
        billsDao.list({ limit: 1, offset: 0 }),
        workOrdersDao.list({ limit: 1, offset: 0 }),
        itemsDao.list({ limit: 1, offset: 0 })
    ]);
    return checks.every(arr => !arr || arr.length === 0);
};

// Initial full pull sequence; throws on first failure
export const initialPullAll = async () => {
    console.log('[initialPullAll] Starting initial data sync...');

    // CRITICAL: Wait for authentication before pulling any data
    console.log('[initialPullAll] Waiting for authentication...');
    await syncAuthGate.waitForAuth();
    console.log('[initialPullAll] ✓ Authentication verified');

    console.log('[initialPullAll] Pulling customers...');
    await ensureBillsPulled(); // prepare tables if needed
    await pullCustomersFromBackend();

    console.log('[initialPullAll] Pulling work orders...');
    await pullWorkOrdersFromBackend();

    console.log('[initialPullAll] Pulling bills...');
    await pullBillsFromBackend();

    console.log('[initialPullAll] Pulling inventory...');
    await pullInventory();

    console.log('[initialPullAll] Pulling bank accounts...');
    await pullBankAccounts();

    try {
        console.log('[initialPullAll] Pulling dashboard metrics...');
        await pullDashboardMetrics({ filterType: 'period', period: '1month' });
    } catch (e) {
        console.warn('Dashboard metrics pull failed (non-blocking):', e);
    }

    console.log('[initialPullAll] ✓ Initial sync completed successfully');
};

export default {
    isDatabaseEmpty,
    initialPullAll
};
