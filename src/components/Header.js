import { useAuth } from '../context/AuthContext';

const Header = () => {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
            <div className="px-4 py-3 flex items-center justify-between">
                {/* Logo & App Name */}
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-blue-400 rounded-xl flex items-center justify-center">
                        <span className="text-lg">🛠️</span>
                    </div>
                    <h1 className="text-lg font-bold text-gray-800">Engineer App</h1>
                </div>

                {/* User Avatar */}
                <div className="flex items-center gap-2">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full border-2 border-primary-200"
                        />
                    ) : (
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
