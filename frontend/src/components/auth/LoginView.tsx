import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Globe,
  Building2,
  Server,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo-transparent.png';

export interface LoginViewProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSwitchToStandard?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  onForgotPassword,
  onSwitchToStandard
}) => {
  const { signInWithPassword } = useAuth();

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [language, setLanguage] = useState<'EN' | 'KH'>('EN');

  // Loading and Alert State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Brute-force rate limiting state (Login Prompt 5)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('apex_login_fails') || '0', 10);
  });
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    const lockUntil = parseInt(localStorage.getItem('apex_lock_until') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    return lockUntil > now ? lockUntil - now : 0;
  });

  // Countdown timer for brute force lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining(prev => {
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
    if (lockoutRemaining > 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signInWithPassword(emailOrId.trim(), password, rememberMe);
      // Reset failed attempts upon successful login
      localStorage.setItem('apex_login_fails', '0');
      setFailedAttempts(0);
      onSuccess?.();
    } catch (err: any) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      localStorage.setItem('apex_login_fails', newFails.toString());

      if (newFails >= 5) {
        const lockDuration = 60; // 60 seconds cooldown
        const lockUntil = Math.floor(Date.now() / 1000) + lockDuration;
        localStorage.setItem('apex_lock_until', lockUntil.toString());
        setLockoutRemaining(lockDuration);
        setErrorMessage(
          language === 'KH'
            ? 'គណនីត្រូវបានចាក់សោបណ្តោះអាសន្ន។ សូមរង់ចាំ ៦០ វិនាទី មុននឹងព្យាយាមម្តងទៀត។'
            : 'Account locked due to 5 consecutive failed attempts. Please wait 60 seconds.'
        );
      } else {
        const remainingTries = 5 - newFails;
        const msg = err.message || 'Invalid Employee ID/Email or Password.';
        setErrorMessage(
          language === 'KH'
            ? `${msg} (នៅសល់ ${remainingTries} ដង)`
            : `${msg} (${remainingTries} attempts remaining before temporary lockout)`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Banking Ambience Gradients */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[150px] rounded-full" />
        <div className="absolute -bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/10 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      </div>

      {/* Top Bar: Brand Badge & Language Toggle */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>256-BIT SSL ENCRYPTION • FINANCIAL LEDGER</span>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToStandard && (
            <button
              type="button"
              onClick={onSwitchToStandard}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 shadow"
            >
              <span>Standard Portal</span>
            </button>
          )}

          {/* Bilingual Support Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(l => l === 'EN' ? 'KH' : 'EN')}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 shadow"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'EN' ? 'ភាសាខ្មែរ' : 'English (EN)'}</span>
          </button>
        </div>
      </div>

      {/* Center Card: Bank-Grade Login Container */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top Edge Glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />

          {/* Logo & Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-700/80 p-2 shadow-xl flex items-center justify-center">
              <img
                src={logoImg}
                alt="Jam Song Vich Logo"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase font-sans">
                JAM SONG VICH
              </h1>
              <p className="text-xs font-bold text-amber-400 tracking-wide mt-0.5 font-serif">
                {language === 'KH' ? 'ប្រព័ន្ធគ្រប់គ្រងឥណទានស្នូល' : 'Core Banking System'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {language === 'KH'
                  ? 'សូមបញ្ចូលអត្តសញ្ញាណប័ណ្ណបុគ្គលិក ដើម្បីចូលប្រើប្រាស់'
                  : 'Authorized personnel access gateway'}
              </p>
            </div>
          </div>

          {/* Inline Alert Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID or Email Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                {language === 'KH' ? 'អ៊ីមែល ឬ លេខសម្គាល់បុគ្គលិក' : 'Employee ID or Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="admin@jamsongvich.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-inner font-mono"
                />
              </div>
            </div>

            {/* Password Input with show/hide eye icon */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {language === 'KH' ? 'ពាក្យសម្ងាត់' : 'Password'}
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-inner font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <span>{language === 'KH' ? 'ចងចាំខ្ញុំ' : 'Remember Me'}</span>
              </label>

              <button
                type="button"
                onClick={onForgotPassword || (() => alert('Please contact the IT Desk at helpdesk@jamsongvich.com to reset credentials.'))}
                className="text-amber-400 hover:text-amber-300 transition hover:underline"
              >
                {language === 'KH' ? 'ភ្លេចពាក្យសម្ងាត់?' : 'Reset via IT Desk'}
              </button>
            </div>

            {/* Big Submit Button */}
            <button
              type="submit"
              disabled={isLoading || lockoutRemaining > 0}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-xl shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'KH' ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'Authenticating Secure Core...'}</span>
                </div>
              ) : lockoutRemaining > 0 ? (
                <div className="flex items-center gap-2 text-slate-900">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Locked ({lockoutRemaining}s remaining)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{language === 'KH' ? 'ចូលប្រើប្រាស់ប្រព័ន្ធ' : 'Authenticate & Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Info for Testability */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Demo Staff Login:</span>
            <button
              type="button"
              onClick={() => {
                setEmailOrId('admin@jamsongvich.com');
                setPassword('Admin@123456');
              }}
              className="font-mono text-emerald-400 hover:underline"
            >
              admin@jamsongvich.com
            </button>
          </div>
        </div>
      </div>

      {/* Footer: Version, Branch Status, Helpdesk */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-emerald-500" />
          <span>v1.4.2 Core • Operational</span>
          <span>•</span>
          <span className="text-slate-400">Phnom Penh Main Branch Node</span>
        </div>

        <div className="flex items-center gap-3">
          <span>IT Helpdesk: +855 23 999 888</span>
          <span>•</span>
          <span className="text-slate-400">support@jamsongvich.com</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginView;
