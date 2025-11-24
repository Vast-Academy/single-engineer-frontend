import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';

const Settings = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const result = await logout();
        if (result.success) {
            navigate('/');
        }
        setIsLoggingOut(false);
    };

    return (
        <div className="py-4">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-800">Settings</h1>
                <p className="text-gray-500 text-sm">Manage your account settings</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-full border-2 border-primary-200"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 text-xl font-bold">
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </span>
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{user?.displayName || 'User'}</h3>
                        <p className="text-gray-500 text-sm">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            Engineer
                        </span>
                    </div>
                </div>
            </div>

            {/* Settings Options */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <span className="text-gray-800 font-medium">Edit Profile</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <span className="text-gray-800 font-medium">Notifications</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button
                    onClick={() => navigate('/bank-accounts')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-gray-800 font-medium">Bank Accounts</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-gray-800 font-medium">Help & Support</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full bg-red-50 text-red-600 p-4 rounded-xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isLoggingOut ? (
                    <>
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Logging out...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </>
                )}
            </button>

            {/* App Version */}
            <p className="text-center text-gray-400 text-xs mt-6">
                Version 1.0.0
            </p>
        </div>
    );
};

export default Settings;
