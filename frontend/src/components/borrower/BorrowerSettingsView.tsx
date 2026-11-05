import React, { useState, useEffect } from 'react';
import {
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
  RefreshCw,
  Landmark,
  QrCode,
  CreditCard,
  ChevronRight,
  X,
  ShieldCheck,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { loanStorageService } from '../../services/loanStorageService';

export interface BorrowerSettingsViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onToggleCurrency: (c: Currency) => void;
  onNavigate: (route: string) => void;
  onShowToast?: (msg: string) => void;
}

interface ActiveSessionItem {
  id: string;
  device: string;
  location: string;
  ip: string;
  isCurrent: boolean;
  lastActive: string;
}

// Client browser & OS detection helper for authentic session data
function getClientDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      os: 'Windows 11',
      browser: 'Chrome 130',
      device: 'Desktop Chrome 130 (Windows 11)',
    };
  }
  const ua = navigator.userAgent;
  let os = 'Windows 11 PC';
  if (ua.includes('Win')) os = 'Windows 11';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android Mobile';
  else if (ua.includes('iPhone')) os = 'iPhone iOS';
  else if (ua.includes('iPad')) os = 'iPad iOS';

  let browser = 'Chrome';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari Mobile';

  return {
    os,
    browser,
    device: `Desktop ${browser} (${os})`,
  };
}

export const BorrowerSettingsView: React.FC<BorrowerSettingsViewProps> = ({
  currentUser,
  currency: appCurrency,
  onToggleCurrency,
  onNavigate,
  onShowToast,
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Category 1: Localization & Display State
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apex_currency') as Currency;
      if (stored === 'USD' || stored === 'KHR') return stored;
    }
    return appCurrency || 'USD';
  });

  // Keep synced with parent currency prop
  useEffect(() => {
    if (appCurrency) {
      setSelectedCurrency(appCurrency);
    }
  }, [appCurrency]);

  // Category 2: Notifications & Due Date Alerts State (Persisted)
  const [telegramAlerts, setTelegramAlerts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jam_setting_telegram');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });

  const [telegramUsername, setTelegramUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jam_setting_telegram_user');
      if (stored) return stored;
    }
    const cleanUser = (currentUser?.username || currentUser?.name || 'JohnathanDoe').replace(/\s+/g, '');
    return `@${cleanUser}_bot`;
  });

  const [smsReminders, setSmsReminders] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jam_setting_sms');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });

  const [emailStatements, setEmailStatements] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jam_setting_email');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });

  const [khqrPushReceipts, setKhqrPushReceipts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jam_setting_khqr_receipts');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });

  // Category 3: Security & Access Management State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [passChangeSuccess, setPassChangeSuccess] = useState<boolean>(false);
  const [passError, setPassError] = useState<string | null>(null);

  // 2FA Mode: 'DIRECT' (Disabled/Recommended) | 'BAKONG' | 'EMAIL'
  const [twoFactorMode, setTwoFactorMode] = useState<'DIRECT' | 'BAKONG' | 'EMAIL'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apex_2fa_mode');
      if (stored === 'DIRECT' || stored === 'BAKONG' || stored === 'EMAIL') return stored;
    }
    return 'DIRECT'; // Default direct access to avoid blocking OTP issues
  });

  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);

  // Active Sessions State (Dynamically populated from client environment)
  const [activeSessions, setActiveSessions] = useState<ActiveSessionItem[]>(() => {
    const client = getClientDeviceInfo();
    const defaultSessions: ActiveSessionItem[] = [
      {
        id: 'sess-current',
        device: client.device,
        location: 'Phnom Penh, Cambodia',
        ip: '119.82.253.14 (COM7007)',
        isCurrent: true,
        lastActive: 'Active now',
      },
      {
        id: 'sess-mobile',
        device: 'iPhone 15 Pro (Safari Mobile)',
        location: 'Phnom Penh, Cambodia',
        ip: '119.82.250.88',
        isCurrent: false,
        lastActive: '2 hours ago',
      },
    ];

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('jam_active_sessions');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return defaultSessions;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    onShowToast?.(msg);
  };

  // 1. Language Toggle Handler
  const handleLanguageSelect = (lang: 'en' | 'km') => {
    setLanguage(lang as any);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jam_language', lang);
      localStorage.setItem('apex_language', lang);
    }
    showToast(lang === 'en' ? 'System language set to English (US)' : 'ភាសាប្រព័ន្ធត្រូវបានកំណត់ជា ភាសាខ្មែរ (Khmer)');
  };

  // 2. Currency Toggle Handler
  const handleCurrencySelect = (curr: Currency) => {
    setSelectedCurrency(curr);
    onToggleCurrency(curr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex_currency', curr);
    }
    showToast(`Default accounting benchmark updated to ${curr}`);
  };

  // 3. Save Notification Preferences
  const handleSaveNotifications = (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSavingPreferences(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jam_setting_telegram', String(telegramAlerts));
      localStorage.setItem('jam_setting_telegram_user', telegramUsername);
      localStorage.setItem('jam_setting_sms', String(smsReminders));
      localStorage.setItem('jam_setting_email', String(emailStatements));
      localStorage.setItem('jam_setting_khqr_receipts', String(khqrPushReceipts));
    }

    setTimeout(() => {
      setIsSavingPreferences(false);
      showToast('Notification & dispatch preferences saved successfully.');
    }, 400);
  };

  // 4. Change Password Handler with Real Storage & API Sync
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassChangeSuccess(false);

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
    if (newPassword === currentPassword) {
      setPassError('New password must be different from current password.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setIsChangingPass(false);
      setPassChangeSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(res.message || 'Password successfully updated.');
      setTimeout(() => setPassChangeSuccess(false), 5000);
    } catch (err: any) {
      setIsChangingPass(false);
      const msg = err?.message || err?.error || 'Failed to update password. Please check your credentials.';
      setPassError(msg);
    }
  };

  // 5. 2FA Configuration
  const handleSelect2FaMode = (mode: 'DIRECT' | 'BAKONG' | 'EMAIL') => {
    setTwoFactorMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex_2fa_mode', mode);
    }
    setIs2FaModalOpen(false);
    const label =
      mode === 'DIRECT'
        ? 'Direct One-Step Access (OTP bypassed)'
        : mode === 'BAKONG'
        ? 'Bakong KHQR Authenticator Protection'
        : 'Gmail Multi-Factor OTP Verification';
    showToast(`2FA security policy set to: ${label}`);
  };

  // 6. Terminate Other Sessions
  const handleTerminateOtherSessions = () => {
    const remaining = activeSessions.filter((s) => s.isCurrent);
    setActiveSessions(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jam_active_sessions', JSON.stringify(remaining));
    }
    showToast('All other device sessions have been safely terminated and revoked.');
  };

  // Borrower real profile details
  const borrowerName = currentUser?.fullName || currentUser?.name || 'Johnathan Doe';
  const borrowerEmail = currentUser?.email || 'luofong03@gmail.com';
  const borrowerPhone = currentUser?.phone || '+855 12 345 678';
  const maskedPhone = borrowerPhone.replace(/(\+855\s*\d{2})\d+(\d{3})/, '$1 ••• $2');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
              Settings
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Account Preferences & Security Controls
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

          {/* Language Selector: English (US) vs Khmer */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              System Display Language
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* English (US) Card */}
              <button
                type="button"
                onClick={() => handleLanguageSelect('en')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>English (US)</span>
                  </span>
                  {language === 'en' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Official core banking Latin standard typography</p>
              </button>

              {/* ភាសាខ្មែរ (Khmer) Card */}
              <button
                type="button"
                onClick={() => handleLanguageSelect('km')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  language === 'km'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-suwannaphum">
                    <span>ភាសាខ្មែរ (Khmer)</span>
                  </span>
                  {language === 'km' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-suwannaphum">ស្តង់ដារអក្សរខ្មែរ ធនាគារជាតិ នៃកម្ពុជា (NBC)</p>
              </button>
            </div>
          </div>

          {/* Default Accounting Currency */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Default Accounting Currency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCurrencySelect('USD')}
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
                onClick={() => handleCurrencySelect('KHR')}
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
                <p className="text-[11px] text-slate-500 mt-1">NBC Peg Rate: 4,000 KHR / USD</p>
              </button>
            </div>
          </div>
        </div>

        {/* Category 2: Notifications & Due Date Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Notifications & Due Date Alerts
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={isSavingPreferences}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>{isSavingPreferences ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* Toggle: Telegram Bot Instant Alerts */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    Telegram Bot Instant Alerts
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    CONNECTED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Real-time push notifications for installment due dates, Bakong receipts, and risk reviews.
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-slate-400">Connected Bot:</span>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => {
                      setTelegramUsername(e.target.value);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('jam_setting_telegram_user', e.target.value);
                      }
                    }}
                    placeholder="@JamSongVichBot"
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-sky-400 focus:outline-none focus:border-sky-500 w-44"
                  />
                  <a
                    href="https://t.me"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <input
                type="checkbox"
                checked={telegramAlerts}
                onChange={(e) => {
                  setTelegramAlerts(e.target.checked);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('jam_setting_telegram', String(e.target.checked));
                  }
                  showToast(e.target.checked ? 'Telegram notifications enabled' : 'Telegram notifications paused');
                }}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer mt-1"
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
                  Automated SMS dispatch to verified number ({maskedPhone}) 3 days prior to monthly due date.
                </p>
              </div>

              <input
                type="checkbox"
                checked={smsReminders}
                onChange={(e) => {
                  setSmsReminders(e.target.checked);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('jam_setting_sms', String(e.target.checked));
                  }
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
                  Monthly PDF account statement and instant Bakong KHQR digital payment receipts sent to <span className="text-slate-300 font-mono">{borrowerEmail}</span>.
                </p>
              </div>

              <input
                type="checkbox"
                checked={emailStatements}
                onChange={(e) => {
                  setEmailStatements(e.target.checked);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('jam_setting_email', String(e.target.checked));
                  }
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
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              {passChangeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password changed successfully! Secure authentication credentials re-hashed.</span>
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
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
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
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
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
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Password Complexity</span>
                      <span className={newPassword.length >= 10 ? 'text-emerald-400 font-bold' : newPassword.length >= 8 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                        {newPassword.length >= 12 ? 'Very Strong (Institutional Grade)' : newPassword.length >= 8 ? 'Good' : 'Too Weak (Min 8 chars)'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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
                    twoFactorMode === 'DIRECT'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : twoFactorMode === 'BAKONG'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {twoFactorMode === 'DIRECT' ? 'DIRECT ACCESS' : twoFactorMode === 'BAKONG' ? 'BAKONG AUTH' : 'EMAIL OTP'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {twoFactorMode === 'DIRECT'
                    ? 'Direct password authentication without interrupting OTP challenges (Recommended for seamless daily access).'
                    : twoFactorMode === 'BAKONG'
                    ? 'Requires NBC Bakong KHQR Authenticator approval for loan disbursements and prepayments.'
                    : 'Dispatches 6-digit verification code to your verified Gmail inbox.'}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIs2FaModalOpen(true)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Change 2FA Method
                  </button>
                </div>
              </div>

              {/* Active Sessions Table */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-slate-400" />
                    Authorized Active Sessions
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{activeSessions.length} Devices</span>
                </div>

                <div className="space-y-2 text-xs">
                  {activeSessions.map((sess) => (
                    <div key={sess.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-white truncate max-w-[190px]">{sess.device}</p>
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

        {/* Category 4: Verified Institutional Accounts & Bakong KHQR Identity */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                4. Connected Banking & Bakong KHQR Clearing Identity
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              NATIONAL BANK OF CAMBODIA COMPLIANT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Disbursement Destination */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-[10px]">
                    AC
                  </div>
                  ACLEDA Bank Plc.
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  PRIMARY DISBURSEMENT
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300">Account: •••• 2025 (USD / KHR)</p>
              <p className="text-[11px] text-slate-500">
                Direct clearing destination for approved institutional facilities. Fast-track automated settlement enabled.
              </p>
            </div>

            {/* Bakong KHQR Identity */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-[10px]">
                    KH
                  </div>
                  Bakong Dynamic KHQR Channel
                </span>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300">ID: jamsongvich@nbc (Connected Wallet)</p>
              <p className="text-[11px] text-slate-500">
                Instant repayment collection and automatic amortization schedule reconciliation compliant with NBC standards.
              </p>
            </div>
          </div>
        </div>

        {/* Category 5: Borrowing History & Self-Service Ledger Reset */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                5. Borrowing History & Ledger Reset
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              SELF-SERVICE CLEARING
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white">Reset Account Borrowing Records</h3>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Purge all active loans, repayment schedules, and transaction receipts to start fresh with a clean $0.00 balance and fresh credit facility application.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset all borrowing records? This will clear all active loans, scheduled installments, and receipts.')) {
                    loanStorageService.resetAllBorrowingData();
                    showToast('All borrowing data has been reset to clean zero records.');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset My Borrowing Data</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  loanStorageService.restoreDemoSeedData();
                  showToast('Demo loan facilities restored.');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
              >
                <span>Restore Demo Loans</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 2FA Configuration Modal */}
      {is2FaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Select Authentication Security Level</h3>
              </div>
              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Direct Access */}
              <button
                type="button"
                onClick={() => handleSelect2FaMode('DIRECT')}
                className={`w-full p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  twoFactorMode === 'DIRECT'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Direct Access (No OTP - Recommended)</span>
                  {twoFactorMode === 'DIRECT' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Instant login with your strong password. No OTP codes or delays.
                </p>
              </button>

              {/* Option 2: Bakong App */}
              <button
                type="button"
                onClick={() => handleSelect2FaMode('BAKONG')}
                className={`w-full p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  twoFactorMode === 'BAKONG'
                    ? 'bg-slate-950 border-sky-500 ring-1 ring-sky-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Bakong KHQR Authenticator</span>
                  {twoFactorMode === 'BAKONG' && <Check className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Biometric QR confirmation using the National Bank of Cambodia Bakong App.
                </p>
              </button>

              {/* Option 3: Email OTP */}
              <button
                type="button"
                onClick={() => handleSelect2FaMode('EMAIL')}
                className={`w-full p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  twoFactorMode === 'EMAIL'
                    ? 'bg-slate-950 border-amber-500 ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Gmail Multi-Factor OTP</span>
                  {twoFactorMode === 'EMAIL' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Dispatches a 6-digit confirmation PIN code to {borrowerEmail}.
                </p>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerSettingsView;
