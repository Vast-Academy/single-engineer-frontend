import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-400 rounded-xl flex items-center justify-center">
                            <span className="text-xl">🛠️</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">Engineer WebApp</h1>
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            {user?.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-full border-2 border-primary-200"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-primary-600 font-medium">
                                        {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </span>
                                </div>
                            )}
                            <div className="hidden sm:block">
                                <p className="text-sm font-medium text-gray-800">{user?.displayName || 'User'}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-primary-500 to-blue-400 rounded-2xl p-6 mb-8 text-white">
                    <h2 className="text-2xl font-bold mb-2">
                        Welcome back, {user?.displayName?.split(' ')[0] || 'User'}! 👋
                    </h2>
                    <p className="opacity-90">
                        Your dashboard is ready. Start managing your work efficiently.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Total Tasks</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📋</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">In Progress</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">⏳</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Completed</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Pending</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">⏰</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Profile Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Profile</h3>
                    <div className="flex items-start gap-4">
                        {user?.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName}
                                referrerPolicy="no-referrer"
                                className="w-20 h-20 rounded-xl border-2 border-gray-100"
                            />
                        ) : (
                            <div className="w-20 h-20 bg-primary-100 rounded-xl flex items-center justify-center">
                                <span className="text-primary-600 text-2xl font-bold">
                                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                        <div className="flex-1">
                            <h4 className="text-xl font-semibold text-gray-800">{user?.displayName || 'User'}</h4>
                            <p className="text-gray-500">{user?.email}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                    Active
                                </span>
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                                    Google Account
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Placeholder for future content */}
                <div className="mt-8 bg-white rounded-xl p-8 shadow-sm border-2 border-dashed border-gray-200">
                    <div className="text-center">
                        <span className="text-4xl mb-4 block">🚧</span>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">More Features Coming Soon</h3>
                        <p className="text-gray-500">
                            This dashboard will be updated with more features. Stay tuned!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
