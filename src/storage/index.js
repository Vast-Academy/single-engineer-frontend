import runMigrations from './migrations';
import { isWeb, assertAndroid } from '../utils/platformDetection';

let readyPromise;

/**
 * Initialize storage: open the DB and run pending migrations.
 *
 * CRITICAL: SQLite storage is ONLY available for Android WebView
 * Web browsers are BLOCKED and will NOT initialize SQLite
 */
export const initStorage = async () => {
    // BLOCK web browsers from initializing SQLite
    if (isWeb()) {
        console.warn('dYs® SQLite initialization blocked. This app is Android-only.');
        throw new Error('SQLite initialization blocked for web browsers. This app only works in Android WebView.');
    }

    if (!readyPromise) {
        readyPromise = (async () => {
            console.log('ƒo" Initializing SQLite for Android WebView...');
            const db = await runMigrations();
            console.log('ƒo" SQLite database ready');
            return db;
        })();
    }
    return readyPromise;
};

export default {
    initStorage
};
