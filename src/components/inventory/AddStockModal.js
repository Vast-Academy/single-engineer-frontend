import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import SummaryApi from '../../common';

const AddStockModal = ({ isOpen, onClose, onSuccess, item }) => {
    const [loading, setLoading] = useState(false);
    const [stockQty, setStockQty] = useState('');
    const [serialInputs, setSerialInputs] = useState([
        { value: '', status: 'idle', message: '', messageType: null }
    ]);

    const inputRefs = useRef([]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStockQty('');
            setSerialInputs([{ value: '', status: 'idle', message: '', messageType: null }]);
        }
    }, [isOpen]);

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

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Debounced serial number check
    const checkSerialNumber = useCallback(async (serialNumber, index) => {
        if (!serialNumber || serialNumber.trim() === '') {
            setSerialInputs(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], status: 'idle', message: '', messageType: null };
                return updated;
            });
            return;
        }

        // Check for duplicates within current inputs first
        const trimmedSerial = serialNumber.trim();
        const duplicateInInputs = serialInputs.some(
            (input, i) => i !== index && input.value.trim() === trimmedSerial
        );

        if (duplicateInInputs) {
            setSerialInputs(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    status: 'invalid',
                    message: 'Duplicate in current list',
                    messageType: 'error'
                };
                return updated;
            });
            return;
        }

        // Set checking status
        setSerialInputs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: 'checking', message: '' };
            return updated;
        });

        try {
            const response = await fetch(
                `${SummaryApi.checkSerialNumber.url}/${encodeURIComponent(trimmedSerial)}`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            const data = await response.json();

            setSerialInputs(prev => {
                const updated = [...prev];
                if (data.exists) {
                    // Show different messages based on status
                    let message = '';
                    let messageType = 'error'; // 'error' or 'warning'

                    if (data.status === 'sold' && data.customerName) {
                        // Serial number was used in a bill - show customer info
                        message = `Sold to ${data.customerName}${data.billNumber ? ` (${data.billNumber})` : ''}`;
                        messageType = 'error';
                    } else if (data.status === 'sold') {
                        // Old data - sold but no customer info
                        message = `Already sold (${data.itemName})`;
                        messageType = 'error';
                    } else if (data.status === 'available') {
                        // Serial number is already in stock
                        message = `Already in stock (${data.itemName})`;
                        messageType = 'warning';
                    } else {
                        // Fallback message
                        message = `Already exists (${data.itemName})`;
                        messageType = 'error';
                    }

                    updated[index] = {
                        ...updated[index],
                        status: 'invalid',
                        message,
                        messageType
                    };
                } else {
                    updated[index] = {
                        ...updated[index],
                        status: 'valid',
                        message: '',
                        messageType: null
                    };
                }
                return updated;
            });
        } catch (error) {
            console.error('Check serial error:', error);
            setSerialInputs(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], status: 'idle', message: '', messageType: null };
                return updated;
            });
        }
    }, [serialInputs]);

    // Debounce timer refs
    const debounceTimers = useRef({});

    const handleSerialChange = (index, value) => {
        // Update value immediately
        setSerialInputs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], value, status: 'idle', message: '', messageType: null };
            return updated;
        });

        // Clear existing timer for this index
        if (debounceTimers.current[index]) {
            clearTimeout(debounceTimers.current[index]);
        }

        // Set new debounce timer
        debounceTimers.current[index] = setTimeout(() => {
            checkSerialNumber(value, index);
        }, 500);
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // If current input has value and this is the last input, add new input
            if (serialInputs[index].value.trim() !== '' && index === serialInputs.length - 1) {
                handleAddSerialField();
            } else if (index < serialInputs.length - 1) {
                // Move to next input
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleAddSerialField = () => {
        setSerialInputs(prev => [...prev, { value: '', status: 'idle', message: '', messageType: null }]);
        // Focus on new input after render
        setTimeout(() => {
            inputRefs.current[serialInputs.length]?.focus();
        }, 50);
    };

    const handleRemoveSerialField = (index) => {
        // Clear debounce timer for this index
        if (debounceTimers.current[index]) {
            clearTimeout(debounceTimers.current[index]);
        }

        setSerialInputs(prev => {
            const updated = prev.filter((_, i) => i !== index);
            return updated.length ? updated : [{ value: '', status: 'idle', message: '', messageType: null }];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // For serialized items, check if any serial is invalid
        if (item.itemType === 'serialized') {
            const hasInvalid = serialInputs.some(
                input => input.value.trim() !== '' && input.status === 'invalid'
            );
            const hasChecking = serialInputs.some(input => input.status === 'checking');

            if (hasChecking) {
                alert('Please wait for serial number validation to complete');
                return;
            }

            if (hasInvalid) {
                alert('Please fix invalid serial numbers before submitting');
                return;
            }

            const validSerials = serialInputs
                .filter(input => input.value.trim() !== '')
                .map(input => input.value.trim());

            if (validSerials.length === 0) {
                alert('Please add at least one serial number');
                return;
            }
        }

        setLoading(true);

        try {
            const body = item.itemType === 'generic'
                ? { stockQty: Number(stockQty) }
                : { serialNumbers: serialInputs.filter(sn => sn.value.trim() !== '').map(sn => sn.value.trim()) };

            const response = await fetch(`${SummaryApi.updateStock.url}/${item._id}/stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                onSuccess(data.item);
                onClose();
                setStockQty('');
                setSerialInputs([{ value: '', status: 'idle', message: '', messageType: null }]);
            } else {
                alert(data.message || 'Failed to update stock');
            }
        } catch (error) {
            console.error('Update stock error:', error);
            alert('Failed to update stock');
        } finally {
            setLoading(false);
        }
    };

    // Get input border class based on status
    const getInputClass = (status) => {
        const baseClass = "flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors";
        switch (status) {
            case 'valid':
                return `${baseClass} border-green-500 bg-green-50 focus:border-green-600`;
            case 'invalid':
                return `${baseClass} border-red-500 bg-red-50 focus:border-red-600`;
            case 'checking':
                return `${baseClass} border-yellow-400 bg-yellow-50`;
            default:
                return `${baseClass} border-gray-300 focus:border-primary-500`;
        }
    };

    // Check if form can be submitted
    const canSubmit = () => {
        if (item?.itemType === 'generic') {
            return stockQty && Number(stockQty) > 0;
        }

        const validSerials = serialInputs.filter(
            input => input.value.trim() !== '' && input.status === 'valid'
        );
        const hasInvalid = serialInputs.some(
            input => input.value.trim() !== '' && input.status === 'invalid'
        );
        const hasChecking = serialInputs.some(input => input.status === 'checking');

        return validSerials.length > 0 && !hasInvalid && !hasChecking;
    };

    if (!isOpen || !item) return null;

    const currentStock = item.itemType === 'generic'
        ? item.stockQty
        : item.serialNumbers?.filter(sn => sn.status === 'available').length || 0;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] bg-black/50 z-40 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">Add Stock</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form - Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Item Info */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <p className="font-medium text-gray-800">{item.itemName}</p>
                        <p className="text-sm text-gray-500">
                            Current Stock: <span className="font-medium text-primary-600">{currentStock} {item.unit}</span>
                        </p>
                    </div>

                    {item.itemType === 'generic' ? (
                        /* Generic - Quantity */
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Add Quantity</label>
                            <input
                                type="number"
                                value={stockQty}
                                onChange={(e) => setStockQty(e.target.value)}
                                required
                                min="1"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                                placeholder="Enter quantity to add"
                            />
                        </div>
                    ) : (
                        /* Serialized - Serial Numbers */
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Serial Numbers
                                <span className="text-xs text-gray-400 ml-2">(Press Enter to add next)</span>
                            </label>
                            {serialInputs.map((serial, index) => (
                                <div key={index} className="mb-2">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                ref={el => inputRefs.current[index] = el}
                                                type="text"
                                                value={serial.value}
                                                onChange={(e) => handleSerialChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                className={getInputClass(serial.status)}
                                                placeholder={`Serial number ${index + 1}`}
                                            />
                                            {/* Status Icon */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {serial.status === 'checking' && (
                                                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                                                )}
                                                {serial.status === 'valid' && (
                                                    <Check className="w-5 h-5 text-green-500" />
                                                )}
                                                {serial.status === 'invalid' && (
                                                    <X className="w-5 h-5 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                        {serialInputs.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSerialField(index)}
                                                className="w-12 h-12 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    {/* Error/Warning Message */}
                                    {serial.status === 'invalid' && serial.message && (
                                        <div className={`mt-2 ml-1 rounded-lg p-2.5 border ${
                                            serial.messageType === 'error'
                                                ? 'bg-red-50 border-red-300'
                                                : 'bg-orange-50 border-orange-300'
                                        }`}>
                                            <p className={`text-xs font-semibold ${
                                                serial.messageType === 'error'
                                                    ? 'text-red-800'
                                                    : 'text-orange-800'
                                            }`}>
                                                {serial.messageType === 'error' ? '⚠️ ' : 'ℹ️ '}
                                                {serial.message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddSerialField}
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-primary-500 hover:text-primary-500"
                            >
                                + Add Another Serial Number
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer - Always Visible */}
                <div className="flex gap-3 p-4 border-t flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit()}
                        className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Adding...' : 'Add Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddStockModal;
