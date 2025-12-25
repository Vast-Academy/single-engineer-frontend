import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FixedSizeList } from 'react-window';
import Layout, { useLayoutContext } from '../components/Layout';
import AddItemModal from '../components/inventory/AddItemModal';
import AddStockModal from '../components/inventory/AddStockModal';
import GenericStockModal from '../components/inventory/GenericStockModal';
import ViewStockModal from '../components/inventory/ViewStockModal';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';
import ItemCard from '../components/inventory/ItemCard';
import AddServiceModal from '../components/inventory/AddServiceModal';
import ServiceCard from '../components/inventory/ServiceCard';
import { SkeletonInventoryPage } from '../components/common/SkeletonLoaders';
import useDebounce from '../hooks/useDebounce';
import { getItemsDao } from '../storage/dao';
import { getServicesDao } from '../storage/dao/servicesDao';
import { pullInventory } from '../storage/sync/inventorySync';
import { pushInventory } from '../storage/sync/pushInventory';
import { useSync } from '../context/SyncContext';
import SummaryApi from '../common';
import { apiClient } from '../utils/apiClient';

const ITEMS_PER_PAGE = 5;
const PRODUCT_ITEM_HEIGHT = 260; // taller to allow long names without overlap
const SERVICE_ITEM_HEIGHT = 150; // 130 + 20px spacing

const InventoryBottomDock = ({ searchQuery, onSearchChange, onAdd }) => (
    <div className="px-4 py-3 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
            <div className="relative flex-1">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-primary-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <button
                onClick={onAdd}
                className="w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-md flex items-center justify-center transition-colors flex-shrink-0"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    </div>
);

const ServicesBottomDock = ({ searchQuery, onSearchChange, onAdd }) => (
    <div className="px-4 py-3 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
            <div className="relative flex-1">
                <input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-purple-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <button
                onClick={onAdd}
                className="w-12 h-12 bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-md flex items-center justify-center transition-colors flex-shrink-0"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    </div>
);

const InventoryContent = ({
    loading,
    filteredItems,
    loadingMoreItems,
    handleItemsRendered,
    handleEditItem,
    handleDeleteItem,
    handleAddStock,
    handleViewStock,
    handleStockSuccess,
    itemsListRef
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
        return <SkeletonInventoryPage />;
    }

    if (filteredItems.length === 0) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Products</h3>
                <p className="text-gray-500 text-sm mb-4">Start adding products to your inventory</p>
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
                    ref={itemsListRef}
                    height={listHeight}
                    itemCount={filteredItems.length}
                    itemSize={PRODUCT_ITEM_HEIGHT}
                    width={listWidth}
                    itemKey={(index) => filteredItems[index]._id}
                    onItemsRendered={handleItemsRendered}
                >
                    {({ index, style }) => (
                        <div style={{ ...style, paddingBottom: '10px' }} key={filteredItems[index]._id}>
                            <ItemCard
                                item={filteredItems[index]}
                                onEdit={handleEditItem}
                                onDelete={handleDeleteItem}
                                onAddStock={handleAddStock}
                                onViewStock={handleViewStock}
                                onStockSuccess={handleStockSuccess}
                            />
                        </div>
                    )}
                </FixedSizeList>
            )}
            {loadingMoreItems && (
                <div className="text-center py-4">
                    <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

const ServicesContent = ({
    loading,
    filteredServices,
    loadingMoreServices,
    handleServicesRendered,
    handleEditService,
    handleDeleteService,
    servicesListRef
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
        return <SkeletonInventoryPage />;
    }

    if (filteredServices.length === 0) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Services</h3>
                <p className="text-gray-500 text-sm mb-4">Start adding services</p>
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
                    ref={servicesListRef}
                    height={listHeight}
                    itemCount={filteredServices.length}
                    itemSize={SERVICE_ITEM_HEIGHT}
                    width={listWidth}
                    onItemsRendered={handleServicesRendered}
                >
                    {({ index, style }) => (
                        <div style={{ ...style, paddingBottom: '20px' }} key={filteredServices[index]._id}>
                            <ServiceCard
                                service={filteredServices[index]}
                                onEdit={handleEditService}
                                onDelete={handleDeleteService}
                            />
                        </div>
                    )}
                </FixedSizeList>
            )}
            {loadingMoreServices && (
                <div className="text-center py-4">
                    <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

const Inventory = ({ initialTab = 'products' }) => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(initialTab === 'services' ? 'services' : 'products');
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchStartY, setTouchStartY] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);
    const [touchEndY, setTouchEndY] = useState(null);
    const SWIPE_THRESHOLD = 60;
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [serviceSearchQuery, setServiceSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [itemsPage, setItemsPage] = useState(1);
    const [itemsHasMore, setItemsHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMoreItems, setLoadingMoreItems] = useState(false);
    const itemsListRef = useRef(null);
    const [services, setServices] = useState([]);
    const [servicesPage, setServicesPage] = useState(1);
    const [servicesHasMore, setServicesHasMore] = useState(false);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [loadingMoreServices, setLoadingMoreServices] = useState(false);
    const servicesListRef = useRef(null);
    const refreshKey = location.state?.refreshKey;

    // Modal states
    const [showItemModal, setShowItemModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showGenericStockModal, setShowGenericStockModal] = useState(false);
    const [showViewStockModal, setShowViewStockModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [stockItem, setStockItem] = useState(null);
    const [genericStockItem, setGenericStockItem] = useState(null);
    const [viewStockItem, setViewStockItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editService, setEditService] = useState(null);
    const { notifyLocalSave } = useSync();

    // Fetch data on mount
    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true);
            setServicesLoading(true);
            try {
                await Promise.all([
                    loadItemsFromLocal(1, true),
                    loadServicesFromLocal(1, true)
                ]);
                pullInventory().then(async () => {
                    await Promise.all([
                        loadItemsFromLocal(1, true, { showSkeleton: false }),
                        loadServicesFromLocal(1, true, { showSkeleton: false })
                    ]);
                }).catch(() => {});
            } finally {
                setLoading(false);
                setServicesLoading(false);
            }
        };
        bootstrap();
    }, []);

    const mapItem = (item) => ({
        _id: item.id,
        itemType: item.item_type,
        itemName: item.item_name,
        unit: item.unit,
        warranty: item.warranty,
        mrp: item.mrp,
        purchasePrice: item.purchase_price,
        salePrice: item.sale_price,
        stockQty: item.stock_qty,
        pendingSync: item.pending_sync === 1,
        syncError: item.sync_error || null,
        serialNumbers: item.serialNumbers,
        stockHistory: item.stockHistory
    });

    const loadItemsFromLocal = async (page = 1, reset = false, options = {}) => {
        const { showSkeleton = true } = options;
        try {
            if (reset) {
                if (showSkeleton) setLoading(true);
            } else {
                setLoadingMoreItems(true);
            }
            const dao = await getItemsDao();
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const rows = await dao.list({ limit: ITEMS_PER_PAGE, offset });

            const { getSerialNumbersDao } = await import('../storage/dao/serialNumbersDao');
            const serialDao = await getSerialNumbersDao();
            for (const row of rows) {
                row.serialNumbers = await serialDao.listByItem(row.id);
                row.stockHistory = [];
            }

            const mapped = rows.map(mapItem);
            if (reset) setItems(mapped); else setItems(prev => [...prev, ...mapped]);
            setItemsPage(page);
            setItemsHasMore(mapped.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Fetch items (local) error:', error);
        } finally {
            setLoading(false);
            setLoadingMoreItems(false);
        }
    };

    const mapService = (service) => ({
        _id: service.id,
        serviceName: service.service_name,
        servicePrice: service.service_price,
        pendingSync: service.pending_sync === 1,
        syncError: service.sync_error || null
    });

    const loadServicesFromLocal = async (page = 1, reset = false, options = {}) => {
        const { showSkeleton = true } = options;
        try {
            if (reset) {
                if (showSkeleton) setServicesLoading(true);
            } else {
                setLoadingMoreServices(true);
            }
            const dao = await getServicesDao();
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const rows = await dao.list({ limit: ITEMS_PER_PAGE, offset });
            const mapped = rows.map(mapService);
            if (reset) setServices(mapped); else setServices(prev => [...prev, ...mapped]);
            setServicesPage(page);
            setServicesHasMore(mapped.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Fetch services (local) error:', error);
        } finally {
            setServicesLoading(false);
            setLoadingMoreServices(false);
        }
    };

    const handleAddItem = () => {
        setEditItem(null);
        setShowItemModal(true);
    };

    const handleEditItem = (item) => {
        setEditItem(item);
        setShowItemModal(true);
    };

    const handleAddService = () => {
        setEditService(null);
        setShowServiceModal(true);
    };

    const handleEditService = (service) => {
        setEditService(service);
        setShowServiceModal(true);
    };

    const handleDeleteItem = (item) => {
        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            alert('Please wait for this item to sync before deleting.');
            return;
        }
        setDeleteTarget({ type: 'item', data: item });
        setShowDeleteModal(true);
    };

    const handleDeleteService = (service) => {
        if (!navigator.onLine) {
            alert('You are offline. Deleting services requires an online connection.');
            return;
        }
        if (service._id && service._id.startsWith('client-')) {
            alert('Please wait for this service to sync before deleting.');
            return;
        }
        setDeleteTarget({ type: 'service', data: service });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        setDeleteLoading(true);
        try {
            if (deleteTarget.type === 'item') {
                const dao = await getItemsDao();
                await dao.markPendingDelete(deleteTarget.data._id);
                setItems(items.filter(i => i._id !== deleteTarget.data._id));
                notifyLocalSave();
                pushInventory().catch(() => {});
            } else if (deleteTarget.type === 'service') {
                const serviceId = deleteTarget.data._id;
                const response = await apiClient(`${SummaryApi.deleteService.url}/${serviceId}`, {
                    method: SummaryApi.deleteService.method
                });
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to delete service on server');
                }

                const dao = await getServicesDao();
                await dao.upsertOne({
                    id: serviceId,
                    client_id: deleteTarget.data.client_id || serviceId,
                    service_name: deleteTarget.data.serviceName || '',
                    service_price: deleteTarget.data.servicePrice || 0,
                    created_by: deleteTarget.data.createdBy || deleteTarget.data.created_by || null,
                    deleted: true,
                    updated_at: new Date().toISOString(),
                    created_at: deleteTarget.data.createdAt || deleteTarget.data.created_at || new Date().toISOString(),
                    pending_sync: 0,
                    sync_op: null,
                    sync_error: null
                });
                setServices(services.filter(s => s._id !== serviceId));
                notifyLocalSave();
            }
            setShowDeleteModal(false);
            setDeleteTarget(null);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleAddStock = (item) => {
        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            alert('Please wait for this item to sync before adding stock.');
            return;
        }

        if (item.itemType === 'generic') {
            setGenericStockItem(item);
            setShowGenericStockModal(true);
        } else {
            setStockItem(item);
            setShowStockModal(true);
        }
    };

    const handleViewStock = (item) => {
        setViewStockItem(item);
        setShowViewStockModal(true);
    };

    const handleItemSuccess = (item) => {
        let newItems;
        if (editItem) {
            newItems = items.map(i => i._id === item._id ? item : i);
        } else {
            newItems = [item, ...items];
        }
        setItems(newItems);
    };

    const handleServiceSuccess = (service) => {
        let newServices;
        if (editService) {
            newServices = services.map(s => s._id === service._id ? service : s);
        } else {
            newServices = [service, ...services];
        }
        setServices(newServices);
    };

    const handleStockSuccess = (updatedItem) => {
        const newItems = items.map(i => i._id === updatedItem._id ? updatedItem : i);
        setItems(newItems);
    };

    const debouncedProductSearch = useDebounce(productSearchQuery, 300);
    const debouncedServiceSearch = useDebounce(serviceSearchQuery, 300);

    const filteredItems = useMemo(() => {
        if (!debouncedProductSearch) return items;

        return items.filter(item => {
            const query = debouncedProductSearch.toLowerCase();
            const nameMatch = item.itemName.toLowerCase().includes(query);

            if (item.itemType === 'serialized' && item.serialNumbers) {
                const availableSerials = item.serialNumbers.filter(sn => sn.status === 'available');
                const serialMatch = availableSerials.some(sn =>
                    sn.serialNo.toLowerCase().includes(query)
                );
                return nameMatch || serialMatch;
            }

            return nameMatch;
        });
    }, [items, debouncedProductSearch]);

    const filteredServices = useMemo(() => {
        if (!debouncedServiceSearch) return services;

        return services.filter(service =>
            service.serviceName.toLowerCase().includes(debouncedServiceSearch.toLowerCase())
        );
    }, [services, debouncedServiceSearch]);

    useEffect(() => {
        if (itemsListRef.current) {
            itemsListRef.current.scrollToItem(0);
        }
    }, [debouncedProductSearch]);

    useEffect(() => {
        if (servicesListRef.current) {
            servicesListRef.current.scrollToItem(0);
        }
    }, [debouncedServiceSearch]);

    useEffect(() => {
        if (!refreshKey) return;
        const refresh = async () => {
            setLoading(true);
            setServicesLoading(true);
            try {
                await Promise.all([
                    loadItemsFromLocal(1, true, { showSkeleton: true }),
                    loadServicesFromLocal(1, true, { showSkeleton: true })
                ]);
                pullInventory().then(async () => {
                    await Promise.all([
                        loadItemsFromLocal(1, true, { showSkeleton: false }),
                        loadServicesFromLocal(1, true, { showSkeleton: false })
                    ]);
                }).catch(() => {});
            } finally {
                setLoading(false);
                setServicesLoading(false);
            }
        };
        refresh();
        itemsListRef.current?.scrollToItem(0);
        servicesListRef.current?.scrollToItem(0);
        window.scrollTo(0, 0);
    }, [refreshKey]);

    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (!debouncedProductSearch && !loadingMoreItems && itemsHasMore) {
            const totalLoaded = items.length;
            if (visibleStopIndex >= totalLoaded - 2) {
                loadItemsFromLocal(itemsPage + 1, false);
            }
        }
    }, [debouncedProductSearch, loadingMoreItems, itemsHasMore, items.length, itemsPage]);

    const handleServicesRendered = useCallback(({ visibleStopIndex }) => {
        if (!debouncedServiceSearch && !loadingMoreServices && servicesHasMore) {
            const totalLoaded = services.length;
            if (visibleStopIndex >= totalLoaded - 2) {
                loadServicesFromLocal(servicesPage + 1, false);
            }
        }
    }, [debouncedServiceSearch, loadingMoreServices, servicesHasMore, services.length, servicesPage]);

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
    };

    const bottomDock = activeTab === 'products' ? (
        <InventoryBottomDock
            searchQuery={productSearchQuery}
            onSearchChange={setProductSearchQuery}
            onAdd={handleAddItem}
        />
    ) : (
        <ServicesBottomDock
            searchQuery={serviceSearchQuery}
            onSearchChange={setServiceSearchQuery}
            onAdd={handleAddService}
        />
    );

    return (
        <Layout
            padForBottomStack={false}
            bottomDock={bottomDock}
        >
            <div
                onTouchStart={(e) => {
                    setTouchStartX(e.changedTouches[0].clientX);
                    setTouchStartY(e.changedTouches[0].clientY);
                }}
                onTouchMove={(e) => {
                    setTouchEndX(e.changedTouches[0].clientX);
                    setTouchEndY(e.changedTouches[0].clientY);
                }}
                onTouchEnd={() => {
                    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) {
                        setTouchStartX(null);
                        setTouchStartY(null);
                        setTouchEndX(null);
                        setTouchEndY(null);
                        return;
                    }

                    const deltaX = touchEndX - touchStartX;
                    const deltaY = touchEndY - touchStartY;
                    const absDeltaX = Math.abs(deltaX);
                    const absDeltaY = Math.abs(deltaY);

                    // Only trigger swipe if horizontal movement is greater than vertical
                    if (absDeltaX > absDeltaY && absDeltaX > SWIPE_THRESHOLD) {
                        if (deltaX < 0 && activeTab === 'products') {
                            setActiveTab('services');
                        } else if (deltaX > 0 && activeTab === 'services') {
                            setActiveTab('products');
                        }
                    }

                    setTouchStartX(null);
                    setTouchStartY(null);
                    setTouchEndX(null);
                    setTouchEndY(null);
                }}
            >
                <div className="sticky top-[var(--layout-top-offset,64px)] z-40 bg-gray-50 px-4 py-3">
                    <h1 className="text-xl font-bold text-gray-800">
                        {activeTab === 'products' ? 'Inventory' : 'Services'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {activeTab === 'products' ? 'Manage your products and stock' : 'Manage your service offerings'}
                    </p>
                    <div className="mt-3 flex bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => handleTabSwitch('products')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'products'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-gray-600'
                            }`}
                        >
                            Products
                        </button>
                        <button
                            onClick={() => handleTabSwitch('services')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'services'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600'
                            }`}
                        >
                            Services
                        </button>
                    </div>
                </div>

                <div className="pt-4 pb-6">
                    {activeTab === 'products' ? (
                        <InventoryContent
                            loading={loading}
                            filteredItems={filteredItems}
                            loadingMoreItems={loadingMoreItems}
                            handleItemsRendered={handleItemsRendered}
                            handleEditItem={handleEditItem}
                            handleDeleteItem={handleDeleteItem}
                            handleAddStock={handleAddStock}
                            handleViewStock={handleViewStock}
                            handleStockSuccess={handleStockSuccess}
                            itemsListRef={itemsListRef}
                        />
                    ) : (
                        <ServicesContent
                            loading={servicesLoading}
                            filteredServices={filteredServices}
                            loadingMoreServices={loadingMoreServices}
                            handleServicesRendered={handleServicesRendered}
                            handleEditService={handleEditService}
                            handleDeleteService={handleDeleteService}
                            servicesListRef={servicesListRef}
                        />
                    )}
                </div>
            </div>

            <AddItemModal
                isOpen={showItemModal}
                onClose={() => setShowItemModal(false)}
                onSuccess={handleItemSuccess}
                editItem={editItem}
                existingItems={items}
            />

            <AddStockModal
                isOpen={showStockModal}
                onClose={() => setShowStockModal(false)}
                onSuccess={handleStockSuccess}
                item={stockItem}
            />

            <GenericStockModal
                isOpen={showGenericStockModal}
                onClose={() => setShowGenericStockModal(false)}
                onSuccess={handleStockSuccess}
                item={genericStockItem}
            />

            <ViewStockModal
                isOpen={showViewStockModal}
                onClose={() => setShowViewStockModal(false)}
                item={viewStockItem}
            />

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                }}
                onConfirm={confirmDelete}
                title={`Delete ${deleteTarget?.type === 'item' ? 'Product' : 'Service'}?`}
                message={`Are you sure you want to delete "${deleteTarget?.data?.itemName || deleteTarget?.data?.serviceName}"? This action cannot be undone.`}
                loading={deleteLoading}
            />

            <AddServiceModal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
                onSuccess={handleServiceSuccess}
                editService={editService}
            />
        </Layout>
    );
};

export default Inventory;
