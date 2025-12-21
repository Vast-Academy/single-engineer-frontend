import { useState, useEffect, useCallback } from 'react';
import { X, Phone, MessageCircle, MapPin } from 'lucide-react';
import { getCustomersDao } from '../../storage/dao/customersDao';
import { pushCustomers } from '../../storage/sync/pushCustomers';
import { useSync } from '../../context/SyncContext';

const EditCustomerModal = ({ isOpen, onClose, customer, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumber: '',
        whatsappNumber: '',
        address: ''
    });
    const [sameAsPhone, setSameAsPhone] = useState(false);
    const { notifyLocalSave } = useSync();

    // Handle ESC key press
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

    // Set form data when customer changes
    useEffect(() => {
        if (customer) {
            setFormData({
                customerName: customer.customerName || '',
                phoneNumber: customer.phoneNumber || '',
                whatsappNumber: customer.whatsappNumber || '',
                address: customer.address || ''
            });
            setSameAsPhone(customer.phoneNumber === customer.whatsappNumber);
        }
    }, [customer, isOpen]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle same as phone checkbox
    const handleSameAsPhone = (e) => {
        const checked = e.target.checked;
        setSameAsPhone(checked);
        if (checked) {
            setFormData(prev => ({
                ...prev,
                whatsappNumber: prev.phoneNumber
            }));
        }
    };

    // Update whatsapp when phone changes and checkbox is checked
    useEffect(() => {
        if (sameAsPhone) {
            setFormData(prev => ({
                ...prev,
                whatsappNumber: prev.phoneNumber
            }));
        }
    }, [formData.phoneNumber, sameAsPhone]);

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customerName.trim() || !formData.phoneNumber.trim()) {
            alert('Customer name and phone number are required');
            return;
        }

        setLoading(true);

        try {
            const dao = await getCustomersDao();
            const localId = customer._id || customer.id;
            await dao.markPendingUpdate(localId, {
                customer_name: formData.customerName.trim(),
                phone_number: formData.phoneNumber.trim(),
                whatsapp_number: formData.whatsappNumber.trim(),
                address: formData.address.trim()
            });

            onSuccess({
                ...customer,
                customerName: formData.customerName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                whatsappNumber: formData.whatsappNumber.trim(),
                address: formData.address.trim()
            });
            onClose();

            // Attempt push in background
            pushCustomers().catch(() => {});
            notifyLocalSave();
        } catch (error) {
            console.error('Update customer (local) error:', error);
            alert('Failed to update customer');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--app-safe-area-bottom, 0px))' }}
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden modal-shell flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">{customer.customerName}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Customer Details Form */}
                    <form onSubmit={handleSubmit} className="p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Customer Details</p>

                        {/* Customer Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                placeholder="Enter customer name"
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                placeholder="Enter phone number"
                            />
                        </div>

                        {/* WhatsApp Number */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MessageCircle className="w-4 h-4 inline mr-1 text-green-600" />
                                WhatsApp Number
                            </label>
                            <input
                                type="tel"
                                name="whatsappNumber"
                                value={formData.whatsappNumber}
                                onChange={handleChange}
                                disabled={sameAsPhone}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 disabled:bg-gray-100"
                                placeholder="Enter WhatsApp number"
                            />
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sameAsPhone}
                                    onChange={handleSameAsPhone}
                                    className="w-4 h-4 text-primary-500 rounded"
                                />
                                <span className="text-sm text-gray-600">Same as phone number</span>
                            </label>
                        </div>

                        {/* Address */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                Address
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows={2}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                                placeholder="Enter address (optional)"
                            />
                        </div>
                    </form>
                </div>

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
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditCustomerModal;
