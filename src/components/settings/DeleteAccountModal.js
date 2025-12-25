import { useState, useEffect } from 'react';
import { X, AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../utils/apiClient';
import SummaryApi from '../../common';
import { clearAllLocalData } from '../../storage';

const DeleteAccountModal = ({ isOpen, onClose }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Countdown, 2: Password verification
    const [countdown, setCountdown] = useState(10);
    const [password, setPassword] = useState('');
    const [passwordValid, setPasswordValid] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [confirmChecked, setConfirmChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Countdown timer
    useEffect(() => {
        if (step === 1 && countdown > 0 && isOpen) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [step, countdown, isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setCountdown(10);
            setPassword('');
            setPasswordValid(false);
            setPasswordError('');
            setConfirmChecked(false);
            setLoading(false);
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, loading, onClose]);

    // Verify password in real-time
    const handlePasswordChange = async (e) => {
        const value = e.target.value;
        setPassword(value);
        setPasswordError('');
        setPasswordValid(false);
        setConfirmChecked(false);

        if (value.trim().length === 0) {
            return;
        }

        // Debounce verification
        if (value.trim().length >= 6) {
            setVerifying(true);
            try {
                const response = await apiClient(SummaryApi.verifyPassword.url, {
                    method: SummaryApi.verifyPassword.method,
                    body: JSON.stringify({ password: value })
                });

                const data = await response.json();

                if (data.success && data.isValid) {
                    setPasswordValid(true);
                    setPasswordError('');
                } else {
                    setPasswordValid(false);
                    setPasswordError('Incorrect password');
                }
            } catch (error) {
                setPasswordValid(false);
                setPasswordError('Failed to verify password');
            } finally {
                setVerifying(false);
            }
        }
    };

    // Handle account deletion
    const handleDeleteAccount = async () => {
        setLoading(true);

        try {
            // 1. Call backend API to delete account
            const response = await apiClient(SummaryApi.deleteAccount.url, {
                method: SummaryApi.deleteAccount.method,
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to delete account');
            }

            // 2. Clear local SQLite data
            await clearAllLocalData();

            // 3. Logout (clears Firebase auth and Capacitor preferences)
            await logout();

            // 4. Navigate to login
            navigate('/login');

        } catch (error) {
            console.error('Delete account error:', error);
            alert(error.message || 'Failed to delete account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) {
                    onClose();
                }
            }}
        >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">
                        {step === 1 ? 'Delete Account' : 'Verify Password'}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {step === 1 ? (
                        /* Step 1: Countdown Warning */
                        <div className="p-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center mb-4">
                                Delete Account?
                            </h3>
                            <p className="text-gray-700 text-center mb-4">
                                Are you sure you want to delete your account? This action is <strong>permanent and cannot be undone</strong>.
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                <p className="text-sm text-yellow-800 font-semibold mb-2">
                                    All your data will be permanently deleted:
                                </p>
                                <ul className="text-sm text-yellow-700 space-y-1">
                                    <li>• All customers</li>
                                    <li>• All inventory items</li>
                                    <li>• All bills and invoices</li>
                                    <li>• All work orders</li>
                                    <li>• All services</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Password Verification */
                        <div className="p-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center mb-6">
                                Verify Your Password
                            </h3>

                            {/* Password Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50"
                                    placeholder="Enter your password"
                                    autoFocus
                                />
                                {verifying && (
                                    <p className="text-sm text-gray-500 mt-1">Verifying...</p>
                                )}
                                {passwordError && !verifying && (
                                    <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                                )}
                                {passwordValid && !verifying && (
                                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        Password verified
                                    </p>
                                )}
                            </div>

                            {/* Confirmation Checkbox */}
                            {passwordValid && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="confirm"
                                            checked={confirmChecked}
                                            onChange={(e) => setConfirmChecked(e.target.checked)}
                                            disabled={loading}
                                            className="w-5 h-5 mt-0.5 text-red-600 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        />
                                        <label htmlFor="confirm" className="text-sm text-gray-700 cursor-pointer">
                                            Yes, I understand my account will be <strong>permanently deleted</strong> and this action cannot be undone.
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={() => setStep(2)}
                            disabled={countdown > 0}
                            className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                        >
                            {countdown > 0 ? `OK (${countdown})` : 'OK'}
                        </button>
                    ) : (
                        <button
                            onClick={handleDeleteAccount}
                            disabled={!passwordValid || !confirmChecked || loading}
                            className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/30"
                        >
                            {loading ? 'Deleting...' : 'Remove Account'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
