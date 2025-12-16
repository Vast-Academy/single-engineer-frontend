import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import logo from '../images/logo.png';

const Login = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const { loginWithGoogle, loginWithEmailPassword, user, loading, logout } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Trigger bottom sheet animation
    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    // Show app logo while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <img
                        src={logo}
                        alt="App Logo"
                        className="w-32 h-32 mx-auto animate-pulse"
                    />
                </div>
            </div>
        );
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');

        const result = await loginWithGoogle();

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Login failed. Please try again.');
        }

        setIsLoading(false);
    };

    const handleLogin = async () => {
        // Validate inputs
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await loginWithEmailPassword(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Invalid email or password. Please try again.');
        }

        setIsLoading(false);
    };

    const handleForceLogout = async () => {
        setIsLoading(true);
        setError('');
        const result = await logout();
        if (result.success) {
            setError('');
            window.location.reload(); // Force page reload after logout
        } else {
            setError('Logout failed. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-end max-w-md mx-auto relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-3xl mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white text-4xl font-bold">MS</span>
                </div>
                <h1 className="text-white text-2xl font-bold">Mera Software</h1>
                <p className="text-blue-100 text-sm mt-2">Welcome Back!</p>
            </div>

            {/* Bottom Sheet Card */}
            <div
                className={`w-full px-4 transition-all duration-700 ease-out ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}
                style={{ minHeight: '65vh' }}
            >
                <div className="bg-white rounded-t-3xl shadow-2xl h-full">
                    {/* Handle Bar */}
                    <div className="pt-3 pb-2 flex justify-center">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                    </div>

                    {/* Content */}
                    <div className="px-5 pt-2 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(65vh - 24px)' }}>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Login</h2>
                        <p className="text-slate-500 text-sm mb-5">Enter your credentials to continue</p>

                        {/* Already Logged In Warning */}
                        {user && !loading && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                <p className="text-yellow-800 text-xs text-center mb-2">
                                    You are already logged in as <strong>{user.displayName || user.email}</strong>
                                </p>
                                <button
                                    onClick={handleForceLogout}
                                    disabled={isLoading}
                                    className="w-full bg-yellow-600 text-white text-xs font-semibold py-2 rounded-lg active:scale-98 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Logging out...' : 'Not you? Logout'}
                                </button>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-xs text-center">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3.5">
                            {/* Email Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full pl-12 pr-12 py-3 bg-slate-50 border-0 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 active:scale-90 transition-transform"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password */}
                            <div className="text-right -mt-1">
                                <button className="text-xs text-blue-600 font-semibold active:text-blue-700">
                                    Forgot Password?
                                </button>
                            </div>

                            {/* Login Button */}
                            <button
                                onClick={handleLogin}
                                className="w-full bg-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-98 transition-all mt-4"
                            >
                                <span className="text-base">Sign In</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>

                            {/* Divider */}
                            <div className="relative py-2.5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 bg-white text-slate-400 text-xs font-medium uppercase">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            {/* Continue with Google Button */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 active:scale-98 active:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm">Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        <span className="text-sm">Continue with Google</span>
                                    </>
                                )}
                            </button>

                            {/* Sign Up Link */}
                            {/* <div className="text-center pt-3">
                                <p className="text-slate-600 text-xs">
                                    Don't have an account?{' '}
                                    <button className="text-blue-600 font-bold active:text-blue-700">
                                        Sign Up
                                    </button>
                                </p>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
