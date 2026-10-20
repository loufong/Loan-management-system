import React, { useState } from 'react';
import { NotificationItem, UserRole } from '../../types';
import { Bell, CheckCheck, AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export interface NotificationsCenterProps {
  notifications: NotificationItem[];
  currentUserRole?: UserRole;
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
  onNavigateToAction?: (linkId?: string, category?: string) => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigateToAction,
}) => {
  const { language, t } = useLanguage();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'PAYMENT_DUE' | 'OVERDUE' | 'APPROVAL'>('ALL');

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'PAYMENT_DUE') return n.category === 'PAYMENT_DUE';
    if (filter === 'OVERDUE') return n.category === 'OVERDUE';
    if (filter === 'APPROVAL') return n.category === 'APPROVAL';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3 h-3" />
            {t('nav_overdue', 'Overdue')}
          </span>
        );
      case 'PAYMENT_DUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            {t('Payment Due', 'Payment Due')}
          </span>
        );
      case 'APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {t('Approval', 'Approval')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <Bell className="w-3 h-3" />
            {t('Alert', 'Alert')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{t('Notification Center', 'Notification Center')}</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-[#2563EB]">
                {unreadCount} {t('unread', 'unread')}
              </span>
            )}
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            {t('System notices, repayment schedules, approval alerts, and institutional dispatches.', 'System notices, repayment schedules, approval alerts, and institutional dispatches.')}
          </p>
        </div>

        {unreadCount > 0 && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[6px] transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            {t('Mark all as read', 'Mark all as read')}
          </button>
        )}
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
        {[
          { key: 'ALL', label: `${t('All', 'All')} (${notifications.length})` },
          { key: 'UNREAD', label: `${t('Unread', 'Unread')} (${unreadCount})` },
          { key: 'PAYMENT_DUE', label: t('Payment Due', 'Payment Due') },
          { key: 'OVERDUE', label: t('nav_overdue', 'Overdue') },
          { key: 'APPROVAL', label: t('Approval', 'Approvals') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              'px-3.5 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
              filter === tab.key
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white bg-transparent border border-transparent hover:border-[#E2E8F0]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Notification List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] py-12 px-4 text-center">
            <Bell className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#0F172A]">{t('No notifications', 'No notifications in this filter')}</h3>
            <p className="text-xs text-[#64748B] mt-1">
              {language === 'km' ? 'អ្នកបានពិនិត្យការជូនដំណឹង និងសារទាំងអស់រួចរាល់ហើយ។' : 'You are all caught up with your dispatches and alerts.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.isRead) onMarkRead(item.id);
                if (item.linkId && onNavigateToAction) {
                  onNavigateToAction(item.linkId, item.category);
                }
              }}
              className={cn(
                'bg-white border rounded-[6px] p-4 transition-all flex items-start justify-between gap-4 cursor-pointer hover:shadow-sm',
                item.isRead
                  ? 'border-[#E2E8F0] bg-white text-[#475569]'
                  : 'border-blue-200 bg-blue-50/20 text-[#0F172A]'
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="pt-0.5 shrink-0">
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full inline-block',
                      item.isRead ? 'bg-[#CBD5E1]' : 'bg-[#2563EB]'
                    )}
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                    {getCategoryBadge(item.category)}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-[#64748B]">
                    <span>
                      {new Date(item.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {item.linkId && (
                      <span className="font-mono text-[#2563EB] hover:underline">
                        Reference: {item.linkId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!item.isRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(item.id);
                  }}
                  className="shrink-0 p-1.5 text-xs text-[#2563EB] hover:bg-blue-50 rounded-[4px] border border-transparent hover:border-blue-200 transition"
                  title="Mark as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
