import { X, User, Building2, Bell, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleNavigation = (path) => {
        onClose();
        navigate(path);
    };

    const SettingItem = ({ icon: Icon, label, onClick, iconBg, iconColor }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
            <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <span className="text-gray-800 font-medium text-base">{label}</span>
        </button>
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={onClose}
        >
            <div
                className="bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Options */}
                <div className="divide-y divide-gray-100 pb-6">
                    <SettingItem
                        icon={User}
                        label="Edit Profile"
                        onClick={() => handleNavigation('/settings')}
                        iconBg="bg-blue-100"
                        iconColor="text-blue-600"
                    />
                    <SettingItem
                        icon={Building2}
                        label="Bank Accounts"
                        onClick={() => handleNavigation('/bank-accounts')}
                        iconBg="bg-green-100"
                        iconColor="text-green-600"
                    />
                    <SettingItem
                        icon={Bell}
                        label="Notifications"
                        onClick={() => handleNavigation('/settings')}
                        iconBg="bg-purple-100"
                        iconColor="text-purple-600"
                    />
                    <SettingItem
                        icon={HelpCircle}
                        label="Help & Support"
                        onClick={() => handleNavigation('/settings')}
                        iconBg="bg-orange-100"
                        iconColor="text-orange-600"
                    />
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
