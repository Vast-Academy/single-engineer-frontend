import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Bell } from 'lucide-react';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import useNotifications from '../hooks/useNotifications';
import { useSync } from '../context/SyncContext';
import SyncToast from './SyncToast';

const LayoutContext = createContext({
    bottomStackHeight: 0
});

export const useLayoutContext = () => useContext(LayoutContext);

const Layout = ({ children, bottomDock = null }) => {
    const { notificationPermission, requestPermission, isSupported } = useNotifications(true);
    const [showBanner, setShowBanner] = useState(false);
    const { offlineWarning, toasts, syncAlert, clearSyncAlert } = useSync();
    const [bottomStackHeight, setBottomStackHeight] = useState(0);
    const bottomStackRef = useRef(null);

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

    // Track combined height of bottom dock + navigation for spacing calculations
    useEffect(() => {
        const element = bottomStackRef.current;
        if (!element) return;

        const updateHeight = () => {
            const rect = element.getBoundingClientRect();
            setBottomStackHeight(Math.round(rect.height));
        };

        updateHeight();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(updateHeight);
            observer.observe(element);
            return () => observer.disconnect();
        }

        // Fallback: update on resize
        const handleResize = () => updateHeight();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [bottomDock]);

    // Expose bottom stack height via CSS variable for any child needing it
    useEffect(() => {
        document.documentElement.style.setProperty('--layout-bottom-stack', `${bottomStackHeight}px`);
        return () => {
            document.documentElement.style.removeProperty('--layout-bottom-stack');
        };
    }, [bottomStackHeight]);

    const contentBottomPadding = bottomStackHeight + 16; // small breathing room above the dock stack

    return (
        <LayoutContext.Provider value={{ bottomStackHeight }}>
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

                {/* Main Content - with padding for header and bottom stack */}
                <main
                    className={`pt-12 sm:pt-16 px-4 ${showBanner ? 'mt-12' : ''}`}
                    style={{ paddingBottom: contentBottomPadding }}
                >
                    {/* Offline warning */}
                    {offlineWarning && (
                        <div className="mb-3 rounded-lg bg-amber-100 text-amber-800 px-3 py-2 text-sm border border-amber-200">
                            Offline mode. Enable internet soon to sync your data automatically.
                        </div>
                    )}
                    {/* Sync failure alert */}
                    {syncAlert && (
                        <div className="mb-3 rounded-lg bg-red-100 text-red-800 px-3 py-2 text-sm border border-red-200 flex justify-between items-center">
                            <span>{syncAlert}</span>
                            <button
                                className="text-red-700 text-xs underline"
                                onClick={clearSyncAlert}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                    {children}
                </main>

                {/* Bottom Dock Stack */}
                <div
                    ref={bottomStackRef}
                    className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
                >
                    {bottomDock && (
                        <div className="bg-white border-t border-gray-200">
                            {bottomDock}
                        </div>
                    )}
                    <BottomNavigation />
                </div>
                <SyncToast toasts={toasts} />
            </div>
        </LayoutContext.Provider>
    );
};

export default Layout;
