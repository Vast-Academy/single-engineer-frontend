import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 2000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-down">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl min-w-[280px] ${
                type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
            }`}>
                {type === 'success' ? (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4" />
                    </div>
                ) : (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-4 h-4" />
                    </div>
                )}
                <p className="font-medium text-sm flex-1">{message}</p>
            </div>
        </div>
    );
};

export default Toast;
