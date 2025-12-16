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
    const silentAttemptedRef = useRef(false);

    // Initialize Google Native SDK on startup
    useEffect(() => {
        if (isNativeApp()) {
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
            const freshIdToken = await firebaseResult.user.getIdToken();
            await syncTokenWithBackend(freshIdToken);
            return true;
        } catch (err) {
            console.log("Silent native sign-in failed:", err?.message || err);
            return false;
        }
    }, []);

    // Listen to user/token state
    useEffect(() => {
        initStorage().catch(err => console.error("Storage init error:", err));

        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null);
                setLoading(false);
                // If native, attempt silent sign-in before giving up
                await silentNativeSignIn();
                return;
            }

            try {
                await initStorage();
                const idToken = await firebaseUser.getIdToken(true);

                // Validate session with backend
                const isValid = await syncTokenWithBackend(idToken);

                // If backend rejects the session, sign out
                if (!isValid) {
                    console.log("Session invalid, signing out...");
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

        return () => unsubscribe();
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

    // Set user password
    const setUserPassword = async (password, confirmPassword) => {
        try {
            const { apiPost } = await import('../utils/apiClient');
            const response = await apiPost(SummaryApi.setPassword.url, {
                password,
                confirmPassword
            });

            if (response.success) {
                // Update local user state
                setUser(prev => ({
                    ...prev,
                    isPasswordSet: true
                }));
                return { success: true };
            }

            return { success: false, error: response.message };
        } catch (error) {
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

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmailPassword, setUserPassword, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
