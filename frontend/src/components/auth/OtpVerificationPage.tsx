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
import { UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo-transparent.png';

export interface OtpVerificationPageProps {
  email: string;
  purpose: 'register_verification' | 'forgot_password' | 'email_verification' | 'login_verification';
  onVerificationSuccess: (resetToken?: string, verifiedUser?: UserProfile, verifiedToken?: string) => void;
  onNavigateBack: () => void;
}

export const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  email,
  purpose,
  onVerificationSuccess,
  onNavigateBack,
}) => {
  const { language, setLanguage, t } = useLanguage();
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
  }, []);

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
      setError(language === 'km' ? 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ទាំង ៦ ខ្ទង់។' : 'Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (purpose === 'login_verification') {
        const res = await api.verifyLoginOtp({ email, otp: code });
        onVerificationSuccess(undefined, res.user, res.token);
      } else if (purpose === 'forgot_password') {
        const res = await api.verifyResetOtp({ email, otp: code });
        onVerificationSuccess(res.resetToken);
      } else {
        await api.verifyRegistrationOtp({ email, otp: code });
        onVerificationSuccess();
      }
    } catch (err: any) {
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setError(err?.message || (language === 'km' ? 'លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវទេ។ សូមពិនិត្យ ហើយព្យាយាមម្តងទៀត។' : 'Invalid verification code. Please check and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const canonicalPurpose = purpose === 'login_verification' ? 'LOGIN' : purpose;
      await api.resendOtp({ email, purpose: canonicalPurpose });
      setResendCooldown(60);
      setSuccessNotice(language === 'km' ? 'លេខកូដផ្ទៀងផ្ទាត់ថ្មី ៦ ខ្ទង់ត្រូវបានផ្ញើទៅកាន់អ៊ីមែលរបស់អ្នក។' : 'A fresh 6-digit verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err?.message || (language === 'km' ? 'មិនអាចផ្ញើលេខកូដម្តងទៀតបានទេ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។' : 'Failed to resend code. Please try again later.'));
    } finally {
      setIsResending(false);
    }
  };

  const getTitle = () => {
    if (purpose === 'login_verification') {
      return language === 'km' ? 'ការចូលគណនីពីរបីជំហាន' : 'Two-Step Sign In';
    }
    if (purpose === 'forgot_password') {
      return language === 'km' ? 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ' : 'Reset Your Password';
    }
    return language === 'km' ? 'ផ្ទៀងផ្ទាត់អ៊ីមែលរបស់អ្នក' : 'Verify Your Email';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Language Switcher in Header */}
        <div className="flex justify-end mb-3">
          <div className="flex items-center bg-white p-0.5 rounded-[6px] border border-[#E2E8F0] text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setLanguage('km')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors flex items-center justify-center cursor-pointer ${
                language === 'km'
                  ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="ភាសាខ្មែរ (KH)"
            >
              <span className="text-[11px] font-bold">KH</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors flex items-center justify-center cursor-pointer ${
                language === 'en'
                  ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="English (EN)"
            >
              <span className="text-[11px] font-bold">EN</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-8 border border-[#E2E8F0] rounded-[8px] space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-slate-50 border border-slate-200/80 flex items-center justify-center p-1 overflow-hidden">
                <img src={logoImg} alt="Jam Song Vich" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-lg font-bold text-[#0F172A]">
                {t('app_name', 'Jam Song Vich')}
              </h1>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] pt-2">
              {getTitle()}
            </h2>
            <p className="text-xs text-[#64748B]">
              {language === 'km' ? 'យើងបានផ្ញើលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ទៅកាន់ ' : 'We sent a 6-digit verification code to '}
              <strong className="text-[#0F172A]">{email}</strong>.
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
                {language === 'km' ? 'បញ្ចូលលេខកូដ ៦ ខ្ទង់' : 'Enter 6-Digit Code'}
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
                    className="w-12 h-12 text-center text-lg font-bold font-mono bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isCodeComplete}
              className="w-full h-[40px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-[14px] rounded-[6px] transition-colors flex items-center justify-center gap-2 shadow-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{t('Verifying code...', 'Verifying...')}</span>
                </>
              ) : (
                <span>{t('Verify & Continue', 'Verify')}</span>
              )}
            </button>
          </form>

          {/* Resend and timer */}
          <div className="flex items-center justify-between text-xs text-[#64748B] pt-2">
            <span>
              {resendCooldown > 0 ? (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" /> {language === 'km' ? `ផ្ញើម្តងទៀតក្នុង ${resendCooldown} វិនាទី` : `Resend code in ${resendCooldown} seconds`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{t('Resend Code', 'Resend code')}</span>
                </button>
              )}
            </span>

            <span>{attemptsRemaining} {language === 'km' ? 'ដងនៅសល់' : 'attempts left'}</span>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] text-center">
            <button
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('btn_back', 'Back')}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#64748B]">
          Jam Song Vich Platform • {t('Security Verification', 'Multi-Factor Verification')}
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;

