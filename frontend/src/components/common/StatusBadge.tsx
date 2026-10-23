import React from 'react';

export type StatusType =
  | 'Active'
  | 'Pending'
  | 'Paid'
  | 'Overdue'
  | 'Rejected'
  | 'Approved'
  | 'Critical'
  | 'In Good Standing';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md'
}) => {
  const norm = status.toLowerCase();

  let dotColor = 'bg-slate-400';
  let badgeStyle = 'bg-slate-500/10 text-slate-300 border-slate-500/20';

  if (norm.includes('active') || norm.includes('paid') || norm.includes('good standing') || norm.includes('approved')) {
    dotColor = 'bg-emerald-400';
    badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  } else if (norm.includes('pending') || norm.includes('review')) {
    dotColor = 'bg-amber-400';
    badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (norm.includes('critical') || norm.includes('overdue 30') || norm.includes('rejected') || norm.includes('default')) {
    dotColor = 'bg-rose-500';
    badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  } else if (norm.includes('overdue')) {
    dotColor = 'bg-amber-400';
    badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide uppercase ${badgeStyle} ${sizeClasses[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} inline-block`} />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
