import { forwardRef, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotificationCenter } from '../context/NotificationContext';

const Header = forwardRef((props, ref) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { notifications, unreadCount, markAllRead, markReadById } = useNotificationCenter();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const handleToggle = () => {
        const next = !open;
        setOpen(next);
        if (next) {
            markAllRead();
        }
    };

    const handleNotificationClick = (notification) => {
        markReadById(notification.id);
        setOpen(false);
        navigate('/workorders');
    };

    const formatLines = (body) => {
        if (!body) return [];
        return body.split('\n').map((line) => line.trim()).filter(Boolean);
    };

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
                            alt={user?.businessProfile?.ownerName || user?.displayName || 'User'}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full border-2 border-primary-200"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-semibold text-base">
                                {(user?.businessProfile?.ownerName || user?.displayName)?.charAt(0) || user?.email?.charAt(0) || 'U'}
                            </span>
                        </div>
                    )}
                    <div>
                        <p className="text-md font-semibold text-gray-800 leading-tight">
                            {user?.businessProfile?.ownerName || user?.displayName || 'User'}
                        </p>
                        {/* <p className="text-xs text-gray-500 leading-tight">Engineer</p> */}
                    </div>
                </button>

                {/* Notification Bell - Right Side */}
                <div className="relative" ref={panelRef}>
                <button
                    onClick={handleToggle}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors relative"
                >
                    <Bell className="w-6 h-6 text-gray-600" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[11px] leading-5 rounded-full text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-lg z-[70]">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-800">Notifications</p>
                            <span className="text-xs text-gray-500">{notifications.length}</span>
                        </div>
                        {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                No notifications yet.
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.map((notification) => {
                                    const lines = formatLines(notification.body);
                                    return (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                                            {lines[0] && (
                                                <p className="text-sm text-gray-700">{lines[0]}</p>
                                            )}
                                            {lines[1] && (
                                                <p className="text-xs text-gray-500 mt-1">{lines.slice(1).join(' ')}</p>
                                            )}
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {new Date(notification.receivedAt).toLocaleString('en-IN')}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
        </header>
    );
});

export default Header;
