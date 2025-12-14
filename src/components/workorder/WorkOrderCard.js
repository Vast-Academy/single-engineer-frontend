import React from 'react';
import { Calendar, Clock, ChevronRight, Phone, User } from 'lucide-react';

const WorkOrderCard = React.memo(({ workOrder, onClick }) => {
    const displayName = workOrder.customer?.customerName || workOrder.customer_name || 'Unknown Customer';
    const displayPhone = workOrder.customer?.phoneNumber || workOrder.phone_number || '';
    const displayAddress = workOrder.customer?.address || workOrder.address || '';
    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'No date';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'No date';
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
        if (isNaN(scheduleDate.getTime())) return false;
        scheduleDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        return scheduleDate < now;
    };

    const overdue = isOverdue();

    return (
        <div
            onClick={() => onClick(workOrder)}
            className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                overdue ? 'border-l-4 border-red-500' : ''
            }`}
        >
            {/* Header - Customer Name & Status Badges */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                <User className="w-5 h-5" />
                        <span className="text-base font-bold text-gray-800">
                            {displayName}
                        </span>
                        {workOrder.status === 'completed' ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                Completed
                            </span>
                        ) : (
                            <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                        )}
                        {workOrder.pendingSync && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                Sync
                            </span>
                        )}
                        {workOrder.syncError && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                !
                            </span>
                        )}
                        {overdue && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                Overdue
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>

            {/* Address & Phone Number */}
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                 <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                {displayAddress && (
                    <>
                        <span className="line-clamp-1">{displayAddress}</span>
                        <span className="text-gray-400">|</span>
                    </>
                )}
                <Phone className="w-3 h-3" />
                <span className="font-medium">{displayPhone}</span>
            </div>

            {/* Work Note */}
            {workOrder.note && (
                <div className="flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                    {workOrder.note}
                </p>
                </div>
            )}

            {/* Date & Time */}
            <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                    <Calendar className={`w-4 h-4 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(workOrder.scheduleDate)}
                    </span>
                </div>
                {workOrder.hasScheduledTime && workOrder.scheduleTime && (
                    <>
                        <span className="text-gray-400">|</span>
                        <div className="flex items-center gap-1.5">
                            <Clock className={`w-4 h-4 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                            <span className={`${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                {workOrder.scheduleTime}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export default WorkOrderCard;
