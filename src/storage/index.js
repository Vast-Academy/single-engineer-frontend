import runMigrations from './migrations';
import { isWeb } from '../utils/platformDetection';

let readyPromise;

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

export default {
    initStorage
};
