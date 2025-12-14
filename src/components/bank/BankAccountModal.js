import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { getBankAccountsDao } from '../../storage/dao/bankAccountsDao';
import { pushBankAccounts } from '../../storage/sync/pushBankAccounts';
import { useSync } from '../../context/SyncContext';

const BankAccountModal = ({ isOpen, onClose, account, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        upiId: '',
        isPrimary: false
    });

    const isEditMode = !!account;
    const { notifyLocalSave } = useSync();

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: true }, '');
            const handlePopState = () => onClose();
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, onClose]);

    // Add ESC key listener
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            return () => document.removeEventListener('keydown', handleEscKey);
        }
    }, [isOpen, handleEscKey]);

    // Set form data when account changes (edit mode)
    useEffect(() => {
        if (account) {
            setFormData({
                bankName: account.bankName || '',
                accountNumber: account.accountNumber || '',
                ifscCode: account.ifscCode || '',
                accountHolderName: account.accountHolderName || '',
                upiId: account.upiId || '',
                isPrimary: account.isPrimary || false
            });
        } else {
            setFormData({
                bankName: '',
                accountNumber: '',
                ifscCode: '',
                accountHolderName: '',
                upiId: '',
                isPrimary: false
            });
        }
    }, [account, isOpen]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Handle form change
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.bankName.trim() || !formData.accountNumber.trim() ||
            !formData.ifscCode.trim() || !formData.accountHolderName.trim() ||
            !formData.upiId.trim()) {
            setFormError('All fields are required');
            return;
        }

        setLoading(true);
        setFormError('');

        try {
            const dao = await getBankAccountsDao();
            const now = new Date().toISOString();

            if (isEditMode) {
                if (account.pendingSync || (account._id && account._id.startsWith('client-'))) {
                    throw new Error('Please wait for this account to sync before editing.');
                }

                await dao.markPendingUpdate(account._id, {
                    bank_name: formData.bankName.trim(),
                    account_number: formData.accountNumber.trim(),
                    ifsc_code: formData.ifscCode.trim().toUpperCase(),
                    account_holder_name: formData.accountHolderName.trim(),
                    upi_id: formData.upiId.trim().toLowerCase(),
                    is_primary: formData.isPrimary ? 1 : 0
                });

                onSuccess({
                    ...account,
                    bankName: formData.bankName.trim(),
                    accountNumber: formData.accountNumber.trim(),
                    ifscCode: formData.ifscCode.trim().toUpperCase(),
                    accountHolderName: formData.accountHolderName.trim(),
                    upiId: formData.upiId.trim().toLowerCase(),
                    isPrimary: formData.isPrimary,
                    pendingSync: true
                });
            } else {
                const clientId = `client-bank-${Date.now()}`;
                await dao.insertLocal({
                    id: clientId,
                    client_id: clientId,
                    bank_name: formData.bankName.trim(),
                    account_number: formData.accountNumber.trim(),
                    ifsc_code: formData.ifscCode.trim().toUpperCase(),
                    account_holder_name: formData.accountHolderName.trim(),
                    upi_id: formData.upiId.trim().toLowerCase(),
                    is_primary: formData.isPrimary ? 1 : 0,
                    created_at: now,
                    updated_at: now,
                    sync_op: 'create'
                });

                onSuccess({
                    _id: clientId,
                    bankName: formData.bankName.trim(),
                    accountNumber: formData.accountNumber.trim(),
                    ifscCode: formData.ifscCode.trim().toUpperCase(),
                    accountHolderName: formData.accountHolderName.trim(),
                    upiId: formData.upiId.trim().toLowerCase(),
                    isPrimary: formData.isPrimary,
                    pendingSync: true,
                    syncError: null
                });
            }

            notifyLocalSave();
            pushBankAccounts().catch(() => {});
            onClose();
        } catch (error) {
            console.error('Bank account error:', error);
            setFormError(error?.message || `Failed to ${isEditMode ? 'update' : 'add'} bank account`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {isEditMode ? 'Edit Bank Account' : 'Add Bank Account'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
                    {/* Bank Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank Name *
                        </label>
                        <input
                            type="text"
                            name="bankName"
                            value={formData.bankName}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                            placeholder="e.g., State Bank of India"
                        />
                    </div>

                    {/* Account Number */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number *
                        </label>
                        <input
                            type="text"
                            name="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                            placeholder="Enter account number"
                        />
                    </div>

                    {/* IFSC Code */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            IFSC Code *
                        </label>
                        <input
                            type="text"
                            name="ifscCode"
                            value={formData.ifscCode}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 uppercase"
                            placeholder="e.g., SBIN0001234"
                        />
                    </div>

                    {/* Account Holder Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Holder Name *
                        </label>
                        <input
                            type="text"
                            name="accountHolderName"
                            value={formData.accountHolderName}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                            placeholder="Enter account holder name"
                        />
                    </div>

                    {/* UPI ID */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            UPI ID *
                        </label>
                        <input
                            type="text"
                            name="upiId"
                            value={formData.upiId}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 lowercase"
                            placeholder="e.g., yourname@upi"
                        />
                    </div>

                    {/* Set as Primary */}
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer mb-4">
                        <input
                            type="checkbox"
                            name="isPrimary"
                            checked={formData.isPrimary}
                            onChange={handleChange}
                            className="w-5 h-5 text-primary-500 rounded"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-800">Set as Primary Account</p>
                            <p className="text-xs text-gray-500">This will be the default account for UPI payments</p>
                        </div>
                    </label>
                </form>

                {formError && (
                    <div className="px-4 pb-3">
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {formError}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : isEditMode ? 'Update' : 'Add Account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BankAccountModal;
