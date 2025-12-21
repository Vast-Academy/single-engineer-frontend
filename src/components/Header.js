import { forwardRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

const Header = forwardRef((props, ref) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <header ref={ref} className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 safe-area-top">
            <div className="px-4 py-1 flex items-center justify-between">
                {/* User Profile - Left Side */}
                <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-2 hover:bg-gray-50 active:bg-gray-100 rounded-xl p-1.5 -ml-1.5 transition-colors"
                >
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full border-2 border-primary-200"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-semibold text-base">
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </span>
                        </div>
                    )}
                    <div>
                        <p className="text-md font-semibold text-gray-800 leading-tight">
                            {user?.displayName || 'User'}
                        </p>
                        {/* <p className="text-xs text-gray-500 leading-tight">Engineer</p> */}
                    </div>
                </button>

                {/* Notification Bell - Right Side */}
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors relative">
                    <Bell className="w-6 h-6 text-gray-600" />
                    {/* Notification Badge (optional - uncomment if needed) */}
                    {/* <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span> */}
                </button>
            </div>
        </header>
    );
});

export default Header;
