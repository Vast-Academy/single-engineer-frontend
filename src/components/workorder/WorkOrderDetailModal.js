import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, User, Phone, MapPin, FileText, CheckCircle, Trash2, Receipt } from 'lucide-react';
import SummaryApi from '../../common';
import CreateBillModal from '../bill/CreateBillModal';

const WorkOrderDetailModal = ({ isOpen, onClose, workOrder, onUpdate, onDelete }) => {
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBillModal, setShowBillModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Edit form state
    const [editData, setEditData] = useState({
        note: '',
        scheduleDate: '',
        hasScheduledTime: false,
        scheduleTime: ''
    });

    // Populate edit data when work order changes
    useEffect(() => {
        if (workOrder && isOpen) {
            setEditData({
                note: workOrder.note || '',
                scheduleDate: workOrder.scheduleDate ? new Date(workOrder.scheduleDate).toISOString().split('T')[0] : '',
                hasScheduledTime: workOrder.hasScheduledTime || false,
                scheduleTime: workOrder.scheduleTime || ''
            });
            setIsEditMode(false);
        }
    }, [workOrder, isOpen]);

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape') {
            if (showDeleteConfirm) {
                setShowDeleteConfirm(false);
            } else if (isEditMode) {
                setIsEditMode(false);
            } else {
                onClose();
            }
        }
    }, [onClose, showDeleteConfirm, isEditMode]);

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

    // Save edited work order
    const handleSaveEdit = async () => {
        if (!workOrder) return;

        // Validate
        if (!editData.note.trim()) {
            alert('Work note is required');
            return;
        }

        if (!editData.scheduleDate) {
            alert('Schedule date is required');
            return;
        }

        if (editData.hasScheduledTime && !editData.scheduleTime) {
            alert('Schedule time is required when time is enabled');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${SummaryApi.updateWorkOrder.url}/${workOrder._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(editData)
            });

            const data = await response.json();
            if (data.success) {
                if (onUpdate) {
                    onUpdate(data.workOrder);
                }
                setIsEditMode(false);
            } else {
                alert(data.message || 'Failed to update work order');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Failed to update work order');
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
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[calc(100vh-80px)] sm:max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`p-4 ${
                    workOrder.status === 'completed'
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : overdue
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-primary-500 to-primary-600'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-white/80 text-sm font-medium">Work Order Details</span>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{workOrder.workOrderNumber}</h2>
                    <div className="flex items-center gap-2">
                        {workOrder.status === 'completed' ? (
                            <span className="px-3 py-1 bg-white/30 text-white text-xs rounded-full font-medium flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Completed
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-white/30 text-white text-xs rounded-full font-medium">
                                Pending
                            </span>
                        )}
                        {overdue && (
                            <span className="px-3 py-1 bg-white/30 text-white text-xs rounded-full font-medium">
                                Overdue
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
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

                    {/* Work Note */}
                    {workOrder.note && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Work Note</p>
                            {isEditMode ? (
                                <textarea
                                    value={editData.note}
                                    onChange={(e) => setEditData({...editData, note: e.target.value})}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                    placeholder="e.g., CCTV Camera Installation..."
                                />
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-2">
                                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <p className="text-sm text-gray-700">{workOrder.note}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Schedule Info */}
                    <div className="mb-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Schedule</p>
                        {isEditMode ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Schedule Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={editData.scheduleDate}
                                        onChange={(e) => setEditData({...editData, scheduleDate: e.target.value})}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={editData.hasScheduledTime}
                                            onChange={(e) => setEditData({...editData, hasScheduledTime: e.target.checked, scheduleTime: e.target.checked ? editData.scheduleTime : ''})}
                                            className="w-4 h-4 text-primary-500 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Set specific time</span>
                                    </label>
                                    {editData.hasScheduledTime && (
                                        <input
                                            type="time"
                                            value={editData.scheduleTime}
                                            onChange={(e) => setEditData({...editData, scheduleTime: e.target.value})}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
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
                                {workOrder.hasScheduledTime && workOrder.scheduleTime ? (
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
                                ) : (
                                    <p className="text-xs text-gray-500 italic mt-2">No specific time set</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Completed Info */}
                    {workOrder.status === 'completed' && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Status</p>
                            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">Work Order Completed</p>
                                        {workOrder.completedAt && (
                                            <p className="text-xs text-green-600 mt-0.5">
                                                {formatShortDate(workOrder.completedAt)}
                                            </p>
                                        )}
                                    </div>
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

                {/* Footer - Actions */}
                {workOrder.status === 'pending' && (
                    <div className="p-4 border-t flex-shrink-0 bg-gray-50">
                        {isEditMode ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditMode(false)}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditMode(true)}
                                        className="flex-1 py-3 bg-gray-200 text-gray-800 font-medium rounded-xl hover:bg-gray-300"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setShowBillModal(true)}
                                        className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Receipt className="w-5 h-5" />
                                        Generate Bill
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 text-center">Work order will be marked as completed after bill generation</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Bill Modal */}
            {showBillModal && workOrder && (
                <CreateBillModal
                    isOpen={showBillModal}
                    onClose={() => setShowBillModal(false)}
                    customer={workOrder.customer}
                    workOrderId={workOrder._id}
                    onSuccess={(bill) => {
                        // Bill created successfully, work order auto-completed in backend
                        if (onUpdate) {
                            onUpdate({
                                ...workOrder,
                                status: 'completed',
                                billId: bill._id,
                                completedAt: new Date()
                            });
                        }
                        setShowBillModal(false);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

export default WorkOrderDetailModal;
