import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboardMetricsDao } from '../storage/dao/dashboardMetricsDao';
import { pullDashboardMetrics, buildKey } from '../storage/sync/dashboardMetricsSync';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [metrics, setMetrics] = useState(null);
    const [staleMessage, setStaleMessage] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const dao = await getDashboardMetricsDao();
                const key = buildKey('period', '1month');
                const cached = await dao.getByKey(key);
                if (cached?.payload) {
                    try {
                        setMetrics(JSON.parse(cached.payload));
                    } catch (e) {
                        console.error('Parse dashboard cache failed', e);
                    }
                }
                await pullDashboardMetrics({ filterType: 'period', period: '1month' });
                const refreshed = await dao.getByKey(key);
                if (refreshed?.payload) {
                    setMetrics(JSON.parse(refreshed.payload));
                }
                setStaleMessage('');
            } catch (err) {
                console.error('Dashboard metrics refresh error', err);
                if (metrics) {
                    setStaleMessage('Showing cached dashboard data. Latest refresh failed.');
                }
            }
        };
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                            <span className="text-xl text-white">DW</span>
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
                        Welcome back, {user?.displayName?.split(' ')[0] || 'User'}!
                    </h2>
                    <p className="opacity-90">
                        Your dashboard is ready. Start managing your work efficiently.
                    </p>
                </div>

                {staleMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                        {staleMessage}
                    </div>
                )}

                {/* Cached metrics snapshot */}
                {metrics && metrics.monthMetrics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-gray-500 text-sm">Billed (month)</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">₹ {metrics.monthMetrics.billedAmount ?? 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-gray-500 text-sm">Collections (month)</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">₹ {metrics.monthMetrics.receivedAmount ?? 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-gray-500 text-sm">Pending Due</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">₹ {metrics.monthMetrics.dueAmount ?? 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-gray-500 text-sm">Total Customers</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.customerCount ?? 0}</p>
                        </div>
                    </div>
                )}

                {/* Simple status tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <p className="text-gray-500 text-sm">Synced</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{metrics ? '✓' : '—'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <p className="text-gray-500 text-sm">Cached</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{metrics ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <p className="text-gray-500 text-sm">Status</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{staleMessage ? 'Stale' : 'Live'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <p className="text-gray-500 text-sm">Period</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">Last 1 month</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
