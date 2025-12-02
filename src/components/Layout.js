import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import useNotifications from '../hooks/useNotifications';

const Layout = ({ children }) => {
    const { notificationPermission, requestPermission, isSupported } = useNotifications(true);
    const [showBanner, setShowBanner] = useState(false);

    // Check if we should show notification permission banner
    useEffect(() => {
        if (isSupported && notificationPermission === 'default') {
            // Show banner after a short delay
            const timer = setTimeout(() => {
                setShowBanner(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isSupported, notificationPermission]);

    const handleEnableNotifications = async () => {
        const success = await requestPermission();
        if (success) {
            setShowBanner(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Notification Permission Banner */}
            {showBanner && (
                <div className="fixed top-0 left-0 right-0 bg-primary-500 text-white p-3 z-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        <span className="text-sm">Enable notifications for work order reminders</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowBanner(false)}
                            className="text-sm text-white/80 hover:text-white"
                        >
                            Later
                        </button>
                        <button
                            onClick={handleEnableNotifications}
                            className="bg-white text-primary-500 px-3 py-1 rounded-lg text-sm font-medium"
                        >
                            Enable
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <Header />

            {/* Main Content - with padding for header and bottom nav */}
            <main className={`pt-14 pb-20 px-4 ${showBanner ? 'mt-12' : ''}`}>
                {children}
            </main>

            {/* Bottom Navigation */}
            <BottomNavigation />
        </div>
    );
};

export default Layout;
