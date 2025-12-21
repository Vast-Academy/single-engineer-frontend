import { useEffect, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ProfileWarningModal = ({ isOpen, onClose, onCompleteProfile }) => {
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
            const handlePopState = () => {
                onClose();
            };
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

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center"
            onClick={handleOverlayClick}
        >
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-xl modal-shell flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">Complete Your Profile</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 modal-body">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Profile Required</h3>
                            <p className="text-gray-600 text-sm">
                                Please complete your business profile before creating bills. This information will be displayed on your bills and is required for proper documentation.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t bg-gray-50 modal-footer-safe">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onCompleteProfile}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    >
                        Complete Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileWarningModal;
