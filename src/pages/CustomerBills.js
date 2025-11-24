import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Receipt, Plus } from 'lucide-react';
import SummaryApi from '../common';
import BillCard from '../components/bill/BillCard';
import CreateBillModal from '../components/bill/CreateBillModal';

const CustomerBills = () => {
    const navigate = useNavigate();
    const { customerId } = useParams();
    const location = useLocation();

    // Customer data from navigation state or will be fetched
    const [customer, setCustomer] = useState(location.state?.customer || null);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateBill, setShowCreateBill] = useState(false);

    // Fetch customer if not passed in state
    useEffect(() => {
        if (!customer && customerId) {
            fetchCustomer();
        }
    }, [customerId]);

    // Fetch bills
    useEffect(() => {
        if (customerId) {
            fetchBills();
        }
    }, [customerId]);

    const fetchCustomer = async () => {
        try {
            const response = await fetch(`${SummaryApi.getCustomer.url}/${customerId}`, {
                method: SummaryApi.getCustomer.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setCustomer(data.customer);
            }
        } catch (error) {
            console.error('Fetch customer error:', error);
        }
    };

    const fetchBills = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${SummaryApi.getBillsByCustomer.url}/${customerId}`, {
                method: SummaryApi.getBillsByCustomer.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setBills(data.bills);
            }
        } catch (error) {
            console.error('Fetch bills error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totalBilled = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalReceived = bills.reduce((sum, bill) => sum + bill.receivedPayment, 0);
    const totalDue = bills.reduce((sum, bill) => sum + bill.dueAmount, 0);

    // Handle bill click
    const handleBillClick = (bill) => {
        navigate(`/bill/${bill._id}`, {
            state: {
                bill,
                customer
            }
        });
    };

    // Handle create bill success
    const handleBillCreated = () => {
        fetchBills();
    };

    return (
        <div className="py-4 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate('/customers', { replace: true })}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">
                        {customer?.customerName || 'Customer'}'s Bills
                    </h1>
                    {customer?.phoneNumber && (
                        <p className="text-gray-500 text-sm">{customer.phoneNumber}</p>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            {bills.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-blue-600 mb-1">Total Billed</p>
                        <p className="text-lg font-bold text-blue-700">₹{totalBilled}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-green-600 mb-1">Received</p>
                        <p className="text-lg font-bold text-green-700">₹{totalReceived}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${totalDue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className={`text-xs mb-1 ${totalDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>Due</p>
                        <p className={`text-lg font-bold ${totalDue > 0 ? 'text-red-700' : 'text-gray-700'}`}>₹{totalDue}</p>
                    </div>
                </div>
            )}

            {/* Bills List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : bills.length > 0 ? (
                <div className="space-y-3">
                    {bills.map(bill => (
                        <BillCard
                            key={bill._id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Receipt className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Bills Yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Create the first bill for this customer</p>
                    <button
                        onClick={() => setShowCreateBill(true)}
                        className="px-6 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
                    >
                        Create Bill
                    </button>
                </div>
            )}

            {/* Floating Action Button */}
            {bills.length > 0 && (
                <button
                    onClick={() => setShowCreateBill(true)}
                    className="fixed bottom-24 right-4 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors z-30"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Create Bill Modal */}
            {customer && (
                <CreateBillModal
                    isOpen={showCreateBill}
                    onClose={() => setShowCreateBill(false)}
                    customer={customer}
                    onSuccess={handleBillCreated}
                />
            )}
        </div>
    );
};

export default CustomerBills;
