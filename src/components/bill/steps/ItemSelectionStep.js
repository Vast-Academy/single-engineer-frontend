import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Minus, X, Phone } from 'lucide-react';

const ItemSelectionStep = ({
    customer,
    items,
    services,
    loading,
    selectedItems,
    onAddItem,
    onRemoveItem,
    onContinue,
    hideCustomerInfo = false
}) => {
    const [activeTab, setActiveTab] = useState('products');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState({});
    const [selectedSerials, setSelectedSerials] = useState({});
    const [genericQty, setGenericQty] = useState({});
    const [serviceQty, setServiceQty] = useState({});

    // Separate serialized and generic items
    const serializedItems = items.filter(item => item.itemType === 'serialized');
    const genericItems = items.filter(item => item.itemType === 'generic');

    // Filter items by search
    const filterBySearch = (list, nameField) => {
        if (!searchQuery.trim()) return list;
        const query = searchQuery.toLowerCase();
        return list.filter(item =>
            item[nameField]?.toLowerCase().includes(query)
        );
    };

    const filteredSerializedItems = filterBySearch(serializedItems, 'itemName');
    const filteredGenericItems = filterBySearch(genericItems, 'itemName');
    const filteredServices = filterBySearch(services, 'serviceName');

    // Toggle item expansion
    const toggleExpand = (itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Handle serial number selection
    const toggleSerialSelect = (itemId, serialNo) => {
        setSelectedSerials(prev => {
            const current = prev[itemId] || [];
            if (current.includes(serialNo)) {
                return { ...prev, [itemId]: current.filter(s => s !== serialNo) };
            } else {
                return { ...prev, [itemId]: [...current, serialNo] };
            }
        });
    };

    // Add serialized items
    const handleAddSerializedItems = (item) => {
        const serials = selectedSerials[item._id] || [];
        serials.forEach(serialNo => {
            onAddItem({
                itemType: 'serialized',
                itemId: item._id,
                itemName: item.itemName,
                serialNumber: serialNo,
                qty: 1,
                price: item.salePrice,
                amount: item.salePrice
            });
        });
        // Clear selection
        setSelectedSerials(prev => ({ ...prev, [item._id]: [] }));
    };

    // Handle generic qty change
    const handleGenericQtyChange = (itemId, delta, maxQty) => {
        setGenericQty(prev => {
            const current = prev[itemId] || 1;
            const newQty = Math.max(1, Math.min(maxQty, current + delta));
            return { ...prev, [itemId]: newQty };
        });
    };

    // Add generic item
    const handleAddGenericItem = (item) => {
        const qty = genericQty[item._id] || 1;
        onAddItem({
            itemType: 'generic',
            itemId: item._id,
            itemName: item.itemName,
            qty,
            price: item.salePrice,
            amount: item.salePrice * qty
        });
        // Reset qty
        setGenericQty(prev => ({ ...prev, [item._id]: 1 }));
    };

    // Handle service qty change
    const handleServiceQtyChange = (serviceId, delta) => {
        setServiceQty(prev => {
            const current = prev[serviceId] || 1;
            const newQty = Math.max(1, current + delta);
            return { ...prev, [serviceId]: newQty };
        });
    };

    // Add service
    const handleAddService = (service) => {
        const qty = serviceQty[service._id] || 1;
        onAddItem({
            itemType: 'service',
            itemId: service._id,
            itemName: service.serviceName,
            qty,
            price: service.servicePrice,
            amount: service.servicePrice * qty
        });
        // Reset qty
        setServiceQty(prev => ({ ...prev, [service._id]: 1 }));
    };

    // Get available serials (not already added)
    const getAvailableSerials = (item) => {
        const addedSerials = selectedItems
            .filter(si => si.itemId === item._id && si.itemType === 'serialized')
            .map(si => si.serialNumber);

        return item.serialNumbers?.filter(
            sn => sn.status === 'available' && !addedSerials.includes(sn.serialNo)
        ) || [];
    };

    // Get available stock for generic
    const getAvailableStock = (item) => {
        const addedQty = selectedItems
            .filter(si => si.itemId === item._id && si.itemType === 'generic')
            .reduce((sum, si) => sum + si.qty, 0);
        return item.stockQty - addedQty;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Customer Info */}
            {!hideCustomerInfo && (
                <div className="p-4 bg-gray-50 border-b flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-bold">
                                {customer.customerName?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-800">{customer.customerName}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phoneNumber}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="p-4 border-b flex-shrink-0">
                <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search items or services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-100 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b flex-shrink-0">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'products'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-gray-500'
                    }`}
                >
                    Products
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'services'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-gray-500'
                    }`}
                >
                    Services
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'products' ? (
                    <div className="p-4 space-y-3">
                        {/* Serialized Items */}
                        {filteredSerializedItems.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Serialized Items</h4>
                                <div className="space-y-2">
                                    {filteredSerializedItems.map(item => {
                                        const availableSerials = getAvailableSerials(item);
                                        const isExpanded = expandedItems[item._id];
                                        const selectedCount = (selectedSerials[item._id] || []).length;

                                        if (availableSerials.length === 0) return null;

                                        return (
                                            <div key={item._id} className="bg-white border rounded-xl overflow-hidden">
                                                {/* Item Header */}
                                                <button
                                                    onClick={() => toggleExpand(item._id)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                                                >
                                                    <div className="flex-1 text-left">
                                                        <p className="font-medium text-gray-800">{item.itemName}</p>
                                                        <p className="text-sm text-gray-500">
                                                            ₹{item.salePrice} · {availableSerials.length} available
                                                        </p>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>

                                                {/* Expanded Serial Numbers */}
                                                {isExpanded && (
                                                    <div className="border-t p-3 bg-gray-50">
                                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                                            {availableSerials.map(sn => (
                                                                <label
                                                                    key={sn.serialNo}
                                                                    className="flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(selectedSerials[item._id] || []).includes(sn.serialNo)}
                                                                        onChange={() => toggleSerialSelect(item._id, sn.serialNo)}
                                                                        className="w-4 h-4 text-primary-500 rounded"
                                                                    />
                                                                    <span className="text-sm text-gray-700">{sn.serialNo}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        {selectedCount > 0 && (
                                                            <button
                                                                onClick={() => handleAddSerializedItems(item)}
                                                                className="mt-3 w-full py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600"
                                                            >
                                                                Add {selectedCount} Item{selectedCount > 1 ? 's' : ''}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Generic Items */}
                        {filteredGenericItems.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Generic Items</h4>
                                <div className="space-y-2">
                                    {filteredGenericItems.map(item => {
                                        const availableStock = getAvailableStock(item);
                                        const qty = genericQty[item._id] || 1;

                                        if (availableStock <= 0) return null;

                                        return (
                                            <div key={item._id} className="bg-white border rounded-xl p-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{item.itemName}</p>
                                                        <p className="text-sm text-gray-500">
                                                            ₹{item.salePrice} · {availableStock} in stock
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Qty Controls */}
                                                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                                                            <button
                                                                onClick={() => handleGenericQtyChange(item._id, -1, availableStock)}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <span className="w-8 text-center text-sm font-medium">{qty}</span>
                                                            <button
                                                                onClick={() => handleGenericQtyChange(item._id, 1, availableStock)}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddGenericItem(item)}
                                                            className="px-3 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {filteredSerializedItems.length === 0 && filteredGenericItems.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No products available
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 space-y-2">
                        {filteredServices.length > 0 ? (
                            filteredServices.map(service => {
                                const qty = serviceQty[service._id] || 1;
                                return (
                                    <div key={service._id} className="bg-white border rounded-xl p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">{service.serviceName}</p>
                                                <p className="text-sm text-gray-500">₹{service.servicePrice}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Qty Controls */}
                                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                                                    <button
                                                        onClick={() => handleServiceQtyChange(service._id, -1)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-medium">{qty}</span>
                                                    <button
                                                        onClick={() => handleServiceQtyChange(service._id, 1)}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleAddService(service)}
                                                    className="px-3 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No services available
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Items Preview */}
            {selectedItems.length > 0 && (
                <div className="border-t bg-gray-50 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} added
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                            ₹{selectedItems.reduce((sum, item) => sum + item.amount, 0)}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3 max-h-20 overflow-y-auto">
                        {selectedItems.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1 bg-white border rounded-full px-2 py-1"
                            >
                                <span className="text-xs text-gray-700 truncate max-w-[100px]">
                                    {item.itemName}
                                    {item.serialNumber && ` (${item.serialNumber})`}
                                    {item.qty > 1 && ` x${item.qty}`}
                                </span>
                                <button
                                    onClick={() => onRemoveItem(index)}
                                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Continue Button */}
            <div className="p-4 border-t flex-shrink-0">
                <button
                    onClick={onContinue}
                    disabled={selectedItems.length === 0}
                    className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default ItemSelectionStep;
