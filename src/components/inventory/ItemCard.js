import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { getItemsDao } from '../../storage/dao/itemsDao';
import { getStockHistoryDao } from '../../storage/dao/stockHistoryDao';
import { pushInventory } from '../../storage/sync/pushInventory';
import { useSync } from '../../context/SyncContext';

const warrantyLabels = {
    no_warranty: 'No Warranty',
    '6_months': '6 Months',
    '1_year': '1 Year',
    '2_year': '2 Years',
    '3_year': '3 Years',
    '4_year': '4 Years',
    '5_year': '5 Years'
};

const ItemCard = React.memo(({ item, onEdit, onAddStock, onViewStock, onStockSuccess }) => {
    const [showInlineStock, setShowInlineStock] = useState(false);
    const [qty, setQty] = useState(0);
    const [loading, setLoading] = useState(false);
    const [inlineError, setInlineError] = useState('');
    const qtyInputRef = useRef(null);
    const incrementIntervalRef = useRef(null);
    const decrementIntervalRef = useRef(null);
    const { notifyLocalSave } = useSync();

    const currentStock = item.itemType === 'generic'
        ? item.stockQty
        : item.serialNumbers?.filter(sn => sn.status === 'available').length || 0;

    // Removed auto-focus behavior as per user request
    // useEffect(() => {
    //     if (showInlineStock && item.itemType === 'generic' && qtyInputRef.current) {
    //         qtyInputRef.current.focus();
    //         qtyInputRef.current.select();
    //     }
    // }, [showInlineStock, item.itemType]);

    const calculateMargin = () => {
        const marginRs = item.salePrice - item.purchasePrice;
        const marginPercent = item.salePrice > 0
            ? ((marginRs / item.salePrice) * 100).toFixed(1)
            : 0;

        return { marginRs, marginPercent };
    };

    const { marginRs, marginPercent } = calculateMargin();

    const getMarginColor = () => {
        if (marginRs > 0) return 'text-green-600';
        if (marginRs < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getMarginBgColor = () => {
        if (marginRs > 0) return 'bg-green-50';
        if (marginRs < 0) return 'bg-red-50';
        return 'bg-gray-50';
    };

    const openInlineStock = () => {
        if (item.itemType !== 'generic') return;
        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            alert('Please wait for this item to sync before updating stock.');
            return;
        }
        setInlineError('');
        setShowInlineStock(true);
        setQty(0);
    };

    const closeInlineStock = () => {
        setShowInlineStock(false);
        setQty(0);
    };

    const handleAddStockClick = () => {
        if (item.itemType === 'generic') {
            openInlineStock();
        } else {
            onAddStock(item);
        }
    };

    const handleInlineStockSubmit = async () => {
        if (!qty || qty < 1) return;
        if (item.pendingSync || (item._id && item._id.startsWith('client-'))) {
            alert('Please wait for this item to sync before updating stock.');
            return;
        }

        setLoading(true);
        setInlineError('');
        try {
            const stockDao = await getStockHistoryDao();
            const itemsDao = await getItemsDao();
            const now = new Date().toISOString();
            const qtyNumber = Number(qty);
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

            if (onStockSuccess) onStockSuccess(updatedItem);
            notifyLocalSave();
            pushInventory().catch(() => {});
            closeInlineStock();
        } catch (error) {
            console.error('Add stock error:', error);
            setInlineError(error?.message || 'Failed to add stock locally');
        } finally {
            setLoading(false);
        }
    };

    const handleQtyKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleInlineStockSubmit();
        }
    };

    const incrementQty = () => setQty(prev => (prev || 0) + 1);
    const decrementQty = () => setQty(prev => prev > 0 ? prev - 1 : 0);

    // Hold-to-increment/decrement handlers
    const startIncrement = () => {
        incrementQty();
        incrementIntervalRef.current = setInterval(() => {
            incrementQty();
        }, 1000);
    };

    const stopIncrement = () => {
        if (incrementIntervalRef.current) {
            clearInterval(incrementIntervalRef.current);
            incrementIntervalRef.current = null;
        }
    };

    const startDecrement = () => {
        decrementQty();
        decrementIntervalRef.current = setInterval(() => {
            decrementQty();
        }, 1000);
    };

    const stopDecrement = () => {
        if (decrementIntervalRef.current) {
            clearInterval(decrementIntervalRef.current);
            decrementIntervalRef.current = null;
        }
    };

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            stopIncrement();
            stopDecrement();
        };
    }, []);

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            {/* Title row - full width */}
            <div className="flex items-start mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-gray-800 break-words">{item.itemName}</h3>
                    {item.pendingSync && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                            Sync
                        </span>
                    )}
                    {item.syncError && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                            !
                        </span>
                    )}
                </div>
                <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            </div>

            {/* Pricing + stock history */}
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <button
                    onClick={() => onViewStock(item)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all"
                >
                    View Stock History
                </button>
                <div className="text-right space-y-1">
                    <p className="text-lg font-bold text-primary-600">Rs. {item.salePrice}</p>
                    <p className="text-xs text-gray-600">
                        Purchase: <span className="font-semibold text-gray-800">Rs. {item.purchasePrice}</span>
                    </p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${getMarginBgColor()}`}>
                        <span className="text-xs text-gray-500">Margin</span>
                        <span className={`text-xs font-bold ${getMarginColor()}`}>Rs. {marginRs}</span>
                        <span className={`text-xs font-semibold ${getMarginColor()}`}>({marginPercent}%)</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <p className="text-xs text-gray-500">Stock</p>
                    <p className={`font-semibold ${currentStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {currentStock}
                    </p>
                </div>

                {!showInlineStock ? (
                    <button
                        onClick={handleAddStockClick}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all"
                    >
                        + Add Stock
                    </button>
                ) : (
                    item.itemType === 'generic' && (
                        <div className="w-full space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <button
                                        onMouseDown={startDecrement}
                                        onMouseUp={stopDecrement}
                                        onMouseLeave={stopDecrement}
                                        onTouchStart={startDecrement}
                                        onTouchEnd={stopDecrement}
                                        disabled={qty <= 0}
                                        className="px-2 py-1 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
                                    >
                                        <Minus className="w-3 h-3 text-gray-600 mx-auto" />
                                    </button>
                                    <input
                                        ref={qtyInputRef}
                                        type="number"
                                        value={qty === 0 ? '' : qty}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQty(0);
                                            } else {
                                                setQty(Math.max(0, parseInt(val) || 0));
                                            }
                                        }}
                                        onKeyDown={handleQtyKeyDown}
                                        placeholder="0"
                                        className="w-12 text-center py-1 border-y border-gray-200 focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="0"
                                    />
                                    <button
                                        onMouseDown={startIncrement}
                                        onMouseUp={stopIncrement}
                                        onMouseLeave={stopIncrement}
                                        onTouchStart={startIncrement}
                                        onTouchEnd={stopIncrement}
                                        className="px-2 py-1 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors w-full"
                                    >
                                        <Plus className="w-3 h-3 text-gray-600 mx-auto" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleInlineStockSubmit}
                                        disabled={loading || !qty || qty < 1}
                                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {loading ? 'Save' : 'Add'}
                                    </button>
                                    <button
                                        onClick={closeInlineStock}
                                        className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors text-sm font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            {inlineError && (
                                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    {inlineError}
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
                <span className="text-xs text-gray-500">Warranty</span>
                <span className="font-medium">
                    {warrantyLabels[item.warranty] || item.warranty}
                </span>
            </div> */}
        </div>
    );
});

export default ItemCard;
