import { getOrCreateDatabase, closeDefaultDatabase } from './sqliteClient';
import { resetStorageInitCache } from './index';

const MIGRATION_TABLE_HINTS = ['migrations', 'schema_migrations', '_migrations'];

const isMigrationTable = (tableName) => {
    const lower = tableName.toLowerCase();
    if (MIGRATION_TABLE_HINTS.includes(lower)) return true;
    return lower.includes('migration') || lower.includes('schema');
};

const isExcludedTable = (tableName) => {
    if (!tableName) return true;
    if (tableName.startsWith('sqlite_')) return true;
    if (tableName === 'android_metadata' || tableName === 'room_master_table') return true;
    if (isMigrationTable(tableName)) return true;
    return false;
};

export const resetLocalAppDataOnUpdate = async () => {
    console.log('WORKOPS DEBUG | db reset | start |', new Date().toISOString());
    try {
        const db = await getOrCreateDatabase();

        try {
            await db.execute('PRAGMA foreign_keys = OFF;');
        } catch (pragmaError) {
            console.warn('WORKOPS DEBUG | db reset | foreign_keys off skipped |', pragmaError);
        }

        const res = await db.query("SELECT name FROM sqlite_master WHERE type = 'table';");
        const tables = (res.values || [])
            .map((row) => row.name)
            .filter((name) => name && !isExcludedTable(name));

        console.log('WORKOPS DEBUG | db reset | tables found |', tables.length);

        for (const table of tables) {
            try {
                const safeName = table.replace(/"/g, '""');
                console.log('WORKOPS DEBUG | db reset | clearing table |', table);
                await db.execute(`DELETE FROM "${safeName}";`);
                console.log('WORKOPS DEBUG | db reset | cleared table |', table);
            } catch (tableError) {
                console.warn('WORKOPS DEBUG | db reset | failed to clear table |', table, tableError);
            }
        }

        try {
            await db.execute('PRAGMA foreign_keys = ON;');
        } catch (pragmaError) {
            console.warn('WORKOPS DEBUG | db reset | foreign_keys on skipped |', pragmaError);
        }

        try {
            await db.close();
        } catch (closeError) {
            console.warn('WORKOPS DEBUG | db reset | close skipped |', closeError);
        }

        try {
            await closeDefaultDatabase();
        } catch (closeError) {
            console.warn('WORKOPS DEBUG | db reset | close connection skipped |', closeError);
        }
    } finally {
        resetStorageInitCache();
        console.log('WORKOPS DEBUG | db reset | done |', new Date().toISOString());
    }
};

export default {
    resetLocalAppDataOnUpdate
};
