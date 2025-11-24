const ServiceCard = ({ service, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{service.serviceName}</h3>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Service
                    </span>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">₹{service.servicePrice}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(service)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(service)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
