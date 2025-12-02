import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SummaryApi from '../common';
import { ClipboardList } from 'lucide-react';
import WorkOrderDetailModal from '../components/workorder/WorkOrderDetailModal';

const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState(null);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [loading, setLoading] = useState(true);

    // Work order detail modal
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showWorkOrderDetail, setShowWorkOrderDetail] = useState(false);

    // Fetch dashboard metrics
    const fetchMetrics = async (month = null, year = null) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (month && year) {
                params.append('month', month);
                params.append('year', year);
            }

            const response = await fetch(
                `${SummaryApi.getDashboardMetrics.url}?${params.toString()}`,
                {
                    method: SummaryApi.getDashboardMetrics.method,
                    credentials: 'include'
                }
            );
            const data = await response.json();

            if (data.success) {
                setMetrics(data.data);
                setAvailableMonths(data.data.availableMonths);

                // Set default month selection if not already set
                if (!selectedMonth && data.data.availableMonths.length > 0) {
                    const currentMonth = data.data.availableMonths[data.data.availableMonths.length - 1];
                    setSelectedMonth(`${currentMonth.year}-${currentMonth.month}`);
                }
            }
        } catch (error) {
            console.error('Fetch metrics error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentDate = new Date();
        fetchMetrics(currentDate.getMonth() + 1, currentDate.getFullYear());
    }, []);

    const handleMonthChange = (e) => {
        const value = e.target.value;
        setSelectedMonth(value);

        const [year, month] = value.split('-');
        fetchMetrics(parseInt(month), parseInt(year));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset time for comparison
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else if (date < today) {
            return 'Overdue';
        }

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    const handleWorkOrderClick = (workOrder) => {
        setSelectedWorkOrder(workOrder);
        setShowWorkOrderDetail(true);
    };

    const handleWorkOrderUpdate = (updatedWorkOrder) => {
        // Refresh metrics to update the list
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            fetchMetrics(parseInt(month), parseInt(year));
        } else {
            const currentDate = new Date();
            fetchMetrics(currentDate.getMonth() + 1, currentDate.getFullYear());
        }
    };

    const handleWorkOrderDelete = (workOrderId) => {
        // Refresh metrics to update the list
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            fetchMetrics(parseInt(month), parseInt(year));
        } else {
            const currentDate = new Date();
            fetchMetrics(currentDate.getMonth() + 1, currentDate.getFullYear());
        }
    };

    const PendingWorkItem = ({ workOrder }) => {
        const isOverdue = () => {
            const now = new Date();
            const scheduleDate = new Date(workOrder.scheduleDate);
            scheduleDate.setHours(0, 0, 0, 0);
            now.setHours(0, 0, 0, 0);
            return scheduleDate < now;
        };

        const overdue = isOverdue();

        return (
            <div
                onClick={() => handleWorkOrderClick(workOrder)}
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
            >
                <div className={`w-9 h-9 ${overdue ? 'bg-red-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <ClipboardList className={`w-4 h-4 ${overdue ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <p className="text-sm font-semibold text-gray-800">{workOrder.workOrderNumber}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                            {formatDate(workOrder.scheduleDate)}
                            {workOrder.hasScheduledTime && workOrder.scheduleTime && ` ${workOrder.scheduleTime}`}
                        </p>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{workOrder.customer?.customerName}</p>
                    <p className="text-xs text-gray-500 truncate">{workOrder.note}</p>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="py-3 pb-20">
            {/* Compact Header with Month Selector */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h1 className="text-lg font-bold text-gray-800">Dashboard</h1>
                    <p className="text-xs text-gray-500">Welcome, {user?.displayName?.split(' ')[0] || 'User'}</p>
                </div>
                {availableMonths.length > 0 && (
                    <select
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-primary-500"
                    >
                        {availableMonths.map((month) => (
                            <option key={`${month.year}-${month.month}`} value={`${month.year}-${month.month}`}>
                                {month.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Current Status - Compact 2 Column */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">Total Stock</p>
                            <p className="text-lg font-bold text-gray-800">{metrics?.currentMetrics.totalStock || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">Pending Orders</p>
                            <p className="text-lg font-bold text-gray-800">{metrics?.currentMetrics.pendingWorkOrders || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gross Profit - Highlight */}
            <div className={`rounded-xl p-4 mb-3 shadow-sm ${
                (metrics?.monthMetrics.grossProfit || 0) >= 0
                    ? 'bg-gradient-to-r from-primary-500 to-blue-500'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-white/80">Gross Profit</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{formatCurrency(metrics?.monthMetrics.grossProfit)}</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {(metrics?.monthMetrics.grossProfit || 0) >= 0 ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Financial Metrics - Compact Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Billed */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Billed</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{formatCurrency(metrics?.monthMetrics.billedAmount)}</p>
                </div>

                {/* Collected */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Collected</p>
                    </div>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(metrics?.monthMetrics.amountCollected)}</p>
                </div>

                {/* Due */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Due</p>
                    </div>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(metrics?.monthMetrics.outstandingAmount)}</p>
                </div>

                {/* Expenses */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Expenses</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{formatCurrency(metrics?.monthMetrics.totalExpenses)}</p>
                </div>

                {/* Net Profit */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                            (metrics?.monthMetrics.netProfit || 0) >= 0
                                ? 'bg-emerald-100'
                                : 'bg-red-100'
                        }`}>
                            <svg className={`w-3 h-3 ${
                                (metrics?.monthMetrics.netProfit || 0) >= 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {(metrics?.monthMetrics.netProfit || 0) >= 0 ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                )}
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Net Profit</p>
                    </div>
                    <p className={`text-sm font-bold ${
                        (metrics?.monthMetrics.netProfit || 0) >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                    }`}>{formatCurrency(metrics?.monthMetrics.netProfit)}</p>
                </div>

                {/* Services */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Services</p>
                    </div>
                    <p className="text-sm font-bold text-purple-600">{formatCurrency(metrics?.monthMetrics.servicesAmount)}</p>
                </div>
            </div>

            {/* Pending Works */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Pending Works</h3>
                {metrics?.pendingWorks && metrics.pendingWorks.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {metrics.pendingWorks.map((workOrder) => (
                            <PendingWorkItem key={workOrder._id} workOrder={workOrder} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No pending work orders</p>
                    </div>
                )}
            </div>

            {/* Work Order Detail Modal */}
            <WorkOrderDetailModal
                isOpen={showWorkOrderDetail}
                onClose={() => {
                    setShowWorkOrderDetail(false);
                    setSelectedWorkOrder(null);
                }}
                workOrder={selectedWorkOrder}
                onUpdate={handleWorkOrderUpdate}
                onDelete={handleWorkOrderDelete}
            />
        </div>
    );
};

export default Home;
