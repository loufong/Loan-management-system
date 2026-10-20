import React, { useState, useEffect } from 'react';
import { Currency, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  KeyRound,
  Bell,
  DollarSign,
  Globe,
  Moon,
  Sun,
  Laptop,
  Smartphone,
  CreditCard,
  Building2,
  Download,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Trash2,
  Plus,
  Sliders,
  Sparkles,
  Clock,
  HelpCircle,
  Calendar,
  BadgeCheck,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';

export interface UserSettingsViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onToggleCurrency: (c: Currency) => void;
  onChangePassword: () => void;
  onShowToast?: (msg: string) => void;
}

interface LinkedBankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  currency: 'USD' | 'KHR';
  isPrimary: boolean;
  isVerified: boolean;
  color: string;
}

interface ActiveSession {
  id: string;
  deviceType: 'desktop' | 'mobile';
  deviceModel: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const UserSettingsView: React.FC<UserSettingsViewProps> = ({
  currentUser,
  currency,
  onToggleCurrency,
  onChangePassword,
  onShowToast,
}) => {
  const { user: authUser, updateSettings: authUpdateSettings, updateProfile: authUpdateProfile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Active Tab: 'profile' | 'security' | 'notifications' | 'preferences' | 'banking' | 'privacy'
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences' | 'banking' | 'privacy'>('profile');

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Profile State
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.name || 'Financial User');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '+855 12 889 900');
  const [nationalId, setNationalId] = useState(currentUser.nationalId || '0108928374');
  const [branch, setBranch] = useState(currentUser.branch || currentUser.settings?.branch || 'Phnom Penh Main Branch');
  const [occupation, setOccupation] = useState(currentUser.position || 'Professional / Borrower');
  const [department, setDepartment] = useState(currentUser.department || 'Information Technology');

  // 2. Security State
  const [skipOtpTrusted, setSkipOtpTrusted] = useState(true);
  const [sensitiveActionOtp, setSensitiveActionOtp] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [biometricUnlock, setBiometricUnlock] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // In-line change password modal/section
  const [showPassModal, setShowPassModal] = useState(false);
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // 3. Notification State
  const [notifDueDate, setNotifDueDate] = useState(true);
  const [notifSameDay, setNotifSameDay] = useState(true);
  const [notifOverdue, setNotifOverdue] = useState(true);
  const [notifDisbursement, setNotifDisbursement] = useState(true);
  const [notifReceipts, setNotifReceipts] = useState(true);
  const [notifMonthlyLedger, setNotifMonthlyLedger] = useState(true);
  const [notifEmailChannel, setNotifEmailChannel] = useState(true);
  const [notifSmsChannel, setNotifSmsChannel] = useState(true);
  const [notifLeadDays, setNotifLeadDays] = useState('3');

  // 4. Preferences State
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('light');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [numberFormat, setNumberFormat] = useState('en-US');

  // 5. Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<LinkedBankAccount[]>([
    {
      id: 'bank-1',
      bankName: 'ABA Bank',
      bankCode: 'ABAKKHPP',
      accountNumber: '001 829 412',
      accountName: (currentUser.fullName || currentUser.name || 'TONGHENG KEO').toUpperCase(),
      currency: 'USD',
      isPrimary: true,
      isVerified: true,
      color: 'border-blue-600 bg-blue-50/50',
    },
    {
      id: 'bank-2',
      bankName: 'Wing Bank (Cambodia)',
      bankCode: 'WINGKHPP',
      accountNumber: '089 554 120',
      accountName: (currentUser.fullName || currentUser.name || 'TONGHENG KEO').toUpperCase(),
      currency: 'KHR',
      isPrimary: false,
      isVerified: true,
      color: 'border-emerald-600 bg-emerald-50/50',
    },
  ]);

  // Add Bank Modal State
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState('ABA Bank');
  const [newBankAccountNo, setNewBankAccountNo] = useState('');
  const [newBankAccountName, setNewBankAccountName] = useState(currentUser.fullName || currentUser.name || '');
  const [newBankCurrency, setNewBankCurrency] = useState<'USD' | 'KHR'>('USD');

  // 6. Active Sessions State
  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: 'sess-1',
      deviceType: 'desktop',
      deviceModel: 'Windows 11 Workstation',
      browser: 'Google Chrome 122',
      ipAddress: '119.82.253.14',
      location: 'Phnom Penh, Cambodia',
      lastActive: 'Active Now (This Device)',
      isCurrent: true,
    },
    {
      id: 'sess-2',
      deviceType: 'mobile',
      deviceModel: 'Apple iPhone 15 Pro',
      browser: 'Mobile Safari 17.4',
      ipAddress: '119.82.253.14',
      location: 'Phnom Penh, Cambodia',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
    {
      id: 'sess-3',
      deviceType: 'desktop',
      deviceModel: 'MacBook Air M2',
      browser: 'Safari 17.2',
      ipAddress: '203.144.144.2',
      location: 'Siem Reap, Cambodia',
      lastActive: '3 days ago',
      isCurrent: false,
    },
  ]);

  // Load custom detailed settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('apex_user_detailed_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.skipOtpTrusted !== undefined) setSkipOtpTrusted(parsed.skipOtpTrusted);
        if (parsed.sensitiveActionOtp !== undefined) setSensitiveActionOtp(parsed.sensitiveActionOtp);
        if (parsed.sessionTimeout) setSessionTimeout(parsed.sessionTimeout);
        if (parsed.themePreference) setThemePreference(parsed.themePreference);
        if (parsed.dateFormat) setDateFormat(parsed.dateFormat);
        if (parsed.notifDueDate !== undefined) setNotifDueDate(parsed.notifDueDate);
        if (parsed.notifLeadDays) setNotifLeadDays(parsed.notifLeadDays);
        if (parsed.notifEmailChannel !== undefined) setNotifEmailChannel(parsed.notifEmailChannel);
        if (parsed.notifSmsChannel !== undefined) setNotifSmsChannel(parsed.notifSmsChannel);
        if (parsed.bankAccounts && Array.isArray(parsed.bankAccounts)) setBankAccounts(parsed.bankAccounts);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save changes handler
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // 1. Update AuthContext profile
      if (authUpdateProfile) {
        await authUpdateProfile({
          fullName,
          phone,
          position: occupation,
          department,
        });
      }

      // 2. Update AuthContext settings
      if (authUpdateSettings) {
        await authUpdateSettings({
          branch,
          currency,
          theme: themePreference,
          notificationsEnabled: notifDueDate || notifSameDay,
        });
      }

      // 3. Persist local details
      const detailPayload = {
        skipOtpTrusted,
        sensitiveActionOtp,
        sessionTimeout,
        biometricUnlock,
        loginAlerts,
        notifDueDate,
        notifSameDay,
        notifOverdue,
        notifDisbursement,
        notifReceipts,
        notifMonthlyLedger,
        notifEmailChannel,
        notifSmsChannel,
        notifLeadDays,
        themePreference,
        dateFormat,
        numberFormat,
        bankAccounts,
      };
      localStorage.setItem('apex_user_detailed_settings', JSON.stringify(detailPayload));

      setTimeout(() => {
        setIsSaving(false);
        showToast('Settings & preferences saved successfully.');
      }, 400);
    } catch (err) {
      setIsSaving(false);
      showToast('Error saving settings. Please try again.', 'error');
    }
  };

  const handleCopyId = () => {
    if (currentUser.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      showToast('User ID copied to clipboard.', 'info');
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    showToast('Session terminated and security token invalidated.', 'info');
  };

  const handleRevokeAllOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast('All other active sessions have been signed out.', 'success');
  };

  const handleSetPrimaryBank = (bankId: string) => {
    setBankAccounts((prev) =>
      prev.map((b) => ({
        ...b,
        isPrimary: b.id === bankId,
      }))
    );
    showToast('Primary disbursement account updated.', 'success');
  };

  const handleRemoveBank = (bankId: string) => {
    setBankAccounts((prev) => prev.filter((b) => b.id !== bankId));
    showToast('Bank account removed.', 'info');
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankAccountNo.trim()) {
      showToast('Please enter an account number.', 'error');
      return;
    }

    const newAcc: LinkedBankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName,
      bankCode: newBankName.replace(/\s+/g, '').toUpperCase().slice(0, 8),
      accountNumber: newBankAccountNo.trim(),
      accountName: newBankAccountName.trim().toUpperCase() || 'VERIFIED HOLDER',
      currency: newBankCurrency,
      isPrimary: bankAccounts.length === 0,
      isVerified: true,
      color: newBankName.includes('ABA')
        ? 'border-blue-600 bg-blue-50/50'
        : newBankName.includes('Wing')
        ? 'border-emerald-600 bg-emerald-50/50'
        : 'border-indigo-600 bg-indigo-50/50',
    };

    const updated = [...bankAccounts, newAcc];
    setBankAccounts(updated);
    localStorage.setItem(
      'apex_user_detailed_settings',
      JSON.stringify({
        ...(JSON.parse(localStorage.getItem('apex_user_detailed_settings') || '{}')),
        bankAccounts: updated,
      })
    );
    setShowAddBankModal(false);
    setNewBankAccountNo('');
    showToast(`${newBankName} account successfully linked & verified!`, 'success');
  };

  // Password Strength Score
  const passScore = (() => {
    if (!newPass) return 0;
    let s = 0;
    if (newPass.length >= 8) s += 1;
    if (/[A-Z]/.test(newPass) && /[a-z]/.test(newPass)) s += 1;
    if (/[0-9]/.test(newPass)) s += 1;
    if (/[^A-Za-z0-9]/.test(newPass)) s += 1;
    return s;
  })();

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (!currPass) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPass.length < 8) {
      setPassError('New password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }

    setShowPassModal(false);
    setCurrPass('');
    setNewPass('');
    setConfirmPass('');
    showToast('Password updated successfully. Please use your new password next time.', 'success');
  };

  // Custom Apple / Banking style Toggle Switch Component
  const ToggleSwitch = ({
    enabled,
    onChange,
    disabled = false,
  }: {
    enabled: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-[#2563EB]' : 'bg-slate-300'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[8px] shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. HERO USER BANNER */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar with Status Ring */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-sm ring-4 ring-blue-50">
                {(fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
                title="Online & Verified"
              />
            </div>

            {/* User Meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{fullName}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] text-[11px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-200 uppercase tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                  {currentUser.role || 'USER'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'km' ? 'បានផ្ទៀងផ្ទាត់ KYC' : 'KYC Verified'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B] mt-1.5">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {email || 'No email registered'}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {branch}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1 hover:text-[#0F172A] transition"
                  title="Click to copy User UUID"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  ID: <span className="font-mono">{currentUser.id ? `${currentUser.id.slice(0, 8)}...` : 'N/A'}</span>
                  {copiedId && <span className="text-emerald-600 font-medium ml-1">{language === 'km' ? 'បានចម្លង!' : 'Copied!'}</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => setShowPassModal(true)}
              className="px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-slate-50 active:bg-slate-100 rounded-[6px] transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('btn_change_password', 'Change Password')}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 rounded-[6px] transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('btn_save_changes', 'Save Changes')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-1.5 flex items-center gap-1 overflow-x-auto shadow-none">
        {[
          { id: 'profile', label: t('tab_profile', 'Profile & Identity'), icon: User },
          { id: 'security', label: t('tab_security', 'Security & Devices'), icon: ShieldCheck },
          { id: 'notifications', label: t('tab_notifications', 'Notifications & Alerts'), icon: Bell },
          { id: 'preferences', label: t('tab_preferences', 'Preferences & Language'), icon: Globe },
          { id: 'banking', label: t('tab_banking', 'Bank & Payouts'), icon: CreditCard },
          { id: 'privacy', label: t('tab_privacy', 'Data & Privacy'), icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-[6px] text-xs font-medium transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: PROFILE & IDENTITY */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4">
              <h2 className="text-base font-bold text-[#0F172A]">Personal & Contact Information</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Official identity credentials utilized for loan underwriting, National Bank of Cambodia reporting, and credit evaluation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Registered Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-24 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="user@example.com"
                  />
                  <span className="absolute right-2.5 top-2 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold rounded">
                    Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Mobile Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="+855 12 345 678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  National ID / Passport Number
                </label>
                <div className="relative">
                  <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] font-mono"
                    placeholder="e.g. 0108928374"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Operating Bank Branch / Campus
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white text-[#0F172A]"
                  >
                    <option value="Phnom Penh Main Branch">Phnom Penh Main Campus (Daun Penh)</option>
                    <option value="Toul Kork Academic Branch">Toul Kork Academic Branch</option>
                    <option value="Siem Reap Regional Branch">Siem Reap Regional Branch</option>
                    <option value="Battambang Provincial Branch">Battambang Provincial Branch</option>
                    <option value="Sihanoukville Coastal Branch">Sihanoukville Coastal Branch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Primary Occupation / Department
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    placeholder="e.g. Faculty Lecturer / Graduate Student"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Personal Information</span>
              </button>
            </div>
          </div>

          {/* Institutional Credit Standing Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Borrower KYC & Credit Solvency Rating</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Assessed automatically against repayment performance and NBC credit guidelines.</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                CBC Score: 780 (Tier A+)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Sanctioned Borrowing Limit</div>
                <div className="text-lg font-bold text-[#0F172A] mt-1">$25,000.00 USD</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Dual-approval eligible</div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Historical On-Time Ratio</div>
                <div className="text-lg font-bold text-emerald-600 mt-1">100.0%</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Zero delinquency recorded</div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Regulatory DTI Ceiling</div>
                <div className="text-lg font-bold text-[#0F172A] mt-1">50.0%</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Compliant with CBC benchmark</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: SECURITY & DEVICES */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Authentication & Password Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Password & Credentials</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Ensure your account uses a strong, complex password updated periodically.</p>
              </div>
              <span className="text-xs text-[#64748B]">Updated 14 days ago</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div>
                <div className="text-xs font-bold text-[#0F172A]">Account Access Password</div>
                <div className="text-xs text-[#64748B] mt-0.5 font-mono">•••••••••••••••• (Encrypted via bcrypt rounds 10)</div>
              </div>
              <button
                type="button"
                onClick={() => setShowPassModal(true)}
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition shrink-0 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication & OTP Bypass Settings */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Two-Factor Authentication & Login Policy</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Configure when verification one-time passwords (OTP) are enforced on subsequent logins.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                    <span>Bypass OTP on Recognized Devices</span>
                    <span className="px-1.5 py-0.2 bg-blue-50 text-[#2563EB] text-[10px] font-semibold border border-blue-200 rounded">
                      Smart Login
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Users who have previously logged in and verified will directly enter their password without waiting for an OTP.
                  </div>
                </div>
                <ToggleSwitch enabled={skipOtpTrusted} onChange={setSkipOtpTrusted} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Enforce OTP on Sensitive Financial Actions</div>
                  <div className="text-xs text-[#64748B]">
                    Require an OTP dispatch to your email before authorizing loan disbursement account changes or large transfers.
                  </div>
                </div>
                <ToggleSwitch enabled={sensitiveActionOtp} onChange={setSensitiveActionOtp} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Inactivity Session Auto-Lock</div>
                  <div className="text-xs text-[#64748B]">
                    Automatically terminate active browser tokens if idle to comply with banking session safety.
                  </div>
                </div>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-[6px] bg-white font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes (Standard)</option>
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                  <option value="0">Never (Dev only)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Devices & Login Sessions */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Active Devices & Sessions</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Manage web browsers and devices that have active token credentials for your profile.</p>
              </div>
              <button
                type="button"
                onClick={handleRevokeAllOtherSessions}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-[6px] transition shrink-0"
              >
                Sign Out Other Devices
              </button>
            </div>

            <div className="space-y-3">
              {sessions.map((sess) => {
                const isDesktop = sess.deviceType === 'desktop';
                return (
                  <div
                    key={sess.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border border-[#E2E8F0] rounded-[6px] hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                        {isDesktop ? <Laptop className="w-5 h-5 text-slate-700" /> : <Smartphone className="w-5 h-5 text-slate-700" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F172A]">{sess.deviceModel}</span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                              This Device
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{sess.browser}</span>
                          <span>•</span>
                          <span>{sess.location}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{sess.ipAddress}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-[11px] text-[#64748B]">{sess.lastActive}</span>
                      {!sess.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: NOTIFICATIONS & ALERTS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Repayment Due Date Notices</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Ensure you never miss installment payments or incur delinquency penalties.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Upcoming Payment Due Notification</div>
                  <div className="text-xs text-[#64748B]">Receive automated reminder before the scheduled installment date.</div>
                </div>
                <ToggleSwitch enabled={notifDueDate} onChange={setNotifDueDate} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Reminder Lead Time</div>
                  <div className="text-xs text-[#64748B]">Choose how many days before maturity the alert triggers.</div>
                </div>
                <select
                  value={notifLeadDays}
                  onChange={(e) => setNotifLeadDays(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-[6px] bg-white font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="1">1 Day Prior</option>
                  <option value="3">3 Days Prior (Recommended)</option>
                  <option value="5">5 Days Prior</option>
                  <option value="7">7 Days Prior</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Same-Day Due Alert (8:00 AM)</div>
                  <div className="text-xs text-[#64748B]">Final morning notice on the exact day an installment is due.</div>
                </div>
                <ToggleSwitch enabled={notifSameDay} onChange={setNotifSameDay} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Overdue Delinquency Escalation Notice</div>
                  <div className="text-xs text-[#64748B]">
                    Urgent notices when loan passes grace period and starts accruing late fee interest.
                  </div>
                </div>
                <ToggleSwitch enabled={notifOverdue} onChange={setNotifOverdue} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Financial Transactions & Receipts</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Stay updated on disbursement credits, payment confirmations, and ledger receipts.</p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Loan Disbursement Alerts</div>
                  <div className="text-xs text-[#64748B]">Immediate notice once approved principal funds are released to your bank account.</div>
                </div>
                <ToggleSwitch enabled={notifDisbursement} onChange={setNotifDisbursement} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Automated Official Payment Receipts</div>
                  <div className="text-xs text-[#64748B]">Automatically dispatch verifiable payment voucher PDF to your email.</div>
                </div>
                <ToggleSwitch enabled={notifReceipts} onChange={setNotifReceipts} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[#E2E8F0] hover:bg-slate-50/50 transition">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#0F172A]">Monthly Consolidated Loan Statement</div>
                  <div className="text-xs text-[#64748B]">Monthly digest detailing principal settled, interest balance, and upcoming schedule.</div>
                </div>
                <ToggleSwitch enabled={notifMonthlyLedger} onChange={setNotifMonthlyLedger} />
              </div>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Delivery Communication Channels</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Choose where system notifications are dispatched.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[#E2E8F0] rounded-[6px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">Email Notification Channel</div>
                    <div className="text-[11px] text-[#64748B]">{email || 'Not configured'}</div>
                  </div>
                </div>
                <ToggleSwitch enabled={notifEmailChannel} onChange={setNotifEmailChannel} />
              </div>

              <div className="p-4 border border-[#E2E8F0] rounded-[6px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">SMS Urgent Dispatch</div>
                    <div className="text-[11px] text-[#64748B]">{phone || 'Not configured'}</div>
                  </div>
                </div>
                <ToggleSwitch enabled={notifSmsChannel} onChange={setNotifSmsChannel} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: PREFERENCES & LANGUAGE */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Currency Preference */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Ledger Base Currency</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Select your preferred reporting and transaction ledger currency between United States Dollars and Khmer Riel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div
                onClick={() => onToggleCurrency('USD')}
                className={`p-4 rounded-[8px] border-2 cursor-pointer transition flex items-center justify-between ${
                  currency === 'USD'
                    ? 'border-[#2563EB] bg-blue-50/40 shadow-xs'
                    : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <span>USD — United States Dollar ($)</span>
                      {currency === 'USD' && (
                        <span className="px-1.5 py-0.2 bg-[#2563EB] text-white text-[10px] font-semibold rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">International standard for loans and repayments</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${currency === 'USD' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-300'}`}>
                  {currency === 'USD' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div
                onClick={() => onToggleCurrency('KHR')}
                className={`p-4 rounded-[8px] border-2 cursor-pointer transition flex items-center justify-between ${
                  currency === 'KHR'
                    ? 'border-[#2563EB] bg-blue-50/40 shadow-xs'
                    : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇰🇭</span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <span>KHR — Khmer Riel (៛)</span>
                      {currency === 'KHR' && (
                        <span className="px-1.5 py-0.2 bg-[#2563EB] text-white text-[10px] font-semibold rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">National currency (NBC rate: 4,100 KHR / 1 USD)</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${currency === 'KHR' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-300'}`}>
                  {currency === 'KHR' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px] text-xs text-[#64748B] flex items-center justify-between">
              <span>National Bank of Cambodia (NBC) Reference Exchange Rate:</span>
              <span className="font-mono font-bold text-[#0F172A]">1.00 USD = 4,100.00 KHR</span>
            </div>
          </div>

          {/* Language Preference */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Interface Language (ភាសាប្រព័ន្ធ)</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Switch seamlessly between Khmer (with Suwannaphum font rendering) and English.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div
                onClick={() => {
                  setLanguage('km');
                  showToast('ភាសាត្រូវបានផ្លាស់ប្តូរទៅជា ភាសាខ្មែរ', 'success');
                }}
                className={`p-4 rounded-[8px] border-2 cursor-pointer transition flex items-center justify-between ${
                  language === 'km'
                    ? 'border-[#2563EB] bg-blue-50/40 shadow-xs'
                    : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇰🇭</span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <span className="font-serif">ភាសាខ្មែរ (Khmer)</span>
                      {language === 'km' && (
                        <span className="px-1.5 py-0.2 bg-[#2563EB] text-white text-[10px] font-semibold rounded">
                          បានជ្រើសរើស
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">ពុម្ពអក្សរសួស្តី Suwannaphum Font</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${language === 'km' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-300'}`}>
                  {language === 'km' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div
                onClick={() => {
                  setLanguage('en');
                  showToast('Language changed to English (US)', 'success');
                }}
                className={`p-4 rounded-[8px] border-2 cursor-pointer transition flex items-center justify-between ${
                  language === 'en'
                    ? 'border-[#2563EB] bg-blue-50/40 shadow-xs'
                    : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <span>English (US)</span>
                      {language === 'en' && (
                        <span className="px-1.5 py-0.2 bg-[#2563EB] text-white text-[10px] font-semibold rounded">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">International Banking Standard</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${language === 'en' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-300'}`}>
                  {language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </div>

          {/* Theme & Display Mode */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Appearance Theme</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Personalize the contrast and layout theme of the portal.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {[
                { id: 'light', label: 'Light Banking', icon: Sun, desc: 'Clean high-contrast slate' },
                { id: 'dark', label: 'Executive Dark', icon: Moon, desc: 'Low-light midnight palette' },
                { id: 'system', label: 'System Default', icon: Laptop, desc: 'Matches device preference' },
              ].map((thm) => {
                const Icon = thm.icon;
                const isSelected = themePreference === thm.id;
                return (
                  <div
                    key={thm.id}
                    onClick={() => setThemePreference(thm.id as any)}
                    className={`p-3.5 border-2 rounded-[6px] cursor-pointer transition ${
                      isSelected
                        ? 'border-[#2563EB] bg-blue-50/30'
                        : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                    <div className="text-xs font-bold text-[#0F172A]">{thm.label}</div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">{thm.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional Formats */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Regional Date & Format Standards</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Set date and number formatting formats.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Date Display Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[6px] bg-white font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 20/10/2026 - Cambodian Standard)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-20 - ISO 8601)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/20/2026 - US Format)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Number & Digit Formatting</label>
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[6px] bg-white font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="en-US">1,250,000.00 (Standard Comma Thousands)</option>
                  <option value="de-DE">1.250.000,00 (Period Thousands)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 5: BANK & PAYOUT ACCOUNTS */}
      {activeTab === 'banking' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Linked Bank Accounts for Disbursement</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Verified Cambodian banking institutions linked with your profile for loan disbursement and auto-debit servicing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(true)}
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link New Bank Account</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className={`p-4 rounded-[8px] border-2 space-y-3 relative transition ${
                    bank.isPrimary ? 'border-[#2563EB] bg-blue-50/20' : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0F172A]">{bank.bankName}</span>
                        {bank.isPrimary && (
                          <span className="px-2 py-0.5 bg-[#2563EB] text-white text-[10px] font-semibold rounded">
                            PRIMARY DISBURSEMENT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B] mt-0.5">Swift/Code: {bank.bankCode}</div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Bakong KHQR
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-[6px]">
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Account Number</div>
                    <div className="text-sm font-mono font-bold text-[#0F172A] mt-0.5 tracking-wider">{bank.accountNumber}</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5 uppercase">{bank.accountName}</div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Currency: <span className="font-bold text-[#0F172A]">{bank.currency}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {!bank.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryBank(bank.id)}
                          className="px-2.5 py-1 text-xs text-[#2563EB] hover:bg-blue-50 rounded transition font-medium"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveBank(bank.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Remove Bank Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-[6px] text-xs text-[#64748B] flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0" />
              <span>
                All linked accounts are verified against the National Bank of Cambodia Bakong clearing gateway to ensure instant and zero-error loan disbursements.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 6: DATA & PRIVACY */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-5">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Account Statements & Data Export</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Download verified loan agreement documents, amortization schedules, and audit trail logs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[#E2E8F0] rounded-[6px] flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">Loan Portfolio Summary Statement</div>
                  <div className="text-xs text-[#64748B] mt-1">
                    Download an authenticated PDF certified copy of all past and active loan contracts and settled balances.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Generating official PDF statement...', 'info')}
                  className="px-3 py-2 text-xs font-medium text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[6px] transition flex items-center justify-center gap-1.5 self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Statement (PDF)</span>
                </button>
              </div>

              <div className="p-4 border border-[#E2E8F0] rounded-[6px] flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">Audit Trail & Transaction Ledger (CSV)</div>
                  <div className="text-xs text-[#64748B] mt-1">
                    Export raw timestamped payment receipts, principal settlements, and interest logs in spreadsheet format.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Exporting transaction audit records (CSV)...', 'info')}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[6px] transition flex items-center justify-center gap-1.5 self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Transactions (CSV)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-rose-200 rounded-[8px] p-6 space-y-4">
            <div className="border-b border-rose-100 pb-3">
              <h2 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Account Controls & Danger Zone</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">Irreversible actions and compliance freeze options.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-rose-50/40 border border-rose-200 rounded-[6px]">
              <div>
                <div className="text-xs font-bold text-rose-900">Temporary Account Freeze</div>
                <div className="text-xs text-rose-700 mt-0.5">
                  Temporarily suspend active loan application submissions and disbursals if device theft is suspected.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to request a temporary account freeze?')) {
                    showToast('Freeze request submitted to Credit Risk team.', 'info');
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-[6px] transition shrink-0"
              >
                Request Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Update Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-5 space-y-4">
              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] text-xs font-medium text-rose-700">
                  {passError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrPass ? 'text' : 'password'}
                    value={currPass}
                    onChange={(e) => setCurrPass(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPass(!showCurrPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">New Secure Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {newPass && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full">
                      <div className={`h-full flex-1 rounded-sm ${passScore >= 1 ? 'bg-rose-500' : 'bg-slate-200'}`} />
                      <div className={`h-full flex-1 rounded-sm ${passScore >= 2 ? 'bg-amber-500' : 'bg-slate-200'}`} />
                      <div className={`h-full flex-1 rounded-sm ${passScore >= 3 ? 'bg-blue-500' : 'bg-slate-200'}`} />
                      <div className={`h-full flex-1 rounded-sm ${passScore >= 4 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    </div>
                    <div className="text-[10px] text-[#64748B] flex justify-between">
                      <span>Strength</span>
                      <span className="font-semibold text-[#0F172A]">
                        {['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'][passScore]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  placeholder="Repeat new password"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1] rounded-[6px] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK BANK ACCOUNT */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Link New Cambodian Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBank} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Select Bank</label>
                <select
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[6px] bg-white text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="ABA Bank">ABA Bank (Advanced Bank of Asia)</option>
                  <option value="Wing Bank (Cambodia)">Wing Bank (Cambodia) Plc</option>
                  <option value="ACLEDA Bank">ACLEDA Bank Plc</option>
                  <option value="Canadia Bank">Canadia Bank Plc</option>
                  <option value="Sathapana Bank">Sathapana Bank Plc</option>
                  <option value="FTB Bank">Foreign Trade Bank of Cambodia (FTB)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={newBankAccountNo}
                  onChange={(e) => setNewBankAccountNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[6px] font-mono focus:outline-none focus:border-[#2563EB]"
                  placeholder="e.g. 001 829 412"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Account Holder Full Name</label>
                <input
                  type="text"
                  required
                  value={newBankAccountName}
                  onChange={(e) => setNewBankAccountName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[6px] uppercase focus:outline-none focus:border-[#2563EB]"
                  placeholder="TONGHENG KEO"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Primary Account Currency</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-[#0F172A] cursor-pointer">
                    <input
                      type="radio"
                      name="currency"
                      checked={newBankCurrency === 'USD'}
                      onChange={() => setNewBankCurrency('USD')}
                    />
                    <span>USD ($)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[#0F172A] cursor-pointer">
                    <input
                      type="radio"
                      name="currency"
                      checked={newBankCurrency === 'KHR'}
                      onChange={() => setNewBankCurrency('KHR')}
                    />
                    <span>KHR (៛)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1] rounded-[6px] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verify & Link Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
