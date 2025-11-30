import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import SummaryApi from '../../common';
import ItemSelectionStep from './steps/ItemSelectionStep';
import BillSummaryStep from './steps/BillSummaryStep';
import PaymentStep from './steps/PaymentStep';
import ConfirmationStep from './steps/ConfirmationStep';
import SuccessStep from './steps/SuccessStep';

const STEPS = {
    ITEM_SELECTION: 1,
    BILL_SUMMARY: 2,
    PAYMENT: 3,
    CONFIRMATION: 4,
    SUCCESS: 5
};

const CreateBillModal = ({ isOpen, onClose, customer, workOrderId, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(STEPS.ITEM_SELECTION);
    const [loading, setLoading] = useState(false);

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

    // Created bill data
    const [createdBill, setCreatedBill] = useState(null);

    // Calculate totals
    const subtotal = selectedItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = Math.max(0, subtotal - discount);
    const dueAmount = Math.max(0, totalAmount - cashReceived);

    // Fetch items and services
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

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
                // Set primary account as default selected
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
            setCurrentStep(STEPS.ITEM_SELECTION);
            setSelectedItems([]);
            setDiscount(0);
            setPaymentMethod('cash');
            setCashReceived(0);
            setTransactionId('');
            setCreatedBill(null);
            // Reset selected bank to primary
            const primaryAccount = bankAccounts.find(a => a.isPrimary) || bankAccounts[0];
            setSelectedBankAccount(primaryAccount || null);
        }
    }, [isOpen, bankAccounts]);

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape' && currentStep !== STEPS.SUCCESS) {
            if (currentStep === STEPS.ITEM_SELECTION) {
                onClose();
            } else {
                handleBack();
            }
        }
    }, [currentStep, onClose]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: true }, '');
            const handlePopState = () => {
                if (currentStep === STEPS.ITEM_SELECTION) {
                    onClose();
                } else if (currentStep !== STEPS.SUCCESS) {
                    handleBack();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, currentStep, onClose]);

    // Add ESC key listener
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            return () => document.removeEventListener('keydown', handleEscKey);
        }
    }, [isOpen, handleEscKey]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && currentStep !== STEPS.SUCCESS) {
            if (currentStep === STEPS.ITEM_SELECTION) {
                onClose();
            }
        }
    };

    // Navigation
    const handleBack = () => {
        if (currentStep > STEPS.ITEM_SELECTION && currentStep !== STEPS.SUCCESS) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.SUCCESS) {
            setCurrentStep(prev => prev + 1);
        }
    };

    // Add item to bill
    const handleAddItem = (item) => {
        setSelectedItems(prev => [...prev, item]);
    };

    // Remove item from bill
    const handleRemoveItem = (index) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index));
    };

    // Create bill
    const handleCreateBill = async () => {
        setLoading(true);
        try {
            // Prepare items for API
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
                    customerId: customer._id,
                    items: billItems,
                    discount,
                    receivedPayment: cashReceived,
                    paymentMethod,
                    workOrderId: workOrderId || null
                })
            });

            const data = await response.json();

            if (data.success) {
                setCreatedBill(data.bill);
                setCurrentStep(STEPS.SUCCESS);
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

    // Handle done (close modal and notify parent)
    const handleDone = () => {
        if (onSuccess && createdBill) {
            onSuccess(createdBill);
        }
        onClose();
    };

    // Get step title
    const getStepTitle = () => {
        switch (currentStep) {
            case STEPS.ITEM_SELECTION: return 'Create Bill';
            case STEPS.BILL_SUMMARY: return 'Bill Summary';
            case STEPS.PAYMENT: return 'Payment';
            case STEPS.CONFIRMATION: return 'Confirm Bill';
            case STEPS.SUCCESS: return 'Success';
            default: return 'Create Bill';
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl h-full sm:h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
                    {currentStep !== STEPS.SUCCESS && currentStep !== STEPS.ITEM_SELECTION && (
                        <button
                            onClick={handleBack}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">{getStepTitle()}</h2>
                    {currentStep !== STEPS.SUCCESS && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    )}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-hidden">
                    {currentStep === STEPS.ITEM_SELECTION && (
                        <ItemSelectionStep
                            customer={customer}
                            items={items}
                            services={services}
                            loading={loadingData}
                            selectedItems={selectedItems}
                            onAddItem={handleAddItem}
                            onRemoveItem={handleRemoveItem}
                            onContinue={handleNext}
                        />
                    )}

                    {currentStep === STEPS.BILL_SUMMARY && (
                        <BillSummaryStep
                            selectedItems={selectedItems}
                            subtotal={subtotal}
                            discount={discount}
                            totalAmount={totalAmount}
                            onDiscountChange={setDiscount}
                            onRemoveItem={handleRemoveItem}
                            onContinue={handleNext}
                        />
                    )}

                    {currentStep === STEPS.PAYMENT && (
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
                    )}

                    {currentStep === STEPS.CONFIRMATION && (
                        <ConfirmationStep
                            customer={customer}
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
                    )}

                    {currentStep === STEPS.SUCCESS && (
                        <SuccessStep
                            bill={createdBill}
                            customer={customer}
                            onDone={handleDone}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateBillModal;
