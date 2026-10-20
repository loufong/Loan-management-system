import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo-transparent.png';

interface SetNewPasswordPageProps {
  email?: string;
  resetToken?: string;
  onPasswordResetSuccess: () => void;
  onNavigateToLogin?: () => void;
}

export const SetNewPasswordPage: React.FC<SetNewPasswordPageProps> = ({
  email: initialEmail = '',
  resetToken = '',
  onPasswordResetSuccess,
  onNavigateToLogin,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError(language === 'km' ? 'សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលដែលបានចុះឈ្មោះ។' : 'Please provide your registered email address.');
      return;
    }

    if (!resetToken && (!otp || otp.trim().length !== 6)) {
      setError(language === 'km' ? 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ដែលបានទទួលក្នុងអ៊ីមែលរបស់អ្នក។' : 'Please enter the 6-digit verification code received in your email.');
      return;
    }

    if (!isPasswordValid) {
      setError(language === 'km' ? 'ពាក្យសម្ងាត់មិនទាន់បំពេញគ្រប់លក្ខខណ្ឌសុវត្ថិភាពទេ។' : 'Password does not fulfill all security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError(language === 'km' ? 'ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ។ សូមពិនិត្យម្តងទៀត។' : 'Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword({
        email: cleanEmail,
        resetToken: resetToken || undefined,
        otp: otp ? otp.trim() : undefined,
        code: otp ? otp.trim() : undefined,
        newPassword,
        confirmPassword,
      });

      onPasswordResetSuccess();
    } catch (err: any) {
      setError(err?.message || (language === 'km' ? 'មិនអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។ វគ្គកំណត់ឡើងវិញអាចផុតកំណត់។' : 'Unable to reset password. The reset session may have expired.'));
    } finally {
      setIsLoading(false);
    }
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
              {t('Set New Password', 'Reset Your Password')}
            </h2>
            <p className="text-xs text-[#64748B]">
              {t('Create a new, strong password for your account.', 'Enter your reset verification code and create a new secure password.')}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                {t('Email Address', 'Email Address')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-[40px] px-3.5 pl-10 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {!resetToken && (
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                  {t('Verification Code', '6-Digit Verification Code (OTP)')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full h-[40px] px-3.5 pl-10 font-mono tracking-widest bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                {t('New Password', 'New Password')}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('At least 8 characters', 'Enter new password')}
                  className="w-full h-[40px] px-3.5 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                {t('Confirm Password', 'Confirm Password')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('Repeat your password', 'Confirm new password')}
                  className="w-full h-[40px] px-3.5 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px] text-xs space-y-1">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1 ${hasMinLength ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> {language === 'km' ? '៨+ តួអក្សរ' : '8+ Characters'}
                </div>
                <div className={`flex items-center gap-1 ${hasUpperCase ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> {language === 'km' ? 'អក្សរធំ' : 'Uppercase Letter'}
                </div>
                <div className={`flex items-center gap-1 ${hasLowerCase ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> {language === 'km' ? 'អក្សរតូច' : 'Lowercase Letter'}
                </div>
                <div className={`flex items-center gap-1 ${hasNumber && hasSpecialChar ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> {language === 'km' ? 'លេខ & និមិត្តសញ្ញា' : 'Number & Symbol'}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="w-full h-[40px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-[14px] rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-4 shadow-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{t('Resetting password...', 'Resetting password...')}</span>
                </>
              ) : (
                <span>{t('Reset Password & Continue', 'Reset Password')}</span>
              )}
            </button>
          </form>

          {onNavigateToLogin && (
            <div className="pt-4 border-t border-[#E2E8F0] text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('Back to Sign in', 'Back to sign in')}</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-[#64748B]">
          Jam Song Vich • {t('Bank-grade 256-bit encryption • Your privacy is protected', 'Cryptographic Credential Vault')}
        </div>
      </div>
    </div>
  );
};

export default SetNewPasswordPage;

