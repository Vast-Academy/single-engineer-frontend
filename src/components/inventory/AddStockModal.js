import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import SummaryApi from '../../common';
import { apiClient } from '../../utils/apiClient';
import { getItemsDao } from '../../storage/dao/itemsDao';
import { getSerialNumbersDao } from '../../storage/dao/serialNumbersDao';
import { getStockHistoryDao } from '../../storage/dao/stockHistoryDao';
import { pushInventory } from '../../storage/sync/pushInventory';
import { useSync } from '../../context/SyncContext';

const AddStockModal = ({ isOpen, onClose, onSuccess, item }) => {
    const [loading, setLoading] = useState(false);
    const [stockQty, setStockQty] = useState('');
    const [serialInputs, setSerialInputs] = useState([
        { value: '', status: 'idle', message: '', messageType: null }
    ]);
    const [formError, setFormError] = useState('');

    const inputRefs = useRef([]);
    const { notifyLocalSave } = useSync();
    const incrementIntervalRef = useRef(null);
    const decrementIntervalRef = useRef(null);
    const modalOpenTimeRef = useRef(null);
    const allowBackCloseRef = useRef(false);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStockQty('');
            setSerialInputs([{ value: '', status: 'idle', message: '', messageType: null }]);
            setFormError('');
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
            modalOpenTimeRef.current = Date.now();
            allowBackCloseRef.current = false;

            // Allow back button to close modal only after 500ms
            // This prevents MIUI keyboard-induced popstate from closing the modal
            const timer = setTimeout(() => {
                allowBackCloseRef.current = true;
            }, 500);

            window.history.pushState({ modal: true }, '');

            const handlePopState = () => {
                const timeSinceOpen = Date.now() - modalOpenTimeRef.current;
                // Only close if modal has been open for at least 500ms
                // This prevents keyboard opening from triggering close
                if (allowBackCloseRef.current && timeSinceOpen > 500) {
                    onClose();
                }
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('popstate', handlePopState);
            };
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

    // Increment/Decrement handlers with hold functionality
    const handleIncrement = () => {
        setStockQty(prev => {
            const current = Number(prev) || 0;
            return String(current + 1);
        });
    };

    const handleDecrement = () => {
        setStockQty(prev => {
            const current = Number(prev) || 0;
            return current > 1 ? String(current - 1) : '1';
        });
    };

    const startIncrement = () => {
        handleIncrement();
        incrementIntervalRef.current = setInterval(() => {
            handleIncrement();
        }, 100);
    };

    const stopIncrement = () => {
        if (incrementIntervalRef.current) {
            clearInterval(incrementIntervalRef.current);
            incrementIntervalRef.current = null;
        }
    };

    const startDecrement = () => {
        handleDecrement();
        decrementIntervalRef.current = setInterval(() => {
            handleDecrement();
        }, 100);
    };

    const stopDecrement = () => {
        if (decrementIntervalRef.current) {
            clearInterval(decrementIntervalRef.current);
            decrementIntervalRef.current = null;
        }
    };

    // Cleanup intervals on unmount or close
    useEffect(() => {
        return () => {
            stopIncrement();
            stopDecrement();
        };
    }, []);

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
            const serialDao = await getSerialNumbersDao();
            const existing = await serialDao.getBySerial(trimmedSerial);
            setSerialInputs(prev => {
                const updated = [...prev];
                if (existing) {
                    updated[index] = {
                        ...updated[index],
                        status: 'invalid',
                        message: 'Serial already exists locally',
                        messageType: 'error'
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

        const initialId = item._id || item.id;

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
        setFormError('');

        try {
            const itemsDao = await getItemsDao();
            const stockDao = await getStockHistoryDao();
            const serialDao = await getSerialNumbersDao();
            const now = new Date().toISOString();

            // Ensure server ID is available; if pending, try to sync first
            let serverItemId = item._id || item.id;
            let serverReady = serverItemId && !serverItemId.startsWith('client-') && !item.pendingSync;
            if (!serverReady) {
                try {
                    await pushInventory(); // attempt to sync pending items
                    let refreshed = await itemsDao.getById(initialId);
                    if (!refreshed && item.client_id) {
                        refreshed = await itemsDao.getById(item.client_id);
                    }
                    if (refreshed && refreshed.id && !refreshed.id.startsWith('client-')) {
                        serverItemId = refreshed.id;
                        serverReady = true;
                    }
                } catch (err) {
                    console.warn('Item sync before stock failed:', err?.message || err);
                }
            }

            if (!serverReady) {
                alert('Please wait for this item to finish syncing before adding stock.');
                setLoading(false);
                return;
            }

            if (item.itemType === 'generic') {
                const qtyNumber = Number(stockQty);
                if (!qtyNumber || qtyNumber <= 0) {
                    setLoading(false);
                    return;
                }
                const localId = `client-stock-${Date.now()}`;
                await stockDao.insertLocal({
                    id: localId,
                    item_id: serverItemId,
                    qty: qtyNumber,
                    added_at: now,
                    sync_op: 'create'
                });
                await itemsDao.update(
                    'stock_qty = stock_qty + ?, updated_at = ?',
                    [qtyNumber, now, serverItemId],
                    'id = ?'
                );
                const updatedItem = {
                    ...item,
                    stockQty: (item.stockQty || 0) + qtyNumber,
                    stockHistory: [
                        {
                        _id: localId,
                        id: localId,
                        item_id: serverItemId,
                        qty: qtyNumber,
                        addedAt: now,
                        pending_sync: 1
                        },
                        ...(item.stockHistory || [])
                    ]
                };
                onSuccess(updatedItem);
            } else {
                // Serialized items
                const validSerials = serialInputs
                    .map(sn => sn.value.trim())
                    .filter(Boolean);

                // Optional online duplicate check (non-blocking failure)
                if (navigator.onLine && validSerials.length) {
                    try {
                        const res = await apiClient(`${SummaryApi.checkSerialNumber.url}?serialNo=${encodeURIComponent(validSerials[0])}`, {
                            method: SummaryApi.checkSerialNumber.method
                        });
                        await res.json(); // ignore result; local check already done
                    } catch (err) {
                        console.warn('Serial check skipped (offline/server issue)', err);
                    }
                }

                const newSerials = [];
                for (const sn of validSerials) {
                    const localId = `client-serial-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    const payload = {
                        id: localId,
                        item_id: serverItemId,
                        serial_no: sn,
                        status: 'available',
                        added_at: now,
                        sync_op: 'create'
                    };
                    await serialDao.insertLocal(payload);
                    newSerials.push({
                        _id: localId,
                        id: localId,
                        item_id: serverItemId,
                        serialNo: sn,
                        status: 'available',
                        addedAt: now,
                        pending_sync: 1
                    });
                }

                await itemsDao.update(
                    'stock_qty = stock_qty + ?, updated_at = ?',
                    [newSerials.length, now, serverItemId],
                    'id = ?'
                );

                const updatedItem = {
                    ...item,
                    stockQty: (item.stockQty || 0) + newSerials.length,
                    serialNumbers: [...(item.serialNumbers || []), ...newSerials]
                };
                onSuccess(updatedItem);
            }

            notifyLocalSave();
            pushInventory().catch(() => {});
            onClose();
            setStockQty('');
            setSerialInputs([{ value: '', status: 'idle', message: '', messageType: null }]);
        } catch (error) {
            console.error('Update stock error:', error);
            setFormError(error?.message || 'Failed to update stock locally');
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
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--app-safe-area-bottom, 0px))' }}
            onClick={handleOverlayClick}
        >
            <div
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl h-auto flex flex-col overflow-hidden modal-shell"
            >
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
                <div className="p-4 modal-body">
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Add Quantity</label>
                            <div className="flex items-center gap-3">
                                {/* Decrement Button */}
                                <button
                                    type="button"
                                    onMouseDown={startDecrement}
                                    onMouseUp={stopDecrement}
                                    onMouseLeave={stopDecrement}
                                    onTouchStart={startDecrement}
                                    onTouchEnd={stopDecrement}
                                    className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl font-bold text-xl transition-colors"
                                >
                                    −
                                </button>

                                {/* Quantity Input */}
                                <input
                                    type="number"
                                    value={stockQty}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || Number(value) >= 1) {
                                            setStockQty(value);
                                        }
                                    }}
                                    required
                                    min="1"
                                    className="flex-1 text-center border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-primary-500"
                                    placeholder="0"
                                />

                                {/* Increment Button */}
                                <button
                                    type="button"
                                    onMouseDown={startIncrement}
                                    onMouseUp={stopIncrement}
                                    onMouseLeave={stopIncrement}
                                    onTouchStart={startIncrement}
                                    onTouchEnd={stopIncrement}
                                    className="w-12 h-12 flex items-center justify-center bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-xl font-bold text-xl transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Serialized - Serial Numbers */
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Serial Numbers
                                <span className="text-xs text-gray-400 ml-2">(Press Enter to add next)</span>
                            </label>
                            <div className="max-h-[35vh] overflow-y-auto pr-1">
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
                                                {serial.messageType === 'error' ? 'Error: ' : 'Warning: '}
                                                {serial.message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddSerialField}
                                className="w-full py-2 mt-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-primary-500 hover:text-primary-500"
                            >
                                + Add Another Serial Number
                            </button>
                        </div>
                    )}
                    {formError && (
                        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {formError}
                        </div>
                    )}
                </div>

                {/* Footer - Always Visible */}
                <div className="flex gap-3 p-4 border-t flex-shrink-0 modal-footer-safe">
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
