import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities
 */

export const isNative = () => {
  return Capacitor.isNativePlatform();
};

export const isWeb = () => {
  return !Capacitor.isNativePlatform();
};

export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};

export const canUseBrowserAPIs = () => {
  return isWeb();
};

/**
 * Get the platform-specific base URL for API calls
 * For native apps, use the full backend URL
 * For web, can use relative URLs
 */
export const getBackendURL = () => {
  return process.env.REACT_APP_BACKEND_URL;
};
