import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, User, Phone, MapPin, FileText, CheckCircle, Trash2 } from 'lucide-react';
import SummaryApi from '../../common';

const WorkOrderDetailModal = ({ isOpen, onClose, workOrder, onUpdate, onDelete }) => {
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape') {
            if (showDeleteConfirm) {
                setShowDeleteConfirm(false);
            } else {
                onClose();
            }
        }
    }, [onClose, showDeleteConfirm]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            return () => document.removeEventListener('keydown', handleEscKey);
        }
    }, [isOpen, handleEscKey]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: true }, '');
            const handlePopState = () => {
                if (showDeleteConfirm) {
                    setShowDeleteConfirm(false);
                } else {
                    onClose();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, showDeleteConfirm, onClose]);

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Format short date
    const formatShortDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Check if overdue
    const isOverdue = () => {
        if (!workOrder || workOrder.status === 'completed') return false;
        const now = new Date();
        const scheduleDate = new Date(workOrder.scheduleDate);
        scheduleDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        return scheduleDate < now;
    };

    // Mark as completed
    const handleMarkComplete = async () => {
        if (!workOrder) return;

        setLoading(true);
        try {
            const response = await fetch(`${SummaryApi.markWorkOrderComplete.url}/${workOrder._id}/complete`, {
                method: 'PUT',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                if (onUpdate) {
                    onUpdate(data.workOrder);
                }
                onClose();
            } else {
                alert(data.message || 'Failed to update work order');
            }
        } catch (error) {
            console.error('Mark complete error:', error);
            alert('Failed to update work order');
        } finally {
            setLoading(false);
        }
    };

    // Delete work order
    const handleDelete = async () => {
        if (!workOrder) return;

        setLoading(true);
        try {
            const response = await fetch(`${SummaryApi.deleteWorkOrder.url}/${workOrder._id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                if (onDelete) {
                    onDelete(workOrder._id);
                }
                onClose();
            } else {
                alert(data.message || 'Failed to delete work order');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete work order');
        } finally {
            setLoading(false);
        }
    };

    // Call customer
    const handleCall = () => {
        if (workOrder?.customer?.phoneNumber) {
            window.location.href = `tel:${workOrder.customer.phoneNumber}`;
        }
    };

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !workOrder) return null;

    const overdue = isOverdue();

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`p-4 ${
                    workOrder.status === 'completed'
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : overdue
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-primary-500 to-primary-600'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-white/80 text-sm font-medium">Work Order</span>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{workOrder.workOrderNumber}</h2>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-medium">
                            {workOrder.workOrderType}
                        </span>
                        {workOrder.status === 'completed' && (
                            <span className="px-2 py-0.5 bg-white/30 text-white text-xs rounded-full font-medium">
                                Completed
                            </span>
                        )}
                        {overdue && (
                            <span className="px-2 py-0.5 bg-white/30 text-white text-xs rounded-full font-medium">
                                Overdue
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{workOrder.customer?.customerName}</p>
                                    <p className="text-sm text-gray-500">{workOrder.customer?.phoneNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCall}
                                className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200"
                            >
                                <Phone className="w-5 h-5 text-green-600" />
                            </button>
                        </div>
                        {workOrder.customer?.address && (
                            <div className="flex items-start gap-2 mt-3 pt-3 border-t">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                <p className="text-sm text-gray-600">{workOrder.customer.address}</p>
                            </div>
                        )}
                    </div>

                    {/* Schedule Info */}
                    <div className="mb-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Schedule</p>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 ${overdue ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                                    <Calendar className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-blue-600'}`} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${overdue ? 'text-red-700' : 'text-gray-800'}`}>
                                        {formatDate(workOrder.scheduleDate)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${overdue ? 'bg-red-100' : 'bg-amber-100'} rounded-full flex items-center justify-center`}>
                                    <Clock className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-amber-600'}`} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${overdue ? 'text-red-700' : 'text-gray-800'}`}>
                                        {workOrder.scheduleTime}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Remark */}
                    {workOrder.remark && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Remark</p>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <p className="text-sm text-gray-700">{workOrder.remark}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completed Info */}
                    {workOrder.status === 'completed' && workOrder.completedAt && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Completed</p>
                            <div className="bg-green-50 rounded-xl p-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <p className="text-sm text-green-700 font-medium">
                                        Completed on {formatShortDate(workOrder.completedAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Button */}
                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Work Order
                        </button>
                    ) : (
                        <div className="bg-red-50 rounded-xl p-4">
                            <p className="text-sm text-red-700 mb-3">Are you sure you want to delete this work order?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                    {loading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Mark Complete */}
                {workOrder.status === 'pending' && (
                    <div className="p-4 border-t flex-shrink-0">
                        <button
                            onClick={handleMarkComplete}
                            disabled={loading}
                            className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {loading ? 'Updating...' : 'Mark as Completed'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkOrderDetailModal;
