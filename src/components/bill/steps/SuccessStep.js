import { useNavigate } from 'react-router-dom';
import { CheckCircle, ExternalLink } from 'lucide-react';

const SuccessStep = ({ bill, onDone, customer }) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>

                {/* Success Message */}
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Bill Created!</h2>
                <p className="text-gray-500 text-center mb-6">
                    Your bill has been created successfully
                </p>

                {/* Bill Number */}
                {bill && (
                    <div className="bg-gray-100 rounded-xl px-6 py-4 text-center mb-6">
                        <p className="text-sm text-gray-500 mb-1">Bill Number</p>
                        <p className="text-xl font-bold text-primary-600">{bill.billNumber}</p>
                    </div>
                )}

                {/* Bill Summary */}
                {bill && (
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Amount</span>
                            <span className="font-medium text-gray-800">₹{bill.totalAmount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Received</span>
                            <span className="font-medium text-green-600">₹{bill.receivedPayment}</span>
                        </div>
                        {bill.dueAmount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Due</span>
                                <span className="font-medium text-orange-600">₹{bill.dueAmount}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-medium capitalize ${
                                bill.status === 'paid' ? 'text-green-600' :
                                bill.status === 'partial' ? 'text-orange-600' : 'text-red-600'
                            }`}>
                                {bill.status}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t flex-shrink-0 space-y-3">
                <button
                    onClick={() => {
                        onDone();
                        navigate(`/bill/${bill._id}`, {
                            state: { bill, customer },
                            replace: true
                        });
                    }}
                    className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 flex items-center justify-center gap-2"
                >
                    <ExternalLink className="w-5 h-5" />
                    View Bill
                </button>
                <button
                    onClick={onDone}
                    className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default SuccessStep;
