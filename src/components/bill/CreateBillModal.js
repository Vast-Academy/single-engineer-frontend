import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import SummaryApi from '../../common';
import ItemSelectionStep from './steps/ItemSelectionStep';
import BillSummaryStep from './steps/BillSummaryStep';
import PaymentStep from './steps/PaymentStep';
import ConfirmationStep from './steps/ConfirmationStep';
import SuccessStep from './steps/SuccessStep';
import { getBillsDao } from '../../storage/dao/billsDao';
import { useSync } from '../../context/SyncContext';
import { apiClient } from '../../utils/apiClient';

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
    const { isOnline, bumpDataVersion } = useSync();

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
            // FIXED: Load from local SQLite for instant display
            const { getItemsDao } = await import('../../storage/dao/itemsDao');
            const { getServicesDao } = await import('../../storage/dao/servicesDao');
            const { getSerialNumbersDao } = await import('../../storage/dao/serialNumbersDao');
            const { getBankAccountsDao } = await import('../../storage/dao/bankAccountsDao');

            const itemsDao = await getItemsDao();
            const servicesDao = await getServicesDao();
            const serialDao = await getSerialNumbersDao();
            const bankDao = await getBankAccountsDao();

            // Load items
            const itemRows = await itemsDao.list({ limit: 1000, offset: 0 });
            const mappedItems = await Promise.all(itemRows.map(async (item) => {
                const serialNumbers = await serialDao.listByItem(item.id);
                return {
                    _id: item.id,
                    itemType: item.item_type,
                    itemName: item.item_name,
                    unit: item.unit,
                    warranty: item.warranty,
                    mrp: item.mrp,
                    purchasePrice: item.purchase_price,
                    salePrice: item.sale_price,
                    stockQty: item.stock_qty,
                    serialNumbers: serialNumbers.map(sn => ({
                        serialNo: sn.serial_no,
                        status: sn.status,
                        customerName: sn.customer_name,
                        billNumber: sn.bill_number,
                        addedAt: sn.added_at
                    }))
                };
            }));
            setItems(mappedItems);

            // Load services
            const serviceRows = await servicesDao.list({ limit: 1000, offset: 0 });
            const mappedServices = serviceRows.map(s => ({
                _id: s.id,
                serviceName: s.service_name,
                servicePrice: s.service_price
            }));
            setServices(mappedServices);

            // Load bank accounts
            const bankRows = await bankDao.list({ limit: 100, offset: 0 });
            const mappedBanks = bankRows.map(b => ({
                _id: b.id,
                bankName: b.bank_name,
                accountNumber: b.account_number,
                ifscCode: b.ifsc_code,
                accountHolderName: b.account_holder_name,
                upiId: b.upi_id,
                isPrimary: b.is_primary === 1
            }));
            setBankAccounts(mappedBanks);
            const primaryAccount = mappedBanks.find(a => a.isPrimary) || mappedBanks[0];
            setSelectedBankAccount(primaryAccount || null);

        } catch (error) {
            console.error('Fetch data (local) error:', error);
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

    // Create bill (offline-first)
    const handleCreateBill = async () => {
        // Require online so bill is created on server immediately
        if (!isOnline) {
            alert('Go online to create a bill. Please connect to the internet and try again.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customerId: customer._id,
                items: selectedItems.map(item => ({
                    itemType: item.itemType,
                    itemId: item.itemId,
                    serialNumber: item.serialNumber || null,
                    qty: item.qty || 1
                })),
                discount,
                receivedPayment: cashReceived,
                paymentMethod,
                workOrderId: workOrderId || null
            };

            const response = await apiClient(SummaryApi.createBill.url, {
                method: SummaryApi.createBill.method,
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (!data.success || !data.bill) {
                throw new Error(data.message || 'Failed to create bill');
            }

            const serverBill = data.bill;

            // Persist server bill to local SQLite so detail screens have items/history immediately
            const dao = await getBillsDao();
            await dao.upsertMany([serverBill]);

            // Update local inventory immediately (reduce stock for sold items)
            try {
                const { getItemsDao } = await import('../../storage/dao/itemsDao');
                const { getSerialNumbersDao } = await import('../../storage/dao/serialNumbersDao');
                const itemsDao = await getItemsDao();
                const serialDao = await getSerialNumbersDao();
                const now = new Date().toISOString();

                for (const item of selectedItems) {
                    if (item.itemType === 'generic') {
                        // Reduce stock quantity for generic items
                        await itemsDao.update(
                            'stock_qty = stock_qty - ?, updated_at = ?',
                            [item.qty || 1, now, item.itemId],
                            'id = ?'
                        );
                    } else if (item.itemType === 'serialized' && item.serialNumber) {
                        // Mark serial number as sold
                        await serialDao.markPendingUpdateBySerial(item.serialNumber, {
                            status: 'sold',
                            customer_name: customer.customerName,
                            bill_number: serverBill.billNumber || serverBill.bill_number
                        });
                        // Reduce stock quantity for serialized items
                        await itemsDao.update(
                            'stock_qty = stock_qty - 1, updated_at = ?',
                            [now, item.itemId],
                            'id = ?'
                        );
                    }
                }
            } catch (invError) {
                console.error('Local inventory update error:', invError);
                // Non-critical, continue
            }

            bumpDataVersion();

            // Map to UI shape for success screen
            const mappedBill = {
                _id: serverBill._id || serverBill.id,
                billNumber: serverBill.billNumber || serverBill.bill_number || '',
                subtotal: serverBill.subtotal || 0,
                discount: serverBill.discount || 0,
                totalAmount: serverBill.totalAmount || serverBill.total_amount || 0,
                receivedPayment: serverBill.receivedPayment || serverBill.received_payment || 0,
                dueAmount: serverBill.dueAmount || serverBill.due_amount || 0,
                paymentMethod: serverBill.paymentMethod || serverBill.payment_method || 'cash',
                status: serverBill.status || 'pending',
                createdAt: serverBill.createdAt || serverBill.created_at,
                pendingSync: false,
                items: (serverBill.items || []).map(it => ({
                    itemType: it.itemType || it.item_type,
                    itemId: it.itemId || it.item_id,
                    itemName: it.itemName || it.item_name,
                    serialNumber: it.serialNumber || it.serial_number,
                    qty: it.qty || 1,
                    price: it.price || 0,
                    amount: it.amount || 0,
                    purchasePrice: it.purchasePrice || it.purchase_price || 0
                })),
                paymentHistory: (serverBill.paymentHistory || serverBill.payment_history || []).map(p => ({
                    _id: p._id || p.id,
                    amount: p.amount || 0,
                    paidAt: p.paidAt || p.paid_at,
                    note: p.note || '',
                    pending_sync: 0,
                    sync_error: null
                }))
            };

            setCreatedBill(mappedBill);
            setCurrentStep(STEPS.SUCCESS);
            if (onSuccess) {
                onSuccess(mappedBill);
            }
        } catch (error) {
            console.error('Create bill (server) error:', error);
            alert(error.message || 'Failed to create bill');
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
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden modal-shell"
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b flex-shrink-0 safe-area-top">
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
                <div className="modal-body">
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
                            onRefreshItems={fetchData}
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
