import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Globe,
  HelpCircle,
  Server,
  Building2,
  Phone,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo-transparent.png';
import { DemoAccountSwitcher } from './DemoAccountSwitcher';

export interface LoginViewProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSwitchToStandard?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  onForgotPassword,
  onSwitchToStandard,
}) => {
  const { signInWithPassword } = useAuth();

  // Form Inputs
  const [employeeIdOrEmail, setEmployeeIdOrEmail] = useState<string>(() => {
    return localStorage.getItem('apex_remembered_staff_id') || 'admin@jamsongvich.com';
  });
  const [password, setPassword] = useState<string>('Admin@123456');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('apex_remember_staff') === 'true';
  });

  // Language state: 'EN' or 'KH'
  const [language, setLanguage] = useState<'EN' | 'KH'>('KH');

  // Interactive States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState<boolean>(false);

  // Brute-force rate limiting: 5 attempts -> 60-second lockout
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('apex_login_fails') || '0', 10);
  });
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    const lockUntil = parseInt(localStorage.getItem('apex_lock_until') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    return lockUntil > now ? lockUntil - now : 0;
  });

  // Countdown timer & draining progress bar
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem('apex_lock_until');
          localStorage.setItem('apex_login_fails', '0');
          setFailedAttempts(0);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0 || isLoading) return;

    const trimmedId = employeeIdOrEmail.trim();
    if (!trimmedId || !password) {
      setErrorMessage(
        language === 'KH'
          ? 'ព័ត៌មានសម្ងាត់មិនត្រឹមត្រូវ (Invalid staff credentials or inactive account)'
          : 'Invalid staff credentials or inactive account'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (rememberMe) {
        localStorage.setItem('apex_remember_staff', 'true');
        localStorage.setItem('apex_remembered_staff_id', trimmedId);
      } else {
        localStorage.removeItem('apex_remember_staff');
        localStorage.removeItem('apex_remembered_staff_id');
      }

      await signInWithPassword(trimmedId, password, rememberMe);

      // Reset failure counters upon success
      localStorage.setItem('apex_login_fails', '0');
      setFailedAttempts(0);
      onSuccess?.();
    } catch (err: any) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      localStorage.setItem('apex_login_fails', newFails.toString());

      if (newFails >= 5) {
        const lockDuration = 60; // 60 seconds
        const lockUntil = Math.floor(Date.now() / 1000) + lockDuration;
        localStorage.setItem('apex_lock_until', lockUntil.toString());
        setLockoutRemaining(lockDuration);
        setErrorMessage(
          language === 'KH'
            ? 'គណនីត្រូវបានចាក់សោរបណ្តោះអាសន្ន (Account locked. Try again in 60s)'
            : 'Account locked due to 5 consecutive failed attempts. Please wait 60 seconds.'
        );
      } else {
        setErrorMessage(
          language === 'KH'
            ? 'ព័ត៌មានសម្ងាត់មិនត្រឹមត្រូវ (Invalid staff credentials or inactive account)'
            : 'Invalid staff credentials or inactive account.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo Quick-Switcher 1-click sign in handler
  const handleQuickLogin = async (_role: string, email: string, pass: string) => {
    if (lockoutRemaining > 0) return;
    setEmployeeIdOrEmail(email);
    setPassword(pass);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      localStorage.setItem('apex_remember_staff', 'true');
      localStorage.setItem('apex_remembered_staff_id', email);

      await signInWithPassword(email, pass, true);

      localStorage.setItem('apex_login_fails', '0');
      setFailedAttempts(0);
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Visual Style & Ambient Background: Deep slate/navy with radial blur/glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Center ambient radial blur behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-amber-500/15 via-emerald-500/10 to-blue-600/10 rounded-full blur-[140px] opacity-75" />
        {/* Subtle grid pattern accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415512_1px,transparent_1px),linear-gradient(to_bottom,#33415512_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
      </div>

      {/* Top Utility Bar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto flex items-center justify-between pb-4">
        {/* Security Indicator Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/90 border border-slate-800 text-slate-300 shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide">256-BIT SSL ENCRYPTION • SECURE CORE</span>
        </div>

        {/* Right Corner Utilities: Language Toggle & Portal Switcher */}
        <div className="flex items-center gap-2">
          {onSwitchToStandard && (
            <button
              type="button"
              onClick={onSwitchToStandard}
              className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition shadow-sm backdrop-blur-md cursor-pointer"
            >
              Standard Portal
            </button>
          )}

          {/* Clean Pill Button to Toggle Language (English / ភាសាខ្មែរ) */}
          <button
            type="button"
            onClick={() => setLanguage((l) => (l === 'KH' ? 'EN' : 'KH'))}
            className="px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-200 hover:text-white transition shadow-sm backdrop-blur-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Toggle Language / ប្តូរភាសា"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'KH' ? 'English (EN)' : 'ភាសាខ្មែរ'}</span>
          </button>
        </div>
      </header>

      {/* Center Card: Elevated container with subtle frosted borders */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-4">
        <div className="border border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl p-8 max-w-md w-full backdrop-blur-xl relative overflow-hidden transition-all duration-300">
          {/* Subtle Top Border Ambient Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          {/* Header & Brand Placement */}
          <div className="text-center space-y-2.5 mb-7">
            {/* Brand emblem at top center with logo-transparent.png */}
            <div className="w-18 h-18 mx-auto rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-2.5 shadow-xl flex items-center justify-center">
              <img
                src={logoImg}
                alt="JAM SONG VICH"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>

            {/* Typography */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase font-sans">
                JAM SONG VICH
              </h1>
              <p className="text-xs font-bold text-amber-400 tracking-wide mt-0.5">
                ប្រព័ន្ធគ្រប់គ្រងឥណទាន • Core Banking System
              </p>

              {/* Security indicator chip underneath */}
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-[10px] font-semibold bg-slate-950/80 border border-slate-800/80 text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>256-BIT SSL ENCRYPTION • SECURE CORE</span>
              </div>
            </div>
          </div>

          {/* Login UI Prompt 3: Credential Error Alert */}
          {errorMessage && lockoutRemaining <= 0 && (
            <div className="mb-5 bg-rose-950/40 border border-rose-800 text-rose-200 rounded-xl p-3 text-sm flex items-center gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <div className="leading-snug text-xs font-medium">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Login UI Prompt 3: Account Lockout Countdown Banner & Draining Progress Bar */}
          {lockoutRemaining > 0 && (
            <div className="mb-5 bg-amber-950/50 border border-amber-800/80 text-amber-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span>
                  {language === 'KH'
                    ? `គណនីត្រូវបានចាក់សោរបណ្តោះអាសន្ន (Account locked. Try again in ${lockoutRemaining}s)`
                    : `Account locked. Try again in ${lockoutRemaining}s`}
                </span>
              </div>
              {/* Animated progress bar that drains over 60 seconds */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(lockoutRemaining / 60) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID / Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                លេខកូដបុគ្គលិក ឬ អ៊ីមែល / Employee ID or Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={employeeIdOrEmail}
                  onChange={(e) => setEmployeeIdOrEmail(e.target.value)}
                  placeholder="admin@jamsongvich.com"
                  disabled={lockoutRemaining > 0}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                ពាក្យសម្ងាត់ / Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={lockoutRemaining > 0}
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Utility Row (Between inputs and submit) */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>Remember Me</span>
              </label>

              {/* Forgot Password? or Contact IT Support link */}
              <button
                type="button"
                onClick={() => setIsHelpdeskOpen(true)}
                className="text-amber-400 hover:text-amber-300 transition hover:underline font-medium cursor-pointer"
              >
                {language === 'KH' ? 'ភ្លេចពាក្យសម្ងាត់ / ជំនួយការ IT?' : 'Contact IT Support'}
              </button>
            </div>

            {/* Primary Sign-In Button */}
            {lockoutRemaining <= 0 ? (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-xl shadow-amber-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99] mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>កំពុងផ្ទៀងផ្ទាត់... (Verifying Security Tokens)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>ចូលប្រើប្រព័ន្ធ (Sign In to Core)</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-center bg-slate-950/80 border border-slate-800 text-slate-400 cursor-not-allowed">
                <span>Account Locked ({lockoutRemaining}s remaining)</span>
              </div>
            )}
          </form>

          {/* Quick Demo Helper */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Staff Test Account:</span>
            <button
              type="button"
              onClick={() => {
                setEmployeeIdOrEmail('admin@jamsongvich.com');
                setPassword('Admin@123456');
              }}
              className="font-mono text-amber-400 hover:underline cursor-pointer"
            >
              admin@jamsongvich.com
            </button>
          </div>
        </div>
      </main>

      {/* Login UI Prompt 3: Environment Watermark & Legal Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-emerald-500" />
          <span>v1.4.2 Core Engine • Operational Gateway • For Authorized Bank Personnel Only</span>
        </div>

        <div className="flex items-center gap-3">
          <span>IT Helpdesk: +855 23 999 888</span>
          <span>•</span>
          <span className="text-slate-400">support@jamsongvich.com</span>
        </div>
      </footer>

      {/* IT Helpdesk Modal (Prompt 2 & 3) */}
      {isHelpdeskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setIsHelpdeskOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">IT Desk & Password Reset</h3>
                <p className="text-[11px] text-slate-400">Core Banking Security Operations Center</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                Staff credentials are administered under strict banking security guidelines. If your password has expired or your account has been locked, contact the branch IT Helpdesk:
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Branch Desk: <strong>+855 23 999 888 (Ext 104)</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Email: <strong>it-support@jamsongvich.com</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Branch: <strong>Phnom Penh Main Office • Floor 3</strong></span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-950/30 border border-blue-900/60 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Please have your National ID card and Staff Badge ID ready for two-factor identity verification by the Security Officer.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpdeskOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* Login UI Prompt 5: Demo Quick-Switcher for Development / Testing */}
      <DemoAccountSwitcher
        onQuickLogin={handleQuickLogin}
        onFillCredentials={(email, pass) => {
          setEmployeeIdOrEmail(email);
          setPassword(pass);
        }}
        currentEmail={employeeIdOrEmail}
        isAuthenticating={isLoading}
      />
    </div>
  );
};

export default LoginView;
