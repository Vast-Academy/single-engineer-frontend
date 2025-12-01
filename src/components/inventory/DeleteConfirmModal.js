import { useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading = false }) => {
    // Handle ESC key press
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && !loading) {
            onClose();
        }
    }, [onClose, loading]);

    // Handle browser back button
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: true }, '');
            const handlePopState = () => {
                if (!loading) {
                    onClose();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen, onClose, loading]);

    // Add ESC key listener
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-x-0 top-0 bottom-[70px] sm:bottom-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">Confirm Deletion</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                            <p className="text-gray-600 text-sm">{message}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
