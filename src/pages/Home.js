import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList } from 'lucide-react';
import WorkOrderDetailModal from '../components/workorder/WorkOrderDetailModal';
import { ensureWorkOrdersPulled, pullWorkOrdersFromBackend } from '../storage/sync/workOrdersSync';
import { getWorkOrdersDao } from '../storage/dao/workOrdersDao';
import { getCustomersDao } from '../storage/dao/customersDao';
import { getDashboardMetricsDao } from '../storage/dao/dashboardMetricsDao';
import { pullDashboardMetrics, buildKey } from '../storage/sync/dashboardMetricsSync';

const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState(null);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staleMessage, setStaleMessage] = useState('');

    // New filtering system
    const [filterType, setFilterType] = useState('period'); // 'period' or 'monthYear'
    const [selectedPeriod, setSelectedPeriod] = useState('1month');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [noDataMessage, setNoDataMessage] = useState('');

    // Work order detail modal
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showWorkOrderDetail, setShowWorkOrderDetail] = useState(false);
    const [pendingWorksLocal, setPendingWorksLocal] = useState([]);

    // Fetch dashboard metrics
    const loadMetricsFromCache = async (filterType, periodValue, monthValue, yearValue) => {
        const dao = await getDashboardMetricsDao();
        const key = buildKey(filterType, periodValue, monthValue, yearValue);
        const row = await dao.getByKey(key);
        if (row?.payload) {
            try {
                const parsed = JSON.parse(row.payload);
                setMetrics(parsed);
                setAvailableMonths(parsed.availableMonths || []);
                setAvailableYears(parsed.availableYears || []);
                setNoDataMessage('');
                return true;
            } catch (e) {
                console.error('Parse cached metrics failed:', e);
            }
        }
        return false;
    };

    const fetchMetrics = async (type = 'period', periodValue = '1month', monthValue = null, yearValue = null, { background = false } = {}) => {
        if (!background) setLoading(true);
        setNoDataMessage('');
        setStaleMessage('');

        // First try cache for instant load
        const hadCache = await loadMetricsFromCache(type, periodValue, monthValue, yearValue);
        if (hadCache && background) {
            // keep UI as-is and refresh in background
        } else if (hadCache && !background) {
            // We already rendered cached metrics; don't force skeleton
            setLoading(false);
        }

        try {
            const { payload } = await pullDashboardMetrics({
                filterType: type,
                period: periodValue,
                month: monthValue,
                year: yearValue
            });
            if (payload.noData) {
                setNoDataMessage(payload.message || 'No data for selection');
                setMetrics(null);
            } else {
                setMetrics(payload);
                setAvailableMonths(payload.availableMonths || []);
                setAvailableYears(payload.availableYears || []);
            }
        } catch (error) {
            console.error('Fetch metrics error:', error);
            if (hadCache) {
                setStaleMessage('Showing cached data. Latest refresh failed.');
            } else {
                setNoDataMessage('Unable to load metrics (offline?).');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Default: Load 1 month period data (cache-first)
        fetchMetrics('period', '1month');

        // Ensure work orders pulled for local pending list
        ensureWorkOrdersPulled()
            .then(loadPendingWorksLocal)
            .catch(() => {});

        // Background refresh of work orders without blocking initial paint
        setTimeout(() => {
            pullWorkOrdersFromBackend().then(() => loadPendingWorksLocal()).catch(() => {});
        }, 0);
    }, []);

    // Handler for Period dropdown (1st dropdown)
    const handlePeriodChange = (e) => {
        const value = e.target.value;
        setSelectedPeriod(value);
        setFilterType('period');

        // Reset month-year selections
        setSelectedMonth('');
        setSelectedYear('');

        // Fetch data with period filter
        fetchMetrics('period', value);
    };

    // Handler for Month dropdown (2nd dropdown)
    const handleMonthChange = (e) => {
        const value = e.target.value;
        setSelectedMonth(value);

        // Reset period selection when month is selected
        setSelectedPeriod('');

        // Only fetch if year is also selected
        if (selectedYear && value) {
            setFilterType('monthYear');
            fetchMetrics('monthYear', null, parseInt(value), parseInt(selectedYear));
        }
    };

    // Handler for Year dropdown (3rd dropdown)
    const handleYearChange = (e) => {
        const value = e.target.value;
        setSelectedYear(value);

        // Reset period selection when year is selected
        setSelectedPeriod('');

        // Only fetch if month is also selected
        if (selectedMonth && value) {
            setFilterType('monthYear');
            fetchMetrics('monthYear', null, parseInt(selectedMonth), parseInt(value));
        }
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

    const loadPendingWorksLocal = async () => {
        try {
            const dao = await getWorkOrdersDao();
            const rows = await dao.list({ status: 'pending', limit: 50, offset: 0 });
            const ids = [...new Set(rows.map(r => r.customer_id).filter(Boolean))];
            const customersDao = await getCustomersDao();
            const customerMap = {};
            for (const id of ids) {
                const c = await customersDao.getById(id);
                if (c) {
                    customerMap[id] = c;
                }
            }
            const mapped = rows.map(wo => ({
                _id: wo.id,
                workOrderNumber: wo.work_order_number,
                scheduleDate: wo.schedule_date || '',
                scheduleTime: wo.schedule_time,
                hasScheduledTime: !!wo.has_scheduled_time,
                note: wo.note,
                status: wo.status,
                pendingSync: wo.pending_sync === 1,
                syncError: wo.sync_error || null,
                customer: customerMap[wo.customer_id]
                    ? {
                        _id: customerMap[wo.customer_id].id,
                        customerName: customerMap[wo.customer_id].customer_name,
                        phoneNumber: customerMap[wo.customer_id].phone_number,
                        address: customerMap[wo.customer_id].address
                    }
                    : {
                        _id: wo.customer_id,
                        customerName: 'Unknown Customer',
                        phoneNumber: '',
                        address: ''
                    }
            }));
            setPendingWorksLocal(mapped);
        } catch (err) {
            console.error('Load pending work orders (local) error:', err);
        }
    };

    const handleWorkOrderUpdate = (updatedWorkOrder) => {
        // Refresh metrics to update the list
        if (filterType === 'period') {
            fetchMetrics('period', selectedPeriod);
        } else if (filterType === 'monthYear' && selectedMonth && selectedYear) {
            fetchMetrics('monthYear', null, parseInt(selectedMonth), parseInt(selectedYear));
        } else {
            fetchMetrics('period', '1month');
        }
    };

    const handleWorkOrderDelete = (workOrderId) => {
        // Refresh metrics to update the list
        if (filterType === 'period') {
            fetchMetrics('period', selectedPeriod);
        } else if (filterType === 'monthYear' && selectedMonth && selectedYear) {
            fetchMetrics('monthYear', null, parseInt(selectedMonth), parseInt(selectedYear));
        } else {
            fetchMetrics('period', '1month');
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
                className="p-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
                <div className={`w-10 h-10 ${overdue ? 'bg-red-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <ClipboardList className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    {/* Customer Name & Date/Time */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-800 truncate">
                                {workOrder.customer?.customerName || 'Unknown Customer'}
                            </p>
                            {(workOrder.pendingSync || workOrder.syncError) && (
                                <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${workOrder.syncError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {workOrder.syncError ? '!' : 'Sync'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className={`text-xs font-medium whitespace-nowrap ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
                                {formatDate(workOrder.scheduleDate)}
                                {workOrder.hasScheduledTime && workOrder.scheduleTime && (
                                    <span className="ml-1">{workOrder.scheduleTime}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Address */}
                    {workOrder.customer?.address && (
                        <div className="flex items-start gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-xs text-gray-600 line-clamp-1">
                                {workOrder.customer.address}
                            </p>
                        </div>
                    )}

                    {/* Note */}
                    <div className="flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {workOrder.note}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // Skeleton Loader Component
    const SkeletonLoader = () => (
        <div className="pb-20 animate-pulse">
            {/* Month Selector Skeleton */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="col-start-2 bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-7 bg-gray-200 rounded"></div>
                </div>
            </div>

            {/* Financial Metrics Skeleton - 6 Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {[...Array(6)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-20 mt-2"></div>
                    </div>
                ))}
            </div>

            {/* Gross Profit Skeleton - Large Card */}
            <div className="bg-gray-200 rounded-xl p-4 mb-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded w-28 mb-2"></div>
                        <div className="h-8 bg-gray-300 rounded w-32"></div>
                    </div>
                    <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                </div>
            </div>

            {/* Current Status Skeleton - 2 Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {[...Array(2)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0"></div>
                            <div className="flex-1">
                                <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                                <div className="h-5 bg-gray-200 rounded w-12"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Work Orders Skeleton */}
            <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                    {[...Array(3)].map((_, index) => (
                        <div key={index} className="p-3 flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-28 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-40 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-48"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <div className="pb-20">
            {/* Revenue Period Selector - Full Width with 3 Dropdowns */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-600 font-semibold">Revenue Period</span>
                </div>

                {/* 3 Dropdowns Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {/* 1st Dropdown - Period */}
                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Quick Period</label>
                        <select
                            value={selectedPeriod}
                            onChange={handlePeriodChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-800 focus:outline-none focus:border-primary-500 focus:bg-white"
                        >
                            <option value="">Select</option>
                            <option value="1week">1 Week</option>
                            <option value="1month">1 Month</option>
                            <option value="3months">3 Months</option>
                            <option value="6months">6 Months</option>
                            <option value="1year">1 Year</option>
                        </select>
                    </div>

                    {/* 2nd Dropdown - Month */}
                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Month</label>
                        <select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-800 focus:outline-none focus:border-primary-500 focus:bg-white"
                        >
                            <option value="">Select</option>
                            <option value="1">January</option>
                            <option value="2">February</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>

                    {/* 3rd Dropdown - Year */}
                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Year</label>
                        <select
                            value={selectedYear}
                            onChange={handleYearChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-800 focus:outline-none focus:border-primary-500 focus:bg-white"
                        >
                            <option value="">Select</option>
                            {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* No Data Message */}
                {noDataMessage && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
                        <p className="text-xs text-yellow-800">{noDataMessage}</p>
                    </div>
                )}
                {staleMessage && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-center">
                        <p className="text-xs text-red-700">{staleMessage}</p>
                    </div>
                )}
            </div>

            {/* Financial Metrics - Compact Grid */}
            {metrics && (
            <>
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
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                            (metrics?.monthMetrics.servicesAmount || 0) >= 0
                                ? 'bg-purple-100'
                                : 'bg-red-100'
                        }`}>
                            <svg className={`w-3 h-3 ${
                                (metrics?.monthMetrics.servicesAmount || 0) >= 0
                                    ? 'text-purple-600'
                                    : 'text-red-600'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">Services</p>
                    </div>
                    <p className={`text-sm font-bold ${
                        (metrics?.monthMetrics.servicesAmount || 0) >= 0
                            ? 'text-purple-600'
                            : 'text-red-600'
                    }`}>{formatCurrency(metrics?.monthMetrics.servicesAmount)}</p>
                </div>
            </div>

            {/* Gross Profit - Highlight */}
            <div className={`rounded-xl p-4 mb-3 shadow-sm ${
                (metrics?.monthMetrics.grossProfit || 0) >= 0
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-white/80">Gross Profit/Loss</p>
                        <p className="text-2xl font-bold text-white mt-0.5">{formatCurrency(metrics?.monthMetrics.grossProfit)}</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {(metrics?.monthMetrics.grossProfit || 0) >= 0 ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            )}
                        </svg>
                    </div>
                </div>
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

            {/* Work Orders */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Work Orders</h3>
                {pendingWorksLocal && pendingWorksLocal.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {pendingWorksLocal.map((workOrder) => (
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
            </>
            )}

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
