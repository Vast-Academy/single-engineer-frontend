import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import Layout, { useLayoutContext } from '../components/Layout';
import AddItemModal from '../components/inventory/AddItemModal';
import AddStockModal from '../components/inventory/AddStockModal';
import ViewStockModal from '../components/inventory/ViewStockModal';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';
import ItemCard from '../components/inventory/ItemCard';
import { SkeletonInventoryPage } from '../components/common/SkeletonLoaders';
import useDebounce from '../hooks/useDebounce';
import { getItemsDao } from '../storage/dao';
import { pullInventory } from '../storage/sync/inventorySync';
import { pushInventory } from '../storage/sync/pushInventory';
import { useSync } from '../context/SyncContext';

const ITEMS_PER_PAGE = 5;
const PRODUCT_ITEM_HEIGHT = 260; // taller to allow long names without overlap

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
        <div ref={containerRef} className="w-full">
            {listHeight > 0 && listWidth > 0 && (
                <FixedSizeList
                    ref={itemsListRef}
                    height={listHeight}
                    itemCount={filteredItems.length}
                    itemSize={PRODUCT_ITEM_HEIGHT}
                    width={listWidth}
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

const Inventory = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [itemsPage, setItemsPage] = useState(1);
    const [itemsHasMore, setItemsHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMoreItems, setLoadingMoreItems] = useState(false);
    const itemsListRef = useRef(null);

    // Modal states
    const [showItemModal, setShowItemModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showViewStockModal, setShowViewStockModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [stockItem, setStockItem] = useState(null);
    const [viewStockItem, setViewStockItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { notifyLocalSave } = useSync();

    // Fetch data on mount
    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true);
            try {
                await loadItemsFromLocal(1, true);
                pullInventory().then(async () => {
                    await loadItemsFromLocal(1, true);
                }).catch(() => {});
            } finally {
                setLoading(false);
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

    const loadItemsFromLocal = async (page = 1, reset = false) => {
        try {
            if (reset) setLoading(true); else setLoadingMoreItems(true);
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

    const handleAddItem = () => {
        setEditItem(null);
        setShowItemModal(true);
    };

    const handleEditItem = (item) => {
        setEditItem(item);
        setShowItemModal(true);
    };

    const handleDeleteItem = (item) => {
        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            alert('Please wait for this item to sync before deleting.');
            return;
        }
        setDeleteTarget({ type: 'item', data: item });
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

    const handleAddStock = (item) => {
        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            alert('Please wait for this item to sync before adding stock.');
            return;
        }
        setStockItem(item);
        setShowStockModal(true);
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

    const handleStockSuccess = (updatedItem) => {
        const newItems = items.map(i => i._id === updatedItem._id ? updatedItem : i);
        setItems(newItems);
    };

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const filteredItems = useMemo(() => {
        if (!debouncedSearchQuery) return items;

        return items.filter(item => {
            const query = debouncedSearchQuery.toLowerCase();
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
    }, [items, debouncedSearchQuery]);

    useEffect(() => {
        if (itemsListRef.current) {
            itemsListRef.current.scrollToItem(0);
        }
    }, [debouncedSearchQuery]);

    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (!debouncedSearchQuery && !loadingMoreItems && itemsHasMore) {
            const totalLoaded = items.length;
            if (visibleStopIndex >= totalLoaded - 2) {
                loadItemsFromLocal(itemsPage + 1, false);
            }
        }
    }, [debouncedSearchQuery, loadingMoreItems, itemsHasMore, items.length, itemsPage]);

    return (
        <Layout
            bottomDock={
                <InventoryBottomDock
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onAdd={handleAddItem}
                />
            }
        >
            <div>
                <div className="fixed top-[90px] left-0 right-0 bg-gray-50 z-30 px-4 py-3">
                    <h1 className="text-xl font-bold text-gray-800">Inventory</h1>
                    <p className="text-gray-500 text-sm">Manage your products and stock</p>
                </div>

                <div className="pt-[100px] pb-6">
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
        </Layout>
    );
};

export default Inventory;
