import { Phone, MapPin, MessageCircle, ChevronRight } from 'lucide-react';

const CustomerCard = ({ customer, onClick }) => {
    return (
        <div
            onClick={() => onClick(customer)}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-bold text-lg">
                        {customer.customerName?.charAt(0).toUpperCase() || 'C'}
                    </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{customer.customerName}</h3>

                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{customer.phoneNumber}</span>
                    </div>

                    {customer.whatsappNumber && customer.whatsappNumber !== customer.phoneNumber && (
                        <div className="flex items-center gap-1 text-green-600 text-sm mt-0.5">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{customer.whatsappNumber}</span>
                        </div>
                    )}

                    {customer.address && (
                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{customer.address}</span>
                        </div>
                    )}
                </div>

                {/* Chevron */}
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
        </div>
    );
};

export default CustomerCard;
