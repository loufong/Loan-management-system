import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  KeyRound,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  Send,
  Mail,
  MessageSquare,
  DollarSign,
  Save,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export interface BorrowerSettingsViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onToggleCurrency: (c: Currency) => void;
  onNavigate: (route: string) => void;
  onShowToast?: (msg: string) => void;
}

export const BorrowerSettingsView: React.FC<BorrowerSettingsViewProps> = ({
  currentUser,
  currency: appCurrency,
  onToggleCurrency,
  onNavigate,
  onShowToast,
}) => {
  const { language, setLanguage } = useLanguage();
  // Fixed to English-only standard

  // Category 1: Localization & Display State
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(appCurrency || 'USD');

  // Category 2: Notifications & Due Date Alerts State
  const [telegramAlerts, setTelegramAlerts] = useState<boolean>(true);
  const [telegramConnected, setTelegramConnected] = useState<boolean>(true);
  const [smsReminders, setSmsReminders] = useState<boolean>(true);
  const [emailStatements, setEmailStatements] = useState<boolean>(true);

  // Category 3: Security & Access Management State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState<boolean>(true);
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [passChangeSuccess, setPassChangeSuccess] = useState<boolean>(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Active Sessions
  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'sess-1',
      device: 'Desktop Chrome 130 (Windows 11)',
      location: 'Phnom Penh, Cambodia',
      ip: '119.82.253.14 (Online)',
      isCurrent: true,
      lastActive: 'Active now',
    },
    {
      id: 'sess-2',
      device: 'iPhone 15 Pro (Safari Mobile)',
      location: 'Phnom Penh, Cambodia',
      ip: '119.82.250.88',
      isCurrent: false,
      lastActive: '2 hours ago',
    },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
    onShowToast?.(msg);
  };

  const handleLanguageChange = (lang: 'en' | 'km') => {
    setLanguage(lang as any);
    showToast('Language updated to English');
  };

  const handleCurrencyChange = (curr: Currency) => {
    setSelectedCurrency(curr);
    onToggleCurrency(curr);
    showToast(`Default accounting currency updated to ${curr}`);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPass(true);
    setTimeout(() => {
      setIsChangingPass(false);
      setPassChangeSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password successfully updated.');
      setTimeout(() => setPassChangeSuccess(false), 4000);
    }, 1000);
  };

  const handleTerminateOtherSessions = () => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast('All other device sessions have been safely terminated.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div>
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span className="text-slate-500 font-medium">Core Banking</span>
            <span>/</span>
            <span className="font-bold text-emerald-400 uppercase tracking-wider">
              {'Settings'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {'Account Preferences & Security Controls'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure regional display standards, real-time installment reminders, and institutional authentication credentials.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SETTINGS CATEGORIES GRID                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category 1: Localization & Display */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              1. Localization & Regional Display
            </h2>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              System Display Language
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border text-left bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">English (US)</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Official core banking Latin standard typography</p>
              </div>
            </div>
          </div>

          {/* Default Primary Currency */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Default Accounting Currency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedCurrency === 'USD'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-white">USD ($) Dollar</span>
                  {selectedCurrency === 'USD' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Standard dual-currency benchmark</p>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencyChange('KHR')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  selectedCurrency === 'KHR'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-white">KHR (៛) Cambodian Riel</span>
                  {selectedCurrency === 'KHR' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">NBC Peg Rate: 4,080 KHR / USD</p>
              </button>
            </div>
          </div>
        </div>

        {/* Category 2: Notifications & Due Date Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              2. Notifications & Due Date Alerts
            </h2>
          </div>

          <div className="space-y-3">
            {/* Toggle: Telegram Bot Instant Alerts */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    Telegram Bot Instant Alerts
                  </span>
                  {telegramConnected && (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      CONNECTED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Real-time push notifications for installment due dates, Bakong receipts, and risk reviews.
                </p>
                <button
                  type="button"
                  onClick={() => showToast('Telegram Bot session validated: @JamSongVichBot')}
                  className="text-[11px] font-mono text-sky-400 hover:underline pt-1 inline-flex items-center gap-1"
                >
                  <span>Connected to @JamSongVichBot</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <input
                type="checkbox"
                checked={telegramAlerts}
                onChange={(e) => {
                  setTelegramAlerts(e.target.checked);
                  showToast(e.target.checked ? 'Telegram notifications enabled' : 'Telegram notifications disabled');
                }}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Toggle: SMS Repayment Reminders */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  SMS Repayment Reminders
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automated SMS dispatch to verified number (+855 12 ••• 789) 3 days prior to monthly due date.
                </p>
              </div>

              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => {
                  setSmsReminders(e.target.checked);
                  showToast(e.target.checked ? 'SMS Reminders active' : 'SMS Reminders paused');
                }}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Toggle: Email Statements & Settlement Receipts */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  Email Statements & Settlement Receipts
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Monthly PDF account statement and instant Bakong KHQR digital payment receipts.
                </p>
              </div>

              <input
                type="checkbox"
                checked={emailStatements}
                onChange={(e) => {
                  setEmailStatements(e.target.checked);
                  showToast(e.target.checked ? 'Email statements active' : 'Email statements paused');
                }}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Category 3: Security & Access Management (Spans 2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              3. Security & Access Management
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Password Change Form (7 Cols) */}
            <form onSubmit={handlePasswordSubmit} className="lg:col-span-7 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Update Account Password
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ensure your core banking credentials are strong and unique.
                </p>
              </div>

              {passError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              {passChangeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password changed successfully! Secure token re-issued.</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Password Complexity</span>
                      <span className={newPassword.length >= 8 ? 'text-emerald-400' : 'text-amber-400'}>
                        {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Good' : 'Weak'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          newPassword.length >= 12 ? 'bg-emerald-500 w-full' : newPassword.length >= 8 ? 'bg-amber-400 w-2/3' : 'bg-rose-500 w-1/3'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isChangingPass ? 'Encrypting & Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

            {/* 2FA & Active Sessions (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Two-Factor Authentication (2FA) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    twoFactorAuth
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {twoFactorAuth ? 'ENFORCED' : 'OPTIONAL'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Requires Bakong Authenticator or SMS OTP for new loan facility disbursements and custom principal prepayments.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorAuth(!twoFactorAuth);
                    showToast(twoFactorAuth ? '2FA set to optional' : '2FA institutional enforcement enabled');
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:underline"
                >
                  {twoFactorAuth ? 'Change 2FA Method' : 'Enable 2FA Protection'}
                </button>
              </div>

              {/* Active Sessions Table */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-slate-400" />
                    Authorized Active Sessions
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">2 Devices</span>
                </div>

                <div className="space-y-2 text-xs">
                  {activeSessions.map((sess) => (
                    <div key={sess.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-white truncate max-w-[170px]">{sess.device}</p>
                        <p className="text-[10px] font-mono text-slate-400">{sess.ip} • {sess.location}</p>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        sess.isCurrent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {sess.isCurrent ? 'CURRENT' : sess.lastActive}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleTerminateOtherSessions}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign out from all other devices</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowerSettingsView;

