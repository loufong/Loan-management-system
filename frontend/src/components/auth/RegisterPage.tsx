import React, { useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { UserProfile } from '../../types';
import logoImg from '../../assets/logo-transparent.png';

interface RegisterPageProps {
  onRegisterSuccess: (email: string, user?: UserProfile, token?: string) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [showCustomUsername, setShowCustomUsername] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically derive clean username from full name or email
  const autoUsername = useMemo(() => {
    if (customUsername.trim()) return customUsername.trim();
    const clean = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');
    if (clean) return clean;
    if (email.includes('@')) {
      return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    }
    return '';
  }, [fullName, customUsername, email]);

  // Split full name into first and last name for backend compliance
  const { firstName, lastName } = useMemo(() => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0] || '', lastName: parts[0] || '' };
    }
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || first;
    return { firstName: first, lastName: last };
  }, [fullName]);

  // Criteria checks for password checklist
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  // Password Strength Score (0 to 4)
  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUpperAndLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSymbol) score += 1;
    return score;
  }, [password, hasMinLength, hasUpperAndLower, hasNumber, hasSymbol]);

  const strengthLabel = useMemo(() => {
    if (!password) return '';
    if (strengthScore <= 1) return t('Weak', 'Weak');
    if (strengthScore === 2) return t('Fair', 'Fair');
    if (strengthScore === 3) return t('Good', 'Good');
    return t('Strong', 'Strong');
  }, [password, strengthScore, t]);

  const strengthColor = useMemo(() => {
    if (strengthScore <= 1) return 'bg-rose-500';
    if (strengthScore === 2) return 'bg-amber-500';
    if (strengthScore === 3) return 'bg-blue-600';
    return 'bg-emerald-600';
  }, [strengthScore]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFullName = fullName.trim();
    if (!cleanFullName) {
      setError(t('Please enter your full name.', 'Please enter your full name.'));
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !isEmailValid) {
      setError(t('Please enter a valid email address (e.g. name@gmail.com).', 'Please enter a valid email address (e.g. name@gmail.com).'));
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError(t('Please enter a valid phone number (at least 8 digits).', 'Please enter a valid phone number (at least 8 digits).'));
      return;
    }

    if (password.length < 8) {
      setError(t('Password must be at least 8 characters long.', 'Password must be at least 8 characters long.'));
      return;
    }

    if (strengthScore < 3) {
      setError(t('Please make your password stronger with uppercase, lowercase, numbers, and symbols.', 'Please make your password stronger with uppercase, lowercase, numbers, and symbols.'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match. Please re-enter to confirm.', 'Passwords do not match. Please re-enter to confirm.'));
      return;
    }

    if (!agreeTerms) {
      setError(t('You must agree to the Terms of Service and Privacy Policy to create an account.', 'You must agree to the Terms of Service and Privacy Policy to create an account.'));
      return;
    }

    const finalUsername = (customUsername.trim() || autoUsername || cleanEmail.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');

    setIsLoading(true);

    try {
      const res = await api.register({
        fullName: cleanFullName,
        firstName,
        lastName,
        username: finalUsername,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        confirmPassword,
      });

      onRegisterSuccess(cleanEmail, res?.user, res?.token || res?.accessToken);
    } catch (err: any) {
      setError(err?.message || t('Unable to create account. Please check your details and try again.', 'Unable to create account. Please check your details and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[500px]">
        {/* Top Controls: Back to Login & Language Switcher */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#E2E8F0] rounded-[6px] hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('Sign In', 'Sign In')}</span>
          </button>

          {/* Language Switcher */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-[#E2E8F0] rounded-[6px]">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('km')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                language === 'km'
                  ? 'bg-white text-[#2563EB] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              ខ្មែរ
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[12px] bg-white border border-slate-200/80 mb-3 shadow-xs p-2">
            <img src={logoImg} alt="Jam Song Vich" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t('app_name', 'Jam Song Vich')}
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mt-0.5">
            {t('app_subtitle', 'Loan Management System')}
          </p>
        </div>

        {/* Clean Enterprise Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 sm:p-8 space-y-5">
          {/* Card Title & Subtitle */}
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">
              {t('Create Borrower Account', 'Create Borrower Account')}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              {t(
                'Register for online credit access. An email verification code will be sent to confirm your identity.',
                'Register for online credit access. An email verification code will be sent to confirm your identity.'
              )}
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Field 1: Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {t('Full Name', 'Full Name')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  required
                  autoFocus
                  className="w-full h-11 px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Seamless Username Preview / Customize Link */}
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B]">
                <span>
                  {t('Username:', 'Username:')}{' '}
                  <span className="font-mono font-medium text-[#0F172A]">
                    @{autoUsername || 'username'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomUsername(!showCustomUsername)}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-medium cursor-pointer"
                >
                  {showCustomUsername ? t('Hide', 'Hide') : t('Customize', 'Customize')}
                </button>
              </div>

              {/* Optional Custom Username Input */}
              {showCustomUsername && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="Enter custom username"
                    className="w-full h-9 px-3 rounded-[6px] bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">
                    {t('Letters, numbers, dots, and underscores only.', 'Letters, numbers, dots, and underscores only.')}
                  </p>
                </div>
              )}
            </div>

            {/* Field 2: Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0F172A]">
                  {t('Email Address', 'Email Address')} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-[4px] border border-blue-100">
                  {t('OTP Verification', 'OTP Verification')}
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className={`w-full h-11 px-3.5 pl-10 pr-10 rounded-[6px] bg-white border text-[#0F172A] text-sm focus:outline-none focus:ring-1 transition-colors placeholder:text-[#94A3B8] ${
                    isEmailValid
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-[#E2E8F0] focus:border-[#2563EB] focus:ring-[#2563EB]'
                  }`}
                />
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {isEmailValid && (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                {t(
                  'We will send a 6-digit confirmation code to this address.',
                  'We will send a 6-digit confirmation code to this address.'
                )}
              </p>
            </div>

            {/* Field 3: Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {t('Phone Number', 'Phone Number')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 012 345 678"
                  autoComplete="tel"
                  required
                  className="w-full h-11 px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Field 4: Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0F172A]">
                  {t('Password', 'Password')} <span className="text-rose-500">*</span>
                </label>
                {password && (
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {t('Strength:', 'Strength:')}{' '}
                    <span className={strengthScore >= 3 ? 'text-emerald-600' : strengthScore === 2 ? 'text-amber-600' : 'text-rose-600'}>
                      {strengthLabel}
                    </span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('At least 8 characters', 'At least 8 characters')}
                  autoComplete="new-password"
                  required
                  className="w-full h-11 px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter & Visual Checklist */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    <div className={`rounded-full transition-colors ${strengthScore >= 1 ? strengthColor : 'bg-slate-200'}`} />
                    <div className={`rounded-full transition-colors ${strengthScore >= 2 ? strengthColor : 'bg-slate-200'}`} />
                    <div className={`rounded-full transition-colors ${strengthScore >= 3 ? strengthColor : 'bg-slate-200'}`} />
                    <div className={`rounded-full transition-colors ${strengthScore >= 4 ? strengthColor : 'bg-slate-200'}`} />
                  </div>

                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-[#64748B]">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{t('8+ characters', '8+ characters')}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpperAndLower ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasUpperAndLower ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{t('Upper & lowercase', 'Upper & lowercase')}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{t('At least 1 number', 'At least 1 number')}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasSymbol ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{t('1 special symbol', '1 special symbol')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Field 5: Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0F172A]">
                  {t('Confirm Password', 'Confirm Password')} <span className="text-rose-500">*</span>
                </label>
                {confirmPassword && (
                  <span className={`text-[11px] font-semibold ${passwordsMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {passwordsMatch ? `✓ ${t('Passwords match', 'Passwords match')}` : t('Passwords do not match', 'Passwords do not match')}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('Repeat your password', 'Repeat your password')}
                  autoComplete="new-password"
                  required
                  className={`w-full h-11 px-3.5 pl-10 pr-10 rounded-[6px] bg-white border text-[#0F172A] text-sm focus:outline-none focus:ring-1 transition-colors placeholder:text-[#94A3B8] ${
                    passwordsMatch
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-[#E2E8F0] focus:border-[#2563EB] focus:ring-[#2563EB]'
                  }`}
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 6: Agree to Terms and Conditions Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-[#475569] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                  required
                />
                <span className="leading-relaxed">
                  {t('I agree to the', 'I agree to the')}{' '}
                  <span className="text-[#2563EB] font-medium hover:underline">{t('Terms of Service', 'Terms of Service')}</span>{' '}
                  {t('and', 'and')}{' '}
                  <span className="text-[#2563EB] font-medium hover:underline">{t('Privacy Policy', 'Privacy Policy')}</span>
                  {t(', and confirm that all submitted information is accurate.', ', and confirm that all submitted information is accurate.')}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{t('Creating account...', 'Creating account...')}</span>
                </>
              ) : (
                <>
                  <span>{t('Create Account & Continue', 'Create Account & Continue')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account link */}
          <div className="text-center text-xs text-[#64748B] pt-2">
            <span>{t('Already have an account?', 'Already have an account?')} </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors cursor-pointer"
            >
              {t('Sign In', 'Sign In')}
            </button>
          </div>

          {/* Trust & Security Badge */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-center gap-2 text-xs text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{t('Bank-grade 256-bit encryption • Your privacy is protected', 'Bank-grade 256-bit encryption • Your privacy is protected')}</span>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="text-center text-xs text-[#64748B] space-y-0.5 mt-6">
          <p>© 2026 Jam Song Vich • {t('app_subtitle', 'Loan Management System')}</p>
          <p className="text-[11px] text-slate-400">
            {t('Compliant with National Bank of Cambodia Standards', 'Compliant with National Bank of Cambodia Standards')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
