import { useState, useEffect, useCallback, useRef } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '../config/firebase';
import SummaryApi from '../common';
import { isNative, isWeb } from '../utils/platform';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiClient } from '../utils/apiClient';
import { getDeviceId } from '../utils/deviceId';
import { useNotificationCenter } from '../context/NotificationContext';

const useNotifications = (isAuthenticated) => {
    const { addNotification, markReadByWorkOrderId } = useNotificationCenter();
    const [notificationPermission, setNotificationPermission] = useState(
        isWeb() && 'Notification' in window ? Notification.permission : 'default'
    );
    const [fcmToken, setFcmToken] = useState(null);
    const deviceIdRef = useRef(null);

    const getDeviceIdCached = useCallback(async () => {
        if (deviceIdRef.current) return deviceIdRef.current;
        deviceIdRef.current = await getDeviceId();
        return deviceIdRef.current;
    }, []);

    // Register FCM token with backend
    const registerToken = useCallback(async (token) => {
        try {
            const device = isNative() ? 'android' : (navigator.userAgent.includes('Mobile') ? 'mobile' : 'web');
            const deviceId = await getDeviceIdCached();

            await apiClient(SummaryApi.registerFcmToken.url, {
                method: SummaryApi.registerFcmToken.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    device,
                    deviceId
                })
            });
            console.log('FCM token registered successfully:', device);
        } catch (error) {
            console.error('Failed to register FCM token:', error);
        }
    }, [getDeviceIdCached]);

    // Request notification permission (supports both web and native)
    const requestPermission = useCallback(async () => {
        try {
            if (isNative()) {
                // Native push notifications (Android/iOS)
                console.log('Requesting native push notification permission');

                // Request permission
                const permResult = await PushNotifications.requestPermissions();

                if (permResult.receive === 'granted') {
                    // Register with FCM
                    await PushNotifications.register();
                    setNotificationPermission('granted');
                    return true;
                } else {
                    console.log('Push notification permission denied');
                    setNotificationPermission('denied');
                    return false;
                }
            } else {
                // Web push notifications
                console.log('Requesting web push notification permission');
                const token = await requestNotificationPermission();
                if (token) {
                    setFcmToken(token);
                    setNotificationPermission('granted');
                    await registerToken(token);
                    return true;
                }
                setNotificationPermission(isWeb() && 'Notification' in window ? Notification.permission : 'denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }, [registerToken]);

    // Setup notifications when authenticated
    useEffect(() => {
        if (!isAuthenticated || !isNative()) return;
        if (notificationPermission === 'default') {
            requestPermission();
        }
    }, [isAuthenticated, notificationPermission, requestPermission]);

    // Setup native push notification listeners
    useEffect(() => {
        if (!isAuthenticated || !isNative()) return;

        const pushToCenter = (payload) => {
            if (!payload) return;
            addNotification({
                title: payload.title || payload.notification?.title || 'Work Order Reminder',
                body: payload.body || payload.notification?.body || '',
                data: payload.data || payload.notification?.data || {},
                workOrderId: payload.data?.workOrderId || payload.notification?.data?.workOrderId
            });
        };

        // Listen for registration token
        const tokenListener = PushNotifications.addListener('registration', (token) => {
            console.log('Push registration success, token:', token.value);
            setFcmToken(token.value);
            registerToken(token.value);
        });

        // Listen for registration errors
        const errorListener = PushNotifications.addListener('registrationError', (error) => {
            console.error('Push registration error:', error);
        });

        // Listen for push notifications received
        const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received:', notification);
            // Notification is automatically shown by the system
            pushToCenter(notification);
        });

        // Listen for notification actions
        const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push notification action performed:', notification);
            // Navigate to work orders if needed
            const workOrderId = notification.notification?.data?.workOrderId;
            if (workOrderId) {
                addNotification({
                    title: notification.notification?.title || 'Work Order Reminder',
                    body: notification.notification?.body || '',
                    data: notification.notification?.data || {},
                    workOrderId
                });
                markReadByWorkOrderId(workOrderId);
                window.location.href = '/workorders';
            }
        });

        // Cleanup
        return () => {
            tokenListener.remove();
            errorListener.remove();
            notificationListener.remove();
            actionListener.remove();
        };
    }, [isAuthenticated, registerToken, addNotification, markReadByWorkOrderId]);

    // Listen for foreground messages (web only)
    useEffect(() => {
        if (!isAuthenticated || !isWeb()) return;

        const unsubscribe = onForegroundMessage((payload) => {
            console.log('Foreground message received:', payload);

            addNotification({
                title: payload.notification?.title || 'Work Order Reminder',
                body: payload.notification?.body || '',
                data: payload.data || {},
                workOrderId: payload.data?.workOrderId
            });

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
    }, [isAuthenticated, addNotification]);

    return {
        notificationPermission,
        fcmToken,
        requestPermission,
        isSupported: isNative() || (isWeb() && 'Notification' in window)
    };
};

export default useNotifications;
