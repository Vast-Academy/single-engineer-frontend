import runMigrations from './migrations';
import { isWeb } from '../utils/platformDetection';

let readyPromise;

export const resetStorageInitCache = () => {
    readyPromise = undefined;
};

export const initStorage = async () => {
    if (isWeb()) {
        console.warn("WORKOPS DEBUG | db | init blocked web |", new Date().toISOString());
        throw new Error('SQLite initialization blocked for web browsers. This app only works in Android WebView.');
    }

    // If already initialized, reuse the same promise
    if (readyPromise) {
        console.log("WORKOPS DEBUG | db | init reuse readyPromise |", new Date().toISOString());
        return readyPromise;
    }

    // First time initialization
    console.log("WORKOPS DEBUG | db | init start |", new Date().toISOString());

    readyPromise = (async () => {
        try {
            console.log("WORKOPS DEBUG | db | migrations start |", new Date().toISOString());
            const db = await runMigrations();
            console.log("WORKOPS DEBUG | db | migrations done |", new Date().toISOString());
            console.log("WORKOPS DEBUG | db | ready |", new Date().toISOString());
            return db;
        } catch (err) {
            console.error("WORKOPS DEBUG | db | init failed |", new Date().toISOString(), err);
            readyPromise = undefined;
            throw err;
        }
    })();

    return readyPromise;
};

export const clearAllLocalData = async () => {
    try {
        const db = await initStorage();

        // Delete all data from all tables
        await Promise.all([
            db.execute('DELETE FROM customers'),
            db.execute('DELETE FROM items'),
            db.execute('DELETE FROM serial_numbers'),
            db.execute('DELETE FROM stock_history'),
            db.execute('DELETE FROM services'),
            db.execute('DELETE FROM work_orders'),
            db.execute('DELETE FROM bills'),
            db.execute('DELETE FROM bill_items'),
            db.execute('DELETE FROM payment_history'),
            db.execute('DELETE FROM bank_accounts'),
            db.execute('DELETE FROM metadata')
        ]);

        console.log('All local SQLite data cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing local data:', error);
        return false;
    }
};

export default {
    initStorage,
    resetStorageInitCache,
    clearAllLocalData
};
