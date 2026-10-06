import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  RotateCw,
  ArrowLeft,
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

  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    if (devOtp) {
      setSuccessNotice(`Demo Verification Code: ${devOtp}`);
    }
  }, [devOtp]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];

    if (cleanChar.length > 1) {
      const pastedChars = cleanChar.slice(0, 6).split('');
      pastedChars.forEach((ch, idx) => {
        if (index + idx < 6) newDigits[index + idx] = ch;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(5, index + pastedChars.length);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    newDigits[index] = cleanChar;
    setDigits(newDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const code = digits.join('');
  const isCodeComplete = code.length === 6;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isCodeComplete) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (purpose === 'forgot_password') {
        const res = await api.verifyResetOtp({ email, otp: code });
        onVerificationSuccess(res.resetToken);
      } else {
        await api.verifyRegistrationOtp({ email, otp: code });
        onVerificationSuccess();
      }
    } catch (err: any) {
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setError(err?.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const res = await api.resendOtp({ email, purpose });
      setResendCooldown(60);
      setSuccessNotice(
        res.devOtp
          ? `New verification code sent! (Demo Code: ${res.devOtp})`
          : 'A new verification code has been dispatched to your email.'
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-8 border border-[#CBD5E1] rounded-[8px] space-y-6">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[6px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                APX
              </div>
              <h1 className="text-lg font-bold text-[#0F172A]">
                Apex LMS
              </h1>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] pt-2">
              Verify your email
            </h2>
            <p className="text-xs text-[#64748B]">
              We sent a 6-digit verification code to <strong className="text-[#0F172A]">{email}</strong>.
            </p>
          </div>

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-2 text-center">
                Enter 6-Digit Code
              </label>

              <div className="flex items-center justify-between gap-2">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-12 text-center text-lg font-bold font-mono bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isCodeComplete}
              className="w-full h-[44px] bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white font-medium text-[14px] rounded-[6px] transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify Code</span>
              )}
            </button>
          </form>

          {/* Resend and timer */}
          <div className="flex items-center justify-between text-xs text-[#64748B] pt-2">
            <span>
              {resendCooldown > 0 ? (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" /> Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Resend code</span>
                </button>
              )}
            </span>

            <span>{attemptsRemaining} attempts left</span>
          </div>

          <div className="pt-4 border-t border-[#CBD5E1] text-center">
            <button
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

        </div>

        <div className="mt-6 text-center text-xs text-[#64748B]">
          Apex Core Banking Platform • Multi-Factor Verification
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;
