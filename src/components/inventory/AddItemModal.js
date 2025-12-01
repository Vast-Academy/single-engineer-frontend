import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import SummaryApi from '../../common';

const unitOptions = ['kg', 'piece', 'meter', 'litre', 'box'];
const warrantyOptions = [
    { value: 'no_warranty', label: 'No Warranty' },
    { value: '6_months', label: '6 Months' },
    { value: '1_year', label: '1 Year' },
    { value: '2_year', label: '2 Years' },
    { value: '3_year', label: '3 Years' },
    { value: '4_year', label: '4 Years' },
    { value: '5_year', label: '5 Years' }
];

const AddItemModal = ({ isOpen, onClose, onSuccess, editItem = null, existingItems = [] }) => {
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState('');
    const [formData, setFormData] = useState({
        itemType: 'generic',
        itemName: '',
        unit: 'piece',
        warranty: 'no_warranty',
        mrp: '',
        purchasePrice: '',
        salePrice: ''
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
        if (editItem) {
            setFormData({
                itemType: editItem.itemType,
                itemName: editItem.itemName,
                unit: editItem.unit,
                warranty: editItem.warranty,
                mrp: editItem.mrp,
                purchasePrice: editItem.purchasePrice,
                salePrice: editItem.salePrice
            });
        } else {
            setFormData({
                itemType: 'generic',
                itemName: '',
                unit: 'piece',
                warranty: 'no_warranty',
                mrp: '',
                purchasePrice: '',
                salePrice: ''
            });
        }
    }, [editItem, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Check for duplicate item name
        if (name === 'itemName') {
            const trimmedValue = value.trim().toLowerCase();
            if (trimmedValue) {
                const isDuplicate = existingItems.some(item => {
                    // Skip checking against the item being edited
                    if (editItem && item._id === editItem._id) {
                        return false;
                    }
                    return item.itemName.toLowerCase() === trimmedValue;
                });

                if (isDuplicate) {
                    setNameError('This name already exists');
                } else {
                    setNameError('');
                }
            } else {
                setNameError('');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editItem
                ? `${SummaryApi.updateItem.url}/${editItem._id}`
                : SummaryApi.addItem.url;

            const method = editItem ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    mrp: Number(formData.mrp),
                    purchasePrice: Number(formData.purchasePrice),
                    salePrice: Number(formData.salePrice)
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess(data.item);
                onClose();
            } else {
                alert(data.message || 'Failed to save item');
            }
        } catch (error) {
            console.error('Save item error:', error);
            alert('Failed to save item');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-40 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {editItem ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-130px)]">
                    {/* Item Type */}
                    {!editItem && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="itemType"
                                        value="generic"
                                        checked={formData.itemType === 'generic'}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-primary-500"
                                    />
                                    <span className="text-sm text-gray-700">Generic Product</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="itemType"
                                        value="serialized"
                                        checked={formData.itemType === 'serialized'}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-primary-500"
                                    />
                                    <span className="text-sm text-gray-700">Serialized Product</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Item Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                        <input
                            type="text"
                            name="itemName"
                            value={formData.itemName}
                            onChange={handleChange}
                            required
                            className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none ${
                                nameError
                                    ? 'border-red-500 bg-red-50 focus:border-red-600'
                                    : 'border-gray-300 focus:border-primary-500'
                            }`}
                            placeholder="Enter item name"
                        />
                        {nameError && (
                            <p className="text-xs text-red-600 mt-1 ml-1 font-medium">{nameError}</p>
                        )}
                    </div>

                    {/* Unit */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <select
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                        >
                            {unitOptions.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>

                    {/* Warranty */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warranty</label>
                        <select
                            name="warranty"
                            value={formData.warranty}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                        >
                            {warrantyOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                            <input
                                type="number"
                                name="mrp"
                                value={formData.mrp}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-primary-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase</label>
                            <input
                                type="number"
                                name="purchasePrice"
                                value={formData.purchasePrice}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-primary-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sale</label>
                            <input
                                type="number"
                                name="salePrice"
                                value={formData.salePrice}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-primary-500"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex gap-3 p-4 pb-8 border-t bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !!nameError}
                        className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : (editItem ? 'Update Item' : 'Add Item')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddItemModal;
