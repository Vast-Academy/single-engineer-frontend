import { useState, useEffect, useCallback } from 'react';
import { X, Banknote, Smartphone, QrCode, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import SummaryApi from '../../common';
import { apiClient } from '../../utils/apiClient';

const PayCustomerDueModal = ({ isOpen, onClose, customerId, totalDue, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [paidAmount, setPaidAmount] = useState(0);
    const [affectedBillsCount, setAffectedBillsCount] = useState(0);

    // UPI states
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [transactionIdError, setTransactionIdError] = useState('');
    const [loadingBanks, setLoadingBanks] = useState(false);

    const dueAmount = totalDue || 0;

    // Fetch bank accounts and reset form ONLY when modal opens
    useEffect(() => {
        if (isOpen && !showSuccess) {
            fetchBankAccounts();
            setAmount(dueAmount.toString());
            setNote('');
            setShowQR(false);
            setTransactionId('');
            setPaymentMethod('cash');
        }
    }, [isOpen]);

    // Update amount when dueAmount changes (but not during success screen)
    useEffect(() => {
        if (isOpen && !showSuccess) {
            setAmount(dueAmount.toString());
        }
    }, [dueAmount]);

    // Reset everything when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowSuccess(false);
            setPaidAmount(0);
            setAffectedBillsCount(0);
        }
    }, [isOpen]);

    const fetchBankAccounts = async () => {
        setLoadingBanks(true);
        try {
            const response = await apiClient(SummaryApi.getAllBankAccounts.url, {
                method: SummaryApi.getAllBankAccounts.method
            });
            const data = await response.json();
            if (data.success) {
                const accounts = data.bankAccounts || [];
                setBankAccounts(accounts);
                const primaryAccount = accounts.find(a => a.isPrimary) || accounts[0];
                setSelectedBankAccount(primaryAccount || null);
            }
        } catch (error) {
            console.error('Fetch bank accounts error:', error);
        } finally {
            setLoadingBanks(false);
        }
    };

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape' && !showSuccess) {
            onClose();
        }
    }, [onClose, showSuccess]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: true }, '');
            const handlePopState = () => {
                if (showSuccess) {
                    onClose();
                } else {
                    onClose();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, onClose, showSuccess]);

    // Add ESC key listener
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            return () => document.removeEventListener('keydown', handleEscKey);
        }
    }, [isOpen, handleEscKey]);

    // Reset QR when bank account or amount changes
    useEffect(() => {
        setShowQR(false);
    }, [selectedBankAccount, amount]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !showSuccess) {
            onClose();
        }
    };

    // Handle transaction ID change
    const handleTransactionIdChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        setTransactionId(value);
        if (value.length > 0 && value.length < 12) {
            setTransactionIdError('Transaction ID must be at least 12 digits');
        } else {
            setTransactionIdError('');
        }
    };

    // Generate UPI QR string
    const generateUpiString = () => {
        if (!selectedBankAccount) return '';
        const upiAmount = parseFloat(amount) || 0;
        const upiId = selectedBankAccount.upiId;
        const name = encodeURIComponent(selectedBankAccount.accountHolderName);
        return `upi://pay?pa=${upiId}&pn=${name}&am=${upiAmount}&cu=INR`;
    };

    const handleGenerateQR = () => {
        const numAmount = parseFloat(amount) || 0;
        if (numAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!selectedBankAccount) {
            alert('Please select a bank account');
            return;
        }
        setShowQR(true);
    };

    // Quick amount buttons
    const quickAmounts = [
        { label: 'Full Due', value: dueAmount },
        { label: '₹500', value: 500 },
        { label: '₹1000', value: 1000 }
    ].filter(q => q.value <= dueAmount);

    // Handle submit
    const handleSubmit = async () => {
        const numAmount = parseFloat(amount) || 0;

        if (numAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (numAmount > dueAmount) {
            alert(`Amount cannot exceed due amount (₹${dueAmount})`);
            return;
        }

        if (paymentMethod === 'upi' && (!transactionId || transactionId.length < 12)) {
            alert('Please enter a valid transaction ID (12+ digits)');
            return;
        }

        setLoading(true);
        try {
            // Build note with payment method info
            let paymentNote = '';
            if (paymentMethod === 'upi') {
                paymentNote = `[UPI] ${transactionId}`;
                if (note.trim()) {
                    paymentNote += ` | ${note.trim()}`;
                }
            } else {
                paymentNote = '[Cash]';
                if (note.trim()) {
                    paymentNote += ` ${note.trim()}`;
                }
            }

            const response = await apiClient(`${SummaryApi.payCustomerDue.url}/${customerId}/pay-due`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: numAmount,
                    note: paymentNote,
                    paymentMethod: paymentMethod
                })
            });

            const data = await response.json();
            if (data.success) {
                setPaidAmount(numAmount);
                setAffectedBillsCount(data.affectedBills?.length || 0);
                setShowSuccess(true);
                onSuccess();
            } else {
                alert(data.message || 'Failed to process payment');
            }
        } catch (error) {
            console.error('Pay customer due error:', error);
            alert('Failed to process payment');
        } finally {
            setLoading(false);
        }
    };

    // Can proceed
    const canProceed = () => {
        const numAmount = parseFloat(amount) || 0;
        if (numAmount <= 0 || numAmount > dueAmount) return false;
        if (paymentMethod === 'upi') {
            return showQR && transactionId && transactionId.length >= 12;
        }
        return true;
    };

    // Handle close from success screen
    const handleSuccessClose = () => {
        setShowSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    // Success Screen
    if (showSuccess) {
        return (
            <div
                className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-50 flex items-center justify-center"
            >
                <div className="bg-white w-full sm:max-w-sm mx-4 rounded-2xl overflow-hidden">
                    <div className="p-8 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>

                        {/* Success Message */}
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
                        <p className="text-gray-500 mb-2">
                            ₹{paidAmount} has been recorded
                        </p>
                        <p className="text-sm text-gray-400 mb-6">
                            Payment distributed across {affectedBillsCount} bill{affectedBillsCount !== 1 ? 's' : ''}
                        </p>

                        {/* Payment Details */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Amount Paid</span>
                                <span className="font-semibold text-green-600">₹{paidAmount}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Method</span>
                                <span className={`font-medium ${paymentMethod === 'upi' ? 'text-purple-600' : 'text-green-600'}`}>
                                    {paymentMethod === 'upi' ? 'UPI' : 'Cash'}
                                </span>
                            </div>
                            {paymentMethod === 'upi' && transactionId && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Transaction ID</span>
                                    <span className="font-medium text-gray-800">{transactionId}</span>
                                </div>
                            )}
                        </div>

                        {/* Done Button */}
                        <button
                            onClick={handleSuccessClose}
                            className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
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
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">Pay Customer Due</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Due Amount Display */}
                    <div className="bg-red-50 rounded-xl p-4 mb-4 text-center">
                        <p className="text-sm text-red-600 mb-1">Total Due</p>
                        <p className="text-2xl font-bold text-red-700">₹{dueAmount}</p>
                        <p className="text-xs text-red-500 mt-1">Payment will clear oldest bills first</p>
                    </div>

                    {/* Amount Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                max={dueAmount}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-8 text-xl font-semibold focus:outline-none focus:border-primary-500"
                            />
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2 mb-4">
                        {quickAmounts.map((q, index) => (
                            <button
                                key={index}
                                onClick={() => setAmount(q.value.toString())}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    parseFloat(amount) === q.value
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>

                    {/* Payment Method */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Method
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
                                    paymentMethod === 'cash'
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-500'}`} />
                                <span className={`text-sm font-medium ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-600'}`}>
                                    Cash
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    if (bankAccounts.length > 0) {
                                        setPaymentMethod('upi');
                                    }
                                }}
                                className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
                                    paymentMethod === 'upi'
                                        ? 'border-primary-500 bg-primary-50'
                                        : bankAccounts.length === 0
                                            ? 'border-gray-200 opacity-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <Smartphone className={`w-5 h-5 ${paymentMethod === 'upi' ? 'text-primary-600' : 'text-gray-500'}`} />
                                <span className={`text-sm font-medium ${paymentMethod === 'upi' ? 'text-primary-600' : 'text-gray-600'}`}>
                                    UPI
                                </span>
                            </button>
                        </div>
                        {bankAccounts.length === 0 && !loadingBanks && (
                            <p className="text-xs text-orange-600 mt-2">
                                Add a bank account in Settings to enable UPI
                            </p>
                        )}
                    </div>

                    {/* Note Input - Always show */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Remark (Optional)
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g., Payment received by Amit"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                        />
                    </div>

                    {/* UPI Section */}
                    {paymentMethod === 'upi' && (
                        <>
                            {/* Bank Account Selector */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Bank Account
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedBankAccount?._id || ''}
                                        onChange={(e) => {
                                            const account = bankAccounts.find(a => a._id === e.target.value);
                                            setSelectedBankAccount(account);
                                        }}
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-primary-500 appearance-none bg-white"
                                    >
                                        {bankAccounts.map(account => (
                                            <option key={account._id} value={account._id}>
                                                {account.bankName} - {account.upiId} {account.isPrimary ? '(Primary)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* Generate QR Button */}
                            {!showQR && (
                                <button
                                    onClick={handleGenerateQR}
                                    className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 mb-4"
                                >
                                    <QrCode className="w-5 h-5" />
                                    Generate QR Code
                                </button>
                            )}

                            {/* QR Code Display */}
                            {showQR && selectedBankAccount && (
                                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white p-3 rounded-xl mb-3">
                                            <QRCodeSVG
                                                value={generateUpiString()}
                                                size={160}
                                                level="H"
                                                includeMargin={true}
                                            />
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">Scan to pay</p>
                                        <p className="text-lg font-bold text-primary-600">₹{amount}</p>
                                        <p className="text-xs text-gray-500 mt-1">{selectedBankAccount.upiId}</p>
                                    </div>
                                </div>
                            )}

                            {/* Transaction ID Input */}
                            {showQR && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Transaction ID
                                    </label>
                                    <input
                                        type="text"
                                        value={transactionId}
                                        onChange={handleTransactionIdChange}
                                        placeholder="Enter 12+ digit transaction ID"
                                        maxLength={20}
                                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none ${
                                            transactionIdError
                                                ? 'border-red-300 focus:border-red-500'
                                                : 'border-gray-200 focus:border-primary-500'
                                        }`}
                                    />
                                    {transactionIdError && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {transactionIdError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !canProceed()}
                        className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Confirm Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayCustomerDueModal;
