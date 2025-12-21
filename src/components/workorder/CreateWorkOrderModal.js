import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, User, Clock, FileText, ChevronRight, UserPlus } from 'lucide-react';
import SummaryApi from '../../common';
import { getWorkOrdersDao } from '../../storage/dao/workOrdersDao';
import { pushWorkOrders } from '../../storage/sync/pushWorkOrders';
import { useSync } from '../../context/SyncContext';
import { apiClient } from '../../utils/apiClient';
import { Capacitor } from '@capacitor/core';
import DatePicker from '../common/DatePicker';
import Toast from '../common/Toast';
import AddCustomerModal from '../customer/AddCustomerModal';

const CreateWorkOrderModal = ({ isOpen, onClose, preSelectedCustomer, onSuccess, redirectAfterCreate }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Customer, 2: Schedule, 3: Confirm
    const [loading, setLoading] = useState(false);
    const { notifyLocalSave, bumpDataVersion } = useSync();

    // Customer search
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Contacts integration
    const [contactsList, setContactsList] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactPickerSupported, setContactPickerSupported] = useState(false);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [creatingCustomerFromContact, setCreatingCustomerFromContact] = useState(false);

    // Form data
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [note, setNote] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [hasScheduledTime, setHasScheduledTime] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('');

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Get current time in HH:MM format
    const getCurrentTime = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Convert 24-hour time to 12-hour format with AM/PM
    const formatTimeForDisplay = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    // Reset form
    const resetForm = () => {
        setStep(preSelectedCustomer ? 2 : 1);
        setSelectedCustomer(preSelectedCustomer || null);
        setNote('');
        setScheduleDate(getTodayDate());
        setHasScheduledTime(false);
        setScheduleTime(getCurrentTime());
        setSearchQuery('');
        setCustomers([]);
        setContactsList([]);
        setShowToast(false);
        setToastMessage('');
    };

    // Check Contact Picker API support
    useEffect(() => {
        if ('contacts' in navigator && 'ContactsManager' in window) {
            setContactPickerSupported(true);
        } else if (Capacitor.isNativePlatform()) {
            setContactPickerSupported(true);
        }
    }, []);

    // Initialize when modal opens
    useEffect(() => {
        if (isOpen) {
            resetForm();
            if (!preSelectedCustomer) {
                fetchCustomers();
                loadContacts();
            }
        }
    }, [isOpen, preSelectedCustomer]);

    // Handle ESC key
    const handleEscKey = useCallback((e) => {
        if (e.key === 'Escape') {
            if (step === 1 || (step === 2 && preSelectedCustomer)) {
                onClose();
            } else {
                handleBack();
            }
        }
    }, [step, preSelectedCustomer, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            return () => document.removeEventListener('keydown', handleEscKey);
        }
    }, [isOpen, handleEscKey]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: true }, '');
            const handlePopState = () => {
                if (step === 1 || (step === 2 && preSelectedCustomer)) {
                    onClose();
                } else {
                    handleBack();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, step, preSelectedCustomer, onClose]);

    // Fetch customers
    const fetchCustomers = async (query = '') => {
        setSearchLoading(true);
        try {
            // First load from local cache for instant display
            const { getCustomersDao } = await import('../../storage/dao/customersDao');
            const dao = await getCustomersDao();
            const localList = await dao.list({ search: query, limit: 200, offset: 0 });
            const mappedLocal = localList.map(c => ({
                _id: c.id,
                customerName: c.customer_name,
                phoneNumber: c.phone_number,
                whatsappNumber: c.whatsapp_number,
                address: c.address
            }));
            setCustomers(mappedLocal);

            // Then refresh from backend in background
            const url = query
                ? `${SummaryApi.searchCustomers.url}?q=${encodeURIComponent(query)}`
                : SummaryApi.getAllCustomers.url;

            const response = await apiClient(url, {
                method: 'GET'
            });
            const data = await response.json();
            if (data.success) {
                setCustomers(data.customers || mappedLocal);
            }
        } catch (error) {
            console.error('Fetch customers error:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Search customers with debounce
    useEffect(() => {
        if (step === 1) {
            const timer = setTimeout(() => {
                fetchCustomers(searchQuery);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, step]);

    // Load contacts from phone (only on native platforms)
    const loadContacts = async () => {
        // Only load contacts automatically on native platforms
        // Web Contact Picker API requires explicit user interaction
        if (!Capacitor.isNativePlatform()) return;

        try {
            const { Contacts } = await import('@capacitor-community/contacts');

            // Check permissions
            const permStatus = await Contacts.checkPermissions();
            if (permStatus?.contacts !== 'granted') {
                const req = await Contacts.requestPermissions();
                if (req?.contacts !== 'granted') {
                    console.warn('Contacts permission denied');
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
                .sort((a, b) => {
                    // Sort alphabetically by name (case-insensitive)
                    const nameA = (a.name || a.phone || '').toLowerCase();
                    const nameB = (b.name || b.phone || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            setContactsList(list);
            setContactsLoading(false);
        } catch (error) {
            console.error('Load contacts error:', error);
            setContactsLoading(false);
        }
    };

    // Auto-create customer from contact
    const createCustomerFromContact = async (contact) => {
        if (!navigator.onLine) {
            alert('You must be online to create customers from contacts');
            return null;
        }

        setCreatingCustomerFromContact(true);
        try {
            const { pushCustomers } = await import('../../storage/sync/pushCustomers');
            const { getCustomersDao } = await import('../../storage/dao/customersDao');

            const payload = {
                customerName: contact.name || contact.phone,
                phoneNumber: contact.phone,
                whatsappNumber: '',
                address: ''
            };

            const response = await pushCustomers({ directCreate: payload });
            const created = response?.createdCustomer;

            if (!created?._id) {
                throw new Error('Failed to create customer on server');
            }

            // Save to local DB
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

            const newCustomer = {
                _id: created._id,
                customerName: created.customerName,
                phoneNumber: created.phoneNumber,
                whatsappNumber: created.whatsappNumber || '',
                address: created.address || ''
            };

            // Add to customers list
            setCustomers(prev => [newCustomer, ...prev]);
            notifyLocalSave();
            bumpDataVersion();

            return newCustomer;
        } catch (error) {
            console.error('Create customer from contact error:', error);
            alert('Failed to create customer from contact');
            return null;
        } finally {
            setCreatingCustomerFromContact(false);
        }
    };

    // Navigation
    const handleBack = () => {
        if (step > 1) {
            if (step === 2 && preSelectedCustomer) {
                onClose();
            } else {
                setStep(prev => prev - 1);
            }
        }
    };

    const handleNext = () => {
        // Validate note
        if (!note.trim()) {
            alert('Please enter work note');
            return;
        }
        // Validate date
        if (!scheduleDate) {
            alert('Please select schedule date');
            return;
        }
        // Validate time if enabled
        if (hasScheduledTime && !scheduleTime) {
            alert('Please set schedule time');
            return;
        }
        setStep(3);  // Go to confirm
    };

    // Handle customer selection
    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setStep(2);
    };

    // Handle contact selection
    const handleSelectContact = async (contact) => {
        // Check if contact already exists as customer (by phone)
        const existingCustomer = customers.find(c => c.phoneNumber === contact.phone);

        if (existingCustomer) {
            // Contact already exists as customer, select it
            setSelectedCustomer(existingCustomer);
            setStep(2);
        } else {
            // Create new customer from contact
            const newCustomer = await createCustomerFromContact(contact);
            if (newCustomer) {
                setSelectedCustomer(newCustomer);
                setStep(2);
            }
        }
    };

    // Handle add customer success from modal
    const handleAddCustomerSuccess = (customer) => {
        setCustomers(prev => [customer, ...prev]);
        setSelectedCustomer(customer);
        setShowAddCustomerModal(false);
        setStep(2);
    };

    // Create work order
    const handleCreate = async () => {
        if (!selectedCustomer || !note.trim() || !scheduleDate) {
            alert('Please fill all required fields');
            return;
        }

        if (hasScheduledTime && !scheduleTime) {
            alert('Please set schedule time');
            return;
        }

        setLoading(true);
        try {
            const clientId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `wo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const now = new Date().toISOString();
            const local = {
                id: clientId,
                client_id: clientId,
                customer_id: selectedCustomer._id || selectedCustomer.id,
                work_order_number: '',
                note: note.trim(),
                schedule_date: scheduleDate,
                has_scheduled_time: hasScheduledTime,
                schedule_time: hasScheduledTime ? formatTimeForDisplay(scheduleTime) : '',
                status: 'pending',
                completed_at: null,
                notification_sent: 0,
                bill_id: null,
                created_by: null,
                deleted: 0,
                updated_at: now,
                created_at: now,
                pending_sync: 1,
                sync_op: 'create',
                sync_error: null
            };

            const dao = await getWorkOrdersDao();
            await dao.insertLocal(local);

            const mappedForUI = {
                _id: local.id,
                workOrderNumber: local.work_order_number,
                note: local.note,
                scheduleDate: local.schedule_date,
                hasScheduledTime: local.has_scheduled_time,
                scheduleTime: local.schedule_time,
                status: local.status,
                completedAt: local.completed_at,
                billId: local.bill_id,
                pendingSync: true,
                syncError: null,
                customer: selectedCustomer
            };

            if (onSuccess) {
                onSuccess(mappedForUI);
            }

            setToastMessage(`Work Order created locally. Syncing...`);
            setShowToast(true);
            notifyLocalSave();
            bumpDataVersion();
            onClose();
            if (redirectAfterCreate) {
                navigate('/workorders');
            }
            // Attempt push in background
            pushWorkOrders().catch(() => {});
        } catch (error) {
            console.error('Create work order (local) error:', error);
            alert('Failed to create work order');
        } finally {
            setLoading(false);
        }
    };

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            if (step === 1 || (step === 2 && preSelectedCustomer)) {
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <>
        <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div
                className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col modal-shell"
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b flex-shrink-0 safe-area-top">
                    {step > 1 && !(step === 2 && preSelectedCustomer) && (
                        <button
                            onClick={handleBack}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
                        </button>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">
                        {step === 1 && 'Select Customer'}
                        {step === 2 && 'Schedule Work Order'}
                        {step === 3 && 'Confirm Work Order'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-body">
                    {/* Step 1: Select Customer or Contact */}
                    {step === 1 && (
                        <div className="p-4">
                            {/* Search with Add Button */}
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search customers or contacts..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowAddCustomerModal(true)}
                                    className="w-12 h-12 bg-primary-500 text-white rounded-xl flex items-center justify-center hover:bg-primary-600 transition-colors flex-shrink-0"
                                    title="Add Customer"
                                >
                                    <UserPlus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Loading State */}
                            {(searchLoading || contactsLoading || creatingCustomerFromContact) && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                    {creatingCustomerFromContact && (
                                        <p className="ml-2 text-sm text-gray-600">Creating customer...</p>
                                    )}
                                </div>
                            )}

                            {/* Filter customers and contacts based on search */}
                            {!searchLoading && !contactsLoading && !creatingCustomerFromContact && (() => {
                                const query = searchQuery.toLowerCase();
                                const filteredCustomers = customers.filter(c =>
                                    c.customerName.toLowerCase().includes(query) ||
                                    c.phoneNumber.includes(query)
                                ).sort((a, b) => {
                                    // Sort alphabetically by name (case-insensitive)
                                    const nameA = (a.customerName || '').toLowerCase();
                                    const nameB = (b.customerName || '').toLowerCase();
                                    return nameA.localeCompare(nameB);
                                });
                                const filteredContacts = contactsList.filter(c =>
                                    (c.name && c.name.toLowerCase().includes(query)) ||
                                    (c.phone && c.phone.includes(query))
                                ).filter(contact => {
                                    // Exclude contacts that already exist as customers
                                    return !customers.some(customer => customer.phoneNumber === contact.phone);
                                }).sort((a, b) => {
                                    // Sort alphabetically by name (case-insensitive)
                                    const nameA = (a.name || a.phone || '').toLowerCase();
                                    const nameB = (b.name || b.phone || '').toLowerCase();
                                    return nameA.localeCompare(nameB);
                                });

                                return (
                                    <>
                                        {/* Customers Section */}
                                        {filteredCustomers.length > 0 && (
                                            <div className="mb-6">
                                                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">
                                                    Customers
                                                </h3>
                                                <div className="space-y-2">
                                                    {filteredCustomers.map(customer => (
                                                        <button
                                                            key={customer._id}
                                                            onClick={() => handleSelectCustomer(customer)}
                                                            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left transition-colors"
                                                        >
                                                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                                <User className="w-5 h-5 text-primary-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-800">{customer.customerName}</p>
                                                                <p className="text-sm text-gray-500">{customer.phoneNumber}</p>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Contacts Section */}
                                        {filteredContacts.length > 0 && (
                                            <div className="mb-6">
                                                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">
                                                    Contacts
                                                </h3>
                                                <div className="space-y-2">
                                                    {filteredContacts.map((contact, idx) => (
                                                        <button
                                                            key={`${contact.phone}-${idx}`}
                                                            onClick={() => handleSelectContact(contact)}
                                                            className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 text-left transition-colors"
                                                        >
                                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                                <User className="w-5 h-5 text-green-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-800">{contact.name || 'Unnamed'}</p>
                                                                <p className="text-sm text-gray-500">{contact.phone}</p>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty State */}
                                        {filteredCustomers.length === 0 && filteredContacts.length === 0 && (
                                            <div className="text-center py-8">
                                                <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                <p className="text-gray-500 text-sm">
                                                    {searchQuery ? 'No customers or contacts found' : 'No customers or contacts available'}
                                                </p>
                                                <button
                                                    onClick={() => setShowAddCustomerModal(true)}
                                                    className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                                                >
                                                    Add Customer
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Step 2: Schedule */}
                    {step === 2 && (
                        <div className="p-4">
                            {/* Customer Summary */}
                            {selectedCustomer && (
                                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl mb-4">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{selectedCustomer.customerName}</p>
                                        <p className="text-sm text-gray-500">{selectedCustomer.phoneNumber}</p>
                                    </div>
                                </div>
                            )}

                            {/* Note (Mandatory) */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Work Note *
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={3}
                                    placeholder="e.g., CCTV Camera Installation..."
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Schedule Date *
                                </label>
                                <DatePicker
                                    value={scheduleDate}
                                    onChange={setScheduleDate}
                                    minDate={getTodayDate()}
                                    placeholder="Select schedule date"
                                />
                            </div>

                            {/* Time Checkbox */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasScheduledTime}
                                        onChange={(e) => setHasScheduledTime(e.target.checked)}
                                        className="w-5 h-5 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Set specific time</span>
                                </label>
                            </div>

                            {/* Time Input (Conditional) */}
                            {hasScheduledTime && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Schedule Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                    />
                                    {scheduleTime && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Selected: {formatTimeForDisplay(scheduleTime)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                        <div className="p-4">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Customer</p>
                                    <p className="font-semibold text-gray-800">{selectedCustomer?.customerName}</p>
                                    <p className="text-sm text-gray-500">{selectedCustomer?.phoneNumber}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase">Work Note</p>
                                    <p className="text-gray-800">{note}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-500 uppercase">Scheduled</p>
                                    <p className="font-semibold text-gray-800">{formatDate(scheduleDate)}</p>
                                    {hasScheduledTime && scheduleTime && (
                                        <p className="text-sm text-primary-600">{formatTimeForDisplay(scheduleTime)}</p>
                                    )}
                                    {!hasScheduledTime && (
                                        <p className="text-xs text-gray-500 italic">No specific time</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div className="p-4 border-t flex-shrink-0 modal-footer-safe">
                        <button
                            onClick={handleNext}
                            disabled={!note.trim() || !scheduleDate || (hasScheduledTime && !scheduleTime)}
                            className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="p-4 border-t flex-shrink-0 modal-footer-safe">
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Work Order'}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
            <Toast
                message={toastMessage}
                type="success"
                onClose={() => setShowToast(false)}
                duration={2000}
            />
        )}

        {/* Add Customer Modal */}
        <AddCustomerModal
            isOpen={showAddCustomerModal}
            onClose={() => setShowAddCustomerModal(false)}
            onSuccess={handleAddCustomerSuccess}
        />
        </>
    );
};

export default CreateWorkOrderModal;
