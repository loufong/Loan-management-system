import React from 'react';

export type BadgeVariant =
  | 'paid'
  | 'active'
  | 'approved'
  | 'pending'
  | 'review'
  | 'upcoming'
  | 'overdue'
  | 'rejected'
  | 'delinquent'
  | 'draft'
  | 'inactive'
  | 'closed';

interface BadgeProps {
  variant?: BadgeVariant | string;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
  size?: 'xs' | 'sm';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'active',
  children,
  dot = false,
  className = '',
  size = 'xs'
}) => {
  const norm = (variant || '').toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (
    norm.includes('paid') ||
    norm.includes('active') ||
    norm.includes('approved') ||
    norm.includes('verified') ||
    norm.includes('completed') ||
    norm.includes('low risk')
  ) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-[0_2px_8px_rgba(16,185,129,0.15)]';
    dotColor = 'bg-emerald-500';
  } else if (
    norm.includes('pending') ||
    norm.includes('review') ||
    norm.includes('upcoming') ||
    norm.includes('partial') ||
    norm.includes('submitted') ||
    norm.includes('medium risk')
  ) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-[0_2px_8px_rgba(245,158,11,0.15)]';
    dotColor = 'bg-amber-500';
  } else if (
    norm.includes('overdue') ||
    norm.includes('rejected') ||
    norm.includes('delinquent') ||
    norm.includes('blacklisted') ||
    norm.includes('high risk') ||
    norm.includes('written_off')
  ) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80 shadow-[0_2px_8px_rgba(244,63,94,0.15)]';
    dotColor = 'bg-rose-500';
  } else if (
    norm.includes('draft') ||
    norm.includes('inactive') ||
    norm.includes('closed') ||
    norm.includes('cancelled')
  ) {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.03)]';
    dotColor = 'bg-slate-400';
  }

  const sizeClasses =
    size === 'xs'
      ? 'px-2.5 py-0.5 text-[11px] font-semibold'
      : 'px-3 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />}
      <span className="truncate">{children}</span>
    </span>
  );
};
