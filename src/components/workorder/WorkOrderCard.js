import { Calendar, Clock, User, ChevronRight } from 'lucide-react';

const WorkOrderCard = ({ workOrder, onClick }) => {
    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset time for comparison
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        }

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    // Check if overdue
    const isOverdue = () => {
        if (workOrder.status === 'completed') return false;
        const now = new Date();
        const scheduleDate = new Date(workOrder.scheduleDate);
        scheduleDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        return scheduleDate < now;
    };

    // Get type color
    const getTypeColor = (type) => {
        const colors = {
            'CCTV Camera': 'bg-blue-100 text-blue-700',
            'Attendance System': 'bg-purple-100 text-purple-700',
            'Safe and Locks': 'bg-amber-100 text-amber-700',
            'Lift & Elevator Solutions': 'bg-cyan-100 text-cyan-700',
            'Home/Office Automation': 'bg-green-100 text-green-700',
            'IT & Networking Services': 'bg-indigo-100 text-indigo-700',
            'Software & Website Development': 'bg-pink-100 text-pink-700',
            'Custom': 'bg-gray-100 text-gray-700'
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    const overdue = isOverdue();

    return (
        <div
            onClick={() => onClick(workOrder)}
            className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                overdue ? 'border-l-4 border-red-500' : ''
            }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">
                            {workOrder.workOrderNumber}
                        </span>
                        {workOrder.status === 'completed' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                Completed
                            </span>
                        )}
                        {overdue && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                Overdue
                            </span>
                        )}
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${getTypeColor(workOrder.workOrderType)}`}>
                        {workOrder.workOrderType}
                    </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Customer */}
            <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{workOrder.customer?.customerName}</span>
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs text-gray-500">{workOrder.customer?.phoneNumber}</span>
            </div>

            {/* Schedule */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Calendar className={`w-4 h-4 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(workOrder.scheduleDate)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className={`w-4 h-4 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {workOrder.scheduleTime}
                    </span>
                </div>
            </div>

            {/* Remark Preview */}
            {workOrder.remark && (
                <p className="mt-2 text-xs text-gray-500 line-clamp-1">
                    {workOrder.remark}
                </p>
            )}
        </div>
    );
};

export default WorkOrderCard;
