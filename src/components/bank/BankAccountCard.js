import { Building2, Edit2, Trash2, Star } from 'lucide-react';

const BankAccountCard = ({ account, onEdit, onDelete, onSetPrimary }) => {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-start gap-3">
                {/* Bank Icon */}
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 truncate">{account.bankName}</h3>
                        {account.pendingSync && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-full">Sync</span>
                        )}
                        {account.syncError && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-semibold rounded-full">!</span>
                        )}
                        {account.isPrimary && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                Primary
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">{account.accountHolderName}</p>
                    <p className="text-sm text-gray-500">A/C: ****{account.accountNumber.slice(-4)}</p>
                    <p className="text-sm text-primary-600 font-medium mt-1">{account.upiId}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onEdit(account)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(account)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={account.pendingSync || (account._id && account._id.startsWith('client-'))}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Set as Primary Button */}
            {!account.isPrimary && (
                <button
                    onClick={() => onSetPrimary(account)}
                    className="mt-3 w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={account.pendingSync || (account._id && account._id.startsWith('client-'))}
                >
                    Set as Primary
                </button>
            )}
        </div>
    );
};

export default BankAccountCard;
