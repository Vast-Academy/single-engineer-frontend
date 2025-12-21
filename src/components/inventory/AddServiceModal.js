import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import SummaryApi from '../../common';
import { getServicesDao } from '../../storage/dao/servicesDao';
import { useSync } from '../../context/SyncContext';
import { apiClient } from '../../utils/apiClient';

const AddServiceModal = ({ isOpen, onClose, onSuccess, editService = null }) => {
    const [loading, setLoading] = useState(false);
    const { notifyLocalSave } = useSync();
    const [formData, setFormData] = useState({
        serviceName: '',
        servicePrice: ''
    });

    // Handle ESC key press
    const handleKeyDown = useCallback((e) => {
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
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    useEffect(() => {
        if (editService) {
            setFormData({
                serviceName: editService.serviceName,
                servicePrice: editService.servicePrice
            });
        } else {
            setFormData({
                serviceName: '',
                servicePrice: ''
            });
        }
    }, [editService, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const now = new Date().toISOString();
            let savedService = null;

            if (!editService) {
                if (!navigator.onLine) {
                    alert('You are offline. New services can only be added when you are online.');
                    setLoading(false);
                    return;
                }

                const response = await apiClient(SummaryApi.addService.url, {
                    method: SummaryApi.addService.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceName: formData.serviceName.trim(),
                        servicePrice: Number(formData.servicePrice)
                    })
                });
                const data = await response.json();
                if (!data.success || !data.service?._id) {
                    throw new Error(data.message || 'Failed to create service on server');
                }

                savedService = {
                    id: data.service._id,
                    client_id: data.service._id,
                    service_name: data.service.serviceName || data.service.service_name || formData.serviceName.trim(),
                    service_price: data.service.servicePrice ?? data.service.service_price ?? Number(formData.servicePrice),
                    created_by: data.service.createdBy || data.service.created_by || null,
                    deleted: data.service.deleted || false,
                    updated_at: data.service.updatedAt || data.service.updated_at || now,
                    created_at: data.service.createdAt || data.service.created_at || now,
                    pending_sync: 0,
                    sync_op: null,
                    sync_error: null
                };
            } else {
                if (!navigator.onLine) {
                    alert('You are offline. Editing services requires an online connection.');
                    setLoading(false);
                    return;
                }

                const serverId = editService._id || editService.id;
                const response = await apiClient(`${SummaryApi.updateService.url}/${serverId}`, {
                    method: SummaryApi.updateService.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceName: formData.serviceName.trim(),
                        servicePrice: Number(formData.servicePrice)
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to update service on server');
                }

                savedService = {
                    id: serverId,
                    client_id: editService?.client_id || serverId,
                    service_name: formData.serviceName.trim(),
                    service_price: Number(formData.servicePrice),
                    created_by: editService?.createdBy || editService?.created_by || null,
                    deleted: 0,
                    updated_at: data.service?.updatedAt || data.service?.updated_at || now,
                    created_at: editService?.createdAt || editService?.created_at || now,
                    pending_sync: 0,
                    sync_op: null,
                    sync_error: null
                };
            }

            const dao = await getServicesDao();
            await dao.upsertOne(savedService);

            onSuccess({
                _id: savedService.id,
                serviceName: savedService.service_name,
                servicePrice: savedService.service_price,
                pendingSync: false
            });
            onClose();
            notifyLocalSave();
        } catch (error) {
            console.error('Save service error:', error);
            alert('Failed to save service');
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
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl modal-shell flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {editService ? 'Edit Service' : 'Add New Service'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="p-4 modal-body"
                >
                    {/* Service Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                        <input
                            type="text"
                            name="serviceName"
                            value={formData.serviceName}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                            placeholder="Enter service name"
                        />
                    </div>

                    {/* Service Price */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Price</label>
                        <input
                            type="number"
                            name="servicePrice"
                            value={formData.servicePrice}
                            onChange={handleChange}
                            required
                            min="0"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                            placeholder="Enter price"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t modal-footer-safe">
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
                        {loading ? 'Saving...' : (editService ? 'Update Service' : 'Add Service')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddServiceModal;
