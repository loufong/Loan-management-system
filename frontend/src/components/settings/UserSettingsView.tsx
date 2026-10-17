import React, { useState } from 'react';
import { Currency, UserProfile } from '../../types';
import { KeyRound, Bell, DollarSign, Shield, CheckCircle } from 'lucide-react';

export interface UserSettingsViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onToggleCurrency: (c: Currency) => void;
  onChangePassword: () => void;
  onShowToast?: (msg: string) => void;
}

export const UserSettingsView: React.FC<UserSettingsViewProps> = ({
  currentUser,
  currency,
  onToggleCurrency,
  onChangePassword,
  onShowToast,
}) => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
    onShowToast?.('Preferences saved successfully.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Account Settings</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your credentials, notification channels, and operational preferences.
          </p>
        </div>
        {savedNotice && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-[4px] inline-flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
      </div>

      {/* 2. Security & Credentials */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
          <KeyRound className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Security & Authentication
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <div className="text-xs font-semibold text-[#0F172A]">Account Password</div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Change your password to ensure strict security of your financial account.
            </p>
          </div>
          <button
            type="button"
            onClick={onChangePassword}
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition shrink-0"
          >
            Change Password
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <div className="text-xs font-semibold text-[#0F172A]">Two-Tier Session Enforcement</div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Your session is authenticated under role <span className="font-semibold text-[#2563EB]">USER</span>.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-slate-100 text-[#0F172A] rounded font-mono font-medium border border-[#E2E8F0]">
            ACTIVE SESSION
          </span>
        </div>
      </div>

      {/* 3. Notification Preferences */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
          <Bell className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Notification Preferences
          </h2>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-[#0F172A] block">Email Due Date Alerts</span>
              <span className="text-[11px] text-[#64748B]">
                Receive notices 3 days before upcoming repayment installment dates.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded border-[#CBD5E1] focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-[#0F172A] block">SMS Overdue Warning Alerts</span>
              <span className="text-[11px] text-[#64748B]">
                Receive urgent SMS warnings in case of past-due payments.
              </span>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={(e) => setSmsAlerts(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded border-[#CBD5E1] focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-[#0F172A] block">Security & Login Alerts</span>
              <span className="text-[11px] text-[#64748B]">
                Alert me whenever my account is accessed from a new device.
              </span>
            </div>
            <input
              type="checkbox"
              checked={securityAlerts}
              onChange={(e) => setSecurityAlerts(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded border-[#CBD5E1] focus:ring-0"
            />
          </label>
        </div>
      </div>

      {/* 4. Display Preferences */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
          <DollarSign className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Display & Currency
          </h2>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-semibold text-[#0F172A] block">Primary Currency</span>
            <span className="text-[11px] text-[#64748B]">
              Switch preferred ledger currency between USD ($) and Khmer Riel (KHR ៛).
            </span>
          </div>
          <div className="flex items-center border border-[#E2E8F0] rounded-[6px] overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleCurrency('USD')}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                currency === 'USD' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#64748B] hover:bg-slate-50'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => onToggleCurrency('KHR')}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                currency === 'KHR' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#64748B] hover:bg-slate-50'
              }`}
            >
              KHR (៛)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-[6px] transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
