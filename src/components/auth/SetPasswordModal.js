import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';

const SetPasswordModal = ({ isOpen, onClose, onSuccess, isChangingPassword = false }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        password: '',
        confirmPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Current password verification states
    const [isVerifyingCurrentPassword, setIsVerifyingCurrentPassword] = useState(false);
    const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
    const [currentPasswordError, setCurrentPasswordError] = useState('');

    // Confirm password validation state
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    // Forgot password modal state
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const { setUserPassword, verifyCurrentPassword, user } = useAuth();
    const verificationTimeoutRef = useRef(null);

    // Determine if we should show current password field
    const shouldShowCurrentPassword = user?.isPasswordSet === true;

    // Calculate password strength
    const getPasswordStrength = (password) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 6) return { strength: 33, label: 'Weak', color: 'bg-red-500' };
        if (password.length <= 10) return { strength: 66, label: 'Medium', color: 'bg-orange-500' };
        return { strength: 100, label: 'Strong', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    // Get border color for current password field
    const getCurrentPasswordBorderColor = () => {
        if (!formData.currentPassword) return 'border-gray-300';
        if (isVerifyingCurrentPassword) return 'border-blue-400';
        if (currentPasswordError) return 'border-red-500';
        if (isCurrentPasswordVerified) return 'border-green-500';
        return 'border-gray-300';
    };

    // Get border color for confirm password field
    const getConfirmPasswordBorderColor = () => {
        if (!formData.confirmPassword) return 'border-gray-300';
        if (confirmPasswordError) return 'border-red-500';
        if (formData.confirmPassword && formData.password === formData.confirmPassword) return 'border-green-500';
        return 'border-gray-300';
    };

    // Debounced current password verification
    useEffect(() => {
        if (!shouldShowCurrentPassword || !formData.currentPassword) {
            setIsCurrentPasswordVerified(false);
            setCurrentPasswordError('');
            return;
        }

        // Clear previous timeout
        if (verificationTimeoutRef.current) {
            clearTimeout(verificationTimeoutRef.current);
        }

        // Set new timeout for verification (500ms debounce)
        verificationTimeoutRef.current = setTimeout(async () => {
            setIsVerifyingCurrentPassword(true);
            setCurrentPasswordError('');

            const result = await verifyCurrentPassword(formData.currentPassword);

            setIsVerifyingCurrentPassword(false);

            if (result.success) {
                setIsCurrentPasswordVerified(true);
                setCurrentPasswordError('');
            } else {
                setIsCurrentPasswordVerified(false);
                setCurrentPasswordError('Wrong password');
            }
        }, 500);

        return () => {
            if (verificationTimeoutRef.current) {
                clearTimeout(verificationTimeoutRef.current);
            }
        };
    }, [formData.currentPassword, shouldShowCurrentPassword, verifyCurrentPassword]);

    // Real-time confirm password validation
    useEffect(() => {
        if (!formData.confirmPassword) {
            setConfirmPasswordError('');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
        } else {
            setConfirmPasswordError('');
        }
    }, [formData.password, formData.confirmPassword]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                handleClose();
            }
        };

        const handleBackButton = () => {
            if (isOpen && !loading) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            window.addEventListener('popstate', handleBackButton);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('popstate', handleBackButton);
        };
    }, [isOpen, loading]);

    const handleClose = () => {
        if (!loading) {
            setFormData({ currentPassword: '', password: '', confirmPassword: '' });
            setError('');
            setSuccess(false);
            setShowCurrentPassword(false);
            setShowPassword(false);
            setShowConfirmPassword(false);
            setIsCurrentPasswordVerified(false);
            setCurrentPasswordError('');
            setConfirmPasswordError('');
            onClose();
        }
    };

    const handleForgotPassword = () => {
        setShowForgotPassword(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation for current password (if changing password)
        if (shouldShowCurrentPassword) {
            if (!formData.currentPassword) {
                setError('Please enter your current password');
                return;
            }
            if (!isCurrentPasswordVerified) {
                setError('Current password is incorrect');
                return;
            }
        }

        // Validation for new password
        if (!formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        // Call setUserPassword with currentPassword if changing password
        const result = shouldShowCurrentPassword
            ? await setUserPassword(formData.password, formData.confirmPassword, formData.currentPassword)
            : await setUserPassword(formData.password, formData.confirmPassword);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                handleClose();
                if (onSuccess) onSuccess();
            }, 1500);
        } else {
            setError(result.error || 'Failed to set password. Please try again.');
        }

        setLoading(false);
    };

    if (!isOpen) return null;

    // Success screen
    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-8 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Password {shouldShowCurrentPassword ? 'Changed' : 'Set'} Successfully!
                    </h3>
                    <p className="text-sm text-slate-600">
                        {shouldShowCurrentPassword
                            ? 'Your password has been updated successfully'
                            : 'You can now login using your email and password'
                        }
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col modal-shell"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">
                        {shouldShowCurrentPassword ? 'Change Password' : 'Set Password'}
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="p-4 space-y-4">
                        {/* Current Password Field - Only show when changing password */}
                        {shouldShowCurrentPassword && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={formData.currentPassword}
                                        onChange={(e) => {
                                            setFormData({ ...formData, currentPassword: e.target.value });
                                            // Clear error states when user is actively typing
                                            setIsCurrentPasswordVerified(false);
                                            setCurrentPasswordError('');
                                        }}
                                        placeholder="Enter your current password"
                                        disabled={loading}
                                        className={`w-full pl-10 pr-10 py-3 border ${getCurrentPasswordBorderColor()} rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        disabled={loading}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Current password status message */}
                                {isVerifyingCurrentPassword && (
                                    <p className="text-xs text-blue-600 mt-1">Verifying...</p>
                                )}
                                {currentPasswordError && (
                                    <p className="text-xs text-red-600 mt-1">{currentPasswordError}</p>
                                )}
                                {isCurrentPasswordVerified && (
                                    <p className="text-xs text-green-600 mt-1">Password verified</p>
                                )}
                            </div>
                        )}

                        {/* New Password Field */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                {shouldShowCurrentPassword ? 'New Password' : 'Password'}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter password (min 6 characters)"
                                    disabled={loading || (shouldShowCurrentPassword && !isCurrentPasswordVerified)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading || (shouldShowCurrentPassword && !isCurrentPasswordVerified)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-600">Password Strength:</span>
                                        <span className={`text-xs font-semibold ${
                                            passwordStrength.label === 'Weak' ? 'text-red-600' :
                                            passwordStrength.label === 'Medium' ? 'text-orange-600' :
                                            'text-green-600'
                                        }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                            style={{ width: `${passwordStrength.strength}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Re-enter password"
                                    disabled={loading || (shouldShowCurrentPassword && !isCurrentPasswordVerified)}
                                    className={`w-full pl-10 pr-10 py-3 border ${getConfirmPasswordBorderColor()} rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={loading || (shouldShowCurrentPassword && !isCurrentPasswordVerified)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Confirm password validation message */}
                            {confirmPasswordError && (
                                <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>
                            )}
                            {formData.confirmPassword && !confirmPasswordError && (
                                <p className="text-xs text-green-600 mt-1">Passwords match</p>
                            )}
                        </div>

                        {/* Forgot Password Button */}
                        {shouldShowCurrentPassword && (
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-xs text-center">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 flex gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                        >
                            {loading ? 'Setting...' : shouldShowCurrentPassword ? 'Change Password' : 'Set Password'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
                onSuccess={handleClose}
                userEmail={user?.email}
            />
        </div>
    );
};

export default SetPasswordModal;
