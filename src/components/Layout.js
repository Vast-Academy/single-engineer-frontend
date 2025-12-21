import { useState, useEffect, useRef, useLayoutEffect, createContext, useContext } from 'react';
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

const Layout = ({ children, bottomDock = null, padForBottomStack = true }) => {
    const { notificationPermission, requestPermission, isSupported } = useNotifications(true);
    const [showBanner, setShowBanner] = useState(false);
    const { offlineWarning, toasts, syncAlert, clearSyncAlert } = useSync();
    const [bottomStackHeight, setBottomStackHeight] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(64);
    const [bannerHeight, setBannerHeight] = useState(0);
    const bottomStackRef = useRef(null);
    const headerRef = useRef(null);
    const bannerRef = useRef(null);

    // Check if we should show notification permission banner
    useEffect(() => {
        if (!isSupported) {
            setShowBanner(false);
            return;
        }

        if (notificationPermission === 'granted' || notificationPermission === 'denied') {
            setShowBanner(false);
            return;
        }

        // Only show prompt when permission is in default state
        const timer = setTimeout(() => {
            setShowBanner(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, [isSupported, notificationPermission]);

    const handleEnableNotifications = async () => {
        const success = await requestPermission();
        if (success) {
            setShowBanner(false);
        }
    };

    // Track combined height of bottom dock + navigation for spacing calculations
    useLayoutEffect(() => {
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

    // Track header + optional banner height for consistent top spacing
    useLayoutEffect(() => {
        const updateHeights = () => {
            const headerRect = headerRef.current?.getBoundingClientRect();
            const bannerRect = bannerRef.current?.getBoundingClientRect();
            setHeaderHeight(Math.round(headerRect?.height || 0));
            setBannerHeight(Math.round(bannerRect?.height || 0));
        };

        updateHeights();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(updateHeights);
            if (headerRef.current) observer.observe(headerRef.current);
            if (bannerRef.current) observer.observe(bannerRef.current);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', updateHeights);
        return () => window.removeEventListener('resize', updateHeights);
    }, [showBanner]);

    // Expose layout heights via CSS variables for any child needing them
    useLayoutEffect(() => {
        document.documentElement.style.setProperty('--layout-bottom-stack', `${bottomStackHeight}px`);
        return () => {
            document.documentElement.style.removeProperty('--layout-bottom-stack');
        };
    }, [bottomStackHeight]);

    useLayoutEffect(() => {
        const topOffset = headerHeight + bannerHeight;
        document.documentElement.style.setProperty('--layout-top-offset', `${topOffset}px`);
        return () => {
            document.documentElement.style.removeProperty('--layout-top-offset');
        };
    }, [headerHeight, bannerHeight]);

    const contentBottomPadding = padForBottomStack ? bottomStackHeight + 16 : 0; // avoid double scroll padding when pages manage their own offsets
    const contentTopPadding = headerHeight + bannerHeight + 8;
    const mainStyle = {
        paddingTop: contentTopPadding,
        ...(contentBottomPadding ? { paddingBottom: contentBottomPadding } : {})
    };

    return (
        <LayoutContext.Provider value={{ bottomStackHeight }}>
            <div className="min-h-screen bg-gray-50">
                {/* Notification Permission Banner */}
                {/* {showBanner && (
                    <div
                        ref={bannerRef}
                        className="fixed top-0 left-0 right-0 bg-primary-500 text-white p-3 z-[60] flex items-center justify-between"
                    >
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
                )} */}

                {/* Header */}
                <Header ref={headerRef} />

                {/* Main Content - with padding for header and bottom stack */}
                <main
                    className="px-4"
                    style={mainStyle}
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
