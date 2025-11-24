/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values need to match your Firebase project config
firebase.initializeApp({
    apiKey: "AIzaSyBePp0FoQOtofnegpUopob6Plbkl2aOUCY",
    authDomain: "engineer-web-app.firebaseapp.com",
    projectId: "engineer-web-app",
    storageBucket: "engineer-web-app.firebasestorage.app",
    messagingSenderId: "822771091336",
    appId: "1:822771091336:web:eba5075e4481556fd95c3d"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Work Order Reminder';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a work order scheduled',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        tag: payload.data?.workOrderId || 'work-order-notification',
        data: payload.data,
        actions: [
            {
                action: 'view',
                title: 'View Details'
            }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const workOrderId = event.notification.data?.workOrderId;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    if (workOrderId) {
                        client.postMessage({
                            type: 'NOTIFICATION_CLICK',
                            workOrderId
                        });
                    }
                    return;
                }
            }
            // Otherwise, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/workorders');
            }
        })
    );
});
