import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'success' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
  children
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      btn: 'bg-rose-600 hover:bg-rose-500 text-white',
      icon: <AlertCircle className="w-6 h-6 text-rose-400" />,
      iconBg: 'bg-rose-500/15 border-rose-500/30'
    },
    warning: {
      btn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
      icon: <AlertCircle className="w-6 h-6 text-amber-400" />,
      iconBg: 'bg-amber-500/15 border-amber-500/30'
    },
    success: {
      btn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
      iconBg: 'bg-emerald-500/15 border-emerald-500/30'
    },
    primary: {
      btn: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
      icon: <CheckCircle2 className="w-6 h-6 text-blue-400" />,
      iconBg: 'bg-blue-500/15 border-blue-500/30'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {children && <div className="my-4">{children}</div>}

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 ${style.btn} disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
