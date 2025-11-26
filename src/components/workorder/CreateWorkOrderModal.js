import { useState, useEffect, useCallback } from 'react';
import { X, Search, User, Clock, FileText, ChevronRight, Check } from 'lucide-react';
import SummaryApi from '../../common';
import DatePicker from '../common/DatePicker';

const WORK_ORDER_TYPES = [
    'CCTV Camera',
    'Attendance System',
    'Safe and Locks',
    'Lift & Elevator Solutions',
    'Home/Office Automation',
    'IT & Networking Services',
    'Software & Website Development',
    'Custom'
];

// Removed TIME_SLOTS - user can now enter custom time

const CreateWorkOrderModal = ({ isOpen, onClose, preSelectedCustomer, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Customer, 2: Type, 3: Schedule, 4: Confirm
    const [loading, setLoading] = useState(false);

    // Customer search
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Form data
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [workOrderType, setWorkOrderType] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [remark, setRemark] = useState('');

    // Success state
    const [createdWorkOrder, setCreatedWorkOrder] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Get current time in HH:MM format
    const getCurrentTime = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Convert 24-hour time to 12-hour format with AM/PM
    const formatTimeForDisplay = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Reset form
    const resetForm = () => {
        setStep(preSelectedCustomer ? 2 : 1);
        setSelectedCustomer(preSelectedCustomer || null);
        setWorkOrderType('');
        // Set default date to today and time to current time
        setScheduleDate(getTodayDate());
        setScheduleTime(getCurrentTime());
        setRemark('');
        setSearchQuery('');
        setCustomers([]);
        setCreatedWorkOrder(null);
        setShowSuccess(false);
    };

    // Initialize when modal opens
    useEffect(() => {
        if (isOpen) {
            resetForm();
            if (!preSelectedCustomer) {
                fetchCustomers();
            }
        }
    }, [isOpen, preSelectedCustomer]);

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape' && !showSuccess) {
            if (step === 1 || (step === 2 && preSelectedCustomer)) {
                onClose();
            } else {
                handleBack();
            }
        }
    }, [step, showSuccess, preSelectedCustomer, onClose]);

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
                if (showSuccess) return;
                if (step === 1 || (step === 2 && preSelectedCustomer)) {
                    onClose();
                } else {
                    handleBack();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, step, showSuccess, preSelectedCustomer, onClose]);

    // Fetch customers
    const fetchCustomers = async (query = '') => {
        setSearchLoading(true);
        try {
            const url = query
                ? `${SummaryApi.searchCustomers.url}?q=${encodeURIComponent(query)}`
                : SummaryApi.getAllCustomers.url;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setCustomers(data.customers || []);
            }
        } catch (error) {
            console.error('Fetch customers error:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Search customers with debounce
    useEffect(() => {
        if (step === 1) {
            const timer = setTimeout(() => {
                fetchCustomers(searchQuery);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, step]);

    // Navigation
    const handleBack = () => {
        if (step > 1) {
            if (step === 2 && preSelectedCustomer) {
                onClose();
            } else {
                setStep(prev => prev - 1);
            }
        }
    };

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    // Handle customer selection
    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setStep(2);
    };

    // Handle type selection
    const handleSelectType = (type) => {
        setWorkOrderType(type);
        setStep(3);
    };

    // Create work order
    const handleCreate = async () => {
        if (!selectedCustomer || !workOrderType || !scheduleDate || !scheduleTime) {
            alert('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            // Convert 24-hour time to 12-hour format for backend
            const formattedTime = formatTimeForDisplay(scheduleTime);

            const response = await fetch(SummaryApi.createWorkOrder.url, {
                method: SummaryApi.createWorkOrder.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    customerId: selectedCustomer._id,
                    workOrderType,
                    scheduleDate,
                    scheduleTime: formattedTime,
                    remark: remark.trim()
                })
            });

            const data = await response.json();
            if (data.success) {
                setCreatedWorkOrder(data.workOrder);
                setShowSuccess(true);
            } else {
                alert(data.message || 'Failed to create work order');
            }
        } catch (error) {
            console.error('Create work order error:', error);
            alert('Failed to create work order');
        } finally {
            setLoading(false);
        }
    };

    // Handle done
    const handleDone = () => {
        if (onSuccess && createdWorkOrder) {
            onSuccess(createdWorkOrder);
        }
        onClose();
    };

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !showSuccess) {
            if (step === 1 || (step === 2 && preSelectedCustomer)) {
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    // Success Screen
    if (showSuccess && createdWorkOrder) {
        return (
            <div className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
                <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Work Order Created!</h2>
                        <p className="text-gray-500 text-center mb-6">Your work order has been scheduled</p>

                        <div className="bg-gray-100 rounded-xl p-4 w-full max-w-xs mb-4">
                            <p className="text-sm text-gray-500 mb-1">Work Order Number</p>
                            <p className="text-lg font-bold text-primary-600">{createdWorkOrder.workOrderNumber}</p>
                        </div>

                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Customer</span>
                                <span className="font-medium text-gray-800">{createdWorkOrder.customer?.customerName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Type</span>
                                <span className="font-medium text-gray-800">{createdWorkOrder.workOrderType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Scheduled</span>
                                <span className="font-medium text-gray-800">
                                    {formatDate(createdWorkOrder.scheduleDate)} at {createdWorkOrder.scheduleTime}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t">
                        <button
                            onClick={handleDone}
                            className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
                    {step > 1 && !(step === 2 && preSelectedCustomer) && (
                        <button
                            onClick={handleBack}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
                        </button>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">
                        {step === 1 && 'Select Customer'}
                        {step === 2 && 'Select Work Type'}
                        {step === 3 && 'Schedule'}
                        {step === 4 && 'Confirm Work Order'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Step 1: Select Customer */}
                    {step === 1 && (
                        <div className="p-4">
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search customer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-primary-500"
                                    autoFocus
                                />
                            </div>

                            {/* Customer List */}
                            {searchLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : customers.length > 0 ? (
                                <div className="space-y-2">
                                    {customers.map(customer => (
                                        <button
                                            key={customer._id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
                                        >
                                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-800">{customer.customerName}</p>
                                                <p className="text-sm text-gray-500">{customer.phoneNumber}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">No customers found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Select Work Type */}
                    {step === 2 && (
                        <div className="p-4">
                            {/* Selected Customer */}
                            {selectedCustomer && (
                                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl mb-4">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{selectedCustomer.customerName}</p>
                                        <p className="text-sm text-gray-500">{selectedCustomer.phoneNumber}</p>
                                    </div>
                                </div>
                            )}

                            <p className="text-sm font-medium text-gray-700 mb-3">Select Work Order Type</p>
                            <div className="space-y-2">
                                {WORK_ORDER_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => handleSelectType(type)}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
                                    >
                                        <span className="font-medium text-gray-800">{type}</span>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Schedule */}
                    {step === 3 && (
                        <div className="p-4">
                            {/* Summary */}
                            <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                <p className="text-sm text-gray-500">Customer</p>
                                <p className="font-medium text-gray-800">{selectedCustomer?.customerName}</p>
                                <p className="text-sm text-gray-500 mt-2">Work Type</p>
                                <p className="font-medium text-gray-800">{workOrderType}</p>
                            </div>

                            {/* Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Schedule Date *
                                </label>
                                <DatePicker
                                    value={scheduleDate}
                                    onChange={setScheduleDate}
                                    minDate={getTodayDate()}
                                    placeholder="Select schedule date"
                                />
                            </div>

                            {/* Time */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Schedule Time *
                                </label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                />
                                {scheduleTime && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Selected: {formatTimeForDisplay(scheduleTime)}
                                    </p>
                                )}
                            </div>

                            {/* Remark */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Remark (Optional)
                                </label>
                                <textarea
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    rows={3}
                                    placeholder="Add any notes or instructions..."
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirm */}
                    {step === 4 && (
                        <div className="p-4">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Customer</p>
                                    <p className="font-semibold text-gray-800">{selectedCustomer?.customerName}</p>
                                    <p className="text-sm text-gray-500">{selectedCustomer?.phoneNumber}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase">Work Type</p>
                                    <p className="font-semibold text-gray-800">{workOrderType}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase">Scheduled</p>
                                    <p className="font-semibold text-gray-800">{formatDate(scheduleDate)}</p>
                                    <p className="text-sm text-primary-600">{formatTimeForDisplay(scheduleTime)}</p>
                                </div>

                                {remark && (
                                    <div className="border-t pt-4">
                                        <p className="text-xs text-gray-500 uppercase">Remark</p>
                                        <p className="text-gray-800">{remark}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 3 && (
                    <div className="p-4 border-t flex-shrink-0">
                        <button
                            onClick={handleNext}
                            disabled={!scheduleDate || !scheduleTime}
                            className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {step === 4 && (
                    <div className="p-4 border-t flex-shrink-0">
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Work Order'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateWorkOrderModal;
