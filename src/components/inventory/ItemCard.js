import React, { useEffect, useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

const warrantyLabels = {
    no_warranty: 'No Warranty',
    '6_months': '6 Months',
    '1_year': '1 Year',
    '2_year': '2 Years',
    '3_year': '3 Years',
    '4_year': '4 Years',
    '5_year': '5 Years'
};

const ItemCard = React.memo(({ item, onEdit, onDelete, onAddStock, onViewStock, onStockSuccess }) => {
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    const currentStock = item.itemType === 'generic'
        ? item.stockQty
        : item.serialNumbers?.filter(sn => sn.status === 'available').length || 0;

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

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showOptionsMenu && !e.target.closest('.relative')) {
                setShowOptionsMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showOptionsMenu]);

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            {/* Title row - full width */}
            <div className="flex items-start mb-2 gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1">
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

                {/* 3-Dots Options Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showOptionsMenu && (
                        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 py-2 w-36 z-30">
                            {/* Edit Option */}
                            <button
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    onEdit(item);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>

                            {/* Delete Option */}
                            <button
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    onDelete(item);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
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

                <button
                    onClick={() => onAddStock(item)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all"
                >
                    + Add Stock
                </button>
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
