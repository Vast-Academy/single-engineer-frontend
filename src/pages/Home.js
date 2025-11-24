import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="py-4">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-primary-500 to-blue-400 rounded-2xl p-5 mb-6 text-white">
                <h2 className="text-xl font-bold mb-1">
                    Welcome, {user?.displayName?.split(' ')[0] || 'User'}! 👋
                </h2>
                <p className="text-sm opacity-90">
                    Manage your work efficiently
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs">Total Tasks</p>
                            <p className="text-2xl font-bold text-gray-800">0</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="text-xl">📋</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs">In Progress</p>
                            <p className="text-2xl font-bold text-gray-800">0</p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <span className="text-xl">⏳</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs">Completed</p>
                            <p className="text-2xl font-bold text-gray-800">0</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-xl">✅</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs">Customers</p>
                            <p className="text-2xl font-bold text-gray-800">0</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <span className="text-xl">👥</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Recent Activity</h3>
                <div className="text-center py-8">
                    <span className="text-3xl mb-2 block">📭</span>
                    <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
            </div>
        </div>
    );
};

export default Home;
