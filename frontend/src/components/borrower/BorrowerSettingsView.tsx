import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Bell,
  Shield,
  Landmark,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  CreditCard,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

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
      browser: 'Chrome',
      device: 'Desktop Chrome (Windows 11)',
    };
  }
  const ua = navigator.userAgent;
  let os = 'Windows PC';
  if (ua.includes('Win')) os = 'Windows 11';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iPhone iOS';
  else if (ua.includes('iPad')) os = 'iPad iOS';

  let browser = 'Chrome';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  return {
    os,
    browser,
    device: `Desktop ${browser} (${os})`,
  };
}

// Clean, accessible Toggle Switch
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-blue-600' : 'bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export const BorrowerSettingsView: React.FC<BorrowerSettingsViewProps> = ({
  currentUser,
  currency: appCurrency,
  onToggleCurrency,
  onShowToast,
}) => {
  const { language, setLanguage } = useLanguage();

  // Active Tab: 'general' | 'notifications' | 'security' | 'banking'
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'banking'>('general');

  // Currency State
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apex_currency') as Currency;
      if (stored === 'USD' || stored === 'KHR') return stored;
    }
    return appCurrency || 'USD';
  });

  useEffect(() => {
    if (appCurrency) {
      setSelectedCurrency(appCurrency);
    }
  }, [appCurrency]);

  // Notifications State
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
    const cleanUser = (currentUser?.username || currentUser?.name || 'user').replace(/\s+/g, '');
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

  // Security & Password State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [passChangeSuccess, setPassChangeSuccess] = useState<boolean>(false);
  const [passError, setPassError] = useState<string | null>(null);

  // 2FA Mode
  const [twoFactorMode, setTwoFactorMode] = useState<'DIRECT' | 'BAKONG' | 'EMAIL'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apex_2fa_mode');
      if (stored === 'DIRECT' || stored === 'BAKONG' || stored === 'EMAIL') return stored;
    }
    return 'DIRECT';
  });

  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);

  // Active Sessions
  const [activeSessions, setActiveSessions] = useState<ActiveSessionItem[]>(() => {
    const client = getClientDeviceInfo();
    const defaultSessions: ActiveSessionItem[] = [
      {
        id: 'sess-current',
        device: client.device,
        location: 'Phnom Penh, Cambodia',
        ip: '119.82.253.14',
        isCurrent: true,
        lastActive: 'Active now',
      },
      {
        id: 'sess-mobile',
        device: 'iPhone 15 Pro (Safari)',
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
    setTimeout(() => setToastMessage(null), 3000);
    onShowToast?.(msg);
  };

  // Handlers
  const handleLanguageSelect = (lang: 'en' | 'km') => {
    setLanguage(lang as any);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jam_language', lang);
      localStorage.setItem('apex_language', lang);
    }
    showToast(lang === 'en' ? 'Language set to English' : 'ភាសាត្រូវបានកំណត់ជា ភាសាខ្មែរ');
  };

  const handleCurrencySelect = (curr: Currency) => {
    setSelectedCurrency(curr);
    onToggleCurrency(curr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex_currency', curr);
    }
    showToast(`Currency changed to ${curr}`);
  };

  const handleSaveNotifications = (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSavingPreferences(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jam_setting_telegram', String(telegramAlerts));
      localStorage.setItem('jam_setting_telegram_user', telegramUsername);
      localStorage.setItem('jam_setting_sms', String(smsReminders));
      localStorage.setItem('jam_setting_email', String(emailStatements));
    }

    setTimeout(() => {
      setIsSavingPreferences(false);
      showToast('Notification settings saved.');
    }, 300);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassChangeSuccess(false);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPassError('New password must be different.');
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
      showToast(res.message || 'Password updated.');
      setTimeout(() => setPassChangeSuccess(false), 4000);
    } catch (err: any) {
      setIsChangingPass(false);
      const msg = err?.message || err?.error || 'Failed to update password. Please check your credentials.';
      setPassError(msg);
    }
  };

  const handleSelect2FaMode = (mode: 'DIRECT' | 'BAKONG' | 'EMAIL') => {
    setTwoFactorMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apex_2fa_mode', mode);
    }
    setIs2FaModalOpen(false);
    const label =
      mode === 'DIRECT'
        ? 'Direct Access'
        : mode === 'BAKONG'
        ? 'Bakong Authenticator'
        : 'Email OTP';
    showToast(`2FA updated: ${label}`);
  };

  const handleTerminateOtherSessions = () => {
    const remaining = activeSessions.filter((s) => s.isCurrent);
    setActiveSessions(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jam_active_sessions', JSON.stringify(remaining));
    }
    showToast('Signed out of other devices.');
  };

  const borrowerEmail = currentUser?.email || (currentUser?.username ? `${currentUser.username}@student.edu` : 'user@student.edu');
  const borrowerPhone = currentUser?.phone || '+855 12 000 888';
  const maskedPhone = borrowerPhone.replace(/(\+855\s*\d{2})\d+(\d{3})/, '$1 ••• $2');

  const tabs = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'banking', label: 'Bank Accounts', icon: Landmark },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-xl text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your account preferences, notifications, and security.
        </p>
      </div>

      {/* Clean Segmented Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg max-w-fit overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERAL (Display Language & Currency)                              */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div className="space-y-5">
          {/* Display Language Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800/70 pb-3">
              <h2 className="text-sm font-semibold text-white">Display Language</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose the language you prefer for the interface.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <button
                type="button"
                onClick={() => handleLanguageSelect('en')}
                className={`p-3.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                  language === 'en'
                    ? 'bg-slate-800/90 border-blue-500/80 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      language === 'en' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">English (US)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Standard English</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLanguageSelect('km')}
                className={`p-3.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                  language === 'km'
                    ? 'bg-slate-800/90 border-blue-500/80 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      language === 'km' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {language === 'km' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white font-suwannaphum">ភាសាខ្មែរ (Khmer)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-suwannaphum">ភាសាខ្មែរ</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Default Currency Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800/70 pb-3">
              <h2 className="text-sm font-semibold text-white">Default Currency</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your primary currency for loan calculations and balances.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <button
                type="button"
                onClick={() => handleCurrencySelect('USD')}
                className={`p-3.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedCurrency === 'USD'
                    ? 'bg-slate-800/90 border-blue-500/80 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedCurrency === 'USD' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {selectedCurrency === 'USD' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">USD ($)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">United States Dollar</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencySelect('KHR')}
                className={`p-3.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedCurrency === 'KHR'
                    ? 'bg-slate-800/90 border-blue-500/80 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedCurrency === 'KHR' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {selectedCurrency === 'KHR' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">KHR (៛)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Cambodian Riel (4,000 / USD)</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NOTIFICATIONS (Telegram, SMS, Email)                               */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl divide-y divide-slate-800/70">
            {/* Telegram Alerts */}
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Telegram Alerts</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Get instant payment reminders and receipts sent to your Telegram account.
                </p>

                {telegramAlerts && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-slate-400">Telegram:</span>
                    <input
                      type="text"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@your_username"
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 w-48"
                    />
                    <a
                      href="https://t.me"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Telegram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <ToggleSwitch
                checked={telegramAlerts}
                onChange={(val) => setTelegramAlerts(val)}
              />
            </div>

            {/* SMS Reminders */}
            <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="space-y-1 max-w-lg">
                <div className="text-sm font-semibold text-white">SMS Reminders</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Receive an SMS text message to <strong className="text-slate-300 font-mono">{maskedPhone}</strong> 3 days before any payment is due.
                </p>
              </div>

              <ToggleSwitch
                checked={smsReminders}
                onChange={(val) => setSmsReminders(val)}
              />
            </div>

            {/* Email Statements */}
            <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="space-y-1 max-w-lg">
                <div className="text-sm font-semibold text-white">Email Receipts</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Receive monthly statements and payment receipts at <strong className="text-slate-300 font-mono">{borrowerEmail}</strong>.
                </p>
              </div>

              <ToggleSwitch
                checked={emailStatements}
                onChange={(val) => setEmailStatements(val)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPreferences}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SECURITY (Password, 2FA, Devices)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          {/* Change Password Card */}
          <form onSubmit={handlePasswordSubmit} className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800/70 pb-3">
              <h2 className="text-sm font-semibold text-white">Change Password</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update your password to keep your account secure.
              </p>
            </div>

            {passError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passChangeSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}

            <div className="space-y-3 max-w-lg text-xs">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-10 px-3.5 pr-10 bg-slate-950/60 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-10 px-3.5 pr-10 bg-slate-950/60 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full h-10 px-3.5 pr-10 bg-slate-950/60 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Two-Factor Authentication Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Two-Factor Authentication (2FA)</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add an extra layer of security when signing in.
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                {twoFactorMode === 'DIRECT' ? 'Direct Access' : twoFactorMode === 'BAKONG' ? 'Bakong Auth' : 'Email OTP'}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {twoFactorMode === 'DIRECT'
                ? 'Direct sign-in using your password without waiting for OTP codes.'
                : twoFactorMode === 'BAKONG'
                ? 'Secured with Bakong Authenticator biometric approvals.'
                : 'Secured with a 6-digit verification code sent to your email.'}
            </p>

            <button
              type="button"
              onClick={() => setIs2FaModalOpen(true)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
            >
              Change 2FA Method
            </button>
          </div>

          {/* Active Devices Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Active Devices</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Devices currently signed into your account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTerminateOtherSessions}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold hover:underline cursor-pointer"
              >
                Sign out other devices
              </button>
            </div>

            <div className="space-y-2">
              {activeSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    {sess.device.includes('iPhone') || sess.device.includes('Android') ? (
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Laptop className="w-4 h-4 text-slate-400" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white">{sess.device}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{sess.ip} • {sess.location}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    sess.isCurrent ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400'
                  }`}>
                    {sess.isCurrent ? 'This Device' : sess.lastActive}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BANK ACCOUNTS (Connected ACLEDA & Bakong)                           */}
      {/* ========================================================================= */}
      {activeTab === 'banking' && (
        <div className="space-y-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800/70 pb-3">
              <h2 className="text-sm font-semibold text-white">Connected Accounts</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bank accounts linked to your profile for loan disbursement and repayments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ACLEDA Bank */}
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-500/15 text-blue-400 font-bold text-xs flex items-center justify-center">
                      AC
                    </div>
                    <span className="text-xs font-semibold text-white">ACLEDA Bank Plc.</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Verified
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">Account: •••• 2025</div>
                <p className="text-[11px] text-slate-400">
                  Primary disbursement destination for approved loans.
                </p>
              </div>

              {/* Bakong KHQR */}
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-rose-500/15 text-rose-400 font-bold text-xs flex items-center justify-center">
                      KH
                    </div>
                    <span className="text-xs font-semibold text-white">Bakong KHQR</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Active
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">ID: jamsongvich@nbc</div>
                <p className="text-[11px] text-slate-400">
                  Instant repayment clearing via Bakong app with zero fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Selection Modal */}
      {is2FaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Select 2FA Method</h3>
              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSelect2FaMode('DIRECT')}
                className={`w-full p-3 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                  twoFactorMode === 'DIRECT'
                    ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">Direct Access (Recommended)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Quick password sign-in without OTP delay.</div>
                </div>
                {twoFactorMode === 'DIRECT' && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelect2FaMode('BAKONG')}
                className={`w-full p-3 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                  twoFactorMode === 'BAKONG'
                    ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">Bakong Authenticator</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Biometric approval via Bakong app.</div>
                </div>
                {twoFactorMode === 'BAKONG' && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelect2FaMode('EMAIL')}
                className={`w-full p-3 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                  twoFactorMode === 'EMAIL'
                    ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">Email Code (OTP)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">6-digit PIN sent to {borrowerEmail}.</div>
                </div>
                {twoFactorMode === 'EMAIL' && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-medium text-xs transition cursor-pointer"
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
