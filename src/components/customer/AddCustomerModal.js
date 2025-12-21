import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, Phone, MessageCircle, MapPin, ChevronRight, Search, Edit3 } from 'lucide-react';
import { getCustomersDao } from '../../storage/dao/customersDao';
import { pushCustomers } from '../../storage/sync/pushCustomers';
import { useSync } from '../../context/SyncContext';
import { Capacitor } from '@capacitor/core';

const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { notifyLocalSave } = useSync();
    const [contactPickerSupported, setContactPickerSupported] = useState(false);
    const [mode, setMode] = useState('contacts'); // 'contacts' or 'manual'
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumber: '',
        whatsappNumber: '',
        address: ''
    });
    const [sameAsPhone, setSameAsPhone] = useState(false);
    const [contactsList, setContactsList] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactSearch, setContactSearch] = useState('');

    // Check Contact Picker API support
    useEffect(() => {
        if ('contacts' in navigator && 'ContactsManager' in window) {
            setContactPickerSupported(true);
        } else if (Capacitor.isNativePlatform()) {
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

    // Reset and auto-fetch contacts when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                customerName: '',
                phoneNumber: '',
                whatsappNumber: '',
                address: ''
            });
            setSameAsPhone(false);
            setContactSearch('');
            setContactsList([]);

            // Auto-fetch contacts if supported
            if (contactPickerSupported) {
                setMode('contacts');
                handlePickContact();
            } else {
                // If not supported, go to manual mode
                setMode('manual');
            }
        }
    }, [isOpen, contactPickerSupported]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Pick contact from phone
    const handlePickContact = async () => {
        try {
            // Native (Capacitor) path
            if (Capacitor.isNativePlatform()) {
                const { Contacts } = await import('@capacitor-community/contacts');

                // Permissions
                const permStatus = await Contacts.checkPermissions();
                if (permStatus?.contacts !== 'granted') {
                    const req = await Contacts.requestPermissions();
                    if (req?.contacts !== 'granted') {
                        console.warn('Contacts permission denied');
                        setMode('manual');
                        return;
                    }
                }

                setContactsLoading(true);
                const result = await Contacts.getContacts({
                    projection: {
                        name: true,
                        phones: true
                    }
                });
                const list = (result?.contacts || [])
                    .map(c => {
                        const rawName = c.displayName || c.name?.[0] || c.name || '';
                        const name = typeof rawName === 'string' ? rawName : (rawName.display || rawName.given || '');
                        const phone = (c.phoneNumbers || c.phones || [])
                            .map(p => p.number)
                            .find(Boolean) || '';
                        return { name: name || '', phone };
                    })
                    .filter(c => c.name || c.phone)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort A-Z

                setContactsList(list);
                setContactsLoading(false);
                return;
            }

            // Web Contact Picker API - fetch multiple contacts
            if ('contacts' in navigator && 'ContactsManager' in window) {
                setContactsLoading(true);
                const props = ['name', 'tel'];
                const opts = { multiple: true };
                const contacts = await navigator.contacts.select(props, opts);
                if (contacts && contacts.length > 0) {
                    const list = contacts.map(c => {
                        const rawName = c.name?.[0] || '';
                        const name = typeof rawName === 'string' ? rawName : (rawName.display || rawName.given || '');
                        const phone = c.tel?.[0] || '';
                        return { name: name || '', phone };
                    })
                    .filter(c => c.name || c.phone)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort A-Z

                    setContactsList(list);
                }
                setContactsLoading(false);
            }
        } catch (error) {
            console.error('Contact picker error:', error);
            setContactsLoading(false);
            setMode('manual');
        }
    };

    const handleContactSelect = async (contact) => {
        if (!contact.name || !contact.phone) {
            alert('Contact must have both name and phone number');
            return;
        }

        if (!navigator.onLine) {
            alert('You are offline. New customers can only be added when you are online.');
            return;
        }

        setLoading(true);

        try {
            // Create customer directly
            const payload = {
                customerName: contact.name.trim(),
                phoneNumber: contact.phone.trim(),
                whatsappNumber: contact.phone.trim(), // Same as phone by default
                address: '' // Empty address
            };

            const response = await pushCustomers({ directCreate: payload });
            const created = response?.createdCustomer;

            if (!created?._id) {
                throw new Error('Failed to create customer on server');
            }

            // Save to local DB with real _id
            const dao = await getCustomersDao();
            await dao.upsertOne({
                id: created._id,
                client_id: created._id,
                customer_name: created.customerName,
                phone_number: created.phoneNumber,
                whatsapp_number: created.whatsappNumber || '',
                address: created.address || '',
                created_by: created.createdBy || null,
                deleted: created.deleted || false,
                updated_at: created.updatedAt || created.createdAt || new Date().toISOString(),
                created_at: created.createdAt || new Date().toISOString(),
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            });

            onSuccess({
                _id: created._id,
                customerName: created.customerName,
                phoneNumber: created.phoneNumber,
                whatsappNumber: created.whatsappNumber || '',
                address: created.address || ''
            });
            onClose();
            notifyLocalSave();

            // Navigate to customer bills page
            navigate(`/customer/${created._id}/bills`);
        } catch (error) {
            console.error('Add customer from contact error:', error);
            alert('Failed to add customer. Please try again.');
        } finally {
            setLoading(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customerName.trim() || !formData.phoneNumber.trim()) {
            alert('Customer name and phone number are required');
            return;
        }

        if (!navigator.onLine) {
            alert('You are offline. New customers can only be added when you are online.');
            return;
        }

        setLoading(true);

        try {
            // Online-only: create directly on server
            const payload = {
                customerName: formData.customerName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                whatsappNumber: formData.whatsappNumber.trim(),
                address: formData.address.trim()
            };

            const response = await pushCustomers({ directCreate: payload });
            const created = response?.createdCustomer;

            if (!created?._id) {
                throw new Error('Failed to create customer on server');
            }

            // Save to local DB with real _id
            const dao = await getCustomersDao();
            await dao.upsertOne({
                id: created._id,
                client_id: created._id,
                customer_name: created.customerName,
                phone_number: created.phoneNumber,
                whatsapp_number: created.whatsappNumber || '',
                address: created.address || '',
                created_by: created.createdBy || null,
                deleted: created.deleted || false,
                updated_at: created.updatedAt || created.createdAt || new Date().toISOString(),
                created_at: created.createdAt || new Date().toISOString(),
                pending_sync: 0,
                sync_op: null,
                sync_error: null
            });

            onSuccess({
                _id: created._id,
                customerName: created.customerName,
                phoneNumber: created.phoneNumber,
                whatsappNumber: created.whatsappNumber || '',
                address: created.address || ''
            });
            onClose();
            notifyLocalSave();
        } catch (error) {
            console.error('Add customer (local) error:', error);
            alert('Failed to add customer');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl modal-shell overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {mode === 'contacts' ? 'Select Contact' : 'Add Customer'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Contacts Mode - Search Bar */}
                {mode === 'contacts' && (
                    <div className="p-4 border-b flex-shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={contactSearch}
                                onChange={(e) => setContactSearch(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-primary-500"
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                )}

                {/* Contacts List or Manual Form */}
                {mode === 'contacts' ? (
                    <div className="modal-body overflow-y-auto flex-1">
                        {contactsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : contactsList.filter(c => {
                            const query = contactSearch.toLowerCase();
                            return (c.name?.toLowerCase().includes(query) || c.phone?.includes(query));
                        }).length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <p className="text-gray-500 text-sm mb-4">
                                    {contactSearch ? 'No contacts found matching your search' : 'No contacts found'}
                                </p>
                                <button
                                    onClick={() => setMode('manual')}
                                    className="px-6 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
                                >
                                    Enter Manually
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {contactsList
                                    .filter(c => {
                                        const query = contactSearch.toLowerCase();
                                        return (c.name?.toLowerCase().includes(query) || c.phone?.includes(query));
                                    })
                                    .map((c, idx) => (
                                        <button
                                            key={`${c.name}-${c.phone}-${idx}`}
                                            onClick={() => handleContactSelect(c)}
                                            disabled={loading}
                                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                            {/* Avatar Circle */}
                                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-primary-600 font-bold text-lg">
                                                    {c.name?.charAt(0).toUpperCase() || 'C'}
                                                </span>
                                            </div>

                                            {/* Contact Details */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 truncate">
                                                    {c.name || 'Unnamed'}
                                                </p>
                                                <p className="text-sm text-gray-500">{c.phone}</p>
                                            </div>

                                            {/* Chevron or Loading */}
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Manual Form Mode */
                    <form
                        onSubmit={handleSubmit}
                        className="p-4 modal-body overflow-y-auto flex-1"
                    >
                
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
                )}

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t modal-footer-safe flex-shrink-0">
                    {mode === 'contacts' ? (
                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            disabled={loading}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Edit3 className="w-5 h-5" />
                            Enter Manually
                        </button>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddCustomerModal;
