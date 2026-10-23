import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Delete,
  KeyRound,
  ShieldCheck,
  LogOut,
  X,
  AlertCircle,
  CheckCircle2,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PinAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onSwitchToPasswordLogin?: () => void;
  onFallbackPassword?: () => void;
  correctPin?: string; // Default: '123456'
  user?: {
    name?: string;
    role?: string;
    avatar?: string;
    storedPin?: string;
  };
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onSuccess,
  onSwitchToPasswordLogin,
  onFallbackPassword,
  correctPin = '123456',
  user: explicitUser,
}) => {
  const { user: authUser, profile, signOut } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fallbackHandler = onFallbackPassword || onSwitchToPasswordLogin || signOut;
  const targetPin = explicitUser?.storedPin || correctPin;
  const staffName = explicitUser?.name || profile?.fullName || authUser?.name || 'Staff Officer';
  const staffRole = (explicitUser?.role || profile?.role || authUser?.role || 'teller').toUpperCase();
  const staffAvatar = explicitUser?.avatar || staffName.slice(0, 2).toUpperCase();

  const handleInputDigit = useCallback((digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setErrorMessage(null);
    }
  }, [pin]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setErrorMessage(null);
  }, []);

  // Physical keyboard typing support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleInputDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleInputDigit, handleBackspace, handleClear]);

  // Auto-submit as soon as the 6th digit is pressed
  useEffect(() => {
    if (pin.length === 6) {
      const stored = localStorage.getItem('apex_staff_pin') || targetPin;
      if (pin === stored) {
        // Successful PIN authentication
        setErrorMessage(null);
        setTimeout(() => {
          setPin('');
          onSuccess();
        }, 200);
      } else {
        // Wrong entry: trigger shake animation and reset dots
        setIsShaking(true);
        setErrorMessage('Incorrect Security PIN. Please try again.');
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 600);
      }
    }
  }, [pin, correctPin, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl relative text-center space-y-6 ${
          isShaking ? 'animate-shake border-rose-500' : ''
        }`}
      >
        {/* Top Lock Badge */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-400 p-[2px] shadow-xl">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-emerald-400">
              {staffAvatar}
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-1">
              <Lock className="w-3 h-3" /> Inactive Session Locked
            </span>
            <h2 className="text-lg font-black text-white">{staffName}</h2>
            <p className="text-xs text-slate-400">{staffRole} • JAM SONG VICH Core</p>
          </div>
        </div>

        {/* 6 Animated Circular Dots */}
        <div className="flex items-center justify-center gap-3.5 py-2">
          {Array.from({ length: 6 }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <span
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 ring-4 ring-emerald-400/20 scale-110 shadow-lg shadow-emerald-500/40'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-400 font-medium animate-pulse">
            {errorMessage}
          </p>
        )}

        {/* Responsive Numeric Keypad (0–9, Clear, Backspace) */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleInputDigit(num)}
              className="h-13 rounded-2xl bg-slate-950 border border-slate-800 text-lg font-bold text-white hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition shadow-sm font-mono flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
          >
            Clear
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            onClick={() => handleInputDigit('0')}
            className="h-13 rounded-2xl bg-slate-950 border border-slate-800 text-lg font-bold text-white hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition shadow-sm font-mono flex items-center justify-center"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Fallback Option */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={fallbackHandler}
            className="text-xs text-amber-400 hover:text-amber-300 transition hover:underline block mx-auto font-medium"
          >
            Switch to full password login
          </button>

          <p className="text-[10px] text-slate-500">
            Default Demo PIN: <strong className="text-slate-300 font-mono">123456</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PinAuthModal;
