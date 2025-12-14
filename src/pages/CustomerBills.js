import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt, Plus, ClipboardList, Pencil, CreditCard, FileText, Wrench } from 'lucide-react';
import BillCard from '../components/bill/BillCard';
import CreateBillModal from '../components/bill/CreateBillModal';
import WorkOrderCard from '../components/workorder/WorkOrderCard';
import WorkOrderDetailModal from '../components/workorder/WorkOrderDetailModal';
import CreateWorkOrderModal from '../components/workorder/CreateWorkOrderModal';
import EditCustomerModal from '../components/customer/EditCustomerModal';
import PayCustomerDueModal from '../components/bill/PayCustomerDueModal';
import { SkeletonBillsPage, SkeletonWorkOrdersPage } from '../components/common/SkeletonLoaders';
import { ensureBillsPulled, pullBillsFromBackend } from '../storage/sync/billsSync';
import { getBillsDao } from '../storage/dao/billsDao';
import { getCustomersDao } from '../storage/dao/customersDao';
import { pushCustomers } from '../storage/sync/pushCustomers';
import { useSync } from '../context/SyncContext';
import { getWorkOrdersDao } from '../storage/dao/workOrdersDao';

const CustomerBills = () => {
    const navigate = useNavigate();
    const { customerId } = useParams();

    // Active tab state
    const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'workorders'
    const [workOrderTab, setWorkOrderTab] = useState('pending'); // 'pending' | 'completed'

    // Customer data - always fetched fresh (no state passing)
    const [customer, setCustomer] = useState(null);
    const [bills, setBills] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
    const [showCreateBill, setShowCreateBill] = useState(false);
    const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPayDue, setShowPayDue] = useState(false);
    const { notifyLocalSave, dataVersion } = useSync();

    // Work order detail modal
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showWorkOrderDetail, setShowWorkOrderDetail] = useState(false);
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);
    const SWIPE_THRESHOLD = 60;

    // Always fetch customer data fresh on mount
    useEffect(() => {
        if (customerId) {
            fetchCustomer();
        }
    }, [customerId, dataVersion]);

    // Fetch bills and work orders
    useEffect(() => {
        if (customerId) {
            fetchBillsLocal();
            fetchWorkOrders();
        }
    }, [customerId, dataVersion]);

    const fetchCustomer = async () => {
        try {
            const dao = await getCustomersDao();
            const local = await dao.getById(customerId);
            if (local) {
                setCustomer({
                    _id: local.id,
                    customerName: local.customer_name,
                    phoneNumber: local.phone_number,
                    whatsappNumber: local.whatsapp_number,
                    address: local.address
                });
            } else {
                setCustomer(null);
            }
        } catch (error) {
            console.error('Fetch customer (local) error:', error);
        }
    };

    const fetchBillsLocal = async () => {
        setLoading(true);
        try {
            await ensureBillsPulled();
            const dao = await getBillsDao();
            const rows = await dao.listByCustomer(customerId, { limit: 500, offset: 0 });
            const mapped = await Promise.all(rows.map(async (b) => {
                const items = await dao.getItemsByBill(b.id);
                return {
                    _id: b.id,
                    billNumber: b.bill_number,
                    subtotal: b.subtotal,
                    discount: b.discount,
                    totalAmount: b.total_amount,
                    receivedPayment: b.received_payment,
                    dueAmount: b.due_amount,
                    paymentMethod: b.payment_method,
                    status: b.status,
                    createdAt: b.created_at,
                    pendingSync: b.pending_sync === 1,
                    syncError: b.sync_error || null,
                    items: (items || []).map(it => ({
                        itemType: it.item_type,
                        itemId: it.item_id,
                        itemName: it.item_name,
                        serialNumber: it.serial_number,
                        qty: it.qty,
                        price: it.price,
                        amount: it.amount,
                        purchasePrice: it.purchase_price
                    }))
                };
            }));
            setBills(mapped);
        } catch (error) {
            console.error('Fetch bills (local) error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkOrders = async () => {
        setWorkOrdersLoading(true);
        try {
            const dao = await getWorkOrdersDao();
            const rows = await dao.list({ limit: 1000, offset: 0 });
            const filtered = rows.filter(wo => wo.customer_id === customerId);

            // FIXED: Fetch customer data from database instead of using state
            const customersDao = await getCustomersDao();
            const customerData = await customersDao.getById(customerId);
            const customerObj = customerData ? {
                _id: customerData.id,
                customerName: customerData.customer_name,
                phoneNumber: customerData.phone_number,
                address: customerData.address
            } : null;

            const mapped = filtered.map(wo => ({
                _id: wo.id,
                workOrderNumber: wo.work_order_number,
                note: wo.note,
                scheduleDate: wo.schedule_date || '',
                hasScheduledTime: !!wo.has_scheduled_time,
                scheduleTime: wo.schedule_time,
                status: wo.status,
                completedAt: wo.completed_at,
                customer: customerObj,
                billId: wo.bill_id,
                pendingSync: wo.pending_sync === 1,
                syncError: wo.sync_error || null
            }));
            setWorkOrders(mapped);
        } catch (error) {
            console.error('Fetch work orders (local) error:', error);
        } finally {
            setWorkOrdersLoading(false);
        }
    };

    // Calculate totals
    const totalBilled = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalReceived = bills.reduce((sum, bill) => sum + bill.receivedPayment, 0);
    const totalDue = bills.reduce((sum, bill) => sum + bill.dueAmount, 0);
    const pendingWorkOrdersCount = workOrders.filter(wo => wo.status === 'pending').length;

    // Handle bill click
    const handleBillClick = (bill) => {
        // Navigate without state - BillDetail will fetch fresh data
        navigate(`/bill/${bill._id}`);
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
        fetchBillsLocal(); // Refresh bills if new bill was created
    };

    // Handle work order delete
    const handleWorkOrderDelete = (workOrderId) => {
        setWorkOrders(prev => prev.filter(wo => wo._id !== workOrderId));
    };

    // Handle create bill success
    const handleBillCreated = () => {
        fetchBillsLocal();
        fetchWorkOrders(); // Refresh work orders as well
    };

    // Handle work order creation success
    const handleWorkOrderCreated = (newWorkOrder) => {
        fetchWorkOrders();
        setShowCreateWorkOrder(false);
    };

    // Handle payment success
    const handlePaymentSuccess = () => {
        fetchBillsLocal();
        setShowPayDue(false);
    };

    // Handle customer update
    const handleCustomerUpdate = (updatedCustomer) => {
        setCustomer(updatedCustomer);
    };

    // Handle customer delete - navigate back to customers
    const handleCustomerDelete = async (customerToDelete) => {
        try {
            const dao = await getCustomersDao();
            await dao.markPendingDelete(customerToDelete._id || customerToDelete.id);
            pushCustomers().catch(() => {});
            notifyLocalSave();
            navigate('/customers', { replace: true });
        } catch (error) {
            console.error('Delete customer (local) error:', error);
            alert('Failed to delete customer');
        }
    };

    return (
        <div
            className="pb-40"
            onTouchStart={(e) => setTouchStartX(e.changedTouches[0].clientX)}
            onTouchMove={(e) => setTouchEndX(e.changedTouches[0].clientX)}
            onTouchEnd={() => {
                if (touchStartX === null || touchEndX === null) return;
                const delta = touchEndX - touchStartX;
                if (Math.abs(delta) > SWIPE_THRESHOLD) {
                    if (delta < 0 && activeTab === 'bills') {
                        setActiveTab('workorders');
                    } else if (delta > 0 && activeTab === 'workorders') {
                        setActiveTab('bills');
                    }
                }
                setTouchStartX(null);
                setTouchEndX(null);
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate('/customers')}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-800">
                            {customer?.customerName || 'Customer'}
                        </h1>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <Pencil className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
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
                    <span className="inline-flex items-center justify-center gap-2">
                        <span>Work Orders</span>
                        {pendingWorkOrdersCount > 0 && (
                            <span className="min-w-[22px] h-5 px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                                {pendingWorkOrdersCount}
                            </span>
                        )}
                    </span>
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
                        <SkeletonBillsPage />
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
                    {workOrdersLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : workOrders.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wrench className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Work Orders Yet</h3>
                            <p className="text-gray-500 text-sm mb-4">Create the first work order for this customer</p>
                            <button
                                onClick={() => setShowCreateWorkOrder(true)}
                                className="px-6 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
                            >
                                Create Work Order
                            </button>
                        </div>
                    ) : (
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
                            {workOrders.filter(wo => wo.status === workOrderTab).length > 0 ? (
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
                </>
            )}

            {/* Action Buttons - Fixed at bottom */}
            <div className="fixed bottom-[70px] left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
                <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                    {/* Pay Due */}
                    <button
                        onClick={() => setShowPayDue(true)}
                        disabled={totalDue <= 0}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${
                            totalDue > 0
                                ? 'bg-primary-50 hover:bg-primary-100'
                                : 'bg-gray-100 cursor-not-allowed opacity-50'
                        }`}
                    >
                        <CreditCard className={`w-6 h-6 ${totalDue > 0 ? 'text-primary-600' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium ${totalDue > 0 ? 'text-primary-700' : 'text-gray-500'}`}>Pay Due</span>
                    </button>

                    {/* New Bill */}
                    <button
                        onClick={() => setShowCreateBill(true)}
                        className="flex flex-col items-center gap-1 py-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                    >
                        <FileText className="w-6 h-6 text-green-600" />
                        <span className="text-xs font-medium text-green-700">New Bill</span>
                    </button>

                    {/* Work Order */}
                    <button
                        onClick={() => setShowCreateWorkOrder(true)}
                        className="flex flex-col items-center gap-1 py-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-6 h-6 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700">New WorkOrder</span>
                    </button>
                </div>
            </div>


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

            {/* Edit Customer Modal */}
            {customer && (
                <EditCustomerModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    customer={customer}
                    onSuccess={handleCustomerUpdate}
                    onDelete={handleCustomerDelete}
                />
            )}

            {/* Pay Customer Due Modal */}
            <PayCustomerDueModal
                isOpen={showPayDue}
                onClose={() => setShowPayDue(false)}
                customerId={customerId}
                totalDue={totalDue}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
};

export default CustomerBills;
