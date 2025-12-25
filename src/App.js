import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Workorders from './pages/Workorders';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';
import BankAccounts from './pages/BankAccounts';
import CustomerBills from './pages/CustomerBills';
import BillDetail from './pages/BillDetail';
import { isNative } from './utils/platform';
import { App as CapApp } from '@capacitor/app';
import { useSync } from './context/SyncContext';
import { isDatabaseEmpty, initialPullAll } from './storage/sync/initialSync';
import { isWeb } from './utils/platformDetection';
import ErrorBoundary from './components/common/ErrorBoundary';
import logo from './images/logo.png';
import useViewportCssVars from './hooks/useViewportCssVars';
import { Preferences } from "@capacitor/preferences";
import { resetLocalAppDataOnUpdate } from './storage/resetLocalAppDataOnUpdate';
import SummaryApi from './common';
import { apiClient } from './utils/apiClient';
// import { useState } from 'react';

/**
 * Web Blocking Component
 * This app is designed ONLY for Android WebView (Capacitor)
 * Web browsers are NOT supported
 */
function WebBlockingMessage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            padding: '24px',
            textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
            <div style={{
                maxWidth: '500px',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '48px 32px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    color: 'white'
                }}>
                    📱
                </div>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: '16px'
                }}>
                    Android App Only
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    marginBottom: '8px'
                }}>
                    This app is only available on Android.
                </p>
                <p style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    marginBottom: '24px'
                }}>
                    Please install it from the Play Store.
                </p>
                <div style={{
                    padding: '12px 24px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#1e40af'
                }}>
                    <strong>Note:</strong> Web version is not supported
                </div>
            </div>
        </div>
    );
}

// Component to handle Android back button
function AndroidBackButtonHandler() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isNative()) return;

        const backButtonListener = CapApp.addListener('backButton', ({ canGoBack }) => {
            // If we're on the dashboard/home page, exit the app
            if (location.pathname === '/dashboard' || location.pathname === '/') {
                CapApp.exitApp();
            } else if (canGoBack) {
                // Navigate back if we can
                navigate(-1);
            } else {
                // Otherwise go to dashboard
                navigate('/dashboard');
            }
        });

        return () => {
            backButtonListener.remove();
        };
    }, [navigate, location]);

    return null;
}

// Gate that blocks app until initial full pull when DB is empty
function InitialSyncGate({ children }) {
    const { bumpDataVersion } = useSync();
    const { user } = useAuth();
    const [initialNeeded, setInitialNeeded] = useState(false);
    const [initialDone, setInitialDone] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    // track online status
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    const startSync = async () => {
        // IMPORTANT: Only sync if user is authenticated
        if (!user) {
            console.warn('Cannot sync: User not authenticated');
            setError('Please login to download data.');
            setSyncing(false);
            return;
        }

        setSyncing(true);
        setError(null);
        try {
            await initialPullAll();
            bumpDataVersion();
            setInitialDone(true);
        } catch (err) {
            console.error('Initial sync failed:', err);
            // Check if it's a 401 error (authentication issue)
            if (err.message && err.message.includes('401')) {
                setError('Session expired. Please login again.');
            } else {
                setError('Failed to download data. Please retry when online.');
            }
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const check = async () => {
            // Don't attempt sync if user is not authenticated
            if (!user) {
                console.log('InitialSyncGate: Waiting for user authentication...');
                return;
            }

            try {
                const empty = await isDatabaseEmpty();
                if (!empty) {
                    setInitialNeeded(false);
                    setInitialDone(true);
                    return;
                }
                if (!isOnline) {
                    setInitialNeeded(true);
                    setInitialDone(false);
                    setError('Cannot download data while offline. Reconnect to continue.');
                    return;
                }

                let serverHasData = true;
                try {
                    const response = await apiClient(SummaryApi.syncHasData.url, {
                        method: SummaryApi.syncHasData.method
                    });
                    const data = await response.json();
                    if (data.success && data.hasData === false) {
                        setInitialNeeded(false);
                        setInitialDone(true);
                        return;
                    }
                    if (data.success) {
                        serverHasData = !!data.hasData;
                    }
                } catch (err) {
                    console.warn('Initial sync has-data check failed:', err);
                }

                if (!serverHasData) {
                    setInitialNeeded(false);
                    setInitialDone(true);
                    return;
                }

                setInitialNeeded(true);
                setInitialDone(false);
                await startSync();
            } catch (err) {
                console.error('Initial check failed:', err);
                setError('Unable to check local data. Please retry.');
            }
        };
        check();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, user]);

    if (initialNeeded && !initialDone) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-700 px-6 text-center">
                <img
                    src={logo}
                    alt="App Logo"
                    className="w-32 h-32 mx-auto mb-6 animate-pulse"
                />
                <h2 className="text-xl font-semibold mb-2 text-gray-800">Please wait, downloading your data</h2>
                <p className="text-sm text-gray-500 mb-4">We're syncing customers, work orders, bills, inventory, and bank accounts.</p>
                {error && (
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                )}
                <div className="flex gap-3">
                    <button
                        onClick={startSync}
                        disabled={syncing || !isOnline}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {syncing ? 'Syncing…' : 'Retry Sync'}
                    </button>
                    {!isOnline && (
                        <span className="px-3 py-2 text-sm text-gray-500">Offline. Reconnect to continue.</span>
                    )}
                </div>
            </div>
        );
    }

    return children;
}

function App() {
    const [updateResetDone, setUpdateResetDone] = useState(false);

    useEffect(() => {
        const checkVersionChange = async () => {
            try {
                if (isWeb()) {
                    setUpdateResetDone(true);
                    return;
                }

                const info = await CapApp.getInfo();
                const currentVersionCode = String(info.build || "");
                const currentVersionName = String(info.version || "");

                const stored = await Preferences.get({ key: "workops_last_version_code" });
                const lastVersionCode = stored.value;

                console.log(
                    "WORKOPS DEBUG | version check |",
                    new Date().toISOString(),
                    "versionName:", currentVersionName,
                    "versionCode:", currentVersionCode,
                    "lastVersionCode:", lastVersionCode
                );

                const isFirstRun = !lastVersionCode;
                const isUpdated = !!lastVersionCode && lastVersionCode !== currentVersionCode;

                if (isFirstRun) {
                    console.log("WORKOPS DEBUG | version state |", new Date().toISOString(), "first run");
                } else if (isUpdated) {
                    console.log("WORKOPS DEBUG | version state |", new Date().toISOString(), "updated");
                    await resetLocalAppDataOnUpdate();
                } else {
                    console.log("WORKOPS DEBUG | version state |", new Date().toISOString(), "same version");
                }

                await Preferences.set({
                    key: "workops_last_version_code",
                    value: currentVersionCode
                });
            } catch (err) {
                console.error("WORKOPS DEBUG | version check failed |", err);
            } finally {
                setUpdateResetDone(true);
            }
        };

        checkVersionChange();
    }, []);


    useViewportCssVars();
    // CRITICAL: Block web access completely
    // This app ONLY works in Android WebView (Capacitor)
    if (isWeb()) {
        console.warn('🚫 Web access blocked. This app is Android-only.');
        return <WebBlockingMessage />;
    }

    if (!updateResetDone) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-700 px-6 text-center">
                <img
                    src={logo}
                    alt="App Logo"
                    className="w-24 h-24 mx-auto mb-4 animate-pulse"
                />
                <p className="text-sm text-gray-500">Preparing app data...</p>
            </div>
        );
    }

    // Android WebView: Load full app with all features
    console.log('✓ Running in Android WebView. Loading full app...');

    return (
        <ErrorBoundary>
            <AuthProvider>
                <SyncProvider>
                    <NotificationProvider>
                    <Router>
                        <AndroidBackButtonHandler />
                        <Routes>
                            {/* Public Route */}
                            <Route path="/" element={<Login />} />

                            {/* Protected Routes with Layout */}
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <InitialSyncGate>
                                            <Layout>
                                                <Home />
                                            </Layout>
                                        </InitialSyncGate>
                                    </ProtectedRoute>
                                }
                            />
                    <Route
                        path="/inventory"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Inventory />
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/services"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Inventory initialTab="services" />
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/workorders"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Layout padForBottomStack={false}>
                                        <Workorders />
                                    </Layout>
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Customers />
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customer/:customerId"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Layout>
                                        <CustomerDetail />
                                    </Layout>
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customer/:customerId/bills"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Layout>
                                        <CustomerBills />
                                    </Layout>
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Settings />
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/help-support"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <HelpSupport />
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/bank-accounts"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Layout>
                                        <BankAccounts />
                                    </Layout>
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/bill/:billId"
                        element={
                            <ProtectedRoute>
                                <InitialSyncGate>
                                    <Layout>
                                        <BillDetail />
                                    </Layout>
                                </InitialSyncGate>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
            </NotificationProvider>
            </SyncProvider>
        </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;





