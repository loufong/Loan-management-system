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
  Sparkles,
  Edit3,
} from 'lucide-react';
import { api } from '../../services/api';
import logoImg from '../../assets/logo-transparent.png';

interface RegisterPageProps {
  onRegisterSuccess: (email: string) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  // Password Strength Evaluation
  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return '';
    if (strengthScore <= 1) return 'Weak';
    if (strengthScore === 2) return 'Fair';
    if (strengthScore === 3) return 'Good';
    return 'Strong';
  }, [password, strengthScore]);

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
      setError('Please enter your full name.');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !isEmailValid) {
      setError('Please enter a valid email address (e.g. name@gmail.com, name@yahoo.com).');
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (strengthScore < 3) {
      setError('Please make your password stronger with uppercase, lowercase, numbers, and symbols.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter to confirm.');
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

      onRegisterSuccess(cleanEmail);
    } catch (err: any) {
      setError(err?.message || 'Unable to create account. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[490px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[12px] bg-white border border-slate-200/80 mb-3 shadow-xs p-2">
            <img src={logoImg} alt="Jam Song Vich" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Jam Song Vich
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mt-0.5">
            Loan Management System
          </p>
        </div>

        {/* Clean, Human-Friendly Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 sm:p-8 space-y-5">
          {/* Form Header */}
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Create your account
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Fast, simple registration. We will send a 6-digit verification code to your email.
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* 1. Full Name */}
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  required
                  autoFocus
                  className="w-full h-[44px] px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Smart Auto-Username Pill */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#64748B]">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#2563EB]" />
                  <span>Username:</span>
                  <span className="font-mono font-medium text-[#0F172A]">
                    @{autoUsername || 'username'}
                  </span>
                </div>
                {!isEditingUsername ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingUsername(true)}
                    className="text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>Customize</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingUsername(false);
                      setCustomUsername('');
                    }}
                    className="text-[#64748B] hover:text-[#0F172A] font-medium cursor-pointer"
                  >
                    Reset auto
                  </button>
                )}
              </div>

              {/* Optional Custom Username Field (if user clicked customize) */}
              {isEditingUsername && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="Enter custom username"
                    className="w-full h-[36px] px-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-[13px] font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Letters, numbers, dots, and underscores only.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-[#0F172A]">
                  Email Address
                </label>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-[4px] border border-blue-100">
                  OTP sent here
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className={`w-full h-[44px] px-3.5 pl-10 pr-10 rounded-[6px] bg-white border text-[#0F172A] text-[14px] focus:outline-none focus:ring-1 transition-colors placeholder:text-[#94A3B8] ${
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
                Enter your email (Gmail, Yahoo, Outlook, etc.) to receive your 6-digit verification code.
              </p>
            </div>

            {/* 3. Phone Number */}
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 012 345 678"
                  required
                  className="w-full h-[44px] px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
                />
                <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-[#0F172A]">
                  Password
                </label>
                {password && (
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    Strength: <span className={strengthScore >= 3 ? 'text-emerald-600' : strengthScore === 2 ? 'text-amber-600' : 'text-rose-600'}>{strengthLabel}</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full h-[44px] px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#94A3B8]"
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

              {/* Visual Strength Meter */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    <div className={`rounded-full transition-colors ${strengthScore >= 1 ? strengthColor : 'bg-slate-200'}`} />
                    <div className={`rounded-full transition-colors ${strengthScore >= 2 ? strengthColor : 'bg-slate-200'}`} />
                    <div className={`rounded-full transition-colors ${strengthScore >= 3 ? strengthColor : 'bg-slate-200'}`} />
                    <div className={`rounded-full transition-colors ${strengthScore >= 4 ? strengthColor : 'bg-slate-200'}`} />
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Use 8+ characters combining uppercase, lowercase, numbers &amp; symbols.
                  </p>
                </div>
              )}
            </div>

            {/* 5. Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-[#0F172A]">
                  Confirm Password
                </label>
                {confirmPassword && (
                  <span className={`text-[11px] font-semibold ${passwordsMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {passwordsMatch ? '✓ Matches' : 'Does not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className={`w-full h-[44px] px-3.5 pl-10 pr-10 rounded-[6px] bg-white border text-[#0F172A] text-[14px] focus:outline-none focus:ring-1 transition-colors placeholder:text-[#94A3B8] ${
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-3 disabled:opacity-50 cursor-pointer shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending verification code...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <div className="text-center text-[13px] text-[#64748B] pt-2">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </div>

          {/* Trust & Security Badge */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-center gap-2 text-[12px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>Bank-grade 256-bit encryption • Your privacy is protected</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] space-y-0.5 mt-6">
          <p>© 2026 Jam Song Vich • Loan Management System</p>
          <p className="text-[11px] text-slate-400">
            Compliant with National Bank of Cambodia Standards
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
