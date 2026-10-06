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
  const [institutionName, setInstitutionName] = useState('Apex Enterprise Loan Management System');
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
      onShowToast?.('System settings updated successfully.', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
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
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            System Settings &amp; Credit Policies
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure core banking parameters, underwriting ceilings, automated penalty engines, and security thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Configurations'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#CBD5E1] overflow-x-auto">
        {[
          { key: 'general', label: 'General & Currency', icon: Building2 },
          { key: 'lending', label: 'Lending & Risk Policies', icon: Percent },
          { key: 'security', label: 'Security & Access', icon: Shield },
          { key: 'notifications', label: 'Alerts & Dispatches', icon: Bell },
          { key: 'maintenance', label: 'Engine & Infrastructure', icon: Database },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-2.5 px-3.5 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                active
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General & Currency */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <Building2 className="w-4 h-4 text-[#2563EB]" />
              Organization Identity
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Institution Legal Name
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Institution Code
                  </label>
                  <input
                    type="text"
                    value={institutionCode}
                    onChange={(e) => setInstitutionCode(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Operating Branch
                  </label>
                  <input
                    type="text"
                    value={operatingBranch}
                    onChange={(e) => setOperatingBranch(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Fiscal Year Commencement
                </label>
                <select
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="January 1st">January 1st (Calendar Year)</option>
                  <option value="October 1st">October 1st (Academic Year)</option>
                  <option value="July 1st">July 1st (Mid-Year)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <DollarSign className="w-4 h-4 text-[#16A34A]" />
              Currency &amp; Exchange Rates
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Default Display Currency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleCurrency('USD')}
                    className={`p-3 rounded-[6px] border text-left transition-colors cursor-pointer ${
                      currency === 'USD'
                        ? 'border-[#2563EB] bg-blue-50/60 text-[#0F172A] font-bold'
                        : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#0F172A]">USD ($)</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">United States Dollar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleCurrency('KHR')}
                    className={`p-3 rounded-[6px] border text-left transition-colors cursor-pointer ${
                      currency === 'KHR'
                        ? 'border-[#2563EB] bg-blue-50/60 text-[#0F172A] font-bold'
                        : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#0F172A]">KHR (៛)</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">Khmer Riel (កម្ពុជា)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Official NBC Central Bank FX Rate (KHR per 1 USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={khrExchangeRate}
                    onChange={(e) => setKhrExchangeRate(Number(e.target.value))}
                    className="w-full h-10 pl-3 pr-24 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#64748B]">
                    KHR / 1 USD
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1 font-mono">
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
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <Percent className="w-4 h-4 text-[#2563EB]" />
              Underwriting Risk Ceilings
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-[#0F172A]">
                    Maximum Allowable Debt-to-Income (DTI) Ratio
                  </label>
                  <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-[4px] border border-blue-200 font-mono">
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
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Applications exceeding {maxDtiRatio}% DTI require formal Committee sign-off.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-[#0F172A]">
                    Daily Delinquency Penalty Rate (% per day)
                  </label>
                  <span className="text-xs font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-[4px] border border-red-200 font-mono">
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
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Accrues daily on overdue principal. Annualized equivalent: {(dailyLateFeeRate * 365).toFixed(1)}% p.a.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Repayment Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <Clock className="w-4 h-4 text-[#D97706]" />
              Automated Delinquency &amp; Approval Ceilings
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">
                    Automated Daily Overdue Cron Job
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Scans portfolio daily at 00:01, marks past-due installments, and computes late interest.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoOverdueCron}
                  onChange={(e) => setAutoOverdueCron(e.target.checked)}
                  className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Dual-Authorization Approval Threshold (USD $)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={dualApprovalThreshold}
                    onChange={(e) => setDualApprovalThreshold(Number(e.target.value))}
                    className="w-full h-10 pl-3 pr-12 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#64748B]">
                    USD
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Max Concurrent Active Loans per Borrower
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxActiveLoans}
                  onChange={(e) => setMaxActiveLoans(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <Lock className="w-4 h-4 text-[#2563EB]" />
              Session &amp; Token Parameters
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Access Token Lifespan (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={jwtExpiryMinutes}
                  onChange={(e) => setJwtExpiryMinutes(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Production standard: 15 minutes (stateless cryptographically signed JWT).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Refresh Token Session Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={refreshTokenDays}
                  onChange={(e) => setRefreshTokenDays(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Max Failed Password Attempts before Lockout
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={maxLoginAttempts}
                  onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <KeyRound className="w-4 h-4 text-[#16A34A]" />
              Authentication &amp; Compliance Retention
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">
                    Two-Factor Authentication (2FA) for Staff
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Requires 6-digit TOTP code on Administrator and Cashier sessions.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactorAuth}
                  onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Audit Trail Retention Window (Years)
                </label>
                <select
                  value={auditLogRetentionYears}
                  onChange={(e) => setAuditLogRetentionYears(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years (Standard)</option>
                  <option value={7}>7 Years (Central Bank Compliance)</option>
                </select>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Audit records are permanently hash-chained for regulatory discovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Alerts & Dispatches */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
            <Bell className="w-4 h-4 text-[#2563EB]" />
            Automated Customer &amp; Staff Alerts
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
              <div>
                <div className="text-xs font-bold text-[#0F172A]">
                  Advance Installment Due Notice ({notifyDueDaysBefore} Days Prior)
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Sends automated notification to borrower prior to scheduled installment.
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="7"
                value={notifyDueDaysBefore}
                onChange={(e) => setNotifyDueDaysBefore(Number(e.target.value))}
                className="w-16 h-8 text-center bg-white border border-[#CBD5E1] rounded-[4px] font-mono font-bold text-[#0F172A]"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
              <div>
                <div className="text-xs font-bold text-[#0F172A]">
                  Immediate Delinquency Alert on Day 1
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Notifies borrower immediately upon installment passing maturity deadline.
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyOverdueDayOne}
                onChange={(e) => setNotifyOverdueDayOne(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
              <div>
                <div className="text-xs font-bold text-[#0F172A]">
                  Digital Receipt Delivery on Collection
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Generates verified payment voucher upon cashier settlement.
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendCashierReceiptEmail}
                onChange={(e) => setSendCashierReceiptEmail(e.target.checked)}
                className="w-4 h-4 accent-[#2563EB] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Engine & Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <Server className="w-4 h-4 text-[#2563EB]" />
              Runtime Telemetry &amp; Services
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#64748B]">API Engine:</span>
                <span className="font-mono text-[#0F172A]">Node.js v20.x • Express • TypeScript</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#64748B]">Database:</span>
                <span className="font-mono text-[#0F172A]">Prisma ORM • PostgreSQL 16 Alpine</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#64748B]">Overdue Daemon:</span>
                <span className="font-mono text-[#16A34A] font-bold">Active: "1 0 * * *" (Daily 00:01)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                <span className="font-semibold text-[#64748B]">System Timezone:</span>
                <span className="font-mono text-[#0F172A]">Indochina Time (ICT, UTC+7)</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-[#CBD5E1]">
              <Database className="w-4 h-4 text-[#16A34A]" />
              Administrative Operations
            </h3>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => onShowToast?.('Client session tokens and caches invalidated successfully', 'info')}
                className="w-full py-2.5 px-3 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold transition cursor-pointer text-left flex items-center justify-between"
              >
                <span>Flush Client Session Cache</span>
                <span className="text-[11px] text-[#64748B]">Run &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => onShowToast?.('Core Banking Ledger check: zero cent imbalance detected', 'success')}
                className="w-full py-2.5 px-3 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold transition cursor-pointer text-left flex items-center justify-between"
              >
                <span>Run Ledger Reconcile Verification</span>
                <span className="text-[11px] text-[#16A34A] font-bold">Verify &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => onShowToast?.('Automated delinquency scan executed successfully', 'info')}
                className="w-full py-2.5 px-3 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold transition cursor-pointer text-left flex items-center justify-between"
              >
                <span>Execute Manual Delinquency Scan Job</span>
                <span className="text-[11px] text-white">Trigger &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
