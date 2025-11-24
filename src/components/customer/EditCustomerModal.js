import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, MessageCircle, MapPin, Trash2, Receipt, FileText, Wrench } from 'lucide-react';
import SummaryApi from '../../common';

const EditCustomerModal = ({ isOpen, onClose, customer, onSuccess, onDelete, onCreateBill, onCreateWorkorder }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumber: '',
        whatsappNumber: '',
        address: ''
    });
    const [sameAsPhone, setSameAsPhone] = useState(false);

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
            const response = await fetch(`${SummaryApi.updateCustomer.url}/${customer._id}`, {
                method: 'PUT',
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
                alert(data.message || 'Failed to update customer');
            }
        } catch (error) {
            console.error('Update customer error:', error);
            alert('Failed to update customer');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete
    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${customer.customerName}"?`)) {
            onDelete(customer);
            onClose();
        }
    };

    // Navigate to bills
    const handleViewBills = () => {
        navigate(`/customer/${customer._id}/bills`, {
            state: { customer },
            replace: true
        });
        onClose();
    };

    if (!isOpen || !customer) return null;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-40 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden">
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

                <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
                    {/* Quick Actions */}
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Quick Actions</p>
                        <div className="grid grid-cols-3 gap-3">
                            {/* View Bills */}
                            <button
                                onClick={handleViewBills}
                                className="flex flex-col items-center gap-2 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                            >
                                <Receipt className="w-6 h-6 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">View Bills</span>
                            </button>

                            {/* New Bill */}
                            <button
                                onClick={() => {
                                    onCreateBill(customer);
                                    onClose();
                                }}
                                className="flex flex-col items-center gap-2 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                            >
                                <FileText className="w-6 h-6 text-green-600" />
                                <span className="text-xs font-medium text-green-700">New Bill</span>
                            </button>

                            {/* Workorder */}
                            <button
                                onClick={() => {
                                    onCreateWorkorder(customer);
                                    onClose();
                                }}
                                className="flex flex-col items-center gap-2 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                            >
                                <Wrench className="w-6 h-6 text-orange-600" />
                                <span className="text-xs font-medium text-orange-700">Workorder</span>
                            </button>
                        </div>
                    </div>

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

                        {/* Delete Button */}
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Customer
                        </button>
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
