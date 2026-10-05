import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle2,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { api } from '../../services/api';

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
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('manager@apex.local');
  const [password, setPassword] = useState<string>('Password123!');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Demo accounts for quick evaluation
  const DEMO_ACCOUNTS: Array<{ role: UserRole; label: string; email: string }> = [
    { role: 'MANAGER', label: 'Manager', email: 'manager@apex.local' },
    { role: 'LOAN_OFFICER', label: 'Loan Officer', email: 'officer@apex.local' },
    { role: 'CASHIER', label: 'Cashier', email: 'cashier@apex.local' },
    { role: 'BORROWER', label: 'Borrower', email: 'borrower@apex.local' },
  ];

  const handleQuickFill = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setUsernameOrEmail(acc.email);
    setPassword('Password123!');
    setError(null);
  };

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
      } else if (clean.includes('borrower') || clean.includes('student') || clean.includes('davidserey') || clean.includes('sophie')) {
        roleHint = 'BORROWER';
      } else {
        roleHint = 'MANAGER';
      }

      const res = await api.login(identifier, password, rememberMe, roleHint);
      onLoginSuccess(res.user, res.token, rememberMe);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-sm mb-3">
          <Building2 className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          Apex Core Banking
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-sans">
          Student &amp; Staff Loan Management Platform
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-xl shadow-sm">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Sign in to your account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your terminal.
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

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="name@apex.local"
                  required
                  className="w-full h-10 px-3 pl-9 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-sans placeholder:text-slate-400"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 font-sans">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onNavigateToForgotPassword}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-10 px-3 pl-9 pr-10 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-sans placeholder:text-slate-400"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Register Prompt */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                Sign up for an account
              </button>
            </p>
          </div>

          {/* Discreet Demo Account Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-medium text-slate-500 text-center mb-2.5">
              Quick-fill demo credentials:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-colors ${
                    usernameOrEmail === acc.email
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Professional Human Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 Apex Core LMS. All rights reserved.</p>
          <p className="text-[11px] text-slate-400">
            Academic Finance &amp; Loan Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
