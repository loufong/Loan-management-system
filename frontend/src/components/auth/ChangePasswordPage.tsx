import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';

interface ChangePasswordPageProps {
  onBack: () => void;
  onLogout?: () => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({
  onBack,
  onLogout,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }

    if (!isPasswordValid) {
      setError('New password must fulfill all complexity requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('New passwords do not match. Please verify.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password cannot be identical to your current password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMessage(
        res.message ||
          'Password updated successfully! A confirmation notice has been sent to your Gmail.'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please verify your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-8 px-4 font-sans antialiased text-[#0F172A]">
      {/* Top Header & Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <span className="text-xs font-mono uppercase tracking-wider text-[#64748B]">
          Security & Access Settings
        </span>
      </div>

      {/* Main Change Password Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Card Header */}
        <div className="border-b border-[#E2E8F0] pb-4 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[#2563EB] mb-1">
              <KeyRound className="w-5 h-5 text-[#2563EB]" />
              <span className="text-xs font-bold uppercase tracking-wider">Account Credentials</span>
            </div>
            <h1 className="text-xl font-bold text-[#0F172A]">Change Password</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Update your account password. For security, active sessions will be refreshed.
            </p>
          </div>
          <div className="hidden sm:flex w-10 h-10 rounded-[6px] bg-slate-100 items-center justify-center text-slate-700">
            <ShieldCheck className="w-5 h-5 text-[#0F172A]" />
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[6px] flex flex-col gap-2.5 text-xs text-emerald-900">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="font-semibold block">{successMessage}</span>
                <p className="text-emerald-700">
                  A security confirmation email was dispatched to your Gmail account.
                </p>
              </div>
            </div>
            {onLogout && (
              <div className="pt-2 border-t border-emerald-200 flex justify-end">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[4px] text-xs font-semibold transition"
                >
                  Log In With New Password
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-[6px] flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password Field */}
          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-[44px] px-3.5 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition"
                aria-label="Toggle current password visibility"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full h-[44px] px-3.5 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition"
                aria-label="Toggle new password visibility"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-[44px] px-3.5 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Security Rules Verification Checklist */}
          <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px] text-xs space-y-2">
            <span className="font-semibold text-[#0F172A] block">
              Password Security Requirements:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>✓</div>
                <span>Minimum 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasUpperCase ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>✓</div>
                <span>At least 1 uppercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasLowerCase ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>✓</div>
                <span>At least 1 lowercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasNumber ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>✓</div>
                <span>At least 1 numeric digit</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasSpecialChar ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>✓</div>
                <span>At least 1 special symbol</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>✓</div>
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="px-4 h-[44px] border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-semibold text-xs rounded-[6px] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch || !currentPassword}
              className="flex-1 h-[40px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-xs rounded-[6px] transition flex items-center justify-center gap-2 shadow-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
