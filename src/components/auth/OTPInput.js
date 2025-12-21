import { useRef, useEffect } from 'react';

const OTPInput = ({ length = 6, value, onChange, disabled = false, error = false }) => {
  const inputRefs = useRef([]);

  useEffect(() => {
    // Auto-focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, e) => {
    const val = e.target.value;

    // Allow only numbers
    if (!/^\d*$/.test(val)) return;

    // Get new OTP array
    const newOTP = value.split('');
    newOTP[index] = val.slice(-1); // Take only last digit

    const newValue = newOTP.join('');
    onChange(newValue);

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);

    // Focus last filled input
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const borderColor = error ? 'border-red-500' : (value.length === length ? 'border-green-500' : 'border-gray-300');

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={`w-12 h-14 text-center text-2xl font-bold border-2 ${borderColor} rounded-xl focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
