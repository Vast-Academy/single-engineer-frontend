import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Bell, HelpCircle, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';

const Settings = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
            </div>
        </div>
    );
};

export default Settings;
