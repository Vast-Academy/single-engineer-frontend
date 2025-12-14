import authTokenManager from './authTokenManager';
import { auth } from '../config/firebase';
import { isWeb } from './platformDetection';

/**
 * SyncAuthGate - Ensures sync operations only run when properly authenticated
 *
 * CRITICAL: Only runs in Android WebView
 * Web browsers are BLOCKED
 *
 * This is the CRITICAL gate that prevents all sync operations from running
 * without a valid Firebase user and token.
 *
 * Usage:
 *   await syncAuthGate.waitForAuth()
 *   // Now safe to perform sync operations
 */
class SyncAuthGate {
    constructor() {
        // BLOCK web browsers
        if (isWeb()) {
            console.warn('🚫 SyncAuthGate blocked for web browsers.');
            throw new Error('SyncAuthGate is only available in Android WebView.');
        }

        this.authCheckPromise = null;
    }

    /**
     * Wait for Firebase auth to be ready and user to be authenticated
     * Throws error if user is not authenticated after waiting
     *
     * @throws {Error} If user is not authenticated
     * @returns {Promise<void>}
     */
    async waitForAuth() {
        console.log('🔐 SyncAuthGate: Checking authentication before sync...');

        // Wait for Firebase auth initialization
        const isAuthenticated = await authTokenManager.waitForAuthInit();

        if (!isAuthenticated) {
            const error = new Error('Sync blocked: User not authenticated. Please login to sync data.');
            console.error('❌', error.message);
            throw error;
        }

        // Double-check that we have a current user
        if (!auth.currentUser) {
            const error = new Error('Sync blocked: Firebase user unavailable. Please login again.');
            console.error('❌', error.message);
            throw error;
        }

        // Verify we can get a valid token
        try {
            const token = await authTokenManager.getToken();
            if (!token) {
                throw new Error('Token unavailable');
            }
            console.log('✓ SyncAuthGate: Authentication verified. Sync can proceed.');
        } catch (error) {
            const authError = new Error('Sync blocked: Unable to obtain authentication token. Please login again.');
            console.error('❌', authError.message, error);
            throw authError;
        }
    }

    /**
     * Check if user is authenticated (non-blocking)
     * @returns {boolean}
     */
    isAuthenticated() {
        return authTokenManager.isAuthenticated();
    }

    /**
     * Execute a sync operation with automatic auth check
     * Wraps sync operations to ensure they only run when authenticated
     *
     * @param {Function} syncOperation - Async function to execute
     * @param {string} operationName - Name for logging
     * @returns {Promise<any>} Result of syncOperation
     */
    async executeSyncWithAuth(syncOperation, operationName = 'Sync operation') {
        try {
            // Wait for authentication
            await this.waitForAuth();

            // Execute the sync operation
            console.log(`▶ Starting ${operationName}...`);
            const result = await syncOperation();
            console.log(`✓ ${operationName} completed successfully`);

            return result;

        } catch (error) {
            // Authentication errors should be handled differently
            if (error.message.includes('not authenticated') ||
                error.message.includes('authentication token')) {
                console.error(`❌ ${operationName} blocked due to authentication:`, error.message);
                throw error;
            }

            // Other errors (network, data issues, etc.)
            console.error(`❌ ${operationName} failed:`, error);
            throw error;
        }
    }
}

// Singleton instance
const syncAuthGate = new SyncAuthGate();

export default syncAuthGate;

// Export convenience functions
export const waitForSyncAuth = () => syncAuthGate.waitForAuth();
export const executeSyncWithAuth = (operation, name) => syncAuthGate.executeSyncWithAuth(operation, name);
export const isSyncAuthReady = () => syncAuthGate.isAuthenticated();
