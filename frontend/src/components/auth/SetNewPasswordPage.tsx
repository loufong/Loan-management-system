import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

interface SetNewPasswordPageProps {
  email: string;
  resetToken: string;
  onPasswordResetSuccess: () => void;
}

export const SetNewPasswordPage: React.FC<SetNewPasswordPageProps> = ({
  email,
  resetToken,
  onPasswordResetSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Password does not fulfill all security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword({
        email,
        resetToken,
        newPassword,
        confirmPassword,
      });

      onPasswordResetSuccess();
    } catch (err: any) {
      setError(err?.message || 'Unable to reset password. The reset session may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-8 border border-[#CBD5E1] rounded-[8px] space-y-6">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[6px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                APX
              </div>
              <h1 className="text-lg font-bold text-[#0F172A]">
                Apex LMS
              </h1>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] pt-2">
              Set New Password
            </h2>
            <p className="text-xs text-[#64748B]">
              Enter a secure password for account <strong className="text-[#0F172A]">{email}</strong>.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full h-[44px] px-3.5 pl-10 pr-10 bg-white border border-[#CBD5E1] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#0F172A] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-[44px] px-3.5 pl-10 pr-10 bg-white border border-[#CBD5E1] rounded-[6px] text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px] text-xs space-y-1">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1 ${hasMinLength ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> 8+ Characters
                </div>
                <div className={`flex items-center gap-1 ${hasUpperCase ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> Uppercase Letter
                </div>
                <div className={`flex items-center gap-1 ${hasLowerCase ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> Lowercase Letter
                </div>
                <div className={`flex items-center gap-1 ${hasNumber && hasSpecialChar ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                  <Check className="w-3 h-3" /> Number &amp; Symbol
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="w-full h-[44px] bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white font-medium text-[14px] rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>

        </div>

        <div className="mt-6 text-center text-xs text-[#64748B]">
          Apex Core Banking Platform • Cryptographic Credential Vault
        </div>
      </div>
    </div>
  );
};

export default SetNewPasswordPage;
