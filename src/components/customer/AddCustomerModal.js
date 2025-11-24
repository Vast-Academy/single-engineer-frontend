import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Phone, MessageCircle, MapPin } from 'lucide-react';
import SummaryApi from '../../common';

const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [contactPickerSupported, setContactPickerSupported] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumber: '',
        whatsappNumber: '',
        address: ''
    });
    const [sameAsPhone, setSameAsPhone] = useState(false);

    // Check Contact Picker API support
    useEffect(() => {
        if ('contacts' in navigator && 'ContactsManager' in window) {
            setContactPickerSupported(true);
        }
    }, []);

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

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                customerName: '',
                phoneNumber: '',
                whatsappNumber: '',
                address: ''
            });
            setSameAsPhone(false);
        }
    }, [isOpen]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Pick contact from phone
    const handlePickContact = async () => {
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: false };

            const contacts = await navigator.contacts.select(props, opts);

            if (contacts && contacts.length > 0) {
                const contact = contacts[0];
                const name = contact.name?.[0] || '';
                const phone = contact.tel?.[0] || '';

                setFormData(prev => ({
                    ...prev,
                    customerName: name,
                    phoneNumber: phone
                }));
            }
        } catch (error) {
            console.error('Contact picker error:', error);
            // User cancelled or error occurred
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
            const response = await fetch(SummaryApi.addCustomer.url, {
                method: SummaryApi.addCustomer.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    customerName: formData.customerName.trim(),
                    phoneNumber: formData.phoneNumber.trim(),
                    whatsappNumber: formData.whatsappNumber.trim(),
                    address: formData.address.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess(data.customer);
                onClose();
            } else {
                alert(data.message || 'Failed to add customer');
            }
        } catch (error) {
            console.error('Add customer error:', error);
            alert('Failed to add customer');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-40 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">Add Customer</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {/* Contact Picker Button */}
                    {contactPickerSupported && (
                        <button
                            type="button"
                            onClick={handlePickContact}
                            className="w-full mb-4 py-3 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" />
                            Pick from Contacts
                        </button>
                    )}
                    

                    {!contactPickerSupported && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <p className="text-yellow-700 text-sm text-center">
                                Contact Picker not supported. Please enter details manually.
                            </p>
                        </div>
                    )}

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
                            rows={3}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                            placeholder="Enter address (optional)"
                        />
                    </div>
                </form>

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
                        {loading ? 'Adding...' : 'Add Customer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCustomerModal;
