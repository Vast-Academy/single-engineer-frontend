import { useEffect } from 'react';
import { Shield, X } from 'lucide-react';

const PasswordSetupPrompt = ({ isOpen, onClose, onNavigateToSettings }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        const handleBackButton = () => {
            if (isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            window.addEventListener('popstate', handleBackButton);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('popstate', handleBackButton);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        Secure Your Account
                    </h2>
                    <p className="text-blue-50 text-sm">
                        Set a password to enable email login and keep your account secure
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-blue-600 text-xs font-bold">1</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Login with Email</p>
                                <p className="text-xs text-slate-500">Access your account using email and password</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-blue-600 text-xs font-bold">2</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Enhanced Security</p>
                                <p className="text-xs text-slate-500">Protect your data with password authentication</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-blue-600 text-xs font-bold">3</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Quick Setup</p>
                                <p className="text-xs text-slate-500">Takes less than a minute to complete</p>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={onNavigateToSettings}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl active:scale-98 transition-all shadow-lg shadow-blue-500/30"
                        >
                            Set Password Now
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-3 rounded-xl active:scale-98 transition-all"
                        >
                            Remind Me Later
                        </button>
                    </div>

                    <p className="text-xs text-center text-slate-400 mt-4">
                        You can set up your password anytime from Settings
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PasswordSetupPrompt;
