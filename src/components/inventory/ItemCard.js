import { Eye } from 'lucide-react';

const warrantyLabels = {
    'no_warranty': 'No Warranty',
    '6_months': '6 Months',
    '1_year': '1 Year',
    '2_year': '2 Years',
    '3_year': '3 Years',
    '4_year': '4 Years',
    '5_year': '5 Years'
};

const ItemCard = ({ item, onEdit, onDelete, onAddStock, onViewStock }) => {
    const currentStock = item.itemType === 'generic'
        ? item.stockQty
        : item.serialNumbers?.filter(sn => sn.status === 'available').length || 0;

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.itemName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.itemType === 'generic'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                        }`}>
                            {item.itemType === 'generic' ? 'Generic' : 'Serialized'}
                        </span>
                        <span className="text-xs text-gray-500">{item.unit}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">₹{item.salePrice}</p>
                    <p className="text-xs text-gray-500">MRP: ₹{item.mrp}</p>
                </div>
            </div>

            {/* Stock & Warranty */}
            <div className="flex items-center justify-between py-2 border-t border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className={`font-semibold ${currentStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {currentStock} {item.unit}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Warranty</p>
                        <p className="font-medium text-gray-700 text-sm">
                            {warrantyLabels[item.warranty] || item.warranty}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onAddStock(item)}
                    className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"
                >
                    + Stock
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-400">
                    Purchase: ₹{item.purchasePrice}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onViewStock(item)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="View Stock"
                    >
                        <Eye className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(item)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemCard;
