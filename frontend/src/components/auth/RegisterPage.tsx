import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Building2
} from 'lucide-react';
import { api } from '../../services/api';

interface RegisterPageProps {
  onRegisterSuccess: (email: string, devOtp?: string) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    const trimmedUsername = username.trim();
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please make sure your password meets all complexity requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
      });

      onRegisterSuccess(email.trim(), res.devOtp);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[540px]">
        {/* Institutional Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[8px] bg-[#0F172A] text-white mb-3 shadow-none">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            APEX LMS
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mt-0.5">
            Enterprise Loan Management System
          </p>
        </div>

        {/* Clean Register Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-6 sm:p-8 space-y-5">
          {/* Form Header */}
          <div className="border-b border-[#CBD5E1] pb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Create an account
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Enter your details to register for borrower self-service.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full h-[44px] px-3.5 pl-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                  />
                  <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. s.chan"
                    required
                    className="w-full h-[44px] px-3.5 pl-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                  />
                  <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Letters, numbers, and underscores only
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full h-[44px] px-3.5 pl-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                  />
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    required
                    className="w-full h-[44px] px-3.5 pl-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                  />
                  <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    required
                    className="w-full h-[44px] px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                  />
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full h-[44px] px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                  />
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Requirement Badges */}
            <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px] text-xs space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Password Requirements
              </p>
              <div className="grid grid-cols-2 gap-1 text-[12px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3.5 h-3.5" /> 8+ Characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3.5 h-3.5" /> Uppercase Letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3.5 h-3.5" /> Lowercase Letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber && hasSpecialChar ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3.5 h-3.5" /> Number &amp; Symbol
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[44px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-[14px] font-semibold tracking-wider rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>CREATING ACCOUNT...</span>
                </>
              ) : (
                <span>REGISTER ACCOUNT</span>
              )}
            </button>
          </form>

          <div className="text-center text-[13px] text-[#64748B] pt-2">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors"
            >
              Sign in
            </button>
          </div>

          <div className="pt-4 border-t border-[#CBD5E1] flex items-center justify-center gap-1.5 text-[12px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>Encrypted with TLS 256-bit security standard.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] space-y-0.5 mt-6">
          <p>© 2026 Apex LMS • Academic Loan Management System</p>
          <p className="text-[11px] text-slate-400">
            Compliant with National Bank of Cambodia Standards
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
