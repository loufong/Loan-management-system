import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
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
  AlertTriangle,
  Lock,
  KeyRound,
  FileText,
  Sliders,
  Sparkles,
  Server
} from 'lucide-react';
import { Currency } from '../../types';

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
  const [activeTab, setActiveTab] = useState<'general' | 'lending' | 'security' | 'notifications' | 'maintenance'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. General Config
  const [institutionName, setInstitutionName] = useState('Apex Academic Loan Management System');
  const [institutionCode, setInstitutionCode] = useState('APEX-KH-PP');
  const [operatingBranch, setOperatingBranch] = useState('Phnom Penh Main Campus');
  const [khrExchangeRate, setKhrExchangeRate] = useState(4100);
  const [fiscalYearStart, setFiscalYearStart] = useState('January 1st');

  // 2. Lending Policy Config
  const [maxDtiRatio, setMaxDtiRatio] = useState(50);
  const [dailyLateFeeRate, setDailyLateFeeRate] = useState(0.10);
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [autoOverdueCron, setAutoOverdueCron] = useState(true);
  const [dualApprovalThreshold, setDualApprovalThreshold] = useState(10000);
  const [maxActiveLoans, setMaxActiveLoans] = useState(2);

  // 3. Security Config
  const [jwtExpiryMinutes, setJwtExpiryMinutes] = useState(15);
  const [refreshTokenDays, setRefreshTokenDays] = useState(7);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [auditLogRetentionYears, setAuditLogRetentionYears] = useState(7);

  // 4. Notifications Config
  const [notifyDueDaysBefore, setNotifyDueDaysBefore] = useState(3);
  const [notifyOverdueDayOne, setNotifyOverdueDayOne] = useState(true);
  const [sendCashierReceiptEmail, setSendCashierReceiptEmail] = useState(true);
  const [dailyCommitteeDigest, setDailyCommitteeDigest] = useState(true);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      onShowToast?.('System settings and institutional policies successfully updated!', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all institutional configurations to system factory defaults?')) {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            Institutional Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Settings &amp; Lending Policies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure core banking rules, underwriting risk thresholds, late fee penalties, security controls, and currency exchange rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Configurations'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          General &amp; Currency
        </button>

        <button
          onClick={() => setActiveTab('lending')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'lending'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Percent className="w-4 h-4" />
          Lending &amp; Risk Policies
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security &amp; Sessions
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'notifications'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alerts &amp; Dispatches
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'maintenance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          Engine &amp; Maintenance
        </button>
      </div>

      {/* Tab 1: General & Currency */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Institutional Identity
            </h3>
            <p className="text-xs text-slate-500">
              Primary entity metadata displayed on payment receipts, loan agreements, and audit reports.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Legal Name
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Code
                  </label>
                  <input
                    type="text"
                    value={institutionCode}
                    onChange={(e) => setInstitutionCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Branch
                  </label>
                  <input
                    type="text"
                    value={operatingBranch}
                    onChange={(e) => setOperatingBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fiscal Year Commencement
                </label>
                <select
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                >
                  <option value="January 1st">January 1st (Calendar Year)</option>
                  <option value="October 1st">October 1st (Academic Year)</option>
                  <option value="July 1st">July 1st (Mid-Year)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Currency &amp; Exchange Rates
            </h3>
            <p className="text-xs text-slate-500">
              Multi-currency support for dual USD ($) and Khmer Riel (៛) operations.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Display Currency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleCurrency('USD')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      currency === 'USD'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-bold">USD ($)</div>
                    <div className="text-xs text-slate-500 mt-0.5">United States Dollar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleCurrency('KHR')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      currency === 'KHR'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-bold">KHR (៛)</div>
                    <div className="text-xs text-slate-500 mt-0.5">Khmer Riel (កម្ពុជា)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Central Bank FX Rate (KHR per 1 USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={khrExchangeRate}
                    onChange={(e) => setKhrExchangeRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    KHR / 1 USD
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  National Bank of Cambodia (NBC) parity benchmark: 1 USD = {khrExchangeRate.toLocaleString()} KHR
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lending & Risk Policies */}
      {activeTab === 'lending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-indigo-600" />
              Underwriting Risk Ceilings
            </h3>
            <p className="text-xs text-slate-500">
              Institutional risk bounds applied automatically during loan application evaluations.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Maximum Allowable Debt-to-Income (DTI) Ratio
                  </label>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono">
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
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Applications with DTI exceeding {maxDtiRatio}% will be flagged as HIGH RISK and require Committee Underwriting review.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Daily Delinquency Penalty Rate (% per day)
                  </label>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-mono">
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
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Accrues daily on overdue principal balance. Annualized equivalent: {(dailyLateFeeRate * 365).toFixed(1)}% p.a.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Number of calendar days after due date before loan account status is changed to OVERDUE.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Automated Delinquency &amp; Controls
            </h3>
            <p className="text-xs text-slate-500">
              Scheduled background jobs and dual-authorization approval ceilings.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Automated Daily Overdue Cron Job
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Scans database daily at 00:01, marks overdue installments, and accrues penalty fees.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoOverdueCron}
                  onChange={(e) => setAutoOverdueCron(e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dual-Authorization Approval Threshold (USD $)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={dualApprovalThreshold}
                    onChange={(e) => setDualApprovalThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    USD
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Loans requesting more than ${dualApprovalThreshold.toLocaleString()} require committee sign-off.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Concurrent Active Loans per Borrower
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxActiveLoans}
                  onChange={(e) => setMaxActiveLoans(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              Session &amp; Token Parameters
            </h3>
            <p className="text-xs text-slate-500">
              JWT token lifespans and automated session invalidation.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Access Token Lifespan (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={jwtExpiryMinutes}
                  onChange={(e) => setJwtExpiryMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Current production standard: 15 minutes (short-lived stateless JWT).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refresh Token Session Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={refreshTokenDays}
                  onChange={(e) => setRefreshTokenDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Persisted refresh token rotation window with database revoking on logout.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Failed Password Attempts before Lockout
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              Authentication &amp; Compliance
            </h3>
            <p className="text-xs text-slate-500">
              Multi-factor authentication (MFA) and regulatory compliance retention.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Two-Factor Authentication (2FA) for Staff
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Requires TOTP / Authenticator code on Admin and Cashier logins.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactorAuth}
                  onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Trail Retention Window (Years)
                </label>
                <select
                  value={auditLogRetentionYears}
                  onChange={(e) => setAuditLogRetentionYears(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years (Standard)</option>
                  <option value={7}>7 Years (Central Bank Compliance)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Immutable audit records remain permanently cryptographically hashed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Alerts & Dispatches */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 max-w-3xl">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Automated Customer &amp; Staff Alerts
          </h3>
          <p className="text-xs text-slate-500">
            Define automated SMS and email dispatch triggers across the loan lifecycle.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Advance Installment Due Notice ({notifyDueDaysBefore} Days Prior)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Sends automated SMS &amp; email reminder to borrower before due date.
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="7"
                value={notifyDueDaysBefore}
                onChange={(e) => setNotifyDueDaysBefore(Number(e.target.value))}
                className="w-20 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Immediate Overdue Alert on Day 1
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Notifies borrower immediately when an installment enters delinquency.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOverdueDayOne}
                onChange={(e) => setNotifyOverdueDayOne(e.target.checked)}
                className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Automatic Cashier Digital Receipt Email
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Instantly sends digital PDF receipt upon cashier recording a payment.
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendCashierReceiptEmail}
                onChange={(e) => setSendCashierReceiptEmail(e.target.checked)}
                className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Daily Credit Committee Pipeline Digest
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Dispatches an 08:00 AM briefing of pending applications to Managers.
                </div>
              </div>
              <input
                type="checkbox"
                checked={dailyCommitteeDigest}
                onChange={(e) => setDailyCommitteeDigest(e.target.checked)}
                className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Engine & Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              Runtime Infrastructure
            </h3>
            <p className="text-xs text-slate-500">
              Active system nodes, microservice health, and database connection telemetry.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-700">API Runtime:</span>
                <span className="font-mono text-slate-900">Node.js v20.x • Express • TypeScript</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-700">Database Engine:</span>
                <span className="font-mono text-slate-900">Prisma ORM v5.22 • PostgreSQL / In-Memory Demo</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-700">Scheduled Cron Daemon:</span>
                <span className="font-mono text-emerald-600 font-semibold">Active: "1 0 * * *" (Daily 00:01)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-700">System Timezone:</span>
                <span className="font-mono text-slate-900">Indochina Time (ICT, UTC+7)</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              System Utilities
            </h3>
            <p className="text-xs text-slate-500">
              Cache flushing, telemetry synchronization, and diagnostic actions.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => onShowToast?.('Local browser cache and session state flushed successfully', 'info')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Flush Client Session Cache
              </button>

              <button
                type="button"
                onClick={() => onShowToast?.('Core Banking Ledger parity check completed: 0 cent drift', 'success')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Run Penny-Perfect Ledger Reconcile Check
              </button>

              <button
                type="button"
                onClick={() => onShowToast?.('Triggered automated overdue scan background job', 'info')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                Execute Manual Delinquency Scan Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
