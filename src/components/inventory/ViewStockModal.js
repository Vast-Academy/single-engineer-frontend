import { useEffect, useCallback, useState } from 'react';
import { X, Package, Hash, Calendar } from 'lucide-react';
import { getSerialNumbersDao } from '../../storage/dao/serialNumbersDao';
import { getStockHistoryDao } from '../../storage/dao/stockHistoryDao';

const ViewStockModal = ({ isOpen, onClose, item }) => {
    const [serials, setSerials] = useState([]);
    const [stockHistory, setStockHistory] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const loadData = useCallback(async () => {
        if (!item) return;
        setLoading(true);
        try {
            if (item.itemType === 'serialized') {
                const dao = await getSerialNumbersDao();
                const rows = await dao.listByItem(item._id);
                setSerials(rows);
            } else {
                const dao = await getStockHistoryDao();
                const rows = await dao.listByItem(item._id, { limit: 200, offset: 0 });
                setStockHistory(rows);
            }
        } catch (err) {
            console.error('Load stock view error:', err);
        } finally {
            setLoading(false);
        }
    }, [item]);

    useEffect(() => {
        if (isOpen && item) {
            // prime with existing props while loading fresh from DB
            setSerials(item.serialNumbers || []);
            setStockHistory(item.stockHistory || []);
            loadData();
        }
    }, [isOpen, item, loadData]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !item) return null;

    const currentStock = item.itemType === 'generic'
        ? (stockHistory.length ? stockHistory.reduce((sum, e) => sum + (e.qty || 0), 0) : (item.stockQty ?? 0))
        : (serials.length ? serials.filter(sn => sn.status === 'available').length : 0);

    const renderBadge = (row) => {
        if (row?.pending_sync) {
            return (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-semibold">
                    Sync
                </span>
            );
        }
        if (row?.sync_error) {
            return (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-semibold">
                    !
                </span>
            );
        }
        return null;
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--app-safe-area-bottom, 0px))' }}
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden modal-shell flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Stock Details</h2>
                            <p className="text-sm text-gray-500">{item.itemName}</p>
                        </div>
                        {renderBadge(item)}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 modal-body">
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

                            {loading && stockHistory.length === 0 ? (
                                <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
                            ) : stockHistory && stockHistory.length > 0 ? (
                                <div className="space-y-2">
                                    {stockHistory.slice().reverse().map((entry, index) => (
                                        <div
                                            key={entry._id || entry.id || index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-green-600 font-bold text-sm">+{entry.qty}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">Added {entry.qty} {item.unit}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(entry.addedAt || entry.added_at)}</p>
                                                </div>
                                            </div>
                                            {renderBadge(entry)}
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
                                Serial Numbers ({serials?.length || 0})
                            </h3>

                            {loading && serials.length === 0 ? (
                                <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
                            ) : serials && serials.length > 0 ? (
                                <div className="space-y-2">
                                    {serials.slice().reverse().map((sn, index) => (
                                        <div
                                            key={sn._id || sn.id || index}
                                            className={`p-3 rounded-xl ${
                                                sn.status === 'available' ? 'bg-green-50' : 'bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                        sn.status === 'available' ? 'bg-green-100' : 'bg-gray-200'
                                                    }`}>
                                                        <Hash className={`w-5 h-5 ${
                                                            sn.status === 'available' ? 'text-green-600' : 'text-gray-500'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 font-mono">{sn.serialNo || sn.serial_no}</p>
                                                        <p className="text-xs text-gray-500">Added: {formatDate(sn.addedAt || sn.added_at)}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                    sn.status === 'available'
                                                        ? 'bg-green-200 text-green-700'
                                                        : 'bg-gray-300 text-gray-600'
                                                }`}>
                                                    {sn.status === 'available' ? 'Available' : 'Sold'}
                                                </span>
                                                {renderBadge(sn)}
                                            </div>
                                            {/* Show customer info for sold items */}
                                            {sn.status === 'sold' && (sn.customerName || sn.customer_name) && (
                                                <div className="ml-13 text-xs text-gray-600 mt-1">
                                                    Sold to: <span className="font-medium text-gray-800">{sn.customerName || sn.customer_name}</span>
                                                    {(sn.billNumber || sn.bill_number) && <span className="text-gray-500"> ({sn.billNumber || sn.bill_number})</span>}
                                                </div>
                                            )}
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
