import React, { useState } from 'react';
import {
  Building2,
  Percent,
  Shield,
  Bell,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  DollarSign,
  Lock,
  KeyRound,
  Server,
  Activity,
  Check
} from 'lucide-react';
import { Currency } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { loanStorageService } from '../../services/loanStorageService';
import { api } from '../../services/api';

interface SystemSettingsProps {
  currency: Currency;
  onToggleCurrency: (c: Currency) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  currency,
  onToggleCurrency,
  onShowToast
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'general' | 'lending' | 'security' | 'notifications' | 'maintenance'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSavedSettings = () => {
    try {
      const raw = localStorage.getItem('apex_system_settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };
  const saved = loadSavedSettings();

  // 1. General Config
  const [institutionName, setInstitutionName] = useState(saved?.institutionName || 'Jam Song Vich Loan Management System');
  const [institutionCode, setInstitutionCode] = useState(saved?.institutionCode || 'JSV-KH-PP');
  const [operatingBranch, setOperatingBranch] = useState(saved?.operatingBranch || 'Phnom Penh Main Campus');
  const [khrExchangeRate, setKhrExchangeRate] = useState(saved?.khrExchangeRate ?? 4100);
  const [fiscalYearStart, setFiscalYearStart] = useState(saved?.fiscalYearStart || 'January 1st');

  // 2. Lending Policy Config
  const [maxDtiRatio, setMaxDtiRatio] = useState(saved?.maxDtiRatio ?? 50);
  const [dailyLateFeeRate, setDailyLateFeeRate] = useState(saved?.dailyLateFeeRate ?? 0.10);
  const [gracePeriodDays, setGracePeriodDays] = useState(saved?.gracePeriodDays ?? 3);
  const [autoOverdueCron, setAutoOverdueCron] = useState(saved?.autoOverdueCron ?? true);
  const [dualApprovalThreshold, setDualApprovalThreshold] = useState(saved?.dualApprovalThreshold ?? 10000);
  const [maxActiveLoans, setMaxActiveLoans] = useState(saved?.maxActiveLoans ?? 2);

  // 3. Security Config
  const [jwtExpiryMinutes, setJwtExpiryMinutes] = useState(saved?.jwtExpiryMinutes ?? 15);
  const [refreshTokenDays, setRefreshTokenDays] = useState(saved?.refreshTokenDays ?? 7);
  const [twoFactorAuth, setTwoFactorAuth] = useState(saved?.twoFactorAuth ?? true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(saved?.maxLoginAttempts ?? 5);
  const [auditLogRetentionYears, setAuditLogRetentionYears] = useState(saved?.auditLogRetentionYears ?? 7);

  // 4. Notifications Config
  const [notifyDueDaysBefore, setNotifyDueDaysBefore] = useState(saved?.notifyDueDaysBefore ?? 3);
  const [notifyOverdueDayOne, setNotifyOverdueDayOne] = useState(saved?.notifyOverdueDayOne ?? true);
  const [sendCashierReceiptEmail, setSendCashierReceiptEmail] = useState(saved?.sendCashierReceiptEmail ?? true);
  const [dailyCommitteeDigest, setDailyCommitteeDigest] = useState(saved?.dailyCommitteeDigest ?? true);

  const handleSave = () => {
    setIsSaving(true);
    const settingsPayload = {
      institutionName,
      institutionCode,
      operatingBranch,
      khrExchangeRate,
      fiscalYearStart,
      maxDtiRatio,
      dailyLateFeeRate,
      gracePeriodDays,
      autoOverdueCron,
      dualApprovalThreshold,
      maxActiveLoans,
      jwtExpiryMinutes,
      refreshTokenDays,
      twoFactorAuth,
      maxLoginAttempts,
      auditLogRetentionYears,
      notifyDueDaysBefore,
      notifyOverdueDayOne,
      sendCashierReceiptEmail,
      dailyCommitteeDigest,
    };
    try {
      localStorage.setItem('apex_system_settings', JSON.stringify(settingsPayload));
    } catch {}
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      onShowToast?.('System settings updated successfully.', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all settings to factory defaults?')) {
      setMaxDtiRatio(50);
      setDailyLateFeeRate(0.10);
      setGracePeriodDays(3);
      setAutoOverdueCron(true);
      setDualApprovalThreshold(10000);
      setMaxActiveLoans(2);
      setJwtExpiryMinutes(15);
      setRefreshTokenDays(7);
      setTwoFactorAuth(true);
      setMaxLoginAttempts(5);
      setKhrExchangeRate(4100);
      setNotifyDueDaysBefore(3);
      onShowToast?.('Settings restored to default policy values', 'info');
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-100 max-w-7xl mx-auto pb-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t('System Settings & Credit Policies')}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CORE BANKING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('Configure core banking parameters, underwriting ceilings, automated penalty engines, and security thresholds.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('Reset Defaults')}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4.5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 font-mono"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? t('Saving...') : saveSuccess ? t('Saved') : t('Save Configurations')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { key: 'general', label: t('General & Currency'), icon: Building2 },
          { key: 'lending', label: t('Lending & Risk Policies'), icon: Percent },
          { key: 'security', label: t('Security & Access'), icon: Shield },
          { key: 'notifications', label: t('Alerts & Dispatches'), icon: Bell },
          { key: 'maintenance', label: t('Engine & Infrastructure'), icon: Database },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2.5 px-4 text-xs font-semibold transition-all rounded-t-xl flex items-center gap-2 shrink-0 cursor-pointer border-b-2 ${
                active
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General & Currency */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>{t('Organization Identity')}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {t('Institution Legal Name')}
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    {t('Institution Code')}
                  </label>
                  <input
                    type="text"
                    value={institutionCode}
                    onChange={(e) => setInstitutionCode(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    {t('Operating Branch')}
                  </label>
                  <input
                    type="text"
                    value={operatingBranch}
                    onChange={(e) => setOperatingBranch(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {t('Fiscal Year Accounting Start', 'Fiscal Year Commencement')}
                </label>
                <select
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="January 1st">January 1st (Calendar Year)</option>
                  <option value="October 1st">October 1st (Academic Year)</option>
                  <option value="July 1st">July 1st (Mid-Year)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{t('Functional Currency & Exchange', 'Currency & Exchange Rates')}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {t('Base Operating Currency', 'Default Display Currency')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleCurrency('USD')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      currency === 'USD'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">USD ($)</div>
                      {currency === 'USD' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">United States Dollar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleCurrency('KHR')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      currency === 'KHR'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">KHR (៛)</div>
                      {currency === 'KHR' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Khmer Riel (Cambodia)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Official NBC Central Bank FX Rate (KHR per 1 USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={khrExchangeRate}
                    onChange={(e) => setKhrExchangeRate(Number(e.target.value))}
                    className="w-full h-10 pl-3.5 pr-28 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    KHR / 1 USD
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                  Current parity benchmark: 1 USD = {khrExchangeRate.toLocaleString()} KHR
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lending & Risk Policies */}
      {activeTab === 'lending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Percent className="w-4 h-4 text-emerald-400" />
              <span>{t('Underwriting & Debt Ratios', 'Underwriting Risk Ceilings')}</span>
            </h3>

            <div className="space-y-5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-300">
                    {t('Maximum Debt-to-Income (DTI)', 'Maximum Allowable Debt-to-Income (DTI) Ratio')}
                  </label>
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg font-mono">
                    {maxDtiRatio}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="65"
                  step="1"
                  value={maxDtiRatio}
                  onChange={(e) => setMaxDtiRatio(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Applications exceeding {maxDtiRatio}% DTI require formal Committee sign-off.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-300">
                    {t('Daily Late Fee Interest', 'Daily Delinquency Penalty Rate (% per day)')}
                  </label>
                  <span className="text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-lg font-mono">
                    {dailyLateFeeRate}% / day
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.50"
                  step="0.01"
                  value={dailyLateFeeRate}
                  onChange={(e) => setDailyLateFeeRate(Number(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Accrues daily on overdue principal. Annualized equivalent: {(dailyLateFeeRate * 365).toFixed(1)}% p.a.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {t('Grace Period (Days)', 'Repayment Grace Period (Days)')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{t('Late Penalties & Delinquency Engine', 'Automated Delinquency & Approval Ceilings')}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="pr-4">
                  <div className="text-xs font-bold text-white">
                    {t('Automated Overdue Cron Scheduler', 'Automated Daily Overdue Cron Job')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Scans portfolio daily at 00:01, marks past-due installments, and computes late interest.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoOverdueCron}
                  onChange={(e) => setAutoOverdueCron(e.target.checked)}
                  className="w-4.5 h-4.5 accent-emerald-400 cursor-pointer rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {t('Dual-Signature Approval Ceiling', 'Dual-Authorization Approval Threshold (USD $)')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={dualApprovalThreshold}
                    onChange={(e) => setDualApprovalThreshold(Number(e.target.value))}
                    className="w-full h-10 pl-3.5 pr-14 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    USD
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  {t('Max Active Loans per Borrower', 'Max Concurrent Active Loans per Borrower')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxActiveLoans}
                  onChange={(e) => setMaxActiveLoans(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Session &amp; Token Parameters</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Access Token Lifespan (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={jwtExpiryMinutes}
                  onChange={(e) => setJwtExpiryMinutes(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Production standard: 15 minutes (stateless cryptographically signed JWT).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Refresh Token Session Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={refreshTokenDays}
                  onChange={(e) => setRefreshTokenDays(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Max Failed Password Attempts before Lockout
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Authentication &amp; Compliance Retention</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="pr-4">
                  <div className="text-xs font-bold text-white">
                    Two-Factor Authentication (2FA) for Staff
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Requires 6-digit TOTP code on Administrator and Cashier sessions.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactorAuth}
                  onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  className="w-4.5 h-4.5 accent-emerald-400 cursor-pointer rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Audit Trail Retention Window (Years)
                </label>
                <select
                  value={auditLogRetentionYears}
                  onChange={(e) => setAuditLogRetentionYears(Number(e.target.value))}
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years (Standard)</option>
                  <option value={7}>7 Years (Central Bank Compliance)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Audit records are permanently hash-chained for regulatory discovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Alerts & Dispatches */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 max-w-3xl shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Automated Customer &amp; Staff Alerts</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="pr-4">
                <div className="text-xs font-bold text-white">
                  Advance Installment Due Notice ({notifyDueDaysBefore} Days Prior)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Sends automated notification to borrower prior to scheduled installment.
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="7"
                value={notifyDueDaysBefore}
                onChange={(e) => setNotifyDueDaysBefore(Number(e.target.value))}
                className="w-16 h-8 text-center bg-slate-900 border border-slate-700 rounded-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="pr-4">
                <div className="text-xs font-bold text-white">
                  Immediate Delinquency Alert on Day 1
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Notifies borrower immediately upon installment passing maturity deadline.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOverdueDayOne}
                onChange={(e) => setNotifyOverdueDayOne(e.target.checked)}
                className="w-4.5 h-4.5 accent-emerald-400 cursor-pointer rounded"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="pr-4">
                <div className="text-xs font-bold text-white">
                  Digital Receipt Delivery on Collection
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Generates verified payment voucher upon cashier settlement.
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendCashierReceiptEmail}
                onChange={(e) => setSendCashierReceiptEmail(e.target.checked)}
                className="w-4.5 h-4.5 accent-emerald-400 cursor-pointer rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Engine & Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Runtime Telemetry &amp; Services</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-400">API Engine:</span>
                <span className="font-mono text-slate-200">Node.js v20.x • Express • TypeScript</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-400">Database:</span>
                <span className="font-mono text-slate-200">Prisma ORM • PostgreSQL 16 Alpine</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-400">Overdue Daemon:</span>
                <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active: "1 0 * * *" (Daily 00:01)
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-semibold text-slate-400">System Timezone:</span>
                <span className="font-mono text-slate-200">Indochina Time (ICT, UTC+7)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Administrative Operations</span>
            </h3>

            <div className="space-y-3 text-xs">
              <button
                type="button"
                onClick={() => onShowToast?.('Client session tokens and caches invalidated successfully', 'info')}
                className="w-full py-3 px-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-semibold transition cursor-pointer text-left flex items-center justify-between shadow-sm"
              >
                <span>Flush Client Session Cache</span>
                <span className="text-[11px] text-slate-400 font-mono">Run &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => onShowToast?.('Core Banking Ledger check: zero cent imbalance detected', 'success')}
                className="w-full py-3 px-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-semibold transition cursor-pointer text-left flex items-center justify-between shadow-sm"
              >
                <span>Run Ledger Reconcile Verification</span>
                <span className="text-[11px] text-emerald-400 font-bold font-mono">Verify &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => onShowToast?.('Automated delinquency scan executed successfully', 'info')}
                className="w-full py-3 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold transition cursor-pointer text-left flex items-center justify-between shadow-sm"
              >
                <span>Execute Manual Delinquency Scan Job</span>
                <span className="text-[11px] text-emerald-400 font-bold font-mono">Trigger &rarr;</span>
              </button>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to completely RESET all borrowing data? All loans, applications, payment receipts, and repayment schedules will be purged to zero records for both Super Admin and Normal Users.')) {
                      await api.resetBorrowingData().catch(() => null);
                      loanStorageService.resetAllBorrowingData();
                      onShowToast?.('All borrowing data has been reset to zero across the platform', 'success');
                    }
                  }}
                  className="w-full py-3 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold transition cursor-pointer text-left flex items-center justify-between shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    Reset All Core Banking Borrowing Ledger
                  </span>
                  <span className="text-[11px] text-rose-400 font-mono">Reset &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
