import { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft, Edit2, Phone, MapPin, User, Trash2, FileText, Calendar, Clock } from 'lucide-react';
import SummaryApi from '../../common';
import ItemSelectionStep from '../bill/steps/ItemSelectionStep';
import BillSummaryStep from '../bill/steps/BillSummaryStep';
import PaymentStep from '../bill/steps/PaymentStep';
import ConfirmationStep from '../bill/steps/ConfirmationStep';
import Toast from '../common/Toast';

const STEPS = {
    WORK_NOTE_INVENTORY: 1,
    BILL_SUMMARY: 2,
    PAYMENT: 3,
    CONFIRMATION: 4
};

const WorkOrderDetailModal = ({ isOpen, onClose, workOrder, onUpdate, onDelete }) => {
    const [currentStep, setCurrentStep] = useState(STEPS.WORK_NOTE_INVENTORY);
    const [loading, setLoading] = useState(false);

    // Edit states
    const [isEditingWorkOrder, setIsEditingWorkOrder] = useState(false);
    const [editData, setEditData] = useState({
        note: '',
        scheduleDate: '',
        hasScheduledTime: false,
        scheduleTime: ''
    });

    // Items & Services data
    const [items, setItems] = useState([]);
    const [services, setServices] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Bank accounts for UPI
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [transactionId, setTransactionId] = useState('');

    // Bill data
    const [selectedItems, setSelectedItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashReceived, setCashReceived] = useState(0);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Calculate totals
    const subtotal = selectedItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = Math.max(0, subtotal - discount);
    const dueAmount = Math.max(0, totalAmount - cashReceived);

    // Fetch items, services, and bank accounts
    useEffect(() => {
        if (isOpen && workOrder) {
            fetchData();
            setEditData({
                note: workOrder.note || '',
                scheduleDate: workOrder.scheduleDate ? new Date(workOrder.scheduleDate).toISOString().split('T')[0] : '',
                hasScheduledTime: workOrder.hasScheduledTime || false,
                scheduleTime: workOrder.scheduleTime || ''
            });
        }
    }, [isOpen, workOrder]);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [itemsRes, servicesRes, bankRes] = await Promise.all([
                fetch(SummaryApi.getAllItems.url, {
                    method: SummaryApi.getAllItems.method,
                    credentials: 'include'
                }),
                fetch(SummaryApi.getAllServices.url, {
                    method: SummaryApi.getAllServices.method,
                    credentials: 'include'
                }),
                fetch(SummaryApi.getAllBankAccounts.url, {
                    method: SummaryApi.getAllBankAccounts.method,
                    credentials: 'include'
                })
            ]);

            const itemsData = await itemsRes.json();
            const servicesData = await servicesRes.json();
            const bankData = await bankRes.json();

            if (itemsData.success) {
                setItems(itemsData.items || []);
            }
            if (servicesData.success) {
                setServices(servicesData.services || []);
            }
            if (bankData.success) {
                const accounts = bankData.bankAccounts || [];
                setBankAccounts(accounts);
                const primaryAccount = accounts.find(a => a.isPrimary) || accounts[0];
                setSelectedBankAccount(primaryAccount || null);
            }
        } catch (error) {
            console.error('Fetch data error:', error);
        } finally {
            setLoadingData(false);
        }
    };

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(STEPS.WORK_NOTE_INVENTORY);
            setSelectedItems([]);
            setDiscount(0);
            setPaymentMethod('cash');
            setCashReceived(0);
            setTransactionId('');
            setShowToast(false);
            setToastMessage('');
            setIsEditingWorkOrder(false);
            const primaryAccount = bankAccounts.find(a => a.isPrimary) || bankAccounts[0];
            setSelectedBankAccount(primaryAccount || null);
        }
    }, [isOpen, bankAccounts]);

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape') {
            if (isEditingWorkOrder) {
                setIsEditingWorkOrder(false);
                if (workOrder) {
                    setEditData({
                        note: workOrder.note || '',
                        scheduleDate: workOrder.scheduleDate ? new Date(workOrder.scheduleDate).toISOString().split('T')[0] : '',
                        hasScheduledTime: workOrder.hasScheduledTime || false,
                        scheduleTime: workOrder.scheduleTime || ''
                    });
                }
            } else if (currentStep === STEPS.WORK_NOTE_INVENTORY) {
                onClose();
            } else {
                handleBack();
            }
        }
    }, [currentStep, isEditingWorkOrder, workOrder, onClose]);

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
                if (currentStep === STEPS.WORK_NOTE_INVENTORY) {
                    onClose();
                } else {
                    handleBack();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, currentStep, onClose]);

    // Navigation
    const handleBack = () => {
        if (currentStep > STEPS.WORK_NOTE_INVENTORY) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.CONFIRMATION) {
            setCurrentStep(prev => prev + 1);
        }
    };

    // Add item to cart
    const handleAddItem = (item) => {
        setSelectedItems(prev => [...prev, item]);
    };

    // Remove item from cart
    const handleRemoveItem = (index) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index));
    };

    // Save edited work order
    const handleSaveWorkOrder = async () => {
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
                setIsEditingWorkOrder(false);
            } else {
                alert(data.message || 'Failed to update work order');
            }
        } catch (error) {
            console.error('Update work order error:', error);
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

    // Create bill
    const handleCreateBill = async () => {
        setLoading(true);
        try {
            const billItems = selectedItems.map(item => ({
                itemType: item.itemType,
                itemId: item.itemId,
                serialNumber: item.serialNumber || null,
                qty: item.qty || 1
            }));

            const response = await fetch(SummaryApi.createBill.url, {
                method: SummaryApi.createBill.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    customerId: workOrder.customer._id,
                    items: billItems,
                    discount,
                    receivedPayment: cashReceived,
                    paymentMethod,
                    workOrderId: workOrder._id
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update parent with completed work order
                if (onUpdate) {
                    onUpdate({
                        ...workOrder,
                        status: 'completed',
                        billId: data.bill._id,
                        completedAt: new Date()
                    });
                }

                // Show toast notification
                setToastMessage(`Bill ${data.bill.billNumber} created successfully!`);
                setShowToast(true);

                // Close modal
                onClose();
            } else {
                alert(data.message || 'Failed to create bill');
            }
        } catch (error) {
            console.error('Create bill error:', error);
            alert('Failed to create bill');
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
            if (currentStep === STEPS.WORK_NOTE_INVENTORY) {
                onClose();
            }
        }
    };

    // Get step title
    const getStepTitle = () => {
        switch (currentStep) {
            case STEPS.WORK_NOTE_INVENTORY: return 'Work Order Details';
            case STEPS.BILL_SUMMARY: return 'Bill Summary';
            case STEPS.PAYMENT: return 'Payment';
            case STEPS.CONFIRMATION: return 'Confirm Bill';
            default: return 'Work Order Details';
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!isOpen || !workOrder) return null;

    // If work order is already completed, show simple view (not billing flow)
    const isCompleted = workOrder.status === 'completed';

    // For completed work orders, show a simple detail view
    if (isCompleted) {
        return (
            <div className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}>
                <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-green-500 to-green-600">
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
                        <span className="px-3 py-1 bg-white/30 text-white text-xs rounded-full font-medium">
                            Completed ✓
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Customer Info */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{workOrder.customer?.customerName}</p>
                                        <p className="text-sm text-gray-500">{workOrder.customer?.phoneNumber}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.location.href = `tel:${workOrder.customer?.phoneNumber}`}
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
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-2">
                                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <p className="text-sm text-gray-700">{workOrder.note}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Completion Info */}
                        {workOrder.completedAt && (
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Completed On</p>
                                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                    <p className="text-sm text-green-800">{formatDate(workOrder.completedAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-200 text-gray-800 font-medium rounded-xl hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full h-full sm:max-w-lg sm:h-[90vh] sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
                    {currentStep !== STEPS.WORK_NOTE_INVENTORY && (
                        <button
                            onClick={handleBack}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">{getStepTitle()}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Step 1: Work Note + Inventory */}
                {currentStep === STEPS.WORK_NOTE_INVENTORY && !isEditingWorkOrder && (
                    <>
                        {/* Customer Info Header - Compact */}
                        <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-blue-50 border-b flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-sm">
                                            {workOrder.customer?.customerName?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{workOrder.customer?.customerName}</p>
                                        <p className="text-xs text-gray-600">{workOrder.customer?.phoneNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setIsEditingWorkOrder(true)}
                                        className="px-3 py-1.5 bg-white border border-primary-200 text-primary-600 rounded-lg flex items-center gap-1.5 hover:bg-primary-50 text-xs font-medium shadow-sm"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleCall}
                                        className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center hover:bg-green-600 shadow-sm"
                                    >
                                        <Phone className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Work Details - Compact */}
                        <div className="px-4 py-2 bg-white border-b flex-shrink-0">
                            <div className="flex items-start gap-2">
                                <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-gray-700 line-clamp-2 flex-1">{workOrder.note}</p>
                            </div>
                        </div>

                        {/* Inventory Selection - Takes remaining space */}
                        <div className="flex-1 overflow-hidden">
                            <ItemSelectionStep
                                customer={workOrder.customer}
                                items={items}
                                services={services}
                                loading={loadingData}
                                selectedItems={selectedItems}
                                onAddItem={handleAddItem}
                                onRemoveItem={handleRemoveItem}
                                onContinue={handleNext}
                                hideCustomerInfo={true}
                            />
                        </div>
                    </>
                )}

                {/* Edit Mode */}
                {currentStep === STEPS.WORK_NOTE_INVENTORY && isEditingWorkOrder && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {/* Customer Info - Read Only */}
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{workOrder.customer?.customerName}</p>
                                        <p className="text-sm text-gray-500">{workOrder.customer?.phoneNumber}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Work Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Work Note *
                                </label>
                                <textarea
                                    value={editData.note}
                                    onChange={(e) => setEditData({...editData, note: e.target.value})}
                                    rows={3}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                                    placeholder="Enter work description..."
                                />
                            </div>

                            {/* Schedule Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Schedule Date *
                                </label>
                                <input
                                    type="date"
                                    value={editData.scheduleDate}
                                    onChange={(e) => setEditData({...editData, scheduleDate: e.target.value})}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                />
                            </div>

                            {/* Schedule Time Toggle */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editData.hasScheduledTime}
                                        onChange={(e) => setEditData({...editData, hasScheduledTime: e.target.checked, scheduleTime: e.target.checked ? editData.scheduleTime : ''})}
                                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Set specific time</span>
                                </label>
                            </div>

                            {/* Schedule Time */}
                            {editData.hasScheduledTime && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Schedule Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={editData.scheduleTime}
                                        onChange={(e) => setEditData({...editData, scheduleTime: e.target.value})}
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setIsEditingWorkOrder(false);
                                        setEditData({
                                            note: workOrder.note || '',
                                            scheduleDate: workOrder.scheduleDate ? new Date(workOrder.scheduleDate).toISOString().split('T')[0] : '',
                                            hasScheduledTime: workOrder.hasScheduledTime || false,
                                            scheduleTime: workOrder.scheduleTime || ''
                                        });
                                    }}
                                    className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveWorkOrder}
                                    disabled={loading || !editData.note.trim() || !editData.scheduleDate}
                                    className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 shadow-sm"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Bill Summary */}
                {currentStep === STEPS.BILL_SUMMARY && (
                    <div className="flex-1 overflow-hidden">
                        <BillSummaryStep
                            selectedItems={selectedItems}
                            subtotal={subtotal}
                            discount={discount}
                            totalAmount={totalAmount}
                            onDiscountChange={setDiscount}
                            onRemoveItem={handleRemoveItem}
                            onContinue={handleNext}
                        />
                    </div>
                )}

                {/* Step 3: Payment */}
                {currentStep === STEPS.PAYMENT && (
                    <div className="flex-1 overflow-hidden">
                        <PaymentStep
                            totalAmount={totalAmount}
                            paymentMethod={paymentMethod}
                            cashReceived={cashReceived}
                            dueAmount={dueAmount}
                            onPaymentMethodChange={setPaymentMethod}
                            onCashReceivedChange={setCashReceived}
                            onContinue={handleNext}
                            bankAccounts={bankAccounts}
                            selectedBankAccount={selectedBankAccount}
                            onBankAccountChange={setSelectedBankAccount}
                            transactionId={transactionId}
                            onTransactionIdChange={setTransactionId}
                        />
                    </div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === STEPS.CONFIRMATION && (
                    <div className="flex-1 overflow-hidden">
                        <ConfirmationStep
                            customer={workOrder.customer}
                            selectedItems={selectedItems}
                            subtotal={subtotal}
                            discount={discount}
                            totalAmount={totalAmount}
                            paymentMethod={paymentMethod}
                            cashReceived={cashReceived}
                            dueAmount={dueAmount}
                            loading={loading}
                            onConfirm={handleCreateBill}
                            transactionId={transactionId}
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
            <Toast
                message={toastMessage}
                type="success"
                onClose={() => setShowToast(false)}
                duration={2000}
            />
        )}
        </>
    );
};

export default WorkOrderDetailModal;
