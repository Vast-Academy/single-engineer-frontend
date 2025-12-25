import { Preferences } from '@capacitor/preferences';

const DEVICE_ID_KEY = 'device_id';

const generateDeviceId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getDeviceId = async () => {
    const existing = await Preferences.get({ key: DEVICE_ID_KEY });
    if (existing?.value) {
        return existing.value;
    }

    const deviceId = generateDeviceId();
    await Preferences.set({ key: DEVICE_ID_KEY, value: deviceId });
    return deviceId;
};

export default getDeviceId;
