import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Bell, HelpCircle, LogOut, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';
import { isNative } from '../utils/platform';
import SummaryApi from '../common';
import { apiClient } from '../utils/apiClient';

const Settings = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
    const [isClearingData, setIsClearingData] = useState(false);

    // Show logout confirmation modal
    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    // Actual logout after confirmation
    const confirmLogout = async () => {
        setIsLoggingOut(true);
        const result = await logout();
        if (result.success) {
            navigate('/');
        }
        setIsLoggingOut(false);
        setShowLogoutConfirm(false);
    };

    // Clear all data and logout (for development/testing)
    const handleClearAllData = () => {
        setShowClearDataConfirm(true);
    };

    const confirmClearAllData = async () => {
        setIsClearingData(true);
        const errors = [];

        try {
            // Step 1: Clear SQLite database first (before logout)
            if (isNative()) {
                try {
                    const { getOrCreateDatabase } = await import('../storage/sqliteClient');
                    const db = await getOrCreateDatabase();

                    // Clear all tables using db.run (not execute)
                    const tables = [
                        'customers', 'items', 'serial_numbers', 'stock_history',
                        'services', 'work_orders', 'bills', 'bill_items',
                        'payment_history', 'bank_accounts', 'fcm_tokens',
                        'dashboard_metrics', 'metadata'
                    ];

                    for (const table of tables) {
                        try {
                            await db.run(`DELETE FROM ${table}`, []);
                            console.log(`✓ Cleared table: ${table}`);
                        } catch (err) {
                            console.warn(`Failed to clear ${table}:`, err);
                            errors.push(`${table}: ${err.message}`);
                        }
                    }

                    console.log('✓ All local database tables cleared');
                } catch (dbError) {
                    console.error('Database clear error:', dbError);
                    errors.push(`Database: ${dbError.message}`);
                }
            }

            // Step 2: Clear Firebase auth (sign out)
            try {
                const { signOut } = await import('firebase/auth');
                const { auth } = await import('../config/firebase');
                await signOut(auth);
                console.log('✓ Firebase signed out');
            } catch (authError) {
                console.error('Firebase signout error:', authError);
                errors.push(`Firebase: ${authError.message}`);
            }

            // Step 3: Clear Google Native SDK (if initialized)
            if (isNative()) {
                try {
                    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                    await GoogleAuth.signOut();
                    await GoogleAuth.disconnect();
                    console.log('✓ Google Auth cleared');
                } catch (googleError) {
                    // Ignore if not initialized
                    console.warn('Google Auth clear skipped:', googleError.message);
                }
            }

            // Step 4: Clear Capacitor Preferences (WebView storage)
            if (isNative()) {
                try {
                    const { Preferences } = await import('@capacitor/preferences');
                    await Preferences.clear();
                    console.log('✓ Capacitor Preferences cleared');
                } catch (prefError) {
                    console.error('Preferences clear error:', prefError);
                    errors.push(`Preferences: ${prefError.message}`);
                }
            }

            // Step 5: Clear backend session cookie
            try {
                await apiClient(SummaryApi.logout.url, {
                    method: SummaryApi.logout.method
                });
                console.log('✓ Backend session cleared');
            } catch (backendError) {
                // Non-critical, continue
                console.warn('Backend logout failed:', backendError);
            }

            // Show summary
            if (errors.length > 0) {
                console.warn('Clear data completed with errors:', errors);
                alert(`Data cleared with some warnings:\n${errors.join('\n')}\n\nApp will reload now.`);
            } else {
                console.log('✅ All data cleared successfully!');
            }

            // Reload the app (give time for logs)
            setTimeout(() => {
                window.location.href = '/';
            }, 500);

        } catch (error) {
            console.error('Critical clear data error:', error);
            alert(`Failed to clear data: ${error.message}\n\nPlease try again or reinstall the app.`);
        } finally {
            setIsClearingData(false);
            setShowClearDataConfirm(false);
        }
    };

    const SettingItem = ({ icon: Icon, label, onClick, iconBg, iconColor, showChevron = true }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-gray-800 font-medium text-sm">{label}</span>
            </div>
            {showChevron && <ChevronRight className="w-5 h-5 text-gray-400" />}
        </button>
    );

    const SectionHeader = ({ title }) => (
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2 mt-6">
            {title}
        </h2>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Back Arrow */}
            <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">Settings</h1>
                </div>
            </header>

            {/* Content */}
            <div className="pt-20 pb-8 px-4">

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 shadow-lg mb-6">
                <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-full border-3 border-white/30 shadow-md"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-3 border-white/30">
                            <span className="text-white text-2xl font-bold">
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </span>
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">{user?.displayName || 'User'}</h3>
                        <p className="text-white/80 text-sm">{user?.email}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium border border-white/30">
                            Engineer Account
                        </span>
                    </div>
                </div>
            </div>

            {/* Account Section */}
            <SectionHeader title="Account" />
            <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 mb-2">
                <SettingItem
                    icon={User}
                    label="Edit Profile"
                    onClick={() => {}}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                />
                <SettingItem
                    icon={Building2}
                    label="Bank Accounts"
                    onClick={() => navigate('/bank-accounts')}
                    iconBg="bg-green-100"
                    iconColor="text-green-600"
                />
            </div>

            {/* Preferences Section */}
            <SectionHeader title="Preferences" />
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-2">
                <SettingItem
                    icon={Bell}
                    label="Notifications"
                    onClick={() => {}}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                />
            </div>

            {/* Support Section */}
            <SectionHeader title="Support" />
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <SettingItem
                    icon={HelpCircle}
                    label="Help & Support"
                    onClick={() => {}}
                    iconBg="bg-orange-100"
                    iconColor="text-orange-600"
                />
            </div>

            {/* Developer/Testing Section (Only for Development) */}
            <SectionHeader title="Developer Tools" />
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <button
                    onClick={handleClearAllData}
                    disabled={isClearingData}
                    className="w-full flex items-center justify-between p-4 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-red-600 font-medium text-sm">Clear All Data & Logout</span>
                    </div>
                    {isClearingData && (
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                </button>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full bg-white border-2 border-red-200 text-red-600 p-4 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 active:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-sm"
            >
                {isLoggingOut ? (
                    <>
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Logging out...</span>
                    </>
                ) : (
                    <>
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </>
                )}
            </button>

            {/* App Info */}
            <div className="mt-8 text-center space-y-1">
                <p className="text-gray-400 text-xs">Version 1.0.0</p>
                <p className="text-gray-400 text-xs">Made with care for engineers</p>
            </div>

            {/* Logout Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Logout Confirmation"
                message="Are you sure you want to logout? You will need to login again to access your account."
                loading={isLoggingOut}
                confirmText="Logout"
                loadingText="Logging out..."
            />

            {/* Clear All Data Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showClearDataConfirm}
                onClose={() => setShowClearDataConfirm(false)}
                onConfirm={confirmClearAllData}
                title="⚠️ Clear All Data"
                message="This will DELETE ALL local data (customers, bills, work orders, inventory) and log you out. This action cannot be undone. Use only for testing/development."
                loading={isClearingData}
                confirmText="Yes, Clear Everything"
                loadingText="Clearing data..."
            />
            </div>
        </div>
    );
};

export default Settings;
