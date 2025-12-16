import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SetPasswordModal = ({ isOpen, onClose, onSuccess, isChangingPassword = false }) => {
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { setUserPassword } = useAuth();

    // Calculate password strength
    const getPasswordStrength = (password) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 6) return { strength: 33, label: 'Weak', color: 'bg-red-500' };
        if (password.length <= 10) return { strength: 66, label: 'Medium', color: 'bg-orange-500' };
        return { strength: 100, label: 'Strong', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength(formData.password);

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
            setFormData({ password: '', confirmPassword: '' });
            setError('');
            setSuccess(false);
            setShowPassword(false);
            setShowConfirmPassword(false);
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
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

        const result = await setUserPassword(formData.password, formData.confirmPassword);

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
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-8 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Password Set Successfully!
                    </h3>
                    <p className="text-sm text-slate-600">
                        You can now login using your email and password
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isChangingPassword ? 'Change Password' : 'Set Password'}
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
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        {/* Password Field */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter password (min 6 characters)"
                                    disabled={loading}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
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
                                    disabled={loading}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={loading}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

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
                            {loading ? 'Setting...' : isChangingPassword ? 'Change Password' : 'Set Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SetPasswordModal;
