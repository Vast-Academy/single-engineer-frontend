import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, MapPin, Trash2, Receipt, FileText, Wrench, IndianRupee } from 'lucide-react';
import CreateBillModal from '../components/bill/CreateBillModal';
import CreateWorkOrderModal from '../components/workorder/CreateWorkOrderModal';
import { SkeletonCustomerDetailPage } from '../components/common/SkeletonLoaders';
import { getCustomersDao } from '../storage/dao/customersDao';
import { pushCustomers } from '../storage/sync/pushCustomers';
import { useSync } from '../context/SyncContext';

const CustomerDetail = () => {
    const navigate = useNavigate();
    const { customerId } = useParams();

    // Customer data - always fetched fresh (no state passing)
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumber: '',
        whatsappNumber: '',
        address: ''
    });
    const [sameAsPhone, setSameAsPhone] = useState(false);

    // Modal states
    const [showBillModal, setShowBillModal] = useState(false);
    const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
    const { notifyLocalSave, dataVersion } = useSync();

    // Always fetch customer data fresh on mount (from SQLite only)
    useEffect(() => {
        if (customerId) {
            fetchCustomer();
        }
    }, [customerId, dataVersion]);

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
    }, [customer]);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const dao = await getCustomersDao();
            const localCustomer = await dao.getById(customerId);

            if (localCustomer) {
                setCustomer({
                    _id: localCustomer.id,
                    customerName: localCustomer.customer_name,
                    phoneNumber: localCustomer.phone_number,
                    whatsappNumber: localCustomer.whatsapp_number,
                    address: localCustomer.address
                });
            } else {
                setCustomer(null);
            }
        } catch (error) {
            console.error('Fetch customer error:', error);
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
            await dao.markPendingUpdate(customerId, {
                customer_name: formData.customerName.trim(),
                phone_number: formData.phoneNumber.trim(),
                whatsapp_number: formData.whatsappNumber.trim(),
                address: formData.address.trim()
            });

            setCustomer(prev => ({
                ...(prev || {}),
                customerName: formData.customerName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                whatsappNumber: formData.whatsappNumber.trim(),
                address: formData.address.trim()
            }));
            alert('Customer updated locally. Syncing...');
            pushCustomers().catch(() => {});
            notifyLocalSave();
        } catch (error) {
            console.error('Update customer (local) error:', error);
            alert('Failed to update customer');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        const hasServerId = customer?._id && !customer._id.startsWith('client-');
        if (!hasServerId) {
            alert('Please wait for sync before deleting this customer.');
            return;
        }

        if (window.confirm(`Are you sure you want to delete "${customer.customerName}"?`)) {
            try {
                const dao = await getCustomersDao();
                await dao.markPendingDelete(customerId);
                alert('Customer deleted locally. Syncing...');
                pushCustomers().catch(() => {});
                navigate('/customers', { replace: true });
            } catch (error) {
                console.error('Delete customer (local) error:', error);
                alert('Failed to delete customer');
            }
        }
    };

    // Navigate to bills
    const handleViewBills = () => {
        // Navigate without state - CustomerBills will fetch fresh data
        navigate(`/customer/${customer._id}/bills`);
    };

    // Handle bill creation success
    const handleBillSuccess = (bill) => {
        console.log('Bill created:', bill);
        setShowBillModal(false);
    };

    // Handle work order creation success
    const handleWorkOrderSuccess = (workOrder) => {
        console.log('Work order created:', workOrder);
        setShowWorkOrderModal(false);
    };

    if (loading && !customer) {
        return <SkeletonCustomerDetailPage />;
    }

    if (!customer) {
        return (
            <div className="py-10 text-center text-gray-500">
                <p className="font-semibold">No local data found.</p>
                <p className="text-xs text-gray-400">Will update automatically after sync.</p>
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate('/customers', { replace: true })}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">{customer.customerName}</h1>
                    {customer.phoneNumber && (
                        <p className="text-gray-500 text-sm">{customer.phoneNumber}</p>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Quick Actions</p>
                <div className="grid grid-cols-3 gap-3">
                    {/* View Bills */}
                    <button
                        onClick={handleViewBills}
                        className="flex flex-col items-center gap-2 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                        <IndianRupee className="w-6 h-6 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">View Bills</span>
                    </button>

                    {/* New Bill */}
                    <button
                        onClick={() => setShowBillModal(true)}
                        className="flex flex-col items-center gap-2 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                    >
                        <FileText className="w-6 h-6 text-green-600" />
                        <span className="text-xs font-medium text-green-700">New Bill</span>
                    </button>

                    {/* Workorder */}
                    <button
                        onClick={() => setShowWorkOrderModal(true)}
                        className="flex flex-col items-center gap-2 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                    >
                        <Wrench className="w-6 h-6 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700">Workorder</span>
                    </button>
                </div>
            </div>

            {/* Customer Details Form */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Customer Details</p>

                <form onSubmit={handleSubmit}>
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

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 mb-3"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>

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

            {/* Modals */}
            <CreateBillModal
                isOpen={showBillModal}
                onClose={() => setShowBillModal(false)}
                customer={customer}
                onSuccess={handleBillSuccess}
            />

            <CreateWorkOrderModal
                isOpen={showWorkOrderModal}
                onClose={() => setShowWorkOrderModal(false)}
                preSelectedCustomer={customer}
                onSuccess={handleWorkOrderSuccess}
                redirectAfterCreate={true}
            />
        </div>
    );
};

export default CustomerDetail;
