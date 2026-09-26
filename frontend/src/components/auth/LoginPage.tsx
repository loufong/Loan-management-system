import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Landmark,
  Shield,
  Loader2,
  Globe,
  Sparkles,
  X,
  ChevronRight,
  Zap,
  Layers,
  Award,
  CreditCard,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { USER_PROFILES } from '../../data/mockData';
import { api } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
  initialRole?: UserRole;
}

type Language = 'EN' | 'KH';

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  initialRole = 'MANAGER',
}) => {
  // Form State
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('manager@apex.local');
  const [password, setPassword] = useState<string>('Password123!');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('EN');
  const [activeQuickRole, setActiveQuickRole] = useState<string>('MANAGER');

  // Error & Toast States
  const [errors, setErrors] = useState<{ usernameOrEmail?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick Login Demo Seeded Credentials with Vibrant 3D Styling
  const quickFillRoles = [
    {
      key: 'MANAGER',
      label: '👔 Manager',
      role: 'MANAGER' as UserRole,
      email: 'manager@apex.local',
      title: 'Executive Credit Committee & Branch Head',
      colorClass: 'from-indigo-500/10 via-purple-500/10 to-indigo-500/20 text-indigo-700 border-indigo-300 hover:border-indigo-500 hover:shadow-indigo-500/20',
      badgeBg: 'bg-indigo-600 text-white',
    },
    {
      key: 'LOAN_OFFICER',
      label: '📋 Loan Officer',
      role: 'LOAN_OFFICER' as UserRole,
      email: 'officer@apex.local',
      title: 'Senior Loan Origination & DTI Reviewer',
      colorClass: 'from-emerald-500/10 via-teal-500/10 to-emerald-500/20 text-emerald-700 border-emerald-300 hover:border-emerald-500 hover:shadow-emerald-500/20',
      badgeBg: 'bg-emerald-600 text-white',
    },
    {
      key: 'CASHIER',
      label: '💵 Cashier',
      role: 'CASHIER' as UserRole,
      email: 'cashier@apex.local',
      title: 'University Bursar & Cashier Desk',
      colorClass: 'from-amber-500/10 via-orange-500/10 to-amber-500/20 text-amber-800 border-amber-300 hover:border-amber-500 hover:shadow-amber-500/20',
      badgeBg: 'bg-amber-600 text-white',
    },
    {
      key: 'BORROWER',
      label: '👤 Borrower',
      role: 'BORROWER' as UserRole,
      email: 'borrower@apex.local',
      title: 'Logistics Specialist / Applicant',
      colorClass: 'from-sky-500/10 via-cyan-500/10 to-sky-500/20 text-sky-800 border-sky-300 hover:border-sky-500 hover:shadow-sky-500/20',
      badgeBg: 'bg-sky-600 text-white',
    },
  ];

  // Quick fill handler
  const handleQuickFill = (roleItem: typeof quickFillRoles[0]) => {
    setUsernameOrEmail(roleItem.email);
    setPassword('Password123!');
    setActiveQuickRole(roleItem.key);
    setErrors({});
    setAuthError(null);
  };

  // Client-Side Input Validation
  const validateForm = (): boolean => {
    const newErrors: { usernameOrEmail?: string; password?: string } = {};

    if (!usernameOrEmail.trim()) {
      newErrors.usernameOrEmail =
        language === 'EN'
          ? 'Username or email address is required.'
          : 'សូមបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ ឬ អ៊ីមែល។';
    }

    if (!password) {
      newErrors.password =
        language === 'EN'
          ? 'Password is required.'
          : 'សូមបញ្ចូលពាក្យសម្ងាត់។';
    } else if (password.length < 6) {
      newErrors.password =
        language === 'EN'
          ? 'Password must be at least 6 characters long.'
          : 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ។';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let selectedRole: UserRole = 'MANAGER';
      const lowercaseInput = usernameOrEmail.toLowerCase();

      if (lowercaseInput.includes('officer') || lowercaseInput.includes('credit') || lowercaseInput.includes('sarah')) selectedRole = 'LOAN_OFFICER';
      else if (lowercaseInput.includes('cashier')) selectedRole = 'CASHIER';
      else if (lowercaseInput.includes('borrower') || lowercaseInput.includes('sokha')) selectedRole = 'BORROWER';
      else selectedRole = 'MANAGER';

      // Call API Login
      const result = await api.login(usernameOrEmail, selectedRole);

      if (result.token) {
        localStorage.setItem('apex_token', result.token);
      }

      const userProfile = result.user || USER_PROFILES[selectedRole] || USER_PROFILES.MANAGER;

      setSuccessToast(
        language === 'EN'
          ? `Welcome back, ${userProfile.name}!`
          : `សូមស្វាគមន៍មកវិញ, ${userProfile.name}!`
      );

      setTimeout(() => {
        onLoginSuccess(userProfile, result.token);
      }, 700);
    } catch (err: any) {
      setAuthError(
        err.message ||
          (language === 'EN'
            ? 'Invalid username or password. Please verify your credentials.'
            : 'ឈ្មោះអ្នកប្រើប្រាស់ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។ សូមពិនិត្យឡើងវិញ។')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#090D16] font-sans text-slate-900 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Dynamic 3D Mesh Gradient Background Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/35 via-purple-600/25 to-pink-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-gradient-to-tr from-cyan-600/30 via-sky-600/25 to-emerald-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse-glow"></div>
      <div className="absolute top-[30%] right-[30%] w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[100px] pointer-events-none animate-float-slow"></div>

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-900/40 border border-emerald-400/40 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="p-1 rounded-full bg-white/20">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          </div>
          <span className="text-sm font-bold tracking-wide">{successToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* LEFT PANEL: 3D AUTHENTICATION FORM CARD                             */}
      {/* =================================================================== */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-4 sm:p-8 lg:p-10 z-20 my-auto">
        <div className="perspective-1000 transform-style-3d">
          
          {/* Main 3D Glass Card Container */}
          <div className="glass-form-3d rounded-3xl p-6 sm:p-9 border border-white/80 shadow-2xl shadow-indigo-950/40 transform transition-all">
            
            {/* Header: 3D Glowing Brand Logo + Branch + Language Toggle */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200/80">
              <div className="flex items-center gap-3.5">
                {/* 3D Gradient Icon Shield */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 transform hover:scale-105 transition-all">
                  <Landmark className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xl tracking-tight text-slate-900">
                      Apex <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">LMS</span>
                    </span>
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-xs">
                      ENTERPRISE 3D
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Phnom Penh Main Branch • NBC Live</span>
                  </div>
                </div>
              </div>

              {/* Colorful Language Switcher Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    language === 'EN'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('KH')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    language === 'KH'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  KH (ភាសាខ្មែរ)
                </button>
              </div>
            </div>

            {/* Form Title & Subtitle */}
            <div className="mt-6 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {language === 'EN' ? 'Sign in to Core Banking Portal' : 'ចូលប្រើប្រាស់ប្រព័ន្ធធនាគារស្នូល'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-1.5 font-medium">
                {language === 'EN'
                  ? 'Enter your institutional credentials to access loan origination, underwriting, and ledger services.'
                  : 'បញ្ចូលព័ត៌មានសមត្ថកិច្ចរបស់ស្ថាប័នដើម្បីចូលប្រើប្រាស់សេវាកម្មឥណទាន និងបញ្ជីសមតុល្យ។'}
              </p>
            </div>

            {/* Dismissible Top Alert Banner */}
            {authError && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-rose-900 text-xs shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{authError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="text-rose-400 hover:text-rose-700 p-0.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username / Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {language === 'EN' ? 'Username or Email Address' : 'ឈ្មោះអ្នកប្រើប្រាស់ ឬ អ៊ីមែល'}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => {
                      setUsernameOrEmail(e.target.value);
                      if (errors.usernameOrEmail) setErrors((prev) => ({ ...prev, usernameOrEmail: undefined }));
                    }}
                    placeholder="e.g. manager@apex.local or admin"
                    className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50/90 border rounded-xl font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all duration-200 shadow-inner ${
                      errors.usernameOrEmail
                        ? 'border-rose-500 text-rose-900 focus:ring-4 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15'
                    }`}
                  />
                </div>
                {errors.usernameOrEmail && (
                  <p className="border-rose-500 text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.usernameOrEmail}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {language === 'EN' ? 'Password' : 'ពាក្យសម្ងាត់'}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-11 py-3 text-sm bg-slate-50/90 border rounded-xl font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all duration-200 shadow-inner ${
                      errors.password
                        ? 'border-rose-500 text-rose-900 focus:ring-4 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="border-rose-500 text-rose-600 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Sub-row: Remember device & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    {language === 'EN' ? 'Remember this device' : 'ចងចាំឧបករណ៍នេះ'}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    alert(
                      language === 'EN'
                        ? 'Password reset instructions have been routed to your System Administrator.'
                        : 'ការណែនាំអំពីការកំណត់ពាក្យសម្ងាត់ឡើងវិញត្រូវបានផ្ញើទៅកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ។'
                    )
                  }
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {language === 'EN' ? 'Forgot Password?' : 'ភ្លេចពាក្យសម្ងាត់?'}
                </button>
              </div>

              {/* 3D Vibrant Gradient Primary CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {language === 'EN' ? 'Authenticating session...' : 'កំពុងផ្ទៀងផ្ទាត់សិទ្ធិ...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wide text-sm">
                      {language === 'EN' ? 'Sign In to Portal' : 'ចូលប្រព័ន្ធ'}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* VIBRANT 3D DEMO QUICK-FILL BAR */}
            <div className="mt-7 pt-5 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>
                    {language === 'EN'
                      ? 'Quick Login (Evaluation / Demo Mode)'
                      : 'ចូលរហ័ស (របៀបវាយតម្លៃ / ដេម៉ូ)'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Click to Auto-Fill
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickFillRoles.map((rf) => {
                  const isActive = activeQuickRole === rf.key;
                  return (
                    <button
                      key={rf.key}
                      type="button"
                      onClick={() => handleQuickFill(rf)}
                      title={rf.title}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between border bg-gradient-to-r shadow-xs ${
                        rf.colorClass
                      } ${isActive ? 'ring-2 ring-indigo-600 scale-[1.02]' : 'hover:scale-[1.02]'}`}
                    >
                      <span className="truncate">{rf.label}</span>
                      {isActive && (
                        <span className={`w-2 h-2 rounded-full ${rf.badgeBg}`}></span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5 font-medium text-center sm:text-left">
                🔒 256-Bit TLS Bank-Grade Encryption • Institutional Access Only
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT PANEL: 3D INSTITUTIONAL HERO & FLOATING FINANCIAL snapshot     */}
      {/* =================================================================== */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 text-white z-20 my-auto relative">
        
        {/* Top Status Badge Pill with Neon Glow */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 border border-emerald-500/40 text-xs font-bold text-emerald-400 backdrop-blur-xl shadow-xl shadow-emerald-950/40">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>● Operational Core Banking System • NBC Sandbox Mode</span>
          </div>
        </div>

        {/* Center 3D Showcase Container */}
        <div className="relative z-10 max-w-xl space-y-6 my-auto py-6">
          <div>
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Next-Generation Microfinance &amp; <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">Loan Lifecycle</span> Management.
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mt-3 font-medium">
              Enterprise core banking platform delivering Automated DTI Underwriting, Cashier POS collection terminal, and NBC regulatory reporting.
            </p>
          </div>

          {/* 3D Glass Floating Market Ticker Card */}
          <div className="card-3d-tilt glass-card-3d rounded-2xl p-6 shadow-2xl space-y-4 transform-style-3d">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-100 uppercase tracking-wider">
                  Live Market FX &amp; Liquidity Ticker
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Real-Time Sync</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 shadow-inner">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Exchange Rate (USD / KHR)</div>
                <div className="text-xl font-black text-white font-mono mt-1 flex items-center justify-between">
                  <span>1 USD ≈ 4,100 KHR</span>
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 shadow-inner">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Portfolio Overview</div>
                <div className="text-sm font-black text-white font-mono mt-1.5 flex items-center gap-2">
                  <span className="text-emerald-400">Active: 428</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-cyan-400">On-Time: 98.2%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Glass Regulatory Governance Card */}
          <div className="card-3d-tilt glass-card-3d rounded-2xl p-5 flex items-start gap-4 transform-style-3d border border-white/10">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shrink-0 shadow-lg shadow-purple-600/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-white uppercase tracking-wider">
                Regulatory Governance &amp; Security Controls
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-1 font-medium">
                Enforcing Maker-Checker (Four-Eyes Principle), Tiered Credit Limits, and Real-Time Delinquency Detection.
              </p>
            </div>
          </div>

          {/* 3D Trust Pills */}
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/70 border border-emerald-500/30 text-xs font-bold text-emerald-300 shadow-lg backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ Automated DTI Underwriting</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/70 border border-cyan-500/30 text-xs font-bold text-cyan-300 shadow-lg backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>✓ Dynamic QR &amp; Thermal Receipts</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/70 border border-purple-500/30 text-xs font-bold text-purple-300 shadow-lg backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>✓ Immutable System Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-medium">
          <div>© 2026 Apex LMS Enterprise Core Banking. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">Security Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">NBC Guidelines</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default LoginPage;
