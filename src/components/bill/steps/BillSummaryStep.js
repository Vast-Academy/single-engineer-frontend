import { useState } from 'react';
import { Trash2, Package, Wrench } from 'lucide-react';

const BillSummaryStep = ({
    selectedItems,
    subtotal,
    discount,
    totalAmount,
    onDiscountChange,
    onRemoveItem,
    onContinue
}) => {
    const [discountInput, setDiscountInput] = useState(discount.toString());

    const handleDiscountChange = (e) => {
        const value = e.target.value;
        setDiscountInput(value);
        const numValue = parseFloat(value) || 0;
        onDiscountChange(Math.max(0, Math.min(subtotal, numValue)));
    };

    const getItemIcon = (itemType) => {
        if (itemType === 'service') {
            return <Wrench className="w-4 h-4 text-blue-500" />;
        }
        return <Package className="w-4 h-4 text-gray-500" />;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {selectedItems.map((item, index) => (
                        <div key={index} className="bg-white border rounded-xl p-3">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {getItemIcon(item.itemType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{item.itemName}</p>
                                    {item.serialNumber && (
                                        <p className="text-xs text-gray-500">S/N: {item.serialNumber}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-sm text-gray-500">
                                            {item.qty > 1 ? `${item.qty} × ₹${item.price}` : `₹${item.price}`}
                                        </p>
                                        <p className="text-sm font-medium text-gray-800">₹{item.amount}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(index)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary Section */}
            <div className="border-t bg-gray-50 p-4 flex-shrink-0">
                {/* Subtotal */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-800">₹{subtotal}</span>
                </div>

                {/* Discount Input */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-600">Discount</span>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-500">₹</span>
                        <input
                            type="number"
                            value={discountInput}
                            onChange={handleDiscountChange}
                            placeholder="0"
                            min="0"
                            max={subtotal}
                            className="w-20 text-right border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary-500"
                        />
                    </div>
                </div>

                {/* Discount Applied */}
                {discount > 0 && (
                    <div className="flex items-center justify-between mb-3 text-green-600">
                        <span>Discount Applied</span>
                        <span>-₹{discount}</span>
                    </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-lg font-semibold text-gray-800">Total</span>
                    <span className="text-lg font-bold text-primary-600">₹{totalAmount}</span>
                </div>
            </div>

            {/* Continue Button */}
            <div className="p-4 border-t flex-shrink-0">
                <button
                    onClick={onContinue}
                    disabled={selectedItems.length === 0}
                    className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue to Payment
                </button>
            </div>
        </div>
    );
};

export default BillSummaryStep;
