import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
    signInWithPopup,
    signOut,
    onIdTokenChanged,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithCustomToken
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import SummaryApi from '../common';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { initStorage } from '../storage';
import authTokenManager from '../utils/authTokenManager';
import { apiClient } from '../utils/apiClient';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Reliable native detector
const isNativeApp = () => Capacitor.isNativePlatform();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [passwordPromptDismissed, setPasswordPromptDismissed] = useState(false);
    const silentAttemptedRef = useRef(false);

    // Initialize Google Native SDK on startup
    useEffect(() => {
        if (isNativeApp()) {
            console.log("WORKOPS DEBUG | auth | google sdk init start |", new Date().toISOString());
            GoogleAuth.initialize({
                clientId: process.env.REACT_APP_GOOGLE_WEB_CLIENT_ID,
                scopes: ["profile", "email"],
                grantOfflineAccess: true
            }).catch(err => {
                console.error("GoogleAuth init failed:", err);
            });
        }
    }, []);

    // Silent native sign-in to restore session without UI
    const silentNativeSignIn = useCallback(async () => {
        if (!isNativeApp()) return false;
        if (auth.currentUser) return true;
        if (silentAttemptedRef.current) return false;
        silentAttemptedRef.current = true;

        try {
            // Try silent methods in order
            let googleResult = null;
            if (typeof GoogleAuth.signInSilently === 'function') {
                googleResult = await GoogleAuth.signInSilently();
            } else if (typeof GoogleAuth.refresh === 'function') {
                googleResult = await GoogleAuth.refresh();
            }

            const idToken = googleResult?.authentication?.idToken || googleResult?.idToken;
            if (!idToken) {
                return false;
            }

            const credential = GoogleAuthProvider.credential(idToken);
            const firebaseResult = await signInWithCredential(auth, credential);

            console.log("WORKOPS DEBUG | auth | getIdToken start |", new Date().toISOString());
            const freshIdToken = await firebaseResult.user.getIdToken();
             console.log("WORKOPS DEBUG | auth | getIdToken done |", new Date().toISOString());

             console.log("WORKOPS DEBUG | auth | backend sync start |", new Date().toISOString());
            const ok = await syncTokenWithBackend(freshIdToken);
            console.log("WORKOPS DEBUG | auth | backend sync done |", new Date().toISOString(), "isValid:", ok);

            return true;
        } catch (err) {
            console.log("WORKOPS DEBUG | auth | silent native sign-in failed |", err?.message || err);
            return false;
        }
    }, []);

    // Listen to user/token state
    useEffect(() => {
        console.log("WORKOPS DEBUG | auth | init start |", new Date().toISOString());
        console.log("WORKOPS DEBUG | auth | initStorage kick off |", new Date().toISOString());
        initStorage().catch(err => console.error("WORKOPS DEBUG | auth | initStorage error |", err));

        console.log("WORKOPS DEBUG | auth | onIdTokenChanged listener attach |", new Date().toISOString());
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            console.log(
                "WORKOPS DEBUG | auth | onIdTokenChanged callback |",
                new Date().toISOString(),
                "user:",
                !!firebaseUser
            );

            if (!firebaseUser) {
                console.log("WORKOPS DEBUG | auth | firebaseUser null |", new Date().toISOString());
                setUser(null);
                setLoading(false);

                 console.log("WORKOPS DEBUG | auth | silent sign in attempt |", new Date().toISOString());
                // If native, attempt silent sign-in before giving up
                await silentNativeSignIn();
                return;
            }

            try {
                console.log("WORKOPS DEBUG | auth | firebaseUser present |", new Date().toISOString());

                console.log("WORKOPS DEBUG | auth | initStorage await start |", new Date().toISOString());
                await initStorage();
                console.log("WORKOPS DEBUG | auth | initStorage await done |", new Date().toISOString());

                console.log("WORKOPS DEBUG | auth | getIdToken start |", new Date().toISOString());
                const idToken = await firebaseUser.getIdToken(true);
                console.log("WORKOPS DEBUG | auth | getIdToken done |", new Date().toISOString());

                // Validate session with backend
                console.log("WORKOPS DEBUG | auth | backend sync start |", new Date().toISOString());
                const isValid = await syncTokenWithBackend(idToken);
                console.log("WORKOPS DEBUG | auth | backend sync done |", new Date().toISOString(), "isValid:", isValid);

                // If backend rejects the session, sign out
                if (!isValid) {
                     console.log("WORKOPS DEBUG | auth | session invalid signing out |", new Date().toISOString());
                    await signOut(auth);
                    setUser(null);
                    setLoading(false);
                }
            } catch (err) {
                console.log("Token sync err:", err);
                // On error, clear the session
                await signOut(auth).catch(() => {});
                setUser(null);
                setLoading(false);
            }
        });

         return () => {
            console.log("WORKOPS DEBUG | auth | listener removed |", new Date().toISOString());
            unsubscribe();
        };
    }, [silentNativeSignIn]);

    // Send Firebase token to backend => sets cookie session
    // Returns true if session is valid, false otherwise
    const syncTokenWithBackend = async (idToken) => {
        try {
            const res = await fetch(SummaryApi.googleAuth.url, {
                method: SummaryApi.googleAuth.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });

            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                return true;
            } else {
                setUser(null);
                return false;
            }

        } catch (err) {
            console.log("Backend sync failed:", err);
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Clean, stable Google login
    const loginWithGoogle = async () => {
        setLoading(true);

        try {
            let idToken;

            if (isNativeApp()) {
                console.log("Native Google Sign-In running");

                // ALWAYS initialize before using signIn
                await GoogleAuth.initialize({
                    clientId: process.env.REACT_APP_GOOGLE_WEB_CLIENT_ID,
                    scopes: ["profile", "email"],
                    grantOfflineAccess: true
                });

                const googleUser = await GoogleAuth.signIn();

                // Firebase credential
                const credential = GoogleAuthProvider.credential(
                    googleUser.authentication.idToken
                );

                const firebaseResult = await signInWithCredential(auth, credential);
                idToken = await firebaseResult.user.getIdToken();

                // NOTE: Don't call disconnect() here - it breaks subsequent logins
                // Only disconnect on logout to clear the account cache

            } else {
                console.log("Web Google popup running");
                const result = await signInWithPopup(auth, googleProvider);
                idToken = await result.user.getIdToken();
            }

            // Sync with backend
            const res = await fetch(SummaryApi.googleAuth.url, {
                method: SummaryApi.googleAuth.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });

            const data = await res.json();
            if (data.success) {
                await initStorage();
                setUser(data.user);
                return { success: true };
            }

            return { success: false, error: "Authentication failed" };

        } catch (err) {
            console.log("Google Login Error:", err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Logout (native + web)
    const logout = async () => {
        try {
            setLoading(true);

            if (isNativeApp()) {
                try {
                    await GoogleAuth.signOut();
                    await GoogleAuth.disconnect(); // clears native cache
                } catch (err) {
                    console.log("Google native signOut error:", err);
                }
            }

            // Sign out from Firebase (clears auth state)
            await signOut(auth);

            // CRITICAL: Clear token cache on logout
            authTokenManager.clearCache();
            console.log("✓ Auth token cache cleared");

            // Clear backend session cookie
            await apiClient(SummaryApi.logout.url, {
                method: SummaryApi.logout.method
            }).catch(err => console.log("Backend logout error:", err));

            // Clear Capacitor Preferences (WebView storage)
            if (isNativeApp()) {
                try {
                    const { Preferences } = await import('@capacitor/preferences');
                    await Preferences.clear();
                    console.log("WebView storage cleared");
                } catch (err) {
                    console.log("Preferences clear error:", err);
                }
            }

            setUser(null);
            return { success: true };

        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    // Verify current password
    const verifyCurrentPassword = async (currentPassword) => {
        try {
            const { apiPost } = await import('../utils/apiClient');
            const response = await apiPost(SummaryApi.verifyCurrentPassword.url, {
                currentPassword
            });

            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, error: errorData.message || 'Wrong password' };
            }

            // Parse JSON response
            const data = await response.json();

            if (data.success) {
                return { success: true };
            }

            return { success: false, error: data.message || 'Wrong password' };
        } catch (error) {
            console.error('Verify current password error:', error);
            return { success: false, error: error.message || 'Failed to verify password' };
        }
    };

    // Set user password
    const setUserPassword = async (password, confirmPassword, currentPassword = null) => {
        try {
            const { apiPost } = await import('../utils/apiClient');
            const requestBody = {
                password,
                confirmPassword
            };

            // Include currentPassword if provided (for password changes)
            if (currentPassword) {
                requestBody.currentPassword = currentPassword;
            }

            const response = await apiPost(SummaryApi.setPassword.url, requestBody);

            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, error: errorData.message || 'Failed to set password' };
            }

            // Parse JSON response
            const data = await response.json();

            if (data.success) {
                // Update local user state
                setUser(prev => ({
                    ...prev,
                    isPasswordSet: true
                }));
                return { success: true };
            }

            return { success: false, error: data.message || 'Failed to set password' };
        } catch (error) {
            console.error('Set password error:', error);
            return { success: false, error: error.message || 'Failed to set password' };
        }
    };

    // Login with email and password
    const loginWithEmailPassword = async (email, password) => {
        setLoading(true);

        try {
            const response = await fetch(SummaryApi.emailPasswordLogin.url, {
                method: SummaryApi.emailPasswordLogin.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success && data.customToken) {
                // Sign in to Firebase with custom token
                const firebaseResult = await signInWithCustomToken(auth, data.customToken);

                // Get ID token and sync with backend
                const idToken = await firebaseResult.user.getIdToken();
                await syncTokenWithBackend(idToken);

                return { success: true };
            }

            return { success: false, error: data.message || 'Login failed' };
        } catch (error) {
            console.error('Email/Password login error:', error);
            return { success: false, error: error.message || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    // Refresh user data from backend
    const refreshUser = async () => {
        try {
            const response = await apiClient(SummaryApi.getCurrentUser.url, {
                method: SummaryApi.getCurrentUser.method
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setUser(data.user);
                return { success: true };
            }

            return { success: false, error: data.message || 'Failed to refresh user data' };
        } catch (error) {
            console.error('Refresh user error:', error);
            return { success: false, error: error.message || 'Failed to refresh user data' };
        }
    };

    // Send password reset OTP
    const sendPasswordResetOTP = async (email) => {
        try {
            const response = await fetch(SummaryApi.sendPasswordResetOTP.url, {
                method: SummaryApi.sendPasswordResetOTP.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, email: data.email };
            }

            return { success: false, error: data.message || 'Failed to send OTP' };
        } catch (error) {
            console.error('Send OTP error:', error);
            return { success: false, error: error.message || 'Failed to send OTP' };
        }
    };

    // Verify password reset OTP
    const verifyPasswordResetOTP = async (email, otp) => {
        try {
            const response = await fetch(SummaryApi.verifyPasswordResetOTP.url, {
                method: SummaryApi.verifyPasswordResetOTP.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp })
            });

            const data = await response.json();

            if (data.success) {
                return { success: true };
            }

            return {
                success: false,
                error: data.message || 'Invalid OTP',
                attemptsLeft: data.attemptsLeft
            };
        } catch (error) {
            console.error('Verify OTP error:', error);
            return { success: false, error: error.message || 'Failed to verify OTP' };
        }
    };

    // Reset password with OTP
    const resetPasswordWithOTP = async (email, otp, password, confirmPassword) => {
        try {
            const response = await fetch(SummaryApi.resetPasswordWithOTP.url, {
                method: SummaryApi.resetPasswordWithOTP.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, password, confirmPassword })
            });

            const data = await response.json();

            if (data.success && data.customToken) {
                // Auto-login: Sign in with custom token
                const firebaseResult = await signInWithCustomToken(auth, data.customToken);
                const idToken = await firebaseResult.user.getIdToken();
                await syncTokenWithBackend(idToken);

                return { success: true };
            }

            return { success: false, error: data.message || 'Failed to reset password' };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message || 'Failed to reset password' };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                passwordPromptDismissed,
                setPasswordPromptDismissed,
                loginWithGoogle,
                loginWithEmailPassword,
                verifyCurrentPassword,
                setUserPassword,
                sendPasswordResetOTP,
                verifyPasswordResetOTP,
                resetPasswordWithOTP,
                refreshUser,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
