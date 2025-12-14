import React from 'react';

const colors = {
    info: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white'
};

const SyncToast = ({ toasts }) => {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`px-4 py-3 rounded-lg shadow-lg text-sm ${colors[toast.type] || colors.info}`}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
};

export default SyncToast;
