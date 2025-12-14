import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { FixedSizeList } from 'react-window';
import SummaryApi from '../common';
import WorkOrderCard from '../components/workorder/WorkOrderCard';
import CreateWorkOrderModal from '../components/workorder/CreateWorkOrderModal';
import WorkOrderDetailModal from '../components/workorder/WorkOrderDetailModal';
import { SkeletonWorkOrdersPage } from '../components/common/SkeletonLoaders';
import { ensureWorkOrdersPulled, pullWorkOrdersFromBackend } from '../storage/sync/workOrdersSync';
import { getWorkOrdersDao } from '../storage/dao/workOrdersDao';
import { getCustomersDao } from '../storage/dao/customersDao';

const ITEMS_PER_PAGE = 5;
const ITEM_HEIGHT = 170;
const ITEM_SPACING = 12;

const Workorders = () => {
    const [activeTab, setActiveTab] = useState('pending'); // pending, completed
    const [pendingWorkOrders, setPendingWorkOrders] = useState([]);
    const [completedWorkOrders, setCompletedWorkOrders] = useState([]);
    const [pendingPage, setPendingPage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);
    const [pendingHasMore, setPendingHasMore] = useState(false);
    const [completedHasMore, setCompletedHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMorePending, setLoadingMorePending] = useState(false);
    const [loadingMoreCompleted, setLoadingMoreCompleted] = useState(false);
    const [listHeight, setListHeight] = useState(600);
    const [listWidth, setListWidth] = useState(window.innerWidth - 32);
    const pendingListRef = useRef(null);
    const completedListRef = useRef(null);
    const containerRef = useRef(null);

    // Calculate list dimensions on mount and resize
    useEffect(() => {
        const calculateDimensions = () => {
            // Header(60) + PageHeaderWithTabs(110) + BottomNav(80) = 250px
            const height = window.innerHeight - 250;
            setListHeight(height > 400 ? height : 400);

            if (containerRef.current) {
                setListWidth(containerRef.current.offsetWidth);
            } else {
                setListWidth(window.innerWidth - 32);
            }
        };

        calculateDimensions();
        window.addEventListener('resize', calculateDimensions);
        return () => window.removeEventListener('resize', calculateDimensions);
    }, []);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Fetch work orders
    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true);
            try {
                await ensureWorkOrdersPulled();
                await fetchPendingLocal(1, true);
                await fetchCompletedLocal(1, true);
                // background refresh
                pullWorkOrdersFromBackend().then(async () => {
                    await fetchPendingLocal(1, true);
                    await fetchCompletedLocal(1, true);
                }).catch(() => {});
            } catch (err) {
                console.error('Workorders bootstrap error:', err);
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, []);

    const mapWorkOrder = (wo, customerMap = {}) => {
        const customerId = wo.customer_id;
        const customerRow = customerId ? customerMap[customerId] : null;
        const mappedCustomer = customerRow ? {
            _id: customerRow.id,
            customerName: customerRow.customer_name,
            phoneNumber: customerRow.phone_number,
            address: customerRow.address
        } : null;

        return {
            _id: wo.id,
            workOrderNumber: wo.work_order_number,
            note: wo.note,
            scheduleDate: wo.schedule_date || '',
            hasScheduledTime: !!wo.has_scheduled_time,
            scheduleTime: wo.schedule_time,
            status: wo.status,
            completedAt: wo.completed_at,
            customer: mappedCustomer,
            billId: wo.bill_id,
            pendingSync: wo.pending_sync === 1,
            syncError: wo.sync_error || null
        };
    };

    const buildCustomerMap = async (rows) => {
        const ids = [...new Set(rows.map(r => r.customer_id).filter(Boolean))];
        if (ids.length === 0) return {};
        const dao = await getCustomersDao();
        const map = {};
        for (const id of ids) {
            const c = await dao.getById(id);
            if (c) {
                map[id] = c;
            }
        }
        return map;
    };

    const fetchPendingLocal = async (page = 1, reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMorePending(true);
            }

            const dao = await getWorkOrdersDao();
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const rows = await dao.list({ status: 'pending', limit: ITEMS_PER_PAGE, offset });
            const customerMap = await buildCustomerMap(rows);
            const mapped = rows.map((wo) => mapWorkOrder(wo, customerMap));

            if (reset) {
                setPendingWorkOrders(mapped);
            } else {
                setPendingWorkOrders(prev => [...prev, ...mapped]);
            }

            setPendingPage(page);
            setPendingHasMore(mapped.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Fetch pending work orders (local) error:', error);
        } finally {
            setLoading(false);
            setLoadingMorePending(false);
        }
    };

    const fetchCompletedLocal = async (page = 1, reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMoreCompleted(true);
            }

            const dao = await getWorkOrdersDao();
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const rows = await dao.list({ status: 'completed', limit: ITEMS_PER_PAGE, offset });
            const customerMap = await buildCustomerMap(rows);
            const mapped = rows.map((wo) => mapWorkOrder(wo, customerMap));

            if (reset) {
                setCompletedWorkOrders(mapped);
            } else {
                setCompletedWorkOrders(prev => [...prev, ...mapped]);
            }

            setCompletedPage(page);
            setCompletedHasMore(mapped.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Fetch completed work orders (local) error:', error);
        } finally {
            setLoading(false);
            setLoadingMoreCompleted(false);
        }
    };

    // Handle work order click
    const handleWorkOrderClick = (workOrder) => {
        setSelectedWorkOrder(workOrder);
        setShowDetailModal(true);
    };

    // Handle work order update (mark complete)
    const handleWorkOrderUpdate = (updatedWorkOrder) => {
        // Move from pending to completed
        const newPending = pendingWorkOrders.filter(wo => wo._id !== updatedWorkOrder._id);
        const newCompleted = [updatedWorkOrder, ...completedWorkOrders];

        setPendingWorkOrders(newPending);
        setCompletedWorkOrders(newCompleted);
    };

    // Handle work order delete
    const handleWorkOrderDelete = (workOrderId) => {
        const newPending = pendingWorkOrders.filter(wo => wo._id !== workOrderId);
        const newCompleted = completedWorkOrders.filter(wo => wo._id !== workOrderId);

        setPendingWorkOrders(newPending);
        setCompletedWorkOrders(newCompleted);
    };

    // Handle create success
    const handleCreateSuccess = (newWorkOrder) => {
        const newPending = [newWorkOrder, ...pendingWorkOrders].sort((a, b) => {
            const dateA = new Date(a.scheduleDate);
            const dateB = new Date(b.scheduleDate);
            return dateA - dateB;
        });

        setPendingWorkOrders(newPending);
    };

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Load more items when scrolling - Pending (fetch next page from local)
    const handlePendingItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (!loadingMorePending && pendingHasMore) {
            const totalLoaded = pendingWorkOrders.length;

            // Load next page when user scrolls close to the end
            if (visibleStopIndex >= totalLoaded - 2) {
                fetchPendingLocal(pendingPage + 1, false);
            }
        }
    }, [loadingMorePending, pendingHasMore, pendingWorkOrders.length, pendingPage]);

    // Load more items when scrolling - Completed (fetch next page from local)
    const handleCompletedItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (!loadingMoreCompleted && completedHasMore) {
            const totalLoaded = completedWorkOrders.length;

            // Load next page when user scrolls close to the end
            if (visibleStopIndex >= totalLoaded - 2) {
                fetchCompletedLocal(completedPage + 1, false);
            }
        }
    }, [loadingMoreCompleted, completedHasMore, completedWorkOrders.length, completedPage]);

    // Count for tabs
    const pendingCount = pendingWorkOrders.length;
    const completedCount = completedWorkOrders.length;

    return (
        <div>
            {/* Fixed Page Header - Just below main Header */}
            <div className="fixed top-[90px] left-0 right-0 bg-gray-50 z-30 px-4 py-3 ">
                <h1 className="text-xl font-bold text-gray-800">Work Orders</h1>
                <p className="text-gray-500 text-sm">Track and manage work orders</p>

                {/* Filter Tabs */}
                <div className="flex gap-2 mt-3">
                <button
                    onClick={() => handleTabChange('pending')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'pending'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                    Pending {pendingCount > 0 && `(${pendingCount})`}
                </button>
                <button
                    onClick={() => handleTabChange('completed')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'completed'
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                    Completed {completedCount > 0 && `(${completedCount})`}
                </button>
                </div>
            </div>

            {/* Page Content with padding for fixed header */}
            <div className="pt-[155px] pb-10">

            {/* Work Orders List */}
            {loading ? (
                <SkeletonWorkOrdersPage />
            ) : activeTab === 'pending' ? (
                pendingWorkOrders.length > 0 ? (
                    <div ref={containerRef} className="w-full">
                        {listHeight > 0 && listWidth > 0 && (
                            <FixedSizeList
                                ref={pendingListRef}
                                height={listHeight}
                                itemCount={pendingWorkOrders.length}
                                itemSize={ITEM_HEIGHT}
                                width={listWidth}
                                onItemsRendered={handlePendingItemsRendered}
                            >
                                {({ index, style }) => (
                                    <div
                                        style={{
                                            ...style,
                                            paddingTop: ITEM_SPACING / 2,
                                            paddingBottom: ITEM_SPACING / 2,
                                            boxSizing: 'border-box'
                                        }}
                                        key={pendingWorkOrders[index]._id}
                                    >
                                        <WorkOrderCard
                                            workOrder={pendingWorkOrders[index]}
                                            onClick={handleWorkOrderClick}
                                        />
                                    </div>
                                )}
                            </FixedSizeList>
                        )}
                        {loadingMorePending && (
                            <div className="text-center py-4">
                                <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending Work Orders</h3>
                        <p className="text-gray-500 text-sm mb-4">Create your first work order to get started</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                            + Create Work Order
                        </button>
                    </div>
                )
            ) : (
                completedWorkOrders.length > 0 ? (
                    <div ref={containerRef} className="w-full">
                        {listHeight > 0 && listWidth > 0 && (
                            <FixedSizeList
                                ref={completedListRef}
                                height={listHeight}
                                itemCount={completedWorkOrders.length}
                                itemSize={ITEM_HEIGHT}
                                width={listWidth}
                                onItemsRendered={handleCompletedItemsRendered}
                            >
                                {({ index, style }) => (
                                    <div
                                        style={{
                                            ...style,
                                            paddingTop: ITEM_SPACING / 2,
                                            paddingBottom: ITEM_SPACING / 2,
                                            boxSizing: 'border-box'
                                        }}
                                        key={completedWorkOrders[index]._id}
                                    >
                                        <WorkOrderCard
                                            workOrder={completedWorkOrders[index]}
                                            onClick={handleWorkOrderClick}
                                        />
                                    </div>
                                )}
                            </FixedSizeList>
                        )}
                        {loadingMoreCompleted && (
                            <div className="text-center py-4">
                                <div className="inline-block w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Completed Work Orders</h3>
                        <p className="text-gray-500 text-sm mb-4">Complete some work orders to see them here</p>
                    </div>
                )
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setShowCreateModal(true)}
                className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors z-30"
            >
                <Plus className="w-6 h-6" />
            </button>

            </div>

            {/* Create Work Order Modal */}
            <CreateWorkOrderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />

            {/* Work Order Detail Modal */}
            <WorkOrderDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedWorkOrder(null);
                }}
                workOrder={selectedWorkOrder}
                onUpdate={handleWorkOrderUpdate}
                onDelete={handleWorkOrderDelete}
            />
        </div>
    );
};

export default Workorders;
