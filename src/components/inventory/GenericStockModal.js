import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { getItemsDao } from '../../storage/dao/itemsDao';
import { getStockHistoryDao } from '../../storage/dao/stockHistoryDao';
import { pushInventory } from '../../storage/sync/pushInventory';
import { useSync } from '../../context/SyncContext';

const GenericStockModal = ({ isOpen, onClose, onSuccess, item }) => {
    const [qty, setQty] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { notifyLocalSave } = useSync();

    const incrementIntervalRef = useRef(null);
    const decrementIntervalRef = useRef(null);
    const incrementTimeoutRef = useRef(null);
    const decrementTimeoutRef = useRef(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setQty('');
            setError('');
        }
    }, [isOpen]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            stopIncrement();
            stopDecrement();
        };
    }, []);

    const handleIncrement = () => {
        setQty(prev => {
            const current = prev === '' ? 0 : Number(prev);
            return String(current + 1);
        });
    };

    const handleDecrement = () => {
        setQty(prev => {
            const current = prev === '' ? 0 : Number(prev);
            return current > 0 ? String(current - 1) : '0';
        });
    };

    const startIncrement = () => {
        handleIncrement(); // Immediate action
        incrementTimeoutRef.current = setTimeout(() => {
            incrementIntervalRef.current = setInterval(() => {
                handleIncrement();
            }, 120); // 120ms repeat interval
        }, 300); // 300ms delay before starting interval
    };

    const stopIncrement = () => {
        if (incrementTimeoutRef.current) {
            clearTimeout(incrementTimeoutRef.current);
            incrementTimeoutRef.current = null;
        }
        if (incrementIntervalRef.current) {
            clearInterval(incrementIntervalRef.current);
            incrementIntervalRef.current = null;
        }
    };

    const startDecrement = () => {
        handleDecrement(); // Immediate action
        decrementTimeoutRef.current = setTimeout(() => {
            decrementIntervalRef.current = setInterval(() => {
                handleDecrement();
            }, 120); // 120ms repeat interval
        }, 300); // 300ms delay before starting interval
    };

    const stopDecrement = () => {
        if (decrementTimeoutRef.current) {
            clearTimeout(decrementTimeoutRef.current);
            decrementTimeoutRef.current = null;
        }
        if (decrementIntervalRef.current) {
            clearInterval(decrementIntervalRef.current);
            decrementIntervalRef.current = null;
        }
    };

    const handleAddStock = async () => {
        const qtyNumber = Number(qty);

        if (!qtyNumber || qtyNumber < 1) {
            setError('Please enter a valid quantity');
            return;
        }

        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            setError('Please wait for this item to sync before adding stock');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const stockDao = await getStockHistoryDao();
            const itemsDao = await getItemsDao();
            const now = new Date().toISOString();
            const localId = `client-stock-${Date.now()}`;

            await stockDao.insertLocal({
                id: localId,
                item_id: item._id,
                qty: qtyNumber,
                added_at: now,
                sync_op: 'create'
            });

            await itemsDao.update(
                'stock_qty = stock_qty + ?, updated_at = ?',
                [qtyNumber, now, item._id],
                'id = ?'
            );

            const updatedItem = {
                ...item,
                stockQty: (item.stockQty || 0) + qtyNumber,
                stockHistory: [
                    {
                        _id: localId,
                        id: localId,
                        item_id: item._id,
                        qty: qtyNumber,
                        addedAt: now,
                        pending_sync: 1
                    },
                    ...(item.stockHistory || [])
                ]
            };

            if (onSuccess) onSuccess(updatedItem);
            notifyLocalSave();
            pushInventory().catch(() => {});
            onClose();
        } catch (error) {
            console.error('Add stock error:', error);
            setError(error?.message || 'Failed to add stock locally');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            setQty('');
        } else {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
                setQty(String(num));
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddStock();
        }
    };

    if (!isOpen || !item) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--app-safe-area-bottom, 0px))' }}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Add Stock</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{item.itemName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Current Stock Display */}
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                        <p className={`text-2xl font-bold ${item.stockQty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.stockQty || 0} {item.unit || 'units'}
                        </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Quantity to Add
                        </label>
                        <div className="flex items-center justify-center gap-3">
                            {/* Decrement Button */}
                            <button
                                onPointerDown={startDecrement}
                                onPointerUp={stopDecrement}
                                onPointerLeave={stopDecrement}
                                onPointerCancel={stopDecrement}
                                disabled={!qty || Number(qty) <= 0}
                                className="w-12 h-12 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
                            >
                                <Minus className="w-5 h-5 text-gray-700" />
                            </button>

                            {/* Quantity Input */}
                            <input
                                type="number"
                                value={qty}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="0"
                                className="w-24 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                            />

                            {/* Increment Button */}
                            <button
                                onPointerDown={startIncrement}
                                onPointerUp={stopIncrement}
                                onPointerLeave={stopIncrement}
                                onPointerCancel={stopIncrement}
                                className="w-12 h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-xl flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 space-y-3">
                    <button
                        onClick={handleAddStock}
                        disabled={loading || !qty || Number(qty) < 1}
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Adding Stock...' : 'Add Stock'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenericStockModal;
