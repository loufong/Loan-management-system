import React, { useState, useEffect, useRef } from 'react';
import { Currency, UserRole, NotificationItem } from '../../types';
import { Search, Bell, ChevronDown, Check, User } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface TopBarProps {
  breadcrumbs: BreadcrumbItem[];
  currentRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
  currency: Currency;
  onToggleCurrency: (currency: Currency) => void;
  onSearchOpen?: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
}

const ROLE_DISPLAY_NAMES: Record<UserRole, { label: string; badge: string }> = {
  MANAGER: { label: 'Risk & Branch Manager', badge: 'Manager' },
  LOAN_OFFICER: { label: 'Loan & Credit Officer', badge: 'Officer' },
  CASHIER: { label: 'Desk Cashier', badge: 'Cashier' },
  BORROWER: { label: 'Borrower Self-Service', badge: 'Borrower' }
};

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs,
  currentRole,
  onRoleSwitch,
  currency,
  onToggleCurrency,
  onSearchOpen,
  notifications,
  onMarkNotificationRead
}) => {
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [selectedNotifFilter, setSelectedNotifFilter] = useState<'ALL' | 'PAYMENT_DUE' | 'OVERDUE' | 'APPROVAL'>('ALL');
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onSearchOpen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (selectedNotifFilter === 'ALL') return true;
    return n.category === selectedNotifFilter;
  });

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      
      {/* 1. Left: Subtle Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium min-w-0">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300 select-none">/</span>}
              {isLast ? (
                <span className="font-semibold text-slate-900 truncate max-w-[220px]">
                  {crumb.label}
                </span>
              ) : (
                <button
                  onClick={crumb.onClick}
                  className="text-slate-500 hover:text-slate-800 transition truncate hover:underline"
                >
                  {crumb.label}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* 2. Center: Compact Search Bar with Keyboard Shortcut */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={onSearchOpen}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 text-xs text-slate-400 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)] group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition" />
            <span className="text-slate-500 text-xs font-normal">Search borrowers, loans, receipts...</span>
          </div>

          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-white rounded border border-slate-200 shadow-xs">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      {/* 3. Right Utilities with Subtle Vertical Dividers */}
      <div className="flex items-center gap-3 flex-shrink-0">
        
        {/* Exchange Rate Ticker Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-[11px] font-mono text-emerald-800 shadow-[0_2px_8px_rgba(16,185,129,0.12)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold">1 USD = 4,100 KHR</span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-slate-200"></div>

        {/* Currency Segmented Control */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 text-xs">
          <button
            onClick={() => onToggleCurrency('USD')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
              currency === 'USD'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            USD
          </button>
          <button
            onClick={() => onToggleCurrency('KHR')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
              currency === 'KHR'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            KHR
          </button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200"></div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            title="Institutional Alerts & Notifications"
            aria-label="Notifications"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 transition relative"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200/80 shadow-lg z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Institutional Alerts</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium bg-rose-50 text-rose-600 border border-rose-200">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    notifications.forEach((n) => onMarkNotificationRead?.(n.id));
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                >
                  Mark all read
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1 text-[10px] font-semibold bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
                {(['ALL', 'PAYMENT_DUE', 'OVERDUE', 'APPROVAL'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedNotifFilter(cat)}
                    className={`flex-1 py-1 rounded-md transition text-center ${
                      selectedNotifFilter === cat
                        ? 'bg-white text-slate-900 shadow-xs font-medium'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat === 'ALL' ? 'All' : cat === 'PAYMENT_DUE' ? 'Due' : cat === 'OVERDUE' ? 'Overdue' : 'Approvals'}
                  </button>
                ))}
              </div>

              {/* Notifications List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredNotifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No alerts in this category.
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead?.(n.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        !n.isRead
                          ? 'bg-indigo-50/30 border-indigo-100 text-slate-800 hover:bg-indigo-50/50'
                          : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                          n.category === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : n.category === 'APPROVAL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {n.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-[11px] leading-tight">{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200"></div>

        {/* Role Pill Dropdown */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-xs transition shadow-xs group"
          >
            {/* Compact Avatar with Role Initials */}
            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
              {currentRole[0]}
            </div>
            <span className="text-slate-700 font-medium text-xs">
              {ROLE_DISPLAY_NAMES[currentRole]?.badge || currentRole}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition" />
          </button>

          {/* Role Selection Dropdown Menu */}
          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-slate-200/80 shadow-lg z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Switch Role Clearance
              </div>
              {(Object.keys(ROLE_DISPLAY_NAMES) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onRoleSwitch(role);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                    currentRole === role
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span>{ROLE_DISPLAY_NAMES[role].label}</span>
                  </div>
                  {currentRole === role && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
