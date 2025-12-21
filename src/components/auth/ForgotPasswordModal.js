import { useState, useEffect } from 'react';
import { Mail, Lock, X, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import OTPInput from './OTPInput';

const ForgotPasswordModal = ({ isOpen, onClose, userEmail, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Password
  const [email, setEmail] = useState(userEmail || '');
  const [otp, setOTP] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Password visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Confirm password validation state
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Timer states
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds = 1 minute
  const [canResend, setCanResend] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);

  const { sendPasswordResetOTP, verifyPasswordResetOTP, resetPasswordWithOTP } = useAuth();

  // Countdown timer
  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [step, timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if OTP expired (5 minutes)
  useEffect(() => {
    if (step === 2 && otpExpiry) {
      const checkExpiry = setInterval(() => {
        if (new Date() > otpExpiry) {
          setError('OTP has expired. Please request a new one.');
        }
      }, 1000);

      return () => clearInterval(checkExpiry);
    }
  }, [step, otpExpiry]);

  // Real-time confirm password validation
  useEffect(() => {
    if (!confirmPassword) {
      setConfirmPasswordError('');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  }, [password, confirmPassword]);

  // Get border color for confirm password field
  const getConfirmPasswordBorderColor = () => {
    if (!confirmPassword) return 'border-gray-300';
    if (confirmPasswordError) return 'border-red-500';
    if (confirmPassword && password === confirmPassword) return 'border-green-500';
    return 'border-gray-300';
  };

  const handleClose = () => {
    if (!loading) {
      setStep(1);
      setEmail(userEmail || '');
      setOTP('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMessage('');
      setSuccess(false);
      setTimeLeft(60);
      setCanResend(false);
      setOtpExpiry(null);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setConfirmPasswordError('');
      onClose();
    }
  };

  const handleSendOTP = async () => {
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    const result = await sendPasswordResetOTP(email);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(`OTP successfully sent to ${result.email}`);
      setStep(2);
      setTimeLeft(60);
      setCanResend(false);
      setOtpExpiry(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes from now
    } else {
      setError(result.error);
    }
  };

  const handleResendOTP = async () => {
    setOTP('');
    setError('');
    await handleSendOTP();
  };

  const handleVerifyOTP = async () => {
    setError('');

    if (otp.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    const result = await verifyPasswordResetOTP(email, otp);
    setLoading(false);

    if (result.success) {
      setStep(3);
      setError('');
    } else {
      setError(result.error);
      if (result.attemptsLeft === 0) {
        setOTP('');
      }
    }
  };

  const handleResetPassword = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await resetPasswordWithOTP(email, otp, password, confirmPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } else {
      setError(result.error);
    }
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (step === 2 && otp.length === 6 && !loading) {
      handleVerifyOTP();
    }
  }, [otp]);

  if (!isOpen) return null;

  // Success screen
  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-8 text-center animate-slide-up">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Password Reset Successful!
          </h3>
          <p className="text-sm text-slate-600">
            You have been logged in automatically
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col modal-shell"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              disabled={loading}
              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-bold text-slate-900 flex-1 text-center">
            Forgot Password
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body p-4 space-y-4">
          {/* Step 1: Send OTP */}
          {step === 1 && (
            <>
              <p className="text-sm text-slate-600 text-center">
                Enter your email to receive a password reset OTP
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-600 text-xs text-center">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-xs text-center">{error}</p>
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <>
              <p className="text-sm text-slate-600 text-center">
                Enter the 6-digit OTP sent to
              </p>
              <p className="text-sm font-semibold text-slate-900 text-center -mt-2">
                {email}
              </p>

              <div className="my-6">
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={setOTP}
                  disabled={loading}
                  error={!!error}
                />
              </div>

              {/* Timer */}
              <div className="text-center">
                {!canResend ? (
                  <p className="text-sm text-slate-600">
                    Resend OTP in <span className="font-semibold text-blue-600">{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-xs text-center">{error}</p>
                </div>
              )}

              <p className="text-xs text-slate-500 text-center">
                OTP will expire in 5 minutes
              </p>
            </>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <>
              <p className="text-sm text-slate-600 text-center">
                Create your new password
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={loading}
                    className={`w-full pl-10 pr-10 py-3 border ${getConfirmPasswordBorderColor()} rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm password validation message */}
                {confirmPasswordError && (
                  <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>
                )}
                {confirmPassword && !confirmPasswordError && (
                  <p className="text-xs text-green-600 mt-1">Passwords match</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-xs text-center">{error}</p>
                </div>
              )}

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
