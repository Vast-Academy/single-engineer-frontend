import { useState, useEffect } from 'react';
import SummaryApi from '../common';
import AddItemModal from '../components/inventory/AddItemModal';
import AddServiceModal from '../components/inventory/AddServiceModal';
import AddStockModal from '../components/inventory/AddStockModal';
import ViewStockModal from '../components/inventory/ViewStockModal';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';
import ItemCard from '../components/inventory/ItemCard';
import ServiceCard from '../components/inventory/ServiceCard';

const Inventory = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showItemModal, setShowItemModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showViewStockModal, setShowViewStockModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [editService, setEditService] = useState(null);
    const [stockItem, setStockItem] = useState(null);
    const [viewStockItem, setViewStockItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        fetchItems();
        fetchServices();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await fetch(SummaryApi.getAllItems.url, {
                method: SummaryApi.getAllItems.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setItems(data.items);
            }
        } catch (error) {
            console.error('Fetch items error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await fetch(SummaryApi.getAllServices.url, {
                method: SummaryApi.getAllServices.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setServices(data.services);
            }
        } catch (error) {
            console.error('Fetch services error:', error);
        }
    };

    // Item handlers
    const handleAddItem = () => {
        setEditItem(null);
        setShowItemModal(true);
    };

    const handleEditItem = (item) => {
        setEditItem(item);
        setShowItemModal(true);
    };

    const handleDeleteItem = (item) => {
        setDeleteTarget({ type: 'item', data: item });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        setDeleteLoading(true);
        try {
            if (deleteTarget.type === 'item') {
                const response = await fetch(`${SummaryApi.deleteItem.url}/${deleteTarget.data._id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.success) {
                    setItems(items.filter(i => i._id !== deleteTarget.data._id));
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                } else {
                    alert(data.message || 'Failed to delete item');
                }
            } else if (deleteTarget.type === 'service') {
                const response = await fetch(`${SummaryApi.deleteService.url}/${deleteTarget.data._id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.success) {
                    setServices(services.filter(s => s._id !== deleteTarget.data._id));
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                } else {
                    alert(data.message || 'Failed to delete service');
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleAddStock = (item) => {
        setStockItem(item);
        setShowStockModal(true);
    };

    const handleViewStock = (item) => {
        setViewStockItem(item);
        setShowViewStockModal(true);
    };

    const handleItemSuccess = (item) => {
        if (editItem) {
            setItems(items.map(i => i._id === item._id ? item : i));
        } else {
            setItems([item, ...items]);
        }
    };

    const handleStockSuccess = (updatedItem) => {
        setItems(items.map(i => i._id === updatedItem._id ? updatedItem : i));
    };

    // Service handlers
    const handleAddService = () => {
        setEditService(null);
        setShowServiceModal(true);
    };

    const handleEditService = (service) => {
        setEditService(service);
        setShowServiceModal(true);
    };

    const handleDeleteService = (service) => {
        setDeleteTarget({ type: 'service', data: service });
        setShowDeleteModal(true);
    };

    const handleServiceSuccess = (service) => {
        if (editService) {
            setServices(services.map(s => s._id === service._id ? service : s));
        } else {
            setServices([service, ...services]);
        }
    };

    // Filter by search (search in item name and available serial numbers only)
    const filteredItems = items.filter(item => {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.itemName.toLowerCase().includes(query);

        // Also search in AVAILABLE serial numbers only for serialized items
        if (item.itemType === 'serialized' && item.serialNumbers) {
            // Only search in available serial numbers (not sold)
            const availableSerials = item.serialNumbers.filter(sn => sn.status === 'available');
            const serialMatch = availableSerials.some(sn =>
                sn.serialNo.toLowerCase().includes(query)
            );
            return nameMatch || serialMatch;
        }

        return nameMatch;
    });

    const filteredServices = services.filter(service =>
        service.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="pb-20">
            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'products'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Products
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'services'
                            ? 'bg-white text-purple-600 shadow-sm'
                            : 'text-gray-600'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Services
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : activeTab === 'products' ? (
                /* Products Tab */
                filteredItems.length > 0 ? (
                    <div className="space-y-3">
                        {filteredItems.map(item => (
                            <ItemCard
                                key={item._id}
                                item={item}
                                onEdit={handleEditItem}
                                onDelete={handleDeleteItem}
                                onAddStock={handleAddStock}
                                onViewStock={handleViewStock}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Products</h3>
                        <p className="text-gray-500 text-sm mb-4">Start adding products to your inventory</p>
                    </div>
                )
            ) : (
                /* Services Tab */
                filteredServices.length > 0 ? (
                    <div className="space-y-3">
                        {filteredServices.map(service => (
                            <ServiceCard
                                key={service._id}
                                service={service}
                                onEdit={handleEditService}
                                onDelete={handleDeleteService}
                            />
                        ))}
                    </div>
                ) : (
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
                )
            )}

            {/* Floating Action Button */}
            <button
                onClick={activeTab === 'products' ? handleAddItem : handleAddService}
                className={`fixed bottom-24 right-4 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40 ${
                    activeTab === 'services'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : 'bg-primary-500 hover:bg-primary-600'
                }`}
            >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Modals */}
            <AddItemModal
                isOpen={showItemModal}
                onClose={() => setShowItemModal(false)}
                onSuccess={handleItemSuccess}
                editItem={editItem}
                existingItems={items}
            />

            <AddServiceModal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
                onSuccess={handleServiceSuccess}
                editService={editService}
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
        </div>
    );
};

export default Inventory;
