import React, { useState, useEffect } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

const ServiceCard = React.memo(({ service, onEdit, onDelete }) => {
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showOptionsMenu && !e.target.closest('.relative')) {
                setShowOptionsMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showOptionsMenu]);

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{service.serviceName}</h3>
                        {service.pendingSync && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                                Sync
                            </span>
                        )}
                        {service.syncError && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                                !
                            </span>
                        )}
                    </div>
                    <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Service
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-primary-600">₹{service.servicePrice}</p>

                    {/* 3-Dots Options Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {showOptionsMenu && (
                            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 py-2 w-36 z-30">
                                {/* Edit Option */}
                                <button
                                    onClick={() => {
                                        setShowOptionsMenu(false);
                                        onEdit(service);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                </button>

                                {/* Delete Option */}
                                <button
                                    onClick={() => {
                                        setShowOptionsMenu(false);
                                        onDelete(service);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ServiceCard;
