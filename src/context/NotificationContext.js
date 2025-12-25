import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'workops_notifications_v1';
const MAX_NOTIFICATIONS = 50;

const NotificationContext = createContext({
    notifications: [],
    unreadCount: 0,
    addNotification: () => {},
    markAllRead: () => {},
    markReadById: () => {},
    markReadByWorkOrderId: () => {},
    clearAll: () => {}
});

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const stored = await Preferences.get({ key: STORAGE_KEY });
                if (stored?.value) {
                    const parsed = JSON.parse(stored.value);
                    if (Array.isArray(parsed)) {
                        setNotifications(parsed);
                    }
                }
            } catch (error) {
                console.error('Failed to load notifications:', error);
            } finally {
                setLoaded(true);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!loaded) return;
        const persist = async () => {
            try {
                await Preferences.set({
                    key: STORAGE_KEY,
                    value: JSON.stringify(notifications)
                });
            } catch (error) {
                console.error('Failed to persist notifications:', error);
            }
        };
        persist();
    }, [notifications, loaded]);

    const addNotification = useCallback((payload) => {
        if (!payload) return;
        const next = {
            id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: payload.title || 'Notification',
            body: payload.body || '',
            data: payload.data || {},
            workOrderId: payload.workOrderId || payload.data?.workOrderId || null,
            read: false,
            receivedAt: payload.receivedAt || new Date().toISOString()
        };
        setNotifications((prev) => {
            const merged = [next, ...prev];
            return merged.slice(0, MAX_NOTIFICATIONS);
        });
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const markReadById = useCallback((id) => {
        if (!id) return;
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markReadByWorkOrderId = useCallback((workOrderId) => {
        if (!workOrderId) return;
        setNotifications((prev) =>
            prev.map((n) => (n.workOrderId === workOrderId ? { ...n, read: true } : n))
        );
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

    const value = useMemo(
        () => ({
            notifications,
            unreadCount,
            addNotification,
            markAllRead,
            markReadById,
            markReadByWorkOrderId,
            clearAll
        }),
        [notifications, unreadCount, addNotification, markAllRead, markReadById, markReadByWorkOrderId, clearAll]
    );

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationCenter = () => useContext(NotificationContext);
