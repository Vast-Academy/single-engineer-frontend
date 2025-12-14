import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isWeb } from '../utils/platformDetection';

/**
 * Firebase Configuration
 *
 * CRITICAL: Firebase is ONLY initialized for Android WebView
 * Web browsers are BLOCKED and will NOT initialize Firebase
 */

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// BLOCK web browsers from initializing Firebase
if (isWeb()) {
    console.warn('🚫 Firebase initialization blocked. This app is Android-only.');
    throw new Error('Firebase initialization blocked for web browsers. This app only works in Android WebView.');
}

// Initialize Firebase (Android WebView only)
console.log('✓ Initializing Firebase for Android WebView...');
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Set persistence for Android (local to survive app restarts)
const initializeAuthPersistence = async () => {
    try {
        // Android: Persist to local storage so session survives app restarts
        await setPersistence(auth, browserLocalPersistence);
        console.log('Firebase persistence: LOCAL (Android native)');
    } catch (error) {
        console.error('Failed to set Firebase persistence:', error);
    }
};

// Initialize persistence immediately
initializeAuthPersistence();

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Firebase Cloud Messaging is NOT used on Android (uses FCM native plugin)
// This is only for web, which is now blocked
let messaging = null;

// Request notification permission (Android uses native FCM plugin)
export const requestNotificationPermission = async () => {
    console.log('FCM: Android uses native Capacitor Push Notifications plugin');
    return null;
};

// Listen for foreground messages (Android uses native FCM plugin)
export const onForegroundMessage = (callback) => {
    console.log('FCM: Android uses native Capacitor Push Notifications plugin');
    return () => {};
};

export { messaging };
export default app;
