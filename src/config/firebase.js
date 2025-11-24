import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Cloud Messaging
let messaging = null;
try {
    messaging = getMessaging(app);
} catch (error) {
    console.log('Firebase Messaging not supported:', error.message);
}

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
    try {
        if (!messaging) {
            console.log('Messaging not initialized');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        const token = await getToken(messaging, {
            vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
        });

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
        callback(payload);
    });
};

export { messaging };
export default app;
