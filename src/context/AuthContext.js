import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut, onIdTokenChanged } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import SummaryApi from '../common';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Listen to Firebase auth state and token changes
    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, get fresh token and sync with backend
                try {
                    const idToken = await firebaseUser.getIdToken(true); // force refresh
                    await syncTokenWithBackend(idToken);
                } catch (error) {
                    console.error('Token sync error:', error);
                }
            } else {
                // User is signed out
                setUser(null);
                setLoading(false);
            }
        });

        // Set up token refresh interval (every 55 minutes)
        const tokenRefreshInterval = setInterval(async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const idToken = await currentUser.getIdToken(true); // force refresh
                    await syncTokenWithBackend(idToken);
                    console.log('Token refreshed successfully');
                } catch (error) {
                    console.error('Token refresh error:', error);
                }
            }
        }, 55 * 60 * 1000); // 55 minutes

        return () => {
            unsubscribe();
            clearInterval(tokenRefreshInterval);
        };
    }, []);

    // Sync token with backend (updates cookie)
    const syncTokenWithBackend = async (idToken) => {
        try {
            const response = await fetch(SummaryApi.googleAuth.url, {
                method: SummaryApi.googleAuth.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ idToken })
            });

            const data = await response.json();

            if (data.success) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Backend sync error:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Get fresh token for API calls
    const getFreshToken = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const idToken = await currentUser.getIdToken(true);
            await syncTokenWithBackend(idToken);
            return idToken;
        }
        return null;
    };

    // Google Sign In
    const loginWithGoogle = async () => {
        try {
            setLoading(true);

            // Sign in with Google popup
            const result = await signInWithPopup(auth, googleProvider);

            // Get ID token
            const idToken = await result.user.getIdToken();

            // Send token to backend
            const response = await fetch(SummaryApi.googleAuth.url, {
                method: SummaryApi.googleAuth.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ idToken })
            });

            const data = await response.json();

            if (data.success) {
                setUser(data.user);
                return { success: true, user: data.user };
            } else {
                throw new Error(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        try {
            setLoading(true);

            // Sign out from Firebase
            await signOut(auth);

            // Clear backend session
            await fetch(SummaryApi.logout.url, {
                method: SummaryApi.logout.method,
                credentials: 'include'
            });

            setUser(null);
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        loginWithGoogle,
        logout,
        getFreshToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
