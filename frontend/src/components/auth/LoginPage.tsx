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
  Building2,
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
  initialRole,
}) => {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>(() => {
    return initialRole === 'admin' ? 'admin@loansystem.edu' : '';
  });
  const [password, setPassword] = useState<string>(() => {
    return initialRole === 'admin' ? 'Password123!' : '';
  });
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Exact 9-Step Login Logic execution
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Step 1: Validate that email/username and password are not empty
    const identifier = usernameOrEmail.trim();
    if (!identifier || !password) {
      setError('Invalid email/username or password.');
      return;
    }

    setIsLoading(true);

    try {
      // Step 2 to Step 9 handled through auth service with exact status checks & generic invalid messages
      const loggedInUser = await login(identifier, password, rememberMe);
      const activeToken =
        localStorage.getItem('apex_token') ||
        sessionStorage.getItem('apex_token') ||
        'token';
      onLoginSuccess(loggedInUser, activeToken, rememberMe);
    } catch (err: any) {
      setError(err?.message || 'Invalid email/username or password.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
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

        {/* Clean Login Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-6 sm:p-8 space-y-5">
          {/* Form Header */}
          <div className="border-b border-[#CBD5E1] pb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Welcome back
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Sign in to continue to your loan management account.
            </p>
          </div>


          {/* Success Notice Banner */}
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-snug">{successNotice}</span>
            </div>
          )}

          {/* Error Notice Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Quick Demo Credentials 1-Click Fill */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[#0F172A] font-semibold">
              <span>Select Account (1-Click Fill):</span>
              <span className="text-[11px] font-normal text-[#64748B]">Password: Password123!</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail('admin@loansystem.edu');
                  setPassword('Password123!');
                  setError(null);
                }}
                className="p-2 bg-white border border-[#CBD5E1] hover:border-[#2563EB] hover:bg-blue-50/40 rounded-[5px] text-left transition-all cursor-pointer flex flex-col"
              >
                <span className="font-bold text-[11px] text-[#2563EB]">Administrator</span>
                <span className="text-[10px] text-[#64748B] truncate">admin@loansystem.edu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail('johnathan.doe@student.edu');
                  setPassword('Password123!');
                  setError(null);
                }}
                className="p-2 bg-white border border-[#CBD5E1] hover:border-[#059669] hover:bg-emerald-50/40 rounded-[5px] text-left transition-all cursor-pointer flex flex-col"
              >
                <span className="font-bold text-[11px] text-[#059669]">Client User (Borrower)</span>
                <span className="text-[10px] text-[#64748B] truncate">johnathan.doe@student.edu</span>
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Field 1: Email or Username */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter email or username"
                  autoComplete="username"
                  required
                  className="w-full h-11 px-3.5 pl-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                />
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Password with Show/Hide icon */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full h-11 px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Remember Me checkbox & Forgot Password link */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] border-[#CBD5E1] text-[#2563EB] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-[#0F172A] font-medium">Remember me</span>
              </label>

              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Field 4: SIGN IN Button with Loading state */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold tracking-wider rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-none"
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

          {/* Don't have an account? Create account */}
          <div className="text-center text-xs text-[#64748B] pt-1">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors"
            >
              Create account
            </button>
          </div>

          {/* Security notice */}
          <div className="pt-3 border-t border-[#CBD5E1] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>Secure 256-bit TLS connection. Authorized access only.</span>
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

export default LoginPage;
