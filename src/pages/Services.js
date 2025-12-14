import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import Layout, { useLayoutContext } from '../components/Layout';
import AddServiceModal from '../components/inventory/AddServiceModal';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';
import ServiceCard from '../components/inventory/ServiceCard';
import { SkeletonInventoryPage } from '../components/common/SkeletonLoaders';
import useDebounce from '../hooks/useDebounce';
import { getServicesDao } from '../storage/dao';
import { pullInventory } from '../storage/sync/inventorySync';
import { pushInventory } from '../storage/sync/pushInventory';
import { useSync } from '../context/SyncContext';

const ITEMS_PER_PAGE = 5;
const SERVICE_ITEM_HEIGHT = 150; // 130 + 20px spacing

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

    useEffect(() => {
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
        <div ref={containerRef} className="w-full">
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

const Services = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [services, setServices] = useState([]);
    const [servicesPage, setServicesPage] = useState(1);
    const [servicesHasMore, setServicesHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMoreServices, setLoadingMoreServices] = useState(false);
    const servicesListRef = useRef(null);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editService, setEditService] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { notifyLocalSave } = useSync();

    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true);
            try {
                await loadServicesFromLocal(1, true);
                pullInventory().then(async () => {
                    await loadServicesFromLocal(1, true);
                }).catch(() => {});
            } finally {
                setLoading(false);
            }
        };
        bootstrap();
    }, []);

    const mapService = (service) => ({
        _id: service.id,
        serviceName: service.service_name,
        servicePrice: service.service_price,
        pendingSync: service.pending_sync === 1,
        syncError: service.sync_error || null
    });

    const loadServicesFromLocal = async (page = 1, reset = false) => {
        try {
            if (reset) setLoading(true); else setLoadingMoreServices(true);
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
            setLoading(false);
            setLoadingMoreServices(false);
        }
    };

    const handleAddService = () => {
        setEditService(null);
        setShowServiceModal(true);
    };

    const handleEditService = (service) => {
        setEditService(service);
        setShowServiceModal(true);
    };

    const handleDeleteService = (service) => {
        if (service.pendingSync || (service._id && service._id.startsWith('client-'))) {
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
            if (deleteTarget.type === 'service') {
                const dao = await getServicesDao();
                await dao.markPendingDelete(deleteTarget.data._id);
                setServices(services.filter(s => s._id !== deleteTarget.data._id));
            }
            setShowDeleteModal(false);
            setDeleteTarget(null);
            notifyLocalSave();
            pushInventory().catch(() => {});
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete');
        } finally {
            setDeleteLoading(false);
        }
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

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const filteredServices = useMemo(() => {
        if (!debouncedSearchQuery) return services;

        return services.filter(service =>
            service.serviceName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
    }, [services, debouncedSearchQuery]);

    useEffect(() => {
        if (servicesListRef.current) {
            servicesListRef.current.scrollToItem(0);
        }
    }, [debouncedSearchQuery]);

    const handleServicesRendered = useCallback(({ visibleStopIndex }) => {
        if (!debouncedSearchQuery && !loadingMoreServices && servicesHasMore) {
            const totalLoaded = services.length;
            if (visibleStopIndex >= totalLoaded - 2) {
                loadServicesFromLocal(servicesPage + 1, false);
            }
        }
    }, [debouncedSearchQuery, loadingMoreServices, servicesHasMore, services.length, servicesPage]);

    return (
        <Layout
            bottomDock={
                <ServicesBottomDock
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onAdd={handleAddService}
                />
            }
        >
            <div>
                <div className="fixed top-[90px] left-0 right-0 bg-gray-50 z-30 px-4 py-3">
                    <h1 className="text-xl font-bold text-gray-800">Services</h1>
                    <p className="text-gray-500 text-sm">Manage your service offerings</p>
                </div>

                <div className="pt-[100px] pb-6">
                    <ServicesContent
                        loading={loading}
                        filteredServices={filteredServices}
                        loadingMoreServices={loadingMoreServices}
                        handleServicesRendered={handleServicesRendered}
                        handleEditService={handleEditService}
                        handleDeleteService={handleDeleteService}
                        servicesListRef={servicesListRef}
                    />
                </div>
            </div>

            <AddServiceModal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
                onSuccess={handleServiceSuccess}
                editService={editService}
            />

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Service?"
                message={`Are you sure you want to delete "${deleteTarget?.data?.serviceName}"? This action cannot be undone.`}
                loading={deleteLoading}
            />
        </Layout>
    );
};

export default Services;
