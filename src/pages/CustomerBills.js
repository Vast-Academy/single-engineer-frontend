import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Receipt, Plus, ClipboardList } from 'lucide-react';
import SummaryApi from '../common';
import BillCard from '../components/bill/BillCard';
import CreateBillModal from '../components/bill/CreateBillModal';
import WorkOrderCard from '../components/workorder/WorkOrderCard';
import WorkOrderDetailModal from '../components/workorder/WorkOrderDetailModal';
import CreateWorkOrderModal from '../components/workorder/CreateWorkOrderModal';

const CustomerBills = () => {
    const navigate = useNavigate();
    const { customerId } = useParams();
    const location = useLocation();

    // Active tab state
    const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'workorders'
    const [workOrderTab, setWorkOrderTab] = useState('pending'); // 'pending' | 'completed'

    // Customer data from navigation state or will be fetched
    const [customer, setCustomer] = useState(location.state?.customer || null);
    const [bills, setBills] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
    const [showCreateBill, setShowCreateBill] = useState(false);
    const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);

    // Work order detail modal
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showWorkOrderDetail, setShowWorkOrderDetail] = useState(false);

    // Fetch customer if not passed in state
    useEffect(() => {
        if (!customer && customerId) {
            fetchCustomer();
        }
    }, [customerId]);

    // Fetch bills and work orders
    useEffect(() => {
        if (customerId) {
            fetchBills();
            fetchWorkOrders();
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

    const fetchWorkOrders = async () => {
        setWorkOrdersLoading(true);
        try {
            const response = await fetch(`${SummaryApi.getWorkOrdersByCustomer.url}/${customerId}`, {
                method: SummaryApi.getWorkOrdersByCustomer.method,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setWorkOrders(data.workOrders || []);
            }
        } catch (error) {
            console.error('Fetch work orders error:', error);
        } finally {
            setWorkOrdersLoading(false);
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

    // Handle work order click
    const handleWorkOrderClick = (workOrder) => {
        setSelectedWorkOrder(workOrder);
        setShowWorkOrderDetail(true);
    };

    // Handle work order update
    const handleWorkOrderUpdate = (updatedWorkOrder) => {
        setWorkOrders(prev => prev.map(wo =>
            wo._id === updatedWorkOrder._id ? updatedWorkOrder : wo
        ));
        fetchBills(); // Refresh bills if new bill was created
    };

    // Handle work order delete
    const handleWorkOrderDelete = (workOrderId) => {
        setWorkOrders(prev => prev.filter(wo => wo._id !== workOrderId));
    };

    // Handle create bill success
    const handleBillCreated = () => {
        fetchBills();
        fetchWorkOrders(); // Refresh work orders as well
    };

    // Handle work order creation success
    const handleWorkOrderCreated = (newWorkOrder) => {
        fetchWorkOrders();
        setShowCreateWorkOrder(false);
    };

    return (
        <div className="py-4 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate(`/customer/${customerId}`)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">
                        {customer?.customerName || 'Customer'}
                    </h1>
                    {customer?.phoneNumber && (
                        <p className="text-gray-500 text-sm">{customer.phoneNumber}</p>
                    )}
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                    onClick={() => setActiveTab('bills')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'bills'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600'
                    }`}
                >
                    Bills ({bills.length})
                </button>
                <button
                    onClick={() => setActiveTab('workorders')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'workorders'
                            ? 'bg-white text-purple-600 shadow-sm'
                            : 'text-gray-600'
                    }`}
                >
                    Work Orders ({workOrders.length})
                </button>
            </div>

            {/* Summary Cards - Only for Bills Tab */}
            {activeTab === 'bills' && bills.length > 0 && (
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

            {/* Bills Tab Content */}
            {activeTab === 'bills' && (
                <>
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
                </>
            )}

            {/* Work Orders Tab Content */}
            {activeTab === 'workorders' && (
                <>
                    {/* Work Order Sub-Tabs */}
                    <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
                        <button
                            onClick={() => setWorkOrderTab('pending')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                workOrderTab === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'text-gray-600'
                            }`}
                        >
                            Pending ({workOrders.filter(wo => wo.status === 'pending').length})
                        </button>
                        <button
                            onClick={() => setWorkOrderTab('completed')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                workOrderTab === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'text-gray-600'
                            }`}
                        >
                            Completed ({workOrders.filter(wo => wo.status === 'completed').length})
                        </button>
                    </div>

                    {/* Work Orders List */}
                    {workOrdersLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : workOrders.filter(wo => wo.status === workOrderTab).length > 0 ? (
                        <div className="space-y-3">
                            {workOrders
                                .filter(wo => wo.status === workOrderTab)
                                .map(workOrder => (
                                    <WorkOrderCard
                                        key={workOrder._id}
                                        workOrder={workOrder}
                                        onClick={handleWorkOrderClick}
                                    />
                                ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                            <div className={`w-16 h-16 ${workOrderTab === 'pending' ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                <ClipboardList className={`w-8 h-8 ${workOrderTab === 'pending' ? 'text-yellow-600' : 'text-green-600'}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                No {workOrderTab === 'pending' ? 'Pending' : 'Completed'} Work Orders
                            </h3>
                            <p className="text-gray-500 text-sm">
                                No {workOrderTab === 'pending' ? 'pending' : 'completed'} work orders found for this customer
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Floating Action Button - For Bills Tab */}
            {activeTab === 'bills' && bills.length > 0 && (
                <button
                    onClick={() => setShowCreateBill(true)}
                    className="fixed bottom-24 right-4 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors z-30"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Floating Action Button - For Work Orders Tab */}
            {activeTab === 'workorders' && (
                <button
                    onClick={() => setShowCreateWorkOrder(true)}
                    className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors z-30"
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

            {/* Create Work Order Modal */}
            {customer && (
                <CreateWorkOrderModal
                    isOpen={showCreateWorkOrder}
                    onClose={() => setShowCreateWorkOrder(false)}
                    preSelectedCustomer={customer}
                    onSuccess={handleWorkOrderCreated}
                    redirectAfterCreate={false}
                />
            )}

            {/* Work Order Detail Modal */}
            <WorkOrderDetailModal
                isOpen={showWorkOrderDetail}
                onClose={() => {
                    setShowWorkOrderDetail(false);
                    setSelectedWorkOrder(null);
                }}
                workOrder={selectedWorkOrder}
                onUpdate={handleWorkOrderUpdate}
                onDelete={handleWorkOrderDelete}
            />
        </div>
    );
};

export default CustomerBills;
