import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '../config/firebase';
import SummaryApi from '../common';

const useNotifications = (isAuthenticated) => {
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [fcmToken, setFcmToken] = useState(null);

    // Register FCM token with backend
    const registerToken = useCallback(async (token) => {
        try {
            await fetch(SummaryApi.registerFcmToken.url, {
                method: SummaryApi.registerFcmToken.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    token,
                    device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'web'
                })
            });
            console.log('FCM token registered successfully');
        } catch (error) {
            console.error('Failed to register FCM token:', error);
        }
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async () => {
        try {
            const token = await requestNotificationPermission();
            if (token) {
                setFcmToken(token);
                setNotificationPermission('granted');
                await registerToken(token);
                return true;
            }
            setNotificationPermission(Notification.permission);
            return false;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }, [registerToken]);

    // Setup notifications when authenticated
    useEffect(() => {
        if (isAuthenticated && notificationPermission === 'granted' && !fcmToken) {
            requestPermission();
        }
    }, [isAuthenticated, notificationPermission, fcmToken, requestPermission]);

    // Listen for foreground messages
    useEffect(() => {
        if (!isAuthenticated) return;

        const unsubscribe = onForegroundMessage((payload) => {
            console.log('Foreground message received:', payload);

            // Show notification using browser's notification API
            if (Notification.permission === 'granted') {
                const notification = new Notification(
                    payload.notification?.title || 'Work Order Reminder',
                    {
                        body: payload.notification?.body || 'You have a work order scheduled',
                        icon: '/logo192.png',
                        tag: payload.data?.workOrderId || 'work-order-notification'
                    }
                );

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                    // Navigate to work orders page if needed
                    if (payload.data?.workOrderId) {
                        window.location.href = '/workorders';
                    }
                };
            }
        });

        return unsubscribe;
    }, [isAuthenticated]);

    return {
        notificationPermission,
        fcmToken,
        requestPermission,
        isSupported: 'Notification' in window
    };
};

export default useNotifications;
