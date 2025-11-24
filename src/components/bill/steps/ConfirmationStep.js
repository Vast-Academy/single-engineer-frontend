import { User, Package, Receipt, Banknote, AlertCircle } from 'lucide-react';

const ConfirmationStep = ({
    customer,
    selectedItems,
    subtotal,
    discount,
    totalAmount,
    paymentMethod,
    cashReceived,
    dueAmount,
    loading,
    onConfirm,
    transactionId
}) => {
    const getPaymentStatus = () => {
        const received = Number(cashReceived) || 0;
        const total = Number(totalAmount) || 0;

        if (received >= total && total > 0) return { text: 'Fully Paid', color: 'text-green-600', bg: 'bg-green-50' };
        if (received > 0) return { text: 'Partial Payment', color: 'text-orange-600', bg: 'bg-orange-50' };
        return { text: 'Pending', color: 'text-red-600', bg: 'bg-red-50' };
    };

    const paymentStatus = getPaymentStatus();

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                {/* Confirmation Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Receipt className="w-8 h-8 text-primary-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Bill Details</h3>
                    <p className="text-sm text-gray-500">Please review before creating the bill</p>
                </div>

                {/* Summary Cards */}
                <div className="space-y-4">
                    {/* Customer Info */}
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-500">Customer</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-800">{customer.customerName}</p>
                        <p className="text-sm text-gray-500">{customer.phoneNumber}</p>
                    </div>

                    {/* Items Summary */}
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Package className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-500">Items ({selectedItems.length})</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {selectedItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700 truncate flex-1">
                                        {item.itemName}
                                        {item.serialNumber && <span className="text-gray-400"> ({item.serialNumber})</span>}
                                        {item.qty > 1 && <span className="text-gray-400"> ×{item.qty}</span>}
                                    </span>
                                    <span className="font-medium text-gray-800 ml-2">₹{item.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bill Amount */}
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Receipt className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-500">Bill Amount</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="text-gray-800">₹{subtotal}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-₹{discount}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold text-gray-800">Total</span>
                                <span className="font-bold text-primary-600 text-lg">₹{totalAmount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Banknote className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-500">Payment</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Method</span>
                                <span className="text-gray-800 capitalize">{paymentMethod}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Amount Received</span>
                                <span className="text-gray-800">₹{cashReceived}</span>
                            </div>
                            {paymentMethod === 'upi' && transactionId && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Transaction ID</span>
                                    <span className="text-gray-800 font-mono">{transactionId}</span>
                                </div>
                            )}
                            <div className={`flex justify-between text-sm p-2 rounded-lg ${paymentStatus.bg}`}>
                                <span className={paymentStatus.color}>Due Amount</span>
                                <span className={`font-semibold ${paymentStatus.color}`}>₹{dueAmount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Warning if partial/no payment */}
                    {dueAmount > 0 && (
                        <div className={`flex items-start gap-3 ${Number(cashReceived) > 0 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
                            <AlertCircle className={`w-5 h-5 ${Number(cashReceived) > 0 ? 'text-orange-500' : 'text-red-500'} flex-shrink-0 mt-0.5`} />
                            <div>
                                <p className={`text-sm font-medium ${Number(cashReceived) > 0 ? 'text-orange-700' : 'text-red-700'}`}>
                                    {Number(cashReceived) > 0 ? 'Partial Payment' : 'No Payment Received'}
                                </p>
                                <p className={`text-xs ${Number(cashReceived) > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                    Customer will have a due balance of ₹{dueAmount}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Button */}
            <div className="p-4 border-t flex-shrink-0">
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating Bill...
                        </>
                    ) : (
                        'Confirm & Create Bill'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ConfirmationStep;
