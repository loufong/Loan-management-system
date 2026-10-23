import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  headline: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  headline,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
        {icon || <FolderOpen className="w-7 h-7 text-amber-400/80" />}
      </div>
      <h3 className="text-base font-bold text-white tracking-tight mb-1">{headline}</h3>
      {description && <p className="text-xs text-slate-400 leading-relaxed mb-6">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-950/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
