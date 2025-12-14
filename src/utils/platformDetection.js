import { Capacitor } from '@capacitor/core';

/**
 * Platform Detection Utility
 *
 * NOTE: Capacitor does NOT expose window.ReactNativeWebView.
 * Rely on Capacitor APIs instead, with a UA fallback for odd WebView cases.
 */

const isNativePlatform = () => {
    try {
        return Capacitor.isNativePlatform();
    } catch (err) {
        return false;
    }
};

const isAndroidPlatform = () => {
    try {
        return Capacitor.getPlatform() === 'android';
    } catch (err) {
        return false;
    }
};

const uaIndicatesWebView = () => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    // Android WebView UA usually has "wv" and "Version/.."
    return /\bwv\b/i.test(ua) || /\bVersion\/[\d.]+(?:\s|$)/i.test(ua);
};

/**
 * Detect if running in regular web browser (NOT in Capacitor WebView)
 *
 * @returns {boolean} true if running in web browser, false if in Android WebView
 */
export const isWeb = () => {
    if (isNativePlatform()) return false; // Capacitor-native (Android/iOS)
    // Fallback: treat as native WebView if UA hints at it; otherwise web
    return !uaIndicatesWebView();
};

/**
 * Detect if running in Android WebView (Capacitor)
 *
 * @returns {boolean} true if running in Android WebView, false otherwise
 */
export const isAndroid = () => {
    if (isNativePlatform()) return isAndroidPlatform();
    return uaIndicatesWebView() && /Android/i.test((navigator && navigator.userAgent) || '');
};

/**
 * Get platform name for logging
 *
 * @returns {string} 'Android WebView' or 'Web Browser'
 */
export const getPlatformName = () => {
    return isWeb() ? 'Web Browser' : 'Android WebView';
};

/**
 * Assert that code is running in Android WebView
 * Throws error if running in web browser
 *
 * @param {string} feature - Feature name that requires Android
 * @throws {Error} If running in web browser
 */
export const assertAndroid = (feature) => {
    if (isWeb()) {
        throw new Error(`${feature} is only available in Android app. Running in: ${getPlatformName()}`);
    }
};

export default {
    isWeb,
    isAndroid,
    getPlatformName,
    assertAndroid
};
