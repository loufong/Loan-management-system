import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  X
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { USER_PROFILES } from '../../data/mockData';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
  initialRole?: UserRole;
}

type AuthMode = 'signin' | 'signup';

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [emailOrUsername, setEmailOrUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sign up fields
  const [fullName, setFullName] = useState<string>('');
  const [signupRole, setSignupRole] = useState<UserRole>('BORROWER');

  // Errors & Toasts
  const [errors, setErrors] = useState<{ emailOrUsername?: string; password?: string; fullName?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: { emailOrUsername?: string; password?: string; fullName?: string } = {};

    if (authMode === 'signup' && !fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!emailOrUsername.trim()) {
      newErrors.emailOrUsername = 'Please enter your email.';
    }

    if (!password) {
      newErrors.password = 'Please enter your password.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let selectedRole: UserRole = 'MANAGER';
      const input = emailOrUsername.toLowerCase();

      if (input.includes('cashier')) {
        selectedRole = 'CASHIER';
      } else if (
        input.includes('borrower') ||
        input.includes('sokha') ||
        input.includes('student') ||
        input.includes('doe')
      ) {
        selectedRole = 'BORROWER';
      } else {
        selectedRole = 'MANAGER';
      }

      if (authMode === 'signup') {
        selectedRole = signupRole;
      }

      const result = await api.login(emailOrUsername, selectedRole);

      if (result.token) {
        localStorage.setItem('apex_token', result.token);
      }

      const userProfile =
        result.user || USER_PROFILES[selectedRole] || USER_PROFILES.MANAGER;

      setSuccessToast(`Welcome back, ${userProfile.name}!`);

      setTimeout(() => {
        onLoginSuccess(userProfile, result.token || 'demo-token');
      }, 400);
    } catch (err: any) {
      setAuthError(
        err.message || 'Invalid credentials. Please verify your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth Providers Login Handler (Google, Apple, Facebook)
  const handleOAuthLogin = (provider: 'Google' | 'Apple' | 'Facebook') => {
    setIsLoading(true);
    setTimeout(() => {
      const userProfile = USER_PROFILES.MANAGER;
      localStorage.setItem('apex_token', `${provider.toLowerCase()}-oauth-session`);
      setSuccessToast(`Successfully authenticated with ${provider}!`);
      setTimeout(() => {
        onLoginSuccess(userProfile, `${provider.toLowerCase()}-token`);
      }, 400);
    }, 500);
  };

  const handleForgotPassword = () => {
    alert('Password recovery link has been dispatched to your email.');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-slate-950 font-sans select-none">
      {/* =================================================================== */}
      {/* 1. VIBRANT FLUID INK BACKGROUND (CYAN & ORANGE/RED SMOKE)           */}
      {/* =================================================================== */}
      <div className="absolute inset-0 z-0">
        <img
          src="/ink-bg.jpg"
          alt="Fluid Ink Art"
          className="w-full h-full object-cover object-center scale-105"
        />
        {/* Soft Vignette Overlay for Dramatic Focus on the Centered Card */}
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/30 to-black/80" />
      </div>

      {/* Success Notification Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl border border-white/20 text-white px-5 py-2.5 rounded-2xl shadow-2xl text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* 2. CENTERED, LARGER FROSTED GLASS SIGN IN CARD                      */}
      {/* =================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[490px] rounded-[32px] p-8 sm:p-11 backdrop-blur-3xl bg-white/[0.12] border border-white/[0.24] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.7)] text-white before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent before:rounded-t-[32px]"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex items-center -space-x-1">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-xs" />
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-xs" />
            <span className="w-3.5 h-3.5 rounded-full bg-sky-400 shadow-xs" />
          </div>
          <span className="text-base font-bold tracking-tight text-white/95">
            Apex LMS
          </span>
        </div>

        {/* Card Title */}
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1.5">
          {authMode === 'signin' ? 'Sign in' : 'Create account'}
        </h2>
        <p className="text-sm text-white/75 mb-7">
          {authMode === 'signin'
            ? 'Good to see you again.'
            : 'Get started with institutional access.'}
        </p>

        {/* Global Error Banner */}
        <AnimatePresence>
          {authError && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 18 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-3 bg-rose-500/25 border border-rose-300/40 rounded-xl flex items-center justify-between text-xs text-white shadow-inner"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
                <span>{authError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder="enter your full name"
                  className={cn(
                    'w-full h-12 px-4 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.2] border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/60 transition shadow-inner',
                    errors.fullName && 'ring-2 ring-rose-400'
                  )}
                />
                {errors.fullName && (
                  <p className="text-[11px] text-rose-200 mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BORROWER', 'CASHIER', 'MANAGER'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSignupRole(r)}
                      className={cn(
                        'py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all',
                        signupRole === r
                          ? 'bg-white text-slate-950 border-white shadow-xs'
                          : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
                      )}
                    >
                      {r === 'MANAGER' ? 'Admin' : r === 'CASHIER' ? 'Cashier' : 'Borrower'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-white/90 mb-1.5">
              enter your email
            </label>
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => {
                setEmailOrUsername(e.target.value);
                if (errors.emailOrUsername) {
                  setErrors((prev) => ({ ...prev, emailOrUsername: undefined }));
                }
              }}
              placeholder="enter your email"
              className={cn(
                'w-full h-12 px-4 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.2] border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/60 transition shadow-inner',
                errors.emailOrUsername && 'ring-2 ring-rose-400'
              )}
            />
            {errors.emailOrUsername && (
              <p className="text-[11px] text-rose-200 mt-1 font-medium">{errors.emailOrUsername}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-white/90 mb-1.5">
              enter your password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="enter your password"
                className={cn(
                  'w-full h-12 px-4 pr-11 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.2] border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/60 transition shadow-inner',
                  errors.password && 'ring-2 ring-rose-400'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-200 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Remember me & Forgot password? */}
          {authMode === 'signin' && (
            <div className="flex items-center justify-between text-xs text-white/80 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/30 bg-white/20 text-white focus:ring-0 cursor-pointer accent-white"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-white/80 hover:text-white hover:underline transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Primary Action Button: Solid White "Sign in →" */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>{authMode === 'signin' ? 'Sign in' : 'Create account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* "or continue with" Divider */}
        <div className="relative my-7 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20" />
          </div>
          <span className="relative px-3 text-[11px] text-white/60 bg-transparent uppercase tracking-wider font-semibold">
            or continue with
          </span>
        </div>

        {/* Google, Apple, and Facebook SSO Buttons */}
        <div className="grid grid-cols-3 gap-3">
          {/* 1. Google Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin('Google')}
            className="h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-sm cursor-pointer group"
            title="Continue with Google"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </button>

          {/* 2. Apple Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin('Apple')}
            className="h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-sm cursor-pointer group"
            title="Continue with Apple"
          >
            <svg className="w-5 h-5 fill-current text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.65-1.09 1.71-.95 2.73 1 .08 2.05-.48 2.67-1.23" />
            </svg>
          </button>

          {/* 3. Facebook Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin('Facebook')}
            className="h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-sm cursor-pointer group"
            title="Continue with Facebook"
          >
            <svg className="w-5 h-5 fill-[#1877F2] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
        </div>

        {/* Footer Link & Demo Note */}
        <div className="mt-7 text-center space-y-1.5">
          <p className="text-xs text-white/80">
            {authMode === 'signin' ? (
              <>
                New to Apex LMS?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                  }}
                  className="font-semibold text-white underline hover:text-white/90 cursor-pointer"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError(null);
                  }}
                  className="font-semibold text-white underline hover:text-white/90 cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-[11px] text-white/50">
            Demo — nothing is sent.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
