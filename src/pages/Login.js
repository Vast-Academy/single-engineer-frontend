import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { loginWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

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

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Top Section - Gradient Background with Pattern */}
            <div className="relative h-[45vh] bg-gradient-to-br from-primary-600 via-primary-500 to-blue-400 overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full"></div>
                <div className="absolute top-[20%] left-[-15%] w-80 h-80 bg-white/5 rounded-full"></div>
                <div className="absolute bottom-[-30%] right-[20%] w-96 h-96 bg-white/10 rounded-full"></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="h-full w-full" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}></div>
                </div>

                {/* Floating Icons */}
                <div className="absolute top-[15%] left-[10%] text-4xl opacity-20">🔧</div>
                <div className="absolute top-[25%] right-[15%] text-3xl opacity-20">⚙️</div>
                <div className="absolute bottom-[30%] left-[20%] text-3xl opacity-20">🛠️</div>
                <div className="absolute bottom-[20%] right-[25%] text-4xl opacity-20">📱</div>
            </div>

            {/* Bottom Section - Login Card */}
            <div className="flex-1 relative">
                {/* Card that overlaps */}
                <div className="absolute left-0 right-0 top-[-60px] px-6">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-4xl">🛠️</span>
                            </div>
                        </div>

                        {/* App Name */}
                        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
                            Engineer WebApp
                        </h1>
                        <p className="text-gray-500 text-center mb-8">
                            Manage your work efficiently
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm text-center">{error}</p>
                            </div>
                        )}

                        {/* Google Sign In Button */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-6 py-4 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    {/* Google Icon */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span>Continue with Google</span>
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-gray-400 text-sm">Welcome</span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                        </div>

                        {/* Info Text */}
                        <p className="text-gray-400 text-sm text-center">
                            Sign in to access your dashboard and manage your engineering tasks seamlessly.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-0 right-0">
                    <p className="text-gray-400 text-xs text-center">
                        © 2024 Engineer WebApp. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
