import { useState, useEffect } from 'react';
import { Banknote, Smartphone, ChevronDown, QrCode, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const PaymentStep = ({
    totalAmount,
    paymentMethod,
    cashReceived,
    dueAmount,
    onPaymentMethodChange,
    onCashReceivedChange,
    onContinue,
    // UPI props
    bankAccounts = [],
    selectedBankAccount,
    onBankAccountChange,
    transactionId,
    onTransactionIdChange
}) => {
    const [cashInput, setCashInput] = useState(cashReceived.toString());
    const [upiAmount, setUpiAmount] = useState(totalAmount.toString());
    const [showQR, setShowQR] = useState(false);
    const [transactionIdError, setTransactionIdError] = useState('');
    const [showNoBankMessage, setShowNoBankMessage] = useState(false);

    useEffect(() => {
        setCashInput(cashReceived.toString());
    }, [cashReceived]);

    useEffect(() => {
        setUpiAmount(totalAmount.toString());
    }, [totalAmount]);

    // Reset QR when bank account or amount changes
    useEffect(() => {
        setShowQR(false);
    }, [selectedBankAccount, upiAmount]);

    const handleCashChange = (e) => {
        const value = e.target.value;
        setCashInput(value);
        const numValue = parseFloat(value) || 0;
        onCashReceivedChange(Math.max(0, numValue));
    };

    const handleUpiAmountChange = (e) => {
        const value = e.target.value;
        setUpiAmount(value);
        const numValue = parseFloat(value) || 0;
        onCashReceivedChange(Math.max(0, Math.min(totalAmount, numValue)));
    };

    const handleTransactionIdChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Only digits
        onTransactionIdChange(value);
        if (value.length > 0 && value.length < 12) {
            setTransactionIdError('Transaction ID must be at least 12 digits');
        } else {
            setTransactionIdError('');
        }
    };

    // Generate UPI QR string
    const generateUpiString = () => {
        if (!selectedBankAccount) return '';
        const amount = parseFloat(upiAmount) || 0;
        const upiId = selectedBankAccount.upiId;
        const name = encodeURIComponent(selectedBankAccount.accountHolderName);
        return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR`;
    };

    const handleGenerateQR = () => {
        const amount = parseFloat(upiAmount) || 0;
        if (amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!selectedBankAccount) {
            alert('Please select a bank account');
            return;
        }
        onCashReceivedChange(amount);
        setShowQR(true);
    };

    // Quick amount buttons
    const quickAmounts = [
        { label: 'Full', value: totalAmount },
        { label: '₹500', value: 500 },
        { label: '₹1000', value: 1000 },
        { label: '₹2000', value: 2000 }
    ].filter(q => q.value <= totalAmount || q.value === totalAmount);

    const handleQuickAmount = (value) => {
        setCashInput(value.toString());
        onCashReceivedChange(value);
    };

    // Check if can proceed
    const canProceed = () => {
        if (paymentMethod === 'cash') {
            return true;
        }
        if (paymentMethod === 'upi') {
            return showQR && transactionId && transactionId.length >= 12;
        }
        return false;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                {/* Total Amount Display */}
                <div className="bg-primary-50 rounded-xl p-4 mb-6 text-center">
                    <p className="text-sm text-primary-600 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-primary-700">₹{totalAmount}</p>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => onPaymentMethodChange('cash')}
                            className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                                paymentMethod === 'cash'
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-500'}`} />
                            <span className={`text-sm font-medium ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-600'}`}>
                                Cash
                            </span>
                        </button>
                        <button
                            onClick={() => {
                                if (bankAccounts.length === 0) {
                                    setShowNoBankMessage(true);
                                } else {
                                    setShowNoBankMessage(false);
                                    onPaymentMethodChange('upi');
                                }
                            }}
                            className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                                paymentMethod === 'upi'
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Smartphone className={`w-6 h-6 ${paymentMethod === 'upi' ? 'text-primary-600' : 'text-gray-500'}`} />
                            <span className={`text-sm font-medium ${paymentMethod === 'upi' ? 'text-primary-600' : 'text-gray-600'}`}>
                                UPI
                            </span>
                        </button>
                    </div>

                    {/* No Bank Account Message */}
                    {showNoBankMessage && bankAccounts.length === 0 && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                            <p className="text-sm text-orange-700 font-medium mb-1">No Bank Account Found</p>
                            <p className="text-xs text-orange-600">
                                Please add a bank account first from Settings → Bank Accounts
                            </p>
                        </div>
                    )}
                </div>

                {/* Cash Payment Section */}
                {paymentMethod === 'cash' && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Cash Received</h3>

                        {/* Cash Input */}
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
                            <input
                                type="number"
                                value={cashInput}
                                onChange={handleCashChange}
                                placeholder="0"
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 pl-8 text-2xl font-semibold text-center focus:outline-none focus:border-primary-500"
                            />
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex gap-2 mb-6">
                            {quickAmounts.map((q, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleQuickAmount(q.value)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        cashReceived === q.value
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {q.label}
                                </button>
                            ))}
                        </div>

                        {/* Due Amount */}
                        <div className={`rounded-xl p-4 ${dueAmount > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`font-medium ${dueAmount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                    {dueAmount > 0 ? 'Due Amount' : 'Fully Paid'}
                                </span>
                                <span className={`text-xl font-bold ${dueAmount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                    ₹{dueAmount}
                                </span>
                            </div>
                            {cashReceived > totalAmount && (
                                <p className="text-sm text-green-600 mt-2">
                                    Return: ₹{cashReceived - totalAmount}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* UPI Payment Section */}
                {paymentMethod === 'upi' && (
                    <div>
                        {/* Bank Account Selector */}
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Select Bank Account</h3>
                            <div className="relative">
                                <select
                                    value={selectedBankAccount?._id || ''}
                                    onChange={(e) => {
                                        const account = bankAccounts.find(a => a._id === e.target.value);
                                        onBankAccountChange(account);
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

                        {/* UPI Amount Input */}
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Amount to Receive</h3>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
                                <input
                                    type="number"
                                    value={upiAmount}
                                    onChange={handleUpiAmountChange}
                                    placeholder="0"
                                    max={totalAmount}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-8 text-xl font-semibold focus:outline-none focus:border-primary-500"
                                />
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
                                            size={180}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">Scan to pay</p>
                                    <p className="text-lg font-bold text-primary-600">₹{cashReceived}</p>
                                    <p className="text-xs text-gray-500 mt-1">{selectedBankAccount.upiId}</p>
                                </div>
                            </div>
                        )}

                        {/* Transaction ID Input */}
                        {showQR && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction ID</h3>
                                <input
                                    type="text"
                                    value={transactionId || ''}
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

                        {/* Due Amount for UPI */}
                        {showQR && (
                            <div className={`rounded-xl p-4 ${dueAmount > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`font-medium ${dueAmount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                        {dueAmount > 0 ? 'Due Amount' : 'Fully Paid'}
                                    </span>
                                    <span className={`text-xl font-bold ${dueAmount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                        ₹{dueAmount}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Continue Button */}
            <div className="p-4 border-t flex-shrink-0">
                <button
                    onClick={onContinue}
                    disabled={!canProceed()}
                    className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Proceed to Confirm
                </button>
            </div>
        </div>
    );
};

export default PaymentStep;
