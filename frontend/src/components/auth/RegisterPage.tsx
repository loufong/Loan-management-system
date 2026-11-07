import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
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
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFullName = fullName.trim();
    if (!cleanFullName || cleanFullName.length < 2) {
      setError(t('Please enter your full name (at least 2 characters).', 'Please enter your full name (at least 2 characters).'));
      return;
    }

    const cleanEmail = email.trim();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!cleanEmail || !isEmailValid) {
      setError(t('Please enter a valid email address (e.g. name@example.com).', 'Please enter a valid email address (e.g. name@example.com).'));
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

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber) {
      setError(t('Password must contain at least one uppercase letter, one lowercase letter, and one number.', 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match. Please re-enter to confirm.', 'Passwords do not match. Please re-enter to confirm.'));
      return;
    }

    if (!agreeTerms) {
      setError(t('You must agree to the Terms of Service and Privacy Policy to continue.', 'You must agree to the Terms of Service and Privacy Policy to continue.'));
      return;
    }

    // Parse first and last name
    const parts = cleanFullName.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || firstName;

    // Automatically derive clean username for backend compliance
    let autoUsername = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (autoUsername.length < 3) {
      autoUsername = cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now().toString().slice(-4)}`;
    }
    if (autoUsername.length < 3) {
      autoUsername = `usr_${autoUsername}`;
    }

    setIsLoading(true);

    try {
      const res = await api.register({
        fullName: cleanFullName,
        firstName,
        lastName,
        username: autoUsername,
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
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        {/* Top Controls: Back to Sign In & Language Switcher */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-[#E2E8F0] rounded-[6px] hover:bg-slate-50 transition shadow-xs cursor-pointer"
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

        {/* Institutional Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[12px] bg-slate-50 border border-slate-200/80 mb-3 shadow-xs p-2">
            <img src={logoImg} alt="Jam Song Vich" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t('app_name', 'Jam Song Vich')}
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mt-0.5">
            {t('app_subtitle', 'Loan Management System')}
          </p>
        </div>

        {/* Clean Register Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 sm:p-8 space-y-5">
          {/* Form Header */}
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">
              {t('Create an account', 'Create an account')}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t('Enter your details below to register for a borrower account.', 'Enter your details below to register for a borrower account.')}
            </p>
          </div>

          {/* Error Notice Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug flex-1">{error}</span>
            </div>
          )}

          {/* Registration Form */}
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
                  autoComplete="name"
                  required
                  autoFocus
                  className="w-full h-11 px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {t('Email Address', 'Email Address')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full h-11 px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
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
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {t('Password', 'Password')} <span className="text-rose-500">*</span>
              </label>
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                {t('Must be at least 8 characters with letters and numbers.', 'Must be at least 8 characters with letters and numbers.')}
              </p>
            </div>

            {/* Field 5: Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {t('Confirm Password', 'Confirm Password')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('Re-enter your password', 'Re-enter your password')}
                  autoComplete="new-password"
                  required
                  className="w-full h-11 px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 6: Terms and Conditions */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-[4px] border-[#CBD5E1] text-[#2563EB] focus:ring-0 cursor-pointer"
                  required
                />
                <span className="text-xs text-[#475569] leading-relaxed">
                  {t('I agree to the', 'I agree to the')}{' '}
                  <span className="text-[#2563EB] hover:underline font-medium">
                    {t('Terms of Service', 'Terms of Service')}
                  </span>{' '}
                  {t('and', 'and')}{' '}
                  <span className="text-[#2563EB] hover:underline font-medium">
                    {t('Privacy Policy', 'Privacy Policy')}
                  </span>
                  .
                </span>
              </label>
            </div>

            {/* Field 7: CREATE ACCOUNT Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold tracking-wider rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{t('CREATING ACCOUNT...', 'CREATING ACCOUNT...')}</span>
                </>
              ) : (
                <span>{t('CREATE ACCOUNT', 'CREATE ACCOUNT')}</span>
              )}
            </button>
          </form>

          {/* Already have an account link */}
          <div className="text-center text-xs text-[#64748B] pt-1">
            <span>{t('Already have an account?', 'Already have an account?')} </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors cursor-pointer"
            >
              {t('Sign In', 'Sign In')}
            </button>
          </div>

          {/* Security Notice */}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>
              {t('Secure 256-bit TLS connection. Authorized access only.', 'Secure 256-bit TLS connection. Authorized access only.')}
            </span>
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
