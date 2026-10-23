import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Delete,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  UserCheck,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PinLockScreenProps {
  user?: {
    name?: string;
    fullName?: string;
    role?: string;
    avatar?: string;
    branch?: string;
    storedPin?: string;
  };
  onSuccess?: () => void;
  onFallbackPassword?: () => void;
  correctPin?: string;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  user: explicitUser,
  onSuccess,
  onFallbackPassword,
  correctPin = '123456',
}) => {
  const { user: authUser, profile, signOut } = useAuth();

  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User presentation details
  const staffName =
    explicitUser?.fullName ||
    explicitUser?.name ||
    profile?.fullName ||
    authUser?.name ||
    'Sophea Kem';

  const staffBranch =
    explicitUser?.branch ||
    profile?.branchId ||
    authUser?.branch ||
    'Daun Penh';

  const rawRole =
    explicitUser?.role ||
    profile?.role ||
    authUser?.role ||
    'teller';

  const formatRoleTag = (role: string, branch: string) => {
    const cleanRole = role.toLowerCase();
    if (cleanRole === 'teller' || cleanRole === 'cashier') {
      return `Branch Cashier - ${branch}`;
    }
    if (cleanRole === 'loan_officer') {
      return `Loan Officer - ${branch}`;
    }
    if (cleanRole === 'checker' || cleanRole === 'credit_officer') {
      return `Credit Reviewer - ${branch}`;
    }
    if (cleanRole === 'admin') {
      return `System Administrator - ${branch}`;
    }
    return `Operations Staff - ${branch}`;
  };

  const roleTag = formatRoleTag(rawRole, staffBranch);
  const userInitials = staffName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const expectedPin =
    explicitUser?.storedPin ||
    localStorage.getItem('apex_staff_pin') ||
    correctPin;

  // Keypad Actions
  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 6) {
        setPin((prev) => prev + digit);
        setErrorMessage(null);
      }
    },
    [pin.length]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setPin('');
    setErrorMessage(null);
  }, []);

  // Physical Keyboard Listener (Number Row + Numpad + Backspace + Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Main number row or Numpad keys
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.code.startsWith('Numpad') && /^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleClearAll]);

  // Validation on 6th digit
  useEffect(() => {
    if (pin.length === 6) {
      if (pin === expectedPin) {
        // Success
        setErrorMessage(null);
        const timer = setTimeout(() => {
          setPin('');
          if (onSuccess) onSuccess();
        }, 150);
        return () => clearTimeout(timer);
      } else {
        // Incorrect PIN: Trigger gentle horizontal CSS shake animation & auto-clear
        setIsShaking(true);
        setErrorMessage('លេខកូដសម្ងាត់មិនត្រឹមត្រូវ (Incorrect 6-digit PIN)');
        const shakeTimer = setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 600);
        return () => clearTimeout(shakeTimer);
      }
    }
  }, [pin, expectedPin, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-y-auto">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-amber-500/10 rounded-full blur-[140px] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415512_1px,transparent_1px),linear-gradient(to_bottom,#33415512_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
      </div>

      <style>{`
        @keyframes gentleShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-pin-shake {
          animation: gentleShake 0.5s ease-in-out;
        }
      `}</style>

      {/* Center Profile Card */}
      <div
        className={`relative z-10 border border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-sm w-full backdrop-blur-xl text-center space-y-6 ${
          isShaking ? 'animate-pin-shake' : ''
        }`}
      >
        {/* Subtle Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

        {/* User Identity Header */}
        <div className="space-y-3">
          <div className="w-18 h-18 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-emerald-400 font-mono tracking-wider">
              {explicitUser?.avatar && explicitUser.avatar.startsWith('http') ? (
                <img
                  src={explicitUser.avatar}
                  alt={staffName}
                  className="w-full h-full rounded-[14px] object-cover"
                />
              ) : (
                userInitials
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {staffName}
            </h2>
            <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              {roleTag}
            </div>
            <p className="text-xs text-slate-400 pt-2 font-medium">
              សូមបញ្ចូលលេខកូដសម្ងាត់ ៦ ខ្ទង់ (Enter your 6-digit access PIN)
            </p>
          </div>
        </div>

        {/* 6 PIN Dot Indicators */}
        <div className="py-2">
          <div className="flex items-center justify-center gap-3.5">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-emerald-400 border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.85)] scale-110'
                      : 'bg-slate-950 border border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-400 mt-2.5 animate-in fade-in duration-150">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Virtual Numeric Keypad (3x4 Grid) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-13 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-lg font-bold text-white transition-all active:scale-95 shadow-sm font-mono flex items-center justify-center cursor-pointer select-none"
            >
              {num}
            </button>
          ))}

          {/* 'Clear All' Button */}
          <button
            type="button"
            onClick={handleClearAll}
            className="h-13 rounded-2xl bg-slate-950/50 hover:bg-slate-800 border border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none"
            title="Clear All / លុបទាំងអស់"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-[9px]">Clear</span>
          </button>

          {/* '0' Button */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-lg font-bold text-white transition-all active:scale-95 shadow-sm font-mono flex items-center justify-center cursor-pointer select-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-950/50 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer select-none"
            title="Backspace / លុបថយក្រោយ"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Fallback Link */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={onFallbackPassword || signOut}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition hover:underline cursor-pointer block mx-auto"
          >
            ចូលដោយប្រើពាក្យសម្ងាត់ពេញលេញ (Log in with full password instead)
          </button>

          <p className="text-[10px] text-slate-500 font-mono">
            Default Demo PIN: <strong className="text-slate-300">123456</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PinLockScreen;
