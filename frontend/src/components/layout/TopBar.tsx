import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Currency, UserRole, NotificationItem, UserProfile } from '../../types';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu,
  CheckCheck,
  LogOut,
  User,
  Settings
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
  currentUser?: UserProfile;
  onLogout?: () => void;
}

const ROLE_DISPLAY_CONFIG: Record<
  UserRole,
  { label: string; badge: string; description: string; color: string }
> = {
  MANAGER: {
    label: 'Administrator',
    badge: 'Administrator',
    description: 'System Governance & Approvals',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },
  ADMIN: {
    label: 'Administrator',
    badge: 'Administrator',
    description: 'Full System Administration',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },
  admin: {
    label: 'Administrator',
    badge: 'Administrator',
    description: 'Full System Administration',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },
  CASHIER: {
    label: 'Cashier',
    badge: 'Cashier',
    description: 'POS Terminal & Disbursements',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },
  BORROWER: {
    label: 'Borrower',
    badge: 'Borrower',
    description: 'Self-Service Portal & Applications',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },
  LOAN_OFFICER: {
    label: 'Loan Officer',
    badge: 'Loan Officer',
    description: 'Underwriting & Risk Assessment',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },

  USER: {
    label: 'User',
    badge: 'User',
    description: 'Client Self-Service',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
  },
  user: {
    label: 'User',
    badge: 'User',
    description: 'Client Self-Service',
    color: 'bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
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
  onMobileMenuToggle,
  currentUser,
  onLogout,
}) => {
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedNotifFilter, setSelectedNotifFilter] = useState<
    'ALL' | 'PAYMENT_DUE' | 'OVERDUE' | 'APPROVAL'
  >('ALL');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
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

  const displayRole = ROLE_DISPLAY_CONFIG[currentRole]?.label || 'Administrator';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#CBD5E1] px-4 sm:px-6 flex items-center justify-between gap-4 select-none">
      
      {/* 1. Left Side: Mobile Menu Button + Breadcrumb Trail */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          type="button"
          aria-label="Open Navigation Drawer"
          className="lg:hidden p-2 rounded-[6px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb Navigation" className="flex items-center gap-1.5 text-[13px] text-[#64748B] min-w-0">
          <span className="font-semibold text-[#0F172A] hidden sm:inline">Home</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#64748B] hidden sm:inline shrink-0" />
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                )}

                {isLast ? (
                  <span className="font-semibold text-[#0F172A] truncate max-w-[200px] sm:max-w-[320px]">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={crumb.onClick}
                    className="text-[#64748B] hover:text-[#2563EB] transition truncate max-w-[120px] sm:max-w-[180px] hover:underline focus:outline-none"
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* 2. Center: Compact Search Bar */}
      <div className="flex-1 max-w-sm hidden md:block">
        <button
          onClick={onSearchOpen}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-[6px] bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] text-[13px] text-[#64748B] transition-colors group focus:outline-none focus:border-[#2563EB]"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-[#64748B] group-hover:text-[#0F172A] transition-colors" />
            <span className="truncate">
              Search loans, borrowers, accounts...
            </span>
          </div>

          <kbd className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono font-medium text-[#64748B] bg-white rounded-[4px] border border-[#CBD5E1]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* 3. Right Controls: Currency, Notifications & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Currency Switcher */}
        <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-[6px] border border-[#CBD5E1] text-[12px]">
          <button
            onClick={() => onToggleCurrency('USD')}
            className={cn(
              'px-2 py-1 rounded-[4px] font-medium transition-colors font-mono text-[12px]',
              currency === 'USD'
                ? 'bg-white text-[#0F172A] border border-[#CBD5E1] font-semibold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            )}
          >
            USD $
          </button>
          <button
            onClick={() => onToggleCurrency('KHR')}
            className={cn(
              'px-2 py-1 rounded-[4px] font-medium transition-colors text-[12px]',
              currency === 'KHR'
                ? 'bg-white text-[#0F172A] border border-[#CBD5E1] font-semibold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            )}
          >
            KHR ៛
          </button>
        </div>

        {/* Notifications Icon & Drawer */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            title="Notifications"
            aria-label="Notifications"
            className="p-2 rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 border border-transparent hover:border-[#CBD5E1] transition relative focus:outline-none"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]"></span>
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          <AnimatePresence>
            {notifDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[8px] bg-white border border-[#CBD5E1] z-50 p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13px] font-semibold text-[#0F172A] uppercase tracking-wider">
                      Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[11px] font-medium bg-rose-50 text-[#DC2626] border border-rose-200">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      notifications.forEach((n) => onMarkNotificationRead?.(n.id));
                    }}
                    className="text-[12px] text-[#2563EB] hover:underline font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 text-[11px] font-medium bg-slate-50 p-1 rounded-[6px] border border-[#CBD5E1]">
                  {(['ALL', 'PAYMENT_DUE', 'OVERDUE', 'APPROVAL'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedNotifFilter(cat)}
                      className={cn(
                        'flex-1 py-1 rounded-[4px] transition text-center',
                        selectedNotifFilter === cat
                          ? 'bg-white text-[#0F172A] border border-[#CBD5E1] font-semibold'
                          : 'text-[#64748B] hover:text-[#0F172A]'
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
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-[#64748B]">
                      No notifications in this queue.
                    </div>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead?.(n.id)}
                        className={cn(
                          'p-3 rounded-[6px] border text-xs cursor-pointer transition',
                          !n.isRead
                            ? 'bg-blue-50/50 border-blue-200 text-[#0F172A]'
                            : 'bg-white border-[#CBD5E1] text-[#64748B] hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                              n.category === 'OVERDUE'
                                ? 'bg-rose-50 text-[#DC2626] border-rose-200'
                                : n.category === 'APPROVAL'
                                ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                                : 'bg-amber-50 text-[#D97706] border-amber-200'
                            )}
                          >
                            {n.category.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-[#64748B] font-mono">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="font-semibold text-[#0F172A] text-xs">
                          {n.title}
                        </p>
                        <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">
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

        {/* User Profile & Role Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            type="button"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[13px] transition group focus:outline-none"
          >
            <div className="w-6 h-6 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="flex flex-col text-left max-w-[140px]">
              <span className="text-[#0F172A] font-medium text-[13px] leading-tight truncate">
                {currentUser?.name || 'Administrator'}
              </span>
              <span className="text-[11px] text-[#64748B] leading-none truncate">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#0F172A] transition" />
          </button>

          {/* Profile & Role Clearance Menu */}
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-64 rounded-[8px] bg-white border border-[#CBD5E1] z-50 p-2.5 space-y-2 shadow-sm"
              >
                {/* User Info Header */}
                <div className="p-2.5 bg-slate-50 rounded-[6px] border border-[#CBD5E1]">
                  <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                    {currentUser?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                    {currentUser?.email || 'admin@loansystem.edu'}
                  </p>
                  <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-[#0F172A]">
                    {displayRole}
                  </div>
                </div>

                {/* Role Switcher for Testing */}
                <div className="pt-1 border-t border-[#CBD5E1]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-2 py-1">
                    Switch Persona
                  </p>
                  <div className="space-y-0.5">
                    {[
                      { role: 'MANAGER' as UserRole, label: 'Administrator' },
                      { role: 'CASHIER' as UserRole, label: 'Cashier' },
                      { role: 'BORROWER' as UserRole, label: 'Borrower' },
                    ].map((item) => (
                      <button
                        key={item.role}
                        onClick={() => {
                          onRoleSwitch(item.role);
                          setProfileDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[12px] text-left transition',
                          currentRole === item.role
                            ? 'bg-[#2563EB] text-white font-medium'
                            : 'text-[#0F172A] hover:bg-slate-100'
                        )}
                      >
                        <span>{item.label}</span>
                        {currentRole === item.role && <span className="text-[10px]">Active</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sign Out Button */}
                {onLogout && (
                  <div className="pt-1.5 border-t border-[#CBD5E1]">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[4px] text-[13px] text-[#DC2626] hover:bg-rose-50 font-medium transition text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
