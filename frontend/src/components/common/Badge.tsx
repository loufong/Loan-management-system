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

  let colorClasses = 'bg-slate-100 text-[#64748B] border-[#CBD5E1]';
  let dotColor = 'bg-[#64748B]';

  if (
    norm.includes('paid') ||
    norm.includes('active') ||
    norm.includes('approved') ||
    norm.includes('verified') ||
    norm.includes('completed') ||
    norm.includes('low risk') ||
    norm.includes('safe')
  ) {
    if (norm.includes('active')) {
      colorClasses = 'bg-blue-50 text-[#2563EB] border-blue-200';
      dotColor = 'bg-[#2563EB]';
    } else {
      colorClasses = 'bg-emerald-50 text-[#16A34A] border-emerald-200';
      dotColor = 'bg-[#16A34A]';
    }
  } else if (
    norm.includes('pending') ||
    norm.includes('review') ||
    norm.includes('upcoming') ||
    norm.includes('partial') ||
    norm.includes('submitted') ||
    norm.includes('moderate') ||
    norm.includes('medium risk')
  ) {
    colorClasses = 'bg-amber-50 text-[#D97706] border-amber-200';
    dotColor = 'bg-[#D97706]';
  } else if (
    norm.includes('overdue') ||
    norm.includes('rejected') ||
    norm.includes('delinquent') ||
    norm.includes('blacklisted') ||
    norm.includes('high risk') ||
    norm.includes('written_off')
  ) {
    colorClasses = 'bg-red-50 text-[#DC2626] border-red-200';
    dotColor = 'bg-[#DC2626]';
  } else if (
    norm.includes('draft') ||
    norm.includes('inactive') ||
    norm.includes('closed') ||
    norm.includes('cancelled')
  ) {
    colorClasses = 'bg-slate-50 text-[#64748B] border-[#CBD5E1]';
    dotColor = 'bg-slate-400';
  }

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[11px] font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />}
      <span className="truncate">{children}</span>
    </span>
  );
};
