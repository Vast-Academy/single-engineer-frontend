import { ChevronRight, ClipboardList } from 'lucide-react';

const BillCard = ({ bill, onClick }) => {
    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Get status styles
    const getStatusStyles = (status) => {
        switch (status) {
            case 'paid':
                return { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' };
            case 'partial':
                return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial' };
            default:
                return { bg: 'bg-red-100', text: 'text-red-700', label: 'Pending' };
        }
    };

    const statusStyles = getStatusStyles(bill.status);
    const items = bill.items || [];

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer"
        >
            <div className="flex items-center justify-between">
                {/* Left Side */}
                <div className="flex-1">
                    {/* Bill Number & Status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{bill.billNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                            {statusStyles.label}
                        </span>
                        {bill.pendingSync && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                Sync
                            </span>
                        )}
                        {bill.syncError && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                !
                            </span>
                        )}
                        {bill.workOrderId && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" />
                                Work Order
                            </span>
                        )}
                    </div>

                    {/* Date & Time */}
                    <p className="text-sm text-gray-500">
                        {formatDate(bill.createdAt)} at {formatTime(bill.createdAt)}
                    </p>

                    {/* Items Count */}
                    <p className="text-xs text-gray-400 mt-1">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                    </p>
                </div>

                {/* Right Side - Amount */}
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">₹{bill.totalAmount}</p>
                        {bill.dueAmount > 0 && (
                            <p className="text-xs text-red-500">Due: ₹{bill.dueAmount}</p>
                        )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
            </div>
        </div>
    );
};

export default BillCard;
