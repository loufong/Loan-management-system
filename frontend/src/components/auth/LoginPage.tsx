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
import { useLanguage } from '../../context/LanguageContext';
import logoImg from '../../assets/logo-transparent.png';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string, rememberMe: boolean) => void;
  onRequireOtp?: (email: string) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  successNotice?: string | null;
  initialRole?: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onRequireOtp,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  successNotice,
  initialRole,
}) => {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
      const loginResult = await login(identifier, password, rememberMe);
      if (loginResult?.requireOtp) {
        if (onRequireOtp) {
          onRequireOtp(loginResult.email || identifier);
        }
        return;
      }
      const activeToken =
        localStorage.getItem('apex_token') ||
        sessionStorage.getItem('apex_token') ||
        'token';
      onLoginSuccess(loginResult.user || loginResult, activeToken, rememberMe);
    } catch (err: any) {
      setError(err?.message || 'Invalid email/username or password.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        {/* Language Switcher in Login Header */}
        <div className="flex justify-end mb-3">
          <div className="flex items-center bg-white p-0.5 rounded-[6px] border border-[#E2E8F0] text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setLanguage('km')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors flex items-center justify-center cursor-pointer ${
                language === 'km'
                  ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="ភាសាខ្មែរ (KH)"
            >
              <span className="text-[11px] font-bold">KH</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors flex items-center justify-center cursor-pointer ${
                language === 'en'
                  ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="English (EN)"
            >
              <span className="text-[11px] font-bold">EN</span>
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

        {/* Clean Login Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 sm:p-8 space-y-5">
          {/* Form Header */}
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-lg font-bold text-[#0F172A]">
              {language === 'km' ? 'សូមស្វាគមន៍' : 'Welcome back'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {language === 'km'
                ? 'ចូលទៅកាន់គណនីគ្រប់គ្រងឥណទានរបស់អ្នក។'
                : 'Sign in to continue to your loan management account.'}
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
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[#0F172A] font-semibold">
              <span>{language === 'km' ? 'ជ្រើសរើសគណនី (ចុចម្តងចូលភ្លាម):' : 'Select Account (1-Click Fill):'}</span>
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
                className="p-2 bg-white border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/40 rounded-[5px] text-left transition-all cursor-pointer flex flex-col"
              >
                <span className="font-bold text-[11px] text-[#2563EB]">
                  {language === 'km' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'Administrator'}
                </span>
                <span className="text-[10px] text-[#64748B] truncate">admin@loansystem.edu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail('johnathan.doe@student.edu');
                  setPassword('Password123!');
                  setError(null);
                }}
                className="p-2 bg-white border border-[#E2E8F0] hover:border-[#059669] hover:bg-emerald-50/40 rounded-[5px] text-left transition-all cursor-pointer flex flex-col"
              >
                <span className="font-bold text-[11px] text-[#059669]">
                  {language === 'km' ? 'អតិថិជន (Borrower)' : 'Client User (Borrower)'}
                </span>
                <span className="text-[10px] text-[#64748B] truncate">johnathan.doe@student.edu</span>
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Field 1: Email or Username */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {language === 'km' ? 'ឈ្មោះអ្នកប្រើ ឬ អ៊ីមែល' : 'Email or Username'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={language === 'km' ? 'បញ្ចូលអ៊ីមែល ឬ ឈ្មោះអ្នកប្រើ' : 'Enter email or username'}
                  autoComplete="username"
                  required
                  className="w-full h-11 px-3.5 pl-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
                />
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Password with Show/Hide icon */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {language === 'km' ? 'ពាក្យសម្ងាត់' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់' : 'Enter password'}
                  autoComplete="current-password"
                  required
                  className="w-full h-11 px-3.5 pl-10 pr-10 rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors placeholder:text-[#64748B]"
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
                  className="w-4 h-4 rounded-[4px] border-[#E2E8F0] text-[#2563EB] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-[#0F172A] font-medium">
                  {language === 'km' ? 'ចងចាំខ្ញុំនៅលើឧបករណ៍នេះ' : 'Remember me'}
                </span>
              </label>

              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
              >
                {language === 'km' ? 'ភ្លេចពាក្យសម្ងាត់?' : 'Forgot password?'}
              </button>
            </div>

            {/* Field 4: SIGN IN Button with Loading state */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold tracking-wider rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{language === 'km' ? 'កំពុងចូល...' : 'SIGNING IN...'}</span>
                </>
              ) : (
                <span>{language === 'km' ? 'ចូលប្រព័ន្ធ' : 'SIGN IN'}</span>
              )}
            </button>
          </form>

          {/* Don't have an account? Create account */}
          <div className="text-center text-xs text-[#64748B] pt-1">
            <span>{language === 'km' ? 'មិនទាន់មានគណនីមែនទេ? ' : "Don't have an account? "}</span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors"
            >
              {language === 'km' ? 'បង្កើតគណនីឥឡូវនេះ' : 'Create account'}
            </button>
          </div>

          {/* Security notice */}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>
              {language === 'km'
                ? 'សុវត្ថិភាពខ្ពស់ជាមួយនឹងការអ៊ិនគ្រីប 256-bit TLS។'
                : 'Secure 256-bit TLS connection. Authorized access only.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] space-y-0.5 mt-6">
          <p>© 2026 Jam Song Vich • {t('app_subtitle', 'Loan Management System')}</p>
          <p className="text-[11px] text-slate-400">
            {language === 'km'
              ? 'អនុលោមតាមស្តង់ដារធនាគារជាតិនៃកម្ពុជា (NBC)'
              : 'Compliant with National Bank of Cambodia Standards'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

