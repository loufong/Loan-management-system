import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Lock,
  User,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string, rememberMe: boolean) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  successNotice?: string | null;
  initialRole?: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  successNotice,
}) => {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const identifier = usernameOrEmail.trim();
    if (!identifier || !password) {
      setError('Please enter your email or username, and password.');
      return;
    }

    setIsLoading(true);

    try {
      let roleHint: UserRole = 'MANAGER';
      const clean = identifier.toLowerCase();
      if (clean.includes('officer')) {
        roleHint = 'LOAN_OFFICER';
      } else if (clean.includes('cashier')) {
        roleHint = 'CASHIER';
      } else if (
        clean.includes('borrower') ||
        clean.includes('student') ||
        clean.includes('davidserey') ||
        clean.includes('sophie')
      ) {
        roleHint = 'BORROWER';
      } else {
        roleHint = 'MANAGER';
      }

      const loggedInUser = await login(identifier, password, rememberMe, roleHint);
      const activeToken =
        localStorage.getItem('apex_token') ||
        sessionStorage.getItem('apex_token') ||
        'token';
      onLoginSuccess(loggedInUser, activeToken, rememberMe);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#2563EB] selection:text-white">
      {/* ========================================================================= */}
      {/* LEFT SIDE: Institutional Branding & Banking Graphics (~42-45% width)      */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[44%] xl:w-[42%] bg-[#0F172A] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-14 relative shrink-0">
        {/* Subtle geometric line pattern for authentic financial architecture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top: Institutional Brand & Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            {/* Crisp Institutional Banking Emblem */}
            <div className="w-10 h-10 rounded-[6px] bg-[#1E293B] border border-[#334155] flex items-center justify-center shrink-0 shadow-xs">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="#64748B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight font-sans">
                Apex Core Banking
              </h1>
              <p className="text-xs font-normal text-slate-400 mt-0.5">
                Student &amp; Staff Loan Management Platform
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Professional Statement & Clean Geometric Financial Diagram */}
        <div className="my-10 lg:my-auto py-4 relative z-10">
          <div className="max-w-md">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-snug">
              Secure access to loan management and financial services.
            </h2>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Enterprise core ledger infrastructure delivering real-time underwriting, installment schedule reconciliation, and student financial aid management.
            </p>
          </div>

          {/* Abstract Geometric Banking Graphic (Clean Vector Architecture) */}
          <div className="mt-8 hidden sm:block p-5 rounded-[6px] bg-[#131D33] border border-[#1E293B]">
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-mono font-medium text-slate-300">
                  LEDGER NODE // PP-CORE-01
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#1E293B] text-slate-400 border border-[#334155]">
                TLS 1.3 256-BIT
              </span>
            </div>

            {/* Geometric Vector Flow */}
            <svg
              className="w-full h-24 stroke-slate-600"
              viewBox="0 0 380 96"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Grid Axis */}
              <line x1="10" y1="80" x2="370" y2="80" stroke="#1E293B" strokeWidth="1" />
              <line x1="10" y1="48" x2="370" y2="48" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="10" y1="16" x2="370" y2="16" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />

              {/* Connecting Nodes */}
              <path
                d="M 20 68 L 90 48 L 170 56 L 250 24 L 320 38 L 360 20"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 20 78 L 90 64 L 170 70 L 250 48 L 320 54 L 360 40"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                strokeLinecap="round"
              />

              {/* Node Indicators */}
              <circle cx="90" cy="48" r="3.5" fill="#0F172A" stroke="#2563EB" strokeWidth="2" />
              <circle cx="170" cy="56" r="3.5" fill="#0F172A" stroke="#2563EB" strokeWidth="2" />
              <circle cx="250" cy="24" r="4.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="320" cy="38" r="3.5" fill="#0F172A" stroke="#2563EB" strokeWidth="2" />
            </svg>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#1E293B] text-[11px] text-slate-400">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">DISBURSEMENT</div>
                <div className="font-mono text-slate-200 mt-0.5">$2,480,500</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">RECOVERY</div>
                <div className="font-mono text-emerald-400 mt-0.5">96.2% ON-TIME</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">FACILITIES</div>
                <div className="font-mono text-slate-200 mt-0.5">142 ACTIVE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Institutional Compliance Footer */}
        <div className="relative z-10 pt-4 border-t border-[#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-sans">
          <span>Apex Core Banking Platform • v2.4</span>
          <span>Authorized Access Only</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: Clean, Restrained Login Form (~55-58% width)                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-[#F8FAFC]">
        {/* Top bar status indicator */}
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Operational Portal • TLS Protected</span>
          </div>
        </div>

        {/* Main Form Container (Natural page-integrated layout, no floating card) */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-[#64748B] mt-1.5 leading-normal">
              Sign in to continue to Apex Core Banking.
            </p>
          </div>

          {/* Success Notice Banner */}
          {successNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Notice Banner */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Field 1: Email or Username */}
            <div>
              <label className="block text-xs font-medium text-[#0F172A] mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  required
                  className="w-full h-[46px] px-3 pl-9 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-slate-400"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <label className="block text-xs font-medium text-[#0F172A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full h-[46px] px-3 pl-9 pr-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-slate-400"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] border-[#CBD5E1] text-[#2563EB] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-[#0F172A] font-normal">Remember me</span>
              </label>

              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-xs text-[#2563EB] hover:text-blue-700 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold tracking-wider rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                <span>SIGN IN</span>
              )}
            </button>
          </form>

          {/* Account Creation Prompt */}
          <div className="mt-6 text-center text-xs text-[#64748B]">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-[#2563EB] hover:text-blue-700 font-medium transition-colors"
            >
              Create an account
            </button>
          </div>

          {/* Security Message */}
          <div className="mt-8 pt-6 border-t border-[#CBD5E1]/60 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your connection is secure.</span>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="text-center text-xs text-[#64748B] space-y-0.5 pt-6">
          <p>© 2026 Apex Core Banking</p>
          <p className="text-[11px] text-slate-400">
            Academic Finance &amp; Loan Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
