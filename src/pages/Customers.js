import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { FixedSizeList } from 'react-window';
import Layout, { useLayoutContext } from '../components/Layout';
import CustomerCard from '../components/customer/CustomerCard';
import AddCustomerModal from '../components/customer/AddCustomerModal';
import { SkeletonCustomersPage } from '../components/common/SkeletonLoaders';
import useDebounce from '../hooks/useDebounce';
import { ensureCustomersPulled, pullCustomersFromBackend } from '../storage/sync/customersSync';
import { getCustomersDao } from '../storage/dao/customersDao';
import { getWorkOrdersDao } from '../storage/dao/workOrdersDao';
import { getBillsDao } from '../storage/dao/billsDao';
import { useSync } from '../context/SyncContext';

const ITEMS_PER_PAGE = 5;
const ITEM_HEIGHT = 140; // 120 + 20px spacing

const CustomersBottomDock = ({ searchQuery, onSearchChange, onAdd }) => (
    <div className="px-4 py-3 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
            {/* Search Input */}
            <div className="relative flex-1">
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-primary-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* Add Button */}
            <button
                onClick={onAdd}
                className="w-12 h-12 bg-primary-500 text-white rounded-xl shadow-md flex items-center justify-center hover:bg-primary-600 transition-colors flex-shrink-0"
            >
                <UserPlus className="w-6 h-6" />
            </button>
        </div>
    </div>
);

const CustomersContent = ({
    loading,
    filteredCustomers,
    customers,
    loadingMore,
    handleItemsRendered,
    handleCustomerClick,
    pendingWorkCounts,
    searchQuery,
    listRef
}) => {
    const { bottomStackHeight } = useLayoutContext();
    const containerRef = useRef(null);
    const [listHeight, setListHeight] = useState(600);
    const [listWidth, setListWidth] = useState(typeof window !== 'undefined' ? window.innerWidth - 32 : 0);

    useLayoutEffect(() => {
        const calculateDimensions = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            const dockHeight = bottomStackHeight || 0;
            const topOffset = rect ? rect.top : 0;
            const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
            const availableHeight = viewportHeight - topOffset - dockHeight - 16;
            const minHeight = 320;
            setListHeight(availableHeight > minHeight ? availableHeight : minHeight);
            setListWidth(rect?.width || (typeof window !== 'undefined' ? window.innerWidth - 32 : 0));
        };

        calculateDimensions();
        window.addEventListener('resize', calculateDimensions);
        return () => window.removeEventListener('resize', calculateDimensions);
    }, [bottomStackHeight]);

    if (loading) {
        return <SkeletonCustomersPage />;
    }

    if (filteredCustomers.length === 0) {
        if (customers.length > 0) {
            return (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.982 18.725A8.966 8.966 0 0012 15.75a8.966 8.966 0 00-5.982 2.975m11.963 0A9 9 0 1112 3a9 9 0 015.982 15.725z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Results</h3>
                    <p className="text-gray-500 text-sm">No customers match "{searchQuery}"</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.982 18.725A8.966 8.966 0 0012 15.75a8.966 8.966 0 00-5.982 2.975m11.963 0A9 9 0 1112 3a9 9 0 015.982 15.725z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Customers</h3>
                <p className="text-gray-500 text-sm mb-4">Add your first customer</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full"
            style={{ paddingBottom: (bottomStackHeight || 0) + 16 }}
        >
            {listHeight > 0 && listWidth > 0 && (
                <FixedSizeList
                    ref={listRef}
                    height={listHeight}
                    itemCount={filteredCustomers.length}
                    itemSize={ITEM_HEIGHT}
                    width={listWidth}
                    onItemsRendered={handleItemsRendered}
                >
                    {({ index, style }) => (
                        <div style={{ ...style, paddingBottom: '12px' }} key={filteredCustomers[index]._id}>
                            <CustomerCard
                                customer={filteredCustomers[index]}
                                onClick={handleCustomerClick}
                                pendingWorkCount={pendingWorkCounts[filteredCustomers[index]._id] || 0}
                            />
                        </div>
                    )}
                </FixedSizeList>
            )}
            {loadingMore && (
                <div className="text-center py-4">
                    <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

const Customers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [backgroundRefresh, setBackgroundRefresh] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [pendingWorkCounts, setPendingWorkCounts] = useState({});
    const listRef = useRef(null);
    const { dataVersion } = useSync();
    const pendingCountVersion = useRef(0);

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch customers on mount (SQLite read with backend pull bootstrap)
    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true);
            try {
                await ensureCustomersPulled();
                await fetchCustomersFromLocal(1, true);
                setBackgroundRefresh(true);
                pullCustomersFromBackend()
                    .then(() => fetchCustomersFromLocal(1, true, debouncedSearchQuery, { silent: true, showSkeleton: false }))
                    .catch(() => {})
                    .finally(() => setBackgroundRefresh(false));
            } catch (err) {
                console.error('Customers bootstrap error:', err);
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, [debouncedSearchQuery]);

    // Fetch pending work orders once to show badges on customer cards
    const fetchPendingWorkOrders = useCallback(async () => {
        try {
            // Avoid redundant runs if dataVersion unchanged
            if (pendingCountVersion.current === dataVersion) return;
            const dao = await getWorkOrdersDao();
            const rows = await dao.list({ status: 'pending', limit: 2000, offset: 0 });
            const counts = {};
            rows.forEach(wo => {
                const customerId = wo.customer_id || wo.customer;
                if (customerId) {
                    counts[customerId] = (counts[customerId] || 0) + 1;
                }
            });
            pendingCountVersion.current = dataVersion;
            setPendingWorkCounts(counts);
        } catch (error) {
            console.error('Fetch pending work orders error (local):', error);
        }
    }, [dataVersion]);

    useEffect(() => {
        fetchPendingWorkOrders();
    }, [fetchPendingWorkOrders]);

    const fetchCustomersFromLocal = async (page = 1, reset = false, search = '', options = {}) => {
        try {
            const { silent, showSkeleton = true } = options;
            if (reset && !silent) {
                if (showSkeleton) setLoading(true);
            } else if (!silent) {
                setLoadingMore(true);
            }

            const dao = await getCustomersDao();
            const billsDao = await getBillsDao();
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const rows = await dao.list({ search, limit: ITEMS_PER_PAGE, offset });

            const customerIds = rows.map(r => r.id).filter(Boolean);
            const dueTotalsMap = await billsDao.getDueTotalsByCustomerIds(customerIds);

            const mapped = rows.map(r => ({
                _id: r.id,
                customerName: r.customer_name,
                phoneNumber: r.phone_number,
                whatsappNumber: r.whatsapp_number,
                address: r.address,
                totalDue: dueTotalsMap[r.id] || 0,
                pendingSync: r.pending_sync === 1,
                syncError: r.sync_error || null
            }));

            // Sort by totalDue in descending order (highest due first)
            const sorted = mapped.sort((a, b) => b.totalDue - a.totalDue);

            if (reset) {
                setCustomers(sorted);
            } else {
                setCustomers(prev => {
                    const combined = [...prev, ...sorted];
                    // Re-sort the combined list to maintain order
                    return combined.sort((a, b) => b.totalDue - a.totalDue);
                });
            }

            // Determine if more pages exist
            setCurrentPage(page);
            setHasMore(rows.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Fetch customers (local) error:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Handle customer click - navigate to bills page directly
    const handleCustomerClick = (customer) => {
        // Navigate to customer bills page directly
        navigate(`/customer/${customer._id || customer.id}/bills`);
    };

    // Handle add success
    const handleAddSuccess = (customer) => {
        const newCustomers = [customer, ...customers];
        // Sort by totalDue in descending order
        const sorted = newCustomers.sort((a, b) => (b.totalDue || 0) - (a.totalDue || 0));
        setCustomers(sorted);
    };

    // When search changes, reload from SQLite (filtered in query)
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollToItem(0);
        }
        fetchCustomersFromLocal(1, true, debouncedSearchQuery, { silent: true, showSkeleton: false });
    }, [debouncedSearchQuery]);

    const filteredCustomers = customers; // already filtered at query time

    // Load more items when scrolling (fetch next page from local)
    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        // Only load more if not searching and not already loading
        if (!debouncedSearchQuery && !loadingMore && hasMore) {
            const totalLoaded = customers.length;

            // Load next page when user scrolls close to the end
            if (visibleStopIndex >= totalLoaded - 2) {
                fetchCustomersFromLocal(currentPage + 1, false, debouncedSearchQuery);
            }
        }
    }, [debouncedSearchQuery, loadingMore, hasMore, customers.length, currentPage]);

    return (
        <Layout
            padForBottomStack={false}
            bottomDock={
                <CustomersBottomDock
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onAdd={() => setShowAddModal(true)}
                />
            }
        >
            <div>
                {/* Fixed Page Header - Just below main Header */}
                <div className="sticky top-[var(--layout-top-offset,64px)] z-40 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-800">Customers</h1>
                        {backgroundRefresh && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <span className="w-3 h-3 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></span>
                                Refreshing
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm">Manage your customer database</p>
                </div>

                {/* Page Content */}
                <div className="pt-4 pb-6">
                    <CustomersContent
                        loading={loading}
                        filteredCustomers={filteredCustomers}
                        customers={customers}
                        loadingMore={loadingMore}
                        handleItemsRendered={handleItemsRendered}
                        handleCustomerClick={handleCustomerClick}
                        pendingWorkCounts={pendingWorkCounts}
                        searchQuery={searchQuery}
                        listRef={listRef}
                    />
                </div>
            </div>

            {/* Add Customer Modal */}
            <AddCustomerModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleAddSuccess}
            />
        </Layout>
    );
};

export default Customers;



