import { auth } from '../config/firebase';
import { Capacitor } from '@capacitor/core';
import { isWeb } from './platformDetection';

const isNative = () => Capacitor.isNativePlatform();

/**
 * AuthTokenManager - Centralized Firebase ID token management
 *
 * CRITICAL: Only runs in Android WebView
 * Web browsers are BLOCKED
 *
 * Features:
 * - Waits for Firebase auth to initialize
 * - Automatically refreshes expired tokens
 * - Caches valid tokens to reduce Firebase calls
 * - Forces reauthentication on refresh failure
 */
class AuthTokenManager {
    constructor() {
        // BLOCK web browsers
        if (isWeb()) {
            console.warn('🚫 AuthTokenManager blocked for web browsers.');
            throw new Error('AuthTokenManager is only available in Android WebView.');
        }

        this.cachedToken = null;
        this.tokenExpiryTime = null;
        this.authInitialized = false;
        this.authInitPromise = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    /**
     * Wait for Firebase auth to fully initialize
     * Returns true if user is authenticated, false otherwise
     */
    async waitForAuthInit() {
        // Return cached result if already initialized
        if (this.authInitialized) {
            return !!auth.currentUser;
        }

        // If already waiting, return existing promise
        if (this.authInitPromise) {
            return this.authInitPromise;
        }

        // Create new initialization promise
        this.authInitPromise = new Promise((resolve) => {
            // If user already exists, resolve immediately
            if (auth.currentUser) {
                this.authInitialized = true;
                resolve(true);
                return;
            }

            // Otherwise, wait for auth state change with timeout
            const unsubscribe = auth.onAuthStateChanged((user) => {
                this.authInitialized = true;
                unsubscribe();
                resolve(!!user);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.authInitialized) {
                    this.authInitialized = true;
                    unsubscribe();
                    resolve(false);
                }
            }, 10000);
        });

        return this.authInitPromise;
    }

    /**
     * Check if cached token is still valid
     * Tokens expire after 1 hour, we refresh 5 minutes before expiry
     */
    isCachedTokenValid() {
        if (!this.cachedToken || !this.tokenExpiryTime) {
            return false;
        }

        const now = Date.now();
        const timeUntilExpiry = this.tokenExpiryTime - now;
        const fiveMinutes = 5 * 60 * 1000;

        // Refresh if less than 5 minutes until expiry
        return timeUntilExpiry > fiveMinutes;
    }

    /**
     * Get a fresh Firebase ID token
     * - Returns cached token if still valid
     * - Automatically refreshes if expired
     * - Forces refresh if forceRefresh = true
     */
    async getToken(forceRefresh = false) {
        // Wait for auth initialization first
        const isAuthenticated = await this.waitForAuthInit();

        if (!isAuthenticated) {
            throw new Error('User not authenticated');
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        // Return cached token if valid and not forcing refresh
        if (!forceRefresh && this.isCachedTokenValid()) {
            console.log('Using cached Firebase token');
            return this.cachedToken;
        }

        // If already refreshing, wait for that promise
        if (this.isRefreshing && this.refreshPromise) {
            console.log('Token refresh already in progress, waiting...');
            return this.refreshPromise;
        }

        // Start token refresh
        this.isRefreshing = true;
        this.refreshPromise = this._refreshToken(currentUser, forceRefresh);

        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    /**
     * Internal method to refresh token from Firebase
     */
    async _refreshToken(user, forceRefresh) {
        try {
            console.log(`Getting ${forceRefresh ? 'fresh' : 'cached'} Firebase ID token...`);

            const idToken = await user.getIdToken(forceRefresh);

            // Cache the token with expiry time
            // Firebase tokens expire after 1 hour
            this.cachedToken = idToken;
            this.tokenExpiryTime = Date.now() + (60 * 60 * 1000); // 1 hour from now

            console.log('✓ Firebase token obtained successfully');
            return idToken;

        } catch (error) {
            console.error('Firebase token refresh failed:', error);

            // Clear cached token on error
            this.clearCache();

            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Clear cached token (e.g., on logout)
     */
    clearCache() {
        this.cachedToken = null;
        this.tokenExpiryTime = null;
        console.log('Token cache cleared');
    }

    /**
     * Force token refresh (e.g., after 401 error)
     */
    async forceRefresh() {
        console.log('Forcing token refresh due to authentication error...');
        this.clearCache();
        return this.getToken(true);
    }

    /**
     * Check if user is currently authenticated
     */
    isAuthenticated() {
        return this.authInitialized && !!auth.currentUser;
    }
}

// Singleton instance
const authTokenManager = new AuthTokenManager();

// Export singleton
export default authTokenManager;

// Export functions for convenience
export const getAuthToken = () => authTokenManager.getToken();
export const waitForAuth = () => authTokenManager.waitForAuthInit();
export const isAuthenticated = () => authTokenManager.isAuthenticated();
export const clearAuthCache = () => authTokenManager.clearCache();
export const forceTokenRefresh = () => authTokenManager.forceRefresh();
