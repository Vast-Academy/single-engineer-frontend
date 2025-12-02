import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Building2 } from 'lucide-react';
import SummaryApi from '../common';
import BankAccountCard from '../components/bank/BankAccountCard';
import BankAccountModal from '../components/bank/BankAccountModal';
import DeleteConfirmModal from '../components/inventory/DeleteConfirmModal';

const BankAccounts = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch accounts on mount
    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await fetch(SummaryApi.getAllBankAccounts.url, {
                method: SummaryApi.getAllBankAccounts.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setAccounts(data.bankAccounts);
            }
        } catch (error) {
            console.error('Fetch accounts error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle add new
    const handleAddNew = () => {
        setSelectedAccount(null);
        setShowModal(true);
    };

    // Handle edit
    const handleEdit = (account) => {
        setSelectedAccount(account);
        setShowModal(true);
    };

    // Handle delete - Show confirmation modal
    const handleDelete = (account) => {
        setAccountToDelete(account);
        setShowDeleteModal(true);
    };

    // Confirm delete - Actual deletion
    const confirmDelete = async () => {
        if (!accountToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`${SummaryApi.deleteBankAccount.url}/${accountToDelete._id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setShowDeleteModal(false);
                setAccountToDelete(null);
                fetchAccounts(); // Refresh list
            } else {
                alert(data.message || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Delete account error:', error);
            alert('Failed to delete account');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle set primary
    const handleSetPrimary = async (account) => {
        try {
            const response = await fetch(`${SummaryApi.setPrimaryBankAccount.url}/${account._id}/primary`, {
                method: 'PUT',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                fetchAccounts(); // Refresh list
            } else {
                alert(data.message || 'Failed to set primary account');
            }
        } catch (error) {
            console.error('Set primary error:', error);
            alert('Failed to set primary account');
        }
    };

    // Handle success (add/edit)
    const handleSuccess = () => {
        fetchAccounts();
    };

    return (
        <div className="py-4 pb-20">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Bank Accounts</h1>
                    <p className="text-gray-500 text-sm">Manage your UPI payment accounts</p>
                </div>
            </div>

            {/* Content */}
            <div className="">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : accounts.length > 0 ? (
                    <div className="space-y-3">
                        {accounts.map(account => (
                            <BankAccountCard
                                key={account._id}
                                account={account}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onSetPrimary={handleSetPrimary}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Bank Accounts</h3>
                        <p className="text-gray-500 text-sm mb-4">Add your bank account for UPI payments</p>
                        <button
                            onClick={handleAddNew}
                            className="px-6 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
                        >
                            Add Bank Account
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            {accounts.length > 0 && (
                <button
                    onClick={handleAddNew}
                    className="fixed bottom-24 right-4 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors z-30"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Add/Edit Modal */}
            <BankAccountModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                account={selectedAccount}
                onSuccess={handleSuccess}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setAccountToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Bank Account?"
                message={`Are you sure you want to delete "${accountToDelete?.bankName}" account? This action cannot be undone.`}
                loading={isDeleting}
            />
        </div>
    );
};

export default BankAccounts;
