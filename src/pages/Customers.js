import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import SummaryApi from '../common';
import CustomerCard from '../components/customer/CustomerCard';
import AddCustomerModal from '../components/customer/AddCustomerModal';

const Customers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch customers on mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await fetch(SummaryApi.getAllCustomers.url, {
                method: SummaryApi.getAllCustomers.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setCustomers(data.customers);
            }
        } catch (error) {
            console.error('Fetch customers error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle customer click - navigate to detail page
    const handleCustomerClick = (customer) => {
        navigate(`/customer/${customer._id}`, {
            state: { customer }
        });
    };

    // Handle add success
    const handleAddSuccess = (customer) => {
        setCustomers([customer, ...customers]);
    };

    // Filter customers by search
    const filteredCustomers = customers.filter(customer =>
        customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phoneNumber.includes(searchQuery)
    );

    return (
        <div className="pb-20">
            {/* Page Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-800">Customers</h1>
                <p className="text-gray-500 text-sm">Manage your customer database</p>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredCustomers.length > 0 ? (
                <div className="space-y-3">
                    {filteredCustomers.map(customer => (
                        <CustomerCard
                            key={customer._id}
                            customer={customer}
                            onClick={handleCustomerClick}
                        />
                    ))}
                </div>
            ) : customers.length > 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔍</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Results</h3>
                    <p className="text-gray-500 text-sm">No customers match "{searchQuery}"</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">👥</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Customers</h3>
                    <p className="text-gray-500 text-sm mb-4">Add your first customer</p>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setShowAddModal(true)}
                className="fixed bottom-24 right-4 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors z-30"
            >
                <UserPlus className="w-6 h-6" />
            </button>

            {/* Add Customer Modal */}
            <AddCustomerModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleAddSuccess}
            />
        </div>
    );
};

export default Customers;
