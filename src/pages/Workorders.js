import { useState, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import SummaryApi from '../common';
import WorkOrderCard from '../components/workorder/WorkOrderCard';
import CreateWorkOrderModal from '../components/workorder/CreateWorkOrderModal';
import WorkOrderDetailModal from '../components/workorder/WorkOrderDetailModal';

const Workorders = () => {
    const [activeTab, setActiveTab] = useState('pending'); // pending, completed
    const [pendingWorkOrders, setPendingWorkOrders] = useState([]);
    const [completedWorkOrders, setCompletedWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Fetch work orders
    useEffect(() => {
        fetchWorkOrders();
    }, []);

    const fetchWorkOrders = async () => {
        setLoading(true);
        try {
            const [pendingRes, completedRes] = await Promise.all([
                fetch(SummaryApi.getPendingWorkOrders.url, {
                    method: SummaryApi.getPendingWorkOrders.method,
                    credentials: 'include'
                }),
                fetch(SummaryApi.getCompletedWorkOrders.url, {
                    method: SummaryApi.getCompletedWorkOrders.method,
                    credentials: 'include'
                })
            ]);

            const pendingData = await pendingRes.json();
            const completedData = await completedRes.json();

            if (pendingData.success) {
                setPendingWorkOrders(pendingData.workOrders || []);
            }
            if (completedData.success) {
                setCompletedWorkOrders(completedData.workOrders || []);
            }
        } catch (error) {
            console.error('Fetch work orders error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle work order click
    const handleWorkOrderClick = (workOrder) => {
        setSelectedWorkOrder(workOrder);
        setShowDetailModal(true);
    };

    // Handle work order update (mark complete)
    const handleWorkOrderUpdate = (updatedWorkOrder) => {
        // Move from pending to completed
        setPendingWorkOrders(prev => prev.filter(wo => wo._id !== updatedWorkOrder._id));
        setCompletedWorkOrders(prev => [updatedWorkOrder, ...prev]);
    };

    // Handle work order delete
    const handleWorkOrderDelete = (workOrderId) => {
        setPendingWorkOrders(prev => prev.filter(wo => wo._id !== workOrderId));
        setCompletedWorkOrders(prev => prev.filter(wo => wo._id !== workOrderId));
    };

    // Handle create success
    const handleCreateSuccess = (newWorkOrder) => {
        setPendingWorkOrders(prev => [newWorkOrder, ...prev].sort((a, b) => {
            const dateA = new Date(a.scheduleDate);
            const dateB = new Date(b.scheduleDate);
            return dateA - dateB;
        }));
    };

    // Get current list based on active tab
    const currentList = activeTab === 'pending' ? pendingWorkOrders : completedWorkOrders;

    // Count for tabs
    const pendingCount = pendingWorkOrders.length;
    const completedCount = completedWorkOrders.length;

    return (
        <div className="pb-20">
            {/* Page Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-800">Work Orders</h1>
                <p className="text-gray-500 text-sm">Track and manage work orders</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'pending'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                    Pending {pendingCount > 0 && `(${pendingCount})`}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === 'completed'
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                    Completed {completedCount > 0 && `(${completedCount})`}
                </button>
            </div>

            {/* Work Orders List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : currentList.length > 0 ? (
                <div className="space-y-3">
                    {currentList.map(workOrder => (
                        <WorkOrderCard
                            key={workOrder._id}
                            workOrder={workOrder}
                            onClick={handleWorkOrderClick}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {activeTab === 'pending' ? 'No Pending Work Orders' : 'No Completed Work Orders'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {activeTab === 'pending'
                            ? 'Create your first work order to get started'
                            : 'Complete some work orders to see them here'
                        }
                    </p>
                    {activeTab === 'pending' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                            + Create Work Order
                        </button>
                    )}
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setShowCreateModal(true)}
                className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors z-30"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Create Work Order Modal */}
            <CreateWorkOrderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />

            {/* Work Order Detail Modal */}
            <WorkOrderDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedWorkOrder(null);
                }}
                workOrder={selectedWorkOrder}
                onUpdate={handleWorkOrderUpdate}
                onDelete={handleWorkOrderDelete}
            />
        </div>
    );
};

export default Workorders;
