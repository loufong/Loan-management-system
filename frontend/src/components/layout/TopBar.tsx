import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Currency, UserRole, NotificationItem } from '../../types';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Check,
  Menu,
  Sparkles,
  Shield,
  Layers,
  CheckCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
  onMobileMenuToggle?: () => void;
}

const ROLE_DISPLAY_CONFIG: Record<
  UserRole,
  { label: string; badge: string; description: string; color: string }
> = {
  MANAGER: {
    label: 'Admin / Manager',
    badge: 'Admin / Manager',
    description: 'System Governance, Underwriting & Approvals',
    color: 'bg-indigo-600 text-white'
  },
  CASHIER: {
    label: 'Desk Cashier',
    badge: 'Cashier',
    description: 'POS Terminal, Disbursements & Receipts',
    color: 'bg-emerald-600 text-white'
  },
  BORROWER: {
    label: 'Borrower',
    badge: 'Borrower',
    description: 'Self-Service 360° Profile & Applications',
    color: 'bg-amber-600 text-white'
  },
  LOAN_OFFICER: {
    label: 'Loan Officer',
    badge: 'Loan Officer',
    description: 'Underwriting & KYC Risk Assessment',
    color: 'bg-slate-500 text-white'
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs,
  currentRole,
  onRoleSwitch,
  currency,
  onToggleCurrency,
  onSearchOpen,
  notifications,
  onMarkNotificationRead,
  onMobileMenuToggle
}) => {
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [selectedNotifFilter, setSelectedNotifFilter] = useState<
    'ALL' | 'PAYMENT_DUE' | 'OVERDUE' | 'APPROVAL'
  >('ALL');

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
    <header className="sticky top-0 z-30 h-16 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
      
      {/* 1. Left Side: Mobile Menu Button + Breadcrumb Trail */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
        {/* Mobile Hamburger Trigger */}
        <button
          onClick={onMobileMenuToggle}
          type="button"
          aria-label="Open Navigation Drawer"
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200 transition focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Trail with Animated Chevron Transitions */}
        <nav aria-label="Breadcrumb Navigation" className="flex items-center gap-1 text-xs text-slate-500 font-medium min-w-0">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="text-slate-300 flex-shrink-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                  </motion.div>
                )}

                {isLast ? (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-[260px] font-sans"
                  >
                    {crumb.label}
                  </motion.span>
                ) : (
                  <button
                    onClick={crumb.onClick}
                    className="text-slate-500 hover:text-blue-600 transition truncate max-w-[120px] sm:max-w-[180px] hover:underline focus:outline-none"
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* 2. Center: Compact Search Bar with Keyboard Shortcut */}
      <div className="flex-1 max-w-sm hidden md:block mx-2">
        <button
          onClick={onSearchOpen}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 text-xs text-slate-500 transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.02)] group focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-slate-500 text-xs font-normal truncate">
              Quick search borrowers, loans (Cmd+K)
            </span>
          </div>

          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white rounded-md border border-slate-200 shadow-2xs group-hover:border-slate-300">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      {/* 3. Right Controls with Clean Dividers */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        
        {/* Live Market FX Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/90 text-[11px] font-mono text-emerald-800 shadow-[0_1px_4px_rgba(16,185,129,0.08)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold tracking-tight">1 USD ≈ 4,100 KHR</span>
        </div>

        {/* Clean Divider */}
        <div className="hidden sm:block h-5 w-px bg-slate-200/80" />

        {/* Currency Switcher: Segmented Toggle Pill */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs shadow-inner">
          <button
            onClick={() => onToggleCurrency('USD')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 font-mono',
              currency === 'USD'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            USD $
          </button>
          <button
            onClick={() => onToggleCurrency('KHR')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 font-khmer',
              currency === 'KHR'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            KHR ៛
          </button>
        </div>

        {/* Clean Divider */}
        <div className="h-5 w-px bg-slate-200/80" />

        {/* Notifications Drawer Trigger */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            title="Institutional Alerts & Notifications"
            aria-label="Notifications"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 border border-transparent hover:border-slate-200/80 transition relative focus:outline-none"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white"></span>
              </span>
            )}
          </button>

          {/* Animated Notifications Dropdown Panel */}
          <AnimatePresence>
            {notifDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Institutional Alerts
                    </h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-600 border border-rose-200">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      notifications.forEach((n) => onMarkNotificationRead?.(n.id));
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 text-[10px] font-semibold bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                  {(['ALL', 'PAYMENT_DUE', 'OVERDUE', 'APPROVAL'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedNotifFilter(cat)}
                      className={cn(
                        'flex-1 py-1 rounded-lg transition text-center font-sans',
                        selectedNotifFilter === cat
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      {cat === 'ALL'
                        ? 'All'
                        : cat === 'PAYMENT_DUE'
                        ? 'Due'
                        : cat === 'OVERDUE'
                        ? 'Overdue'
                        : 'Approvals'}
                    </button>
                  ))}
                </div>

                {/* Notification Items List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications in this queue.
                    </div>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead?.(n.id)}
                        className={cn(
                          'p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150',
                          !n.isRead
                            ? 'bg-blue-50/40 border-blue-100 text-slate-900 hover:bg-blue-50/70 shadow-2xs'
                            : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100/60'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider',
                              n.category === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : n.category === 'APPROVAL'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            )}
                          >
                            {n.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs leading-snug">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clean Divider */}
        <div className="h-5 w-px bg-slate-200/80" />

        {/* Role Switcher / Profile Dropdown */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs transition shadow-2xs group focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {/* Avatar Pill with Role Color */}
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm',
                ROLE_DISPLAY_CONFIG[currentRole]?.color || 'bg-blue-600 text-white'
              )}
            >
              {currentRole.charAt(0)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-slate-800 font-bold text-xs leading-none">
                {ROLE_DISPLAY_CONFIG[currentRole]?.badge || currentRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
          </button>

          {/* Animated Role Switcher Clearance Menu */}
          <AnimatePresence>
            {roleDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 p-2 space-y-1"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Switch Clearance Level (Demo Grading)
                </div>

                {(['MANAGER', 'CASHIER', 'BORROWER'] as UserRole[]).map((role) => {
                  const cfg = ROLE_DISPLAY_CONFIG[role];
                  const isSelected = currentRole === role;

                  return (
                    <button
                      key={role}
                      onClick={() => {
                        onRoleSwitch(role);
                        setRoleDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-xl text-xs transition text-left',
                        isSelected
                          ? 'bg-blue-50/80 text-blue-900 font-bold border border-blue-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0',
                            cfg.color
                          )}
                        >
                          {role.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold truncate leading-tight">
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            {cfg.description}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
};
