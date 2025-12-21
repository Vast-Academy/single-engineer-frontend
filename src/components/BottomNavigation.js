import { useEffect, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSync } from '../context/SyncContext';

const BottomNavigation = () => {
    const location = useLocation();
    const { bumpDataVersion, dataVersion } = useSync();
    const [pendingWorkCount, setPendingWorkCount] = useState(0);

    const fetchPendingCount = useCallback(async () => {
        try {
            // FIXED: Use local SQLite for real-time count updates
            const { getWorkOrdersDao } = await import('../storage/dao/workOrdersDao');
            const dao = await getWorkOrdersDao();
            const count = await dao.countByStatus('pending');
            setPendingWorkCount(count);
        } catch (error) {
            console.error('Fetch pending work orders count error:', error);
        }
    }, []);

    useEffect(() => {
        fetchPendingCount();
    }, [fetchPendingCount, dataVersion]);

    const navItems = [
        {
            path: '/dashboard',
            label: 'Home',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            path: '/customers',
            label: 'Customers',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            path: '/workorders',
            label: 'Work Orders',
            icon: (
                <div className="relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    {pendingWorkCount > 0 && (
                        <span className="absolute -top-1 -right-2 min-w-[18px] h-4 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
                            {pendingWorkCount}
                        </span>
                    )}
                </div>
            )
        },
        {
            path: '/inventory',
            label: 'Inventory',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        },
        {
            path: '/settings',
            label: 'More',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01M10 6h4M10 12h4M10 18h4M5 6h.01M5 12h.01M5 18h.01M7 6h2M7 12h2M7 18h2M17 6h2M17 12h2M17 18h2" />
                </svg>
            )
        }
    ];

    // Handle tab click - refresh if already on same tab
    const handleTabClick = (e, path) => {
        if (location.pathname === path) {
            e.preventDefault();
            bumpDataVersion();
        }
    };

    return (
        <nav className="bg-white border-t border-gray-200">
            <div className="flex items-center justify-around py-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={(e) => handleTabClick(e, item.path)}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center px-3 py-1 min-w-[64px] ${
                                isActive
                                    ? 'text-primary-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="text-xs mt-1 font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavigation;
