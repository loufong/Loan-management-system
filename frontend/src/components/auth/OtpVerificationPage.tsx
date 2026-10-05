import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  RotateCw,
  ArrowLeft,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

export interface OtpVerificationPageProps {
  email: string;
  purpose: 'register_verification' | 'forgot_password' | 'email_verification';
  devOtp?: string;
  onVerificationSuccess: (resetToken?: string) => void;
  onNavigateBack: () => void;
}

export const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  email,
  purpose,
  devOtp,
  onVerificationSuccess,
  onNavigateBack,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 60-second cooldown timer for Resend OTP
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    if (devOtp) {
      setSuccessNotice(`Demo Verification Code: ${devOtp}`);
    }
  }, [devOtp]);

  // Countdown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/[^0-9]/g, '');

    if (!cleanChar) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const charToSet = cleanChar.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = charToSet;
    setDigits(newDigits);
    setError(null);

    // Auto-advance
    if (index < 5 && charToSet) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    const cleanNumbers = pastedText.replace(/[^0-9]/g, '').slice(0, 6);

    if (cleanNumbers.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = cleanNumbers[i] || '';
      }
      setDigits(newDigits);
      const focusIndex = Math.min(cleanNumbers.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.verifyOtp({
        email,
        code: otpCode,
        purpose,
      });

      onVerificationSuccess(res.resetToken);
    } catch (err: any) {
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setError(err?.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await api.resendOtp({
        email,
        purpose,
      });

      setResendCooldown(res.expiresInSeconds || 60);
      setSuccessNotice(res.devOtp ? `New Demo Code: ${res.devOtp}` : 'A fresh 6-digit code has been dispatched to your email.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Unable to resend OTP at this time. Please wait a moment before trying again.');
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-sm mb-3">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          Apex Core Banking
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-sans">
          Email Verification
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-xl shadow-sm">
          
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Enter verification code
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              We sent a 6-digit code to
            </p>
            <p className="text-xs font-semibold text-slate-800 font-mono mt-0.5 break-all">
              {email}
            </p>
          </div>

          {/* Success Banner */}
          {successNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{successNotice}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 6-Digit OTP Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <div className="flex justify-between items-center gap-2" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={isLoading || attemptsRemaining <= 0}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold rounded-lg border transition-colors focus:outline-hidden ${
                      digit
                        ? 'border-blue-600 bg-white text-slate-900'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-3 px-0.5">
                <span>Code expires in 5 minutes</span>
                <span>Attempts left: <strong className="font-mono text-slate-700">{attemptsRemaining}</strong></span>
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || !isComplete || attemptsRemaining <= 0}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify &amp; Continue</span>
              )}
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-2">
              Didn't receive the email? Check your spam folder or request a new code.
            </p>

            {resendCooldown > 0 ? (
              <span className="text-xs text-slate-400 font-mono">
                Resend code in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1.5"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending fresh code...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Resend code</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Back Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>© 2026 Apex Core LMS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;
