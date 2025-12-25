import { useState, useEffect } from 'react';
import { Building2, User, MapPin, X, CheckCircle, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SummaryApi from '../../common';
import { apiClient } from '../../utils/apiClient';

const BusinessProfileModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, refreshUser } = useAuth();
    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        address: '',
        state: '',
        city: '',
        pincode: '',
        phone: '',
        hidePhoneOnBills: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Pre-fill form if business profile exists
    useEffect(() => {
        if (isOpen) {
            setFormData({
                businessName: user?.businessProfile?.businessName || '',
                ownerName: user?.businessProfile?.ownerName || user?.displayName || '',
                address: user?.businessProfile?.address || '',
                state: user?.businessProfile?.state || '',
                city: user?.businessProfile?.city || '',
                pincode: user?.businessProfile?.pincode || '',
                phone: user?.businessProfile?.phone || '',
                hidePhoneOnBills: user?.businessProfile?.hidePhoneOnBills || false
            });
        }
    }, [isOpen, user]);

    // Handle ESC and back button
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
            setFormData({
                businessName: '',
                ownerName: '',
                address: '',
                state: '',
                city: '',
                pincode: '',
                phone: '',
                hidePhoneOnBills: false
            });
            setError('');
            setSuccess(false);
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.businessName.trim() || !formData.ownerName.trim() ||
            !formData.address.trim() || !formData.state.trim() ||
            !formData.city.trim() || !formData.pincode.trim() || !formData.phone.trim()) {
            setError('All fields are required');
            return;
        }

        // Validate pincode (6 digits)
        if (!/^\d{6}$/.test(formData.pincode.trim())) {
            setError('Pincode must be exactly 6 digits');
            return;
        }

        // Validate phone (10 digits)
        const cleanPhone = formData.phone.trim().replace(/[\s\-\+\(\)]/g, '');
        if (!/^\d{10}$/.test(cleanPhone)) {
            setError('Phone must be exactly 10 digits');
            return;
        }

        setLoading(true);

        try {
            const response = await apiClient(SummaryApi.updateBusinessProfile.url, {
                method: SummaryApi.updateBusinessProfile.method,
                body: JSON.stringify({
                    businessName: formData.businessName.trim(),
                    ownerName: formData.ownerName.trim(),
                    address: formData.address.trim(),
                    state: formData.state.trim(),
                    city: formData.city.trim(),
                    pincode: formData.pincode.trim(),
                    phone: formData.phone.trim(),
                    hidePhoneOnBills: formData.hidePhoneOnBills
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(true);
                // Refresh user data to get updated business profile
                await refreshUser();

                setTimeout(() => {
                    handleClose();
                    if (onSuccess) onSuccess();
                }, 1500);
            } else {
                setError(data.message || 'Failed to update business profile. Please try again.');
            }
        } catch (err) {
            console.error('Business profile update error:', err);
            setError('Failed to update business profile. Please try again.');
        }

        setLoading(false);
    };

    if (!isOpen) return null;

    // Success screen
    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-8 text-center animate-slide-up">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Business Profile Updated!
                    </h3>
                    <p className="text-sm text-slate-600">
                        Your business information has been saved successfully
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col modal-shell"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">
                        Complete Business Profile
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
                        {/* Info Note */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <p className="text-xs text-blue-800 text-center">
                                ℹ️ This information will be shown on your bills
                            </p>
                        </div>

                        {/* Business Name */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Business Name
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    placeholder="Enter your business name"
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Owner Name */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Owner Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={formData.ownerName}
                                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                                    placeholder="Enter owner's name"
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Address
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Enter complete address"
                                    disabled={loading}
                                    rows={2}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                                />
                            </div>
                        </div>

                        {/* State and City (side by side) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    State
                                </label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="Enter state"
                                    disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Enter city"
                                    disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Pincode */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Pincode
                            </label>
                            <input
                                type="text"
                                value={formData.pincode}
                                onChange={(e) => {
                                    // Only allow digits and max 6 characters
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setFormData({ ...formData, pincode: value });
                                }}
                                placeholder="Enter 6-digit pincode"
                                disabled={loading}
                                maxLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Phone Number
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="hidePhone"
                                        checked={formData.hidePhoneOnBills}
                                        onChange={(e) => setFormData({ ...formData, hidePhoneOnBills: e.target.checked })}
                                        disabled={loading}
                                        className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="hidePhone" className="text-xs text-slate-600 cursor-pointer">
                                        Hide on bills
                                    </label>
                                </div>
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        // Only allow digits, spaces, dashes, parentheses, and + sign
                                        const value = e.target.value.replace(/[^\d\s\-\+\(\)]/g, '');
                                        setFormData({ ...formData, phone: value });
                                    }}
                                    placeholder="Enter 10-digit phone number"
                                    disabled={loading}
                                    maxLength={15}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
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
                    <div className="p-4 border-t border-gray-200 flex gap-2 flex-shrink-0 modal-footer-safe">
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
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BusinessProfileModal;
