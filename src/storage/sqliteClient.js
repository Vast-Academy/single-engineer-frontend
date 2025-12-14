import { Capacitor } from '@capacitor/core';
import 'jeep-sqlite/dist/components';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { isWeb } from '../utils/platform';

// Default database name for the app's offline store
const DB_NAME = 'engineer_offline';

let sqliteConnection;

/**
 * Ensure the web implementation is ready (jeep-sqlite) before using SQLite on web.
 * If the web layer is not available, we skip to avoid crashing the app in browsers.
 */
const ensureWebStore = async () => {
    if (!isWeb()) return;

    try {
        // jeep-sqlite custom element is required for web; if not present we simply skip
        const jeepEl = document.querySelector('jeep-sqlite');
        if (jeepEl?.componentOnReady) {
            await jeepEl.componentOnReady();
        }
        if (typeof CapacitorSQLite.initWebStore === 'function') {
            await CapacitorSQLite.initWebStore();
        }
    } catch (error) {
        console.warn('SQLite web store init skipped:', error?.message || error);
    }
};

/**
 * Initialize a single SQLiteConnection instance for the app.
 */
export const initSQLite = async () => {
    if (sqliteConnection) {
        return sqliteConnection;
    }

    // Plugin instance is provided by @capacitor-community/sqlite
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);

    // Prepare web store when running in browser/PWA
    await ensureWebStore();

    return sqliteConnection;
};

/**
 * Open (or create) the default database.
 */
export const openDefaultDatabase = async () => {
    const sqlite = await initSQLite();

    // Create a non-encrypted connection; upgrade/versioning handled by migrations later
    const db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await db.open();
    return db;
};

/**
 * Get existing database connection or create new one if doesn't exist.
 * Use this instead of openDefaultDatabase() when you want to reuse existing connection.
 */
export const getOrCreateDatabase = async () => {
    const sqlite = await initSQLite();

    try {
        // Try to retrieve existing connection first
        const db = await sqlite.retrieveConnection(DB_NAME, false);
        console.log('Retrieved existing database connection');
        return db;
    } catch (error) {
        // Connection doesn't exist, create new one
        console.log('Creating new database connection');
        const db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
        await db.open();
        return db;
    }
};

/**
 * Close the default database connection.
 */
export const closeDefaultDatabase = async () => {
    if (!sqliteConnection) return;

    try {
        await sqliteConnection.closeConnection(DB_NAME);
    } catch (error) {
        console.warn('Error closing SQLite connection:', error?.message || error);
    }
};

/**
 * Expose the database name for other helpers (e.g., migrations, DAOs).
 */
export const getDefaultDatabaseName = () => DB_NAME;

/**
 * Quick helper to check platform when debugging native vs web behavior.
 */
export const getPlatform = () => Capacitor.getPlatform();

export default {
    initSQLite,
    openDefaultDatabase,
    getOrCreateDatabase,
    closeDefaultDatabase,
    getDefaultDatabaseName,
    getPlatform
};
