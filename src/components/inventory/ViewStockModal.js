import { useEffect, useCallback } from 'react';
import { X, Package, Hash, Calendar } from 'lucide-react';

const ViewStockModal = ({ isOpen, onClose, item }) => {
    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Handle ESC key press
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            // Push a state to history when modal opens
            window.history.pushState({ modal: true }, '');

            const handlePopState = () => {
                onClose();
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [isOpen, onClose]);

    // Add ESC key listener
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, handleKeyDown]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !item) return null;

    const currentStock = item.itemType === 'generic'
        ? item.stockQty
        : item.serialNumbers?.filter(sn => sn.status === 'available').length || 0;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-40 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Stock Details</h2>
                        <p className="text-sm text-gray-500">{item.itemName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(80vh-130px)]">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-primary-500 to-blue-400 rounded-xl p-4 mb-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">Current Stock</p>
                                <p className="text-3xl font-bold">{currentStock} <span className="text-lg font-normal">{item.unit}</span></p>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <Package className="w-7 h-7" />
                            </div>
                        </div>
                    </div>

                    {/* Stock Type Badge */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            item.itemType === 'generic'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                        }`}>
                            {item.itemType === 'generic' ? 'Generic Product' : 'Serialized Product'}
                        </span>
                    </div>

                    {item.itemType === 'generic' ? (
                        /* Generic Items - Stock History */
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Stock Addition History
                            </h3>

                            {item.stockHistory && item.stockHistory.length > 0 ? (
                                <div className="space-y-2">
                                    {item.stockHistory.slice().reverse().map((entry, index) => (
                                        <div
                                            key={entry._id || index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-green-600 font-bold text-sm">+{entry.qty}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">Added {entry.qty} {item.unit}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(entry.addedAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-xl">
                                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No stock history available</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Serialized Items - Serial Numbers List */
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Hash className="w-4 h-4" />
                                Serial Numbers ({item.serialNumbers?.length || 0})
                            </h3>

                            {item.serialNumbers && item.serialNumbers.length > 0 ? (
                                <div className="space-y-2">
                                    {item.serialNumbers.slice().reverse().map((sn, index) => (
                                        <div
                                            key={sn._id || index}
                                            className={`flex items-center justify-between p-3 rounded-xl ${
                                                sn.status === 'available' ? 'bg-green-50' : 'bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                    sn.status === 'available' ? 'bg-green-100' : 'bg-gray-200'
                                                }`}>
                                                    <Hash className={`w-5 h-5 ${
                                                        sn.status === 'available' ? 'text-green-600' : 'text-gray-500'
                                                    }`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 font-mono">{sn.serialNo}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(sn.addedAt)}</p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                sn.status === 'available'
                                                    ? 'bg-green-200 text-green-700'
                                                    : 'bg-gray-300 text-gray-600'
                                            }`}>
                                                {sn.status === 'available' ? 'Available' : 'Sold'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-xl">
                                    <Hash className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No serial numbers added yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewStockModal;
