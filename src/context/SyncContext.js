import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import SummaryApi from '../common';
import { pushCustomers } from '../storage/sync/pushCustomers';
import { pushWorkOrders } from '../storage/sync/pushWorkOrders';
import { pushBills } from '../storage/sync/pushBills';
import { pushInventory } from '../storage/sync/pushInventory';
import { pushBankAccounts } from '../storage/sync/pushBankAccounts';
import { pullCustomersFromBackend } from '../storage/sync/customersSync';
import { pullWorkOrdersFromBackend } from '../storage/sync/workOrdersSync';
import { pullBillsFromBackend } from '../storage/sync/billsSync';
import syncAuthGate from '../utils/syncAuthGate';

const SyncContext = createContext(null);

export const useSync = () => useContext(SyncContext);

let toastCounter = 0;

export const SyncProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [toasts, setToasts] = useState([]);
    const [syncAlert, setSyncAlert] = useState(null); // for red alert on failures
    const [dataVersion, setDataVersion] = useState(0); // bump when pulls complete

    const addToast = (message, type = 'info', duration = 3000) => {
        const id = ++toastCounter;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    };

    const notifyLocalSave = () => {
        if (isOnline) {
            addToast('Saved locally. Syncing…', 'info', 2500);
        } else {
            addToast('Saved offline. Will sync when online.', 'info', 3000);
        }
    };
    const notifySynced = () => addToast('All changes synced with cloud.', 'success', 3000);
    const notifySyncFail = () => {
        setSyncAlert('Sync failed. Will retry.');
        addToast('Sync failed. Will retry.', 'error', 3000);
    };

    const triggerSync = async () => {
        if (!isOnline) {
            addToast('You are offline. Will sync when online.', 'info', 3000);
            return;
        }

        // CRITICAL: Check authentication before attempting any sync
        try {
            await syncAuthGate.waitForAuth();
        } catch (authError) {
            console.error('Sync blocked: Not authenticated', authError.message);
            addToast('Please login to sync data', 'error', 4000);
            return;
        }

        const pushTasks = [pushCustomers, pushWorkOrders, pushBills, pushInventory, pushBankAccounts];
        const pullTasks = [pullCustomersFromBackend, pullWorkOrdersFromBackend, pullBillsFromBackend];
        const retries = 3;
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Re-verify auth before each retry attempt
                if (attempt > 1) {
                    await syncAuthGate.waitForAuth();
                }

                console.log(`Sync attempt ${attempt}/${retries} starting...`);

                for (const task of pushTasks) {
                    await task();
                }
                for (const task of pullTasks) {
                    await task();
                }
                setSyncAlert(null);
                setDataVersion((v) => v + 1);
                notifySynced();
                console.log('Sync completed successfully');
                return;
            } catch (err) {
                // Check if it's an authentication error
                if (err.message && (
                    err.message.includes('not authenticated') ||
                    err.message.includes('Authentication required') ||
                    err.message.includes('authentication token')
                )) {
                    console.error('Sync failed due to authentication:', err.message);
                    addToast('Session expired. Please login again.', 'error', 5000);
                    setSyncAlert('Authentication required. Please login.');
                    return; // Don't retry on auth errors
                }

                console.error(`Sync attempt ${attempt} failed:`, err);
                if (attempt === retries) {
                    notifySyncFail();
                } else {
                    await delay(500 * attempt);
                }
            }
        }
    };
    // Listen to online/offline (browser) and verify with health check
    useEffect(() => {
        const ping = async () => {
            try {
                const res = await fetch(SummaryApi.healthCheck.url, {
                    method: SummaryApi.healthCheck.method
                });
                if (res.ok) {
                    setIsOnline(true);
                    return;
                }
            } catch (e) {
                // ignore
            }
            setIsOnline(false);
        };

        const goOnline = () => {
            // we still verify with ping
            ping();
        };
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        // initial ping
        ping();
        // periodic ping while app open
        const interval = setInterval(ping, 15000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // When coming online, attempt sync with light backoff (push then pull core data)
    useEffect(() => {
        if (isOnline) {
            triggerSync();
        }
    }, [isOnline]);

    const value = useMemo(() => ({
        isOnline,
        offlineWarning: !isOnline,
        toasts,
        syncAlert,
        dataVersion,
        notifyLocalSave,
        notifySynced,
        notifySyncFail,
        triggerSync,
        clearSyncAlert: () => setSyncAlert(null),
        bumpDataVersion: () => setDataVersion((v) => v + 1)
    }), [isOnline, toasts, syncAlert, dataVersion]);

    return (
        <SyncContext.Provider value={value}>
            {children}
        </SyncContext.Provider>
    );
};

export default SyncProvider;



