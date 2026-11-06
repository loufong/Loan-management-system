import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  FilePlus2,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Globe,
  Bell,
  Coins,
  Menu,
  X,
  Shield,
  CreditCard,
  Calendar,
  Building2,
  AlertTriangle,
  ShieldCheck,
  Landmark,
  FileText,
  CheckCheck,
  Clock,
  CheckCircle2,
  Check,
  Trash2,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { Currency, UserProfile, NotificationItem } from '../../types';
import { notificationStorageService, formatRelativeTime } from '../../services/notificationStorageService';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentUser?: UserProfile;
  currentPath?: string;
  activeNav?: string;
  activeNavId?: string;
  onNavigate?: (navIdOrPath: string) => void;
  onLogout?: () => void;
  currency?: Currency;
  onToggleCurrency?: (currency: Currency) => void;
  overdueCount?: number;
  activeFacilitiesCount?: number;
  pendingApprovalsCount?: number;
  unreadNotificationsCount?: number;
  branchName?: string;
  breadcrumbs?: any[];
  currentRole?: any;
  onRoleSwitch?: (role: any) => void;
  onRoleToggle?: () => void;
  onSearchOpen?: () => void;
  notifications?: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentUser = {
    id: 'usr-admin',
    username: 'admin',
    name: 'Sophea Pich',
    fullName: 'Sophea Pich',
    email: 'sophea.pich@jamsongvich.com',
    role: 'ADMIN',
    title: 'Senior Loan Director',
    department: 'Credit Operations',
    avatar: 'SP',
    branch: 'Phnom Penh Main Branch'
  },
  currentPath = '/my-loans',
  activeNav: rawActiveNav = 'borrower_dashboard',
  activeNavId,
  onNavigate,
  onLogout,
  currency = 'USD',
  onToggleCurrency,
  overdueCount = 0,
  activeFacilitiesCount = 0,
  pendingApprovalsCount = 0,
  unreadNotificationsCount: rawUnreadCount,
  notifications: propNotifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  currentRole,
  onRoleSwitch,
  onRoleToggle
}) => {
  const activeNav = activeNavId || rawActiveNav;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState<Currency>(currency);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const userRole = (currentUser?.role || currentRole || 'ADMIN').toUpperCase();
  const isBorrower = ['BORROWER', 'CLIENT', 'USER'].includes(userRole);
  const isStaff = !isBorrower;

  // Real-time Notification State & Dropdown Controller
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD' | 'PAYMENTS' | 'KYC'>('ALL');
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize notifications from storage service or props
  const [items, setItems] = useState<NotificationItem[]>(() => {
    if (propNotifications && propNotifications.length > 0) {
      return propNotifications;
    }
    return notificationStorageService.getNotifications(isBorrower);
  });

  // Sync when propNotifications change
  useEffect(() => {
    if (propNotifications && propNotifications.length > 0) {
      setItems(propNotifications);
    }
  }, [propNotifications]);

  // Subscribe to real-time notification changes across components and tabs
  useEffect(() => {
    const unsub = notificationStorageService.subscribe((updated) => {
      setItems(updated);
    });
    return unsub;
  }, []);

  // Close notifications dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  // Dynamic unread count (falls back to items calculation)
  const unreadNotificationsCount = items.filter(n => !n.isRead).length;

  const handleMarkOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    notificationStorageService.markAsRead(id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    onMarkNotificationRead?.(id);
  };

  const handleMarkAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    notificationStorageService.markAllAsRead();
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    onMarkAllNotificationsRead?.();
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    notificationStorageService.clearAll();
    setItems([]);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkOne(item.id);
    }
    setNotificationsOpen(false);
    if (item.actionUrl) {
      onNavigate?.(item.actionUrl);
    } else if (item.linkId) {
      onNavigate?.(item.linkId);
    }
  };

  // Filtered notifications for the dropdown
  const filteredNotifications = items.filter((n) => {
    if (notifFilter === 'UNREAD') return !n.isRead;
    if (notifFilter === 'PAYMENTS') return n.category === 'PAYMENT_DUE' || n.category === 'OVERDUE';
    if (notifFilter === 'KYC') return n.category === 'APPROVAL' || n.category === 'DISBURSEMENT' || n.category === 'SYSTEM';
    return true;
  });

  interface LayoutNavLink {
    id: string;
    label: string;
    khLabel?: string;
    icon: any;
    path: string;
    badge?: number | string;
    dividerBefore?: boolean;
    section?: string;
  }

  const staffNavLinks: LayoutNavLink[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
    },
    {
      id: 'approvals',
      label: 'Loan Approvals',
      icon: ShieldCheck,
      path: '/admin/approvals',
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      id: 'borrowers',
      label: 'Active Facilities',
      icon: Landmark,
      path: '/admin/borrowers',
    },
    {
      id: 'payment_history',
      label: 'Payment History',
      icon: Receipt,
      path: '/admin/payments',
    },
    {
      id: 'reports',
      label: 'Reports & Credit Scoring',
      icon: BarChart3,
      path: '/admin/reports',
      dividerBefore: true,
    },
    {
      id: 'settings',
      label: 'Settings & Audit Logs',
      icon: Settings,
      path: '/admin/settings',
    },
  ];

  const borrowerNavLinks: LayoutNavLink[] = [
    { id: 'borrower_dashboard', label: 'My Loans', icon: Wallet, path: '/my-loans' },
    { id: 'new-application', label: 'Apply for Loan', icon: FilePlus2, path: '/apply-loan' },
    { id: 'repayments', label: 'Repayment Schedule', icon: Calendar, path: '/repayments' },
    { id: 'cashier', label: 'Pay Installment', icon: Wallet, path: '/payments' },
    { id: 'profile', label: 'My Profile', icon: Shield, path: '/profile' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const navLinks: LayoutNavLink[] = isStaff ? staffNavLinks : borrowerNavLinks;

  const handleNavClick = (id: string, path: string) => {
    if (onNavigate) {
      onNavigate(path || id);
    }
    setMobileMenuOpen(false);
  };

  const handleToggleCurr = () => {
    const nextCurr = activeCurrency === 'USD' ? 'KHR' : 'USD';
    setActiveCurrency(nextCurr);
    onToggleCurrency?.(nextCurr);
  };



    const isItemActive = (item: LayoutNavLink) => {
    if (activeNav === item.id || activeNav === item.path || currentPath === item.path) return true;
    if (item.id === 'dashboard') {
      return ['dashboard', 'admin_dashboard', '/admin/dashboard', '/admin', 'super_ledger'].includes(activeNav) ||
        ['/admin/dashboard', '/admin'].includes(currentPath);
    }
    if (item.id === 'approvals') {
      return ['approvals', 'admin_approvals', '/admin/approvals'].includes(activeNav) ||
        currentPath === '/admin/approvals';
    }
    if (item.id === 'borrowers') {
      return ['borrowers', 'admin_borrowers', 'borrower-detail', '/admin/borrowers'].includes(activeNav) ||
        currentPath === '/admin/borrowers';
    }
    if (item.id === 'borrower_dashboard') {
      return ['borrower_dashboard', 'user_dashboard', 'my-loans', '/my-loans', 'portal', '/portal', '/'].includes(activeNav) ||
        ['/my-loans', '/portal', '/'].includes(currentPath);
    }
    if (item.id === 'new-application') {
      return ['new-application', 'applications', '/admin/applications'].includes(activeNav) ||
        currentPath === '/admin/applications';
    }
    if (item.id === 'self-apply') {
      return ['self-apply', 'apply_self', '/apply', '/apply-loan', 'apply-loan'].includes(activeNav) ||
        ['/apply', '/apply-loan'].includes(currentPath);
    }
    if (item.id === 'repayments' || item.id === 'my-repayments') {
      return ['repayments', 'my-repayments', '/repayments', 'repayment-schedule', '/repayment-schedule', 'user_repayments'].includes(activeNav) ||
        ['/repayments', '/repayment-schedule'].includes(currentPath);
    }
    if (item.id === 'payment_history') {
      return ['payment_history', 'admin_payments', '/admin/payments', '/admin/payment-history', 'payments_history'].includes(activeNav) ||
        ['/admin/payments', '/admin/payment-history'].includes(currentPath);
    }
    if (item.id === 'cashier') {
      return ['cashier', 'payments', '/payments', 'pay_installment', 'pay-installment', '/pay-installment', 'user_payments', '/admin/cashier'].includes(activeNav) ||
        ['/payments', '/pay-installment', '/admin/cashier'].includes(currentPath);
    }
    if (item.id === 'profile') {
      return ['profile', '/profile', 'my-profile', '/my-profile', 'user_profile'].includes(activeNav) ||
        ['/profile', '/my-profile'].includes(currentPath);
    }
    if (item.id === 'reports') {
      return ['reports', 'admin_reports', '/admin/reports', '/reports', 'BI-STUDIO'].includes(activeNav) ||
        ['/admin/reports', '/reports'].includes(currentPath);
    }
    if (item.id === 'settings') {
      return ['settings', '/settings', 'user_settings', 'system_config', '/admin/settings', 'admin_settings', '/system-settings'].includes(activeNav) ||
        ['/settings', '/admin/settings', '/user/settings'].includes(currentPath);
    }
    return false;
  };

  const currentNav = navLinks.find(isItemActive) || navLinks[0];
  const displayName = currentUser?.name || currentUser?.fullName || currentUser?.username || 'User';
  const displayAvatar = (displayName.slice(0, 2) || 'US').toUpperCase();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. SIDEBAR (Collapsible, Modern Core-Banking Identity)                     */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 relative z-30 ${
          isSidebarCollapsed ? 'w-20' : 'w-68'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/90">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-400 p-[1.5px] shadow-lg shadow-emerald-950/40 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="truncate">
                <h1 className="text-xs font-black tracking-wider uppercase text-white truncate">
                  JAM SONG VICH
                </h1>
                <p className="text-[10px] font-medium tracking-tight text-amber-400 truncate">
                  Core Banking System
                </p>
                <p className="text-[9px] font-medium text-emerald-400 truncate">
                  Loan Management System
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-400 p-[1.5px] flex items-center justify-center shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);
            return (
              <React.Fragment key={item.id}>
                {item.dividerBefore && !isSidebarCollapsed && (
                  <div className="my-2 mx-1 border-t border-slate-800/80" />
                )}
                {item.section && !isSidebarCollapsed && (
                  <div className="pt-2.5 pb-1 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => handleNavClick(item.id, item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex-1 text-left flex items-center justify-between min-w-0">
                      <span className="truncate pr-2">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`shrink-0 ml-auto px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full shadow-sm shadow-emerald-400" />
                  )}
                  {isSidebarCollapsed && item.badge !== undefined && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User Profile Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          {!isSidebarCollapsed ? (
            <div className="flex flex-col gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    {displayAvatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.title || (isBorrower ? 'Client Borrower' : 'Administrator')}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                {displayAvatar}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEWPORT & TOP HEADER BAR                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
          {/* Left: Mobile Menu Button & Breadcrumb Trail */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span className="text-slate-500 font-medium">Core Banking</span>
              <span>/</span>
              <span className="font-bold text-white capitalize">
                {currentNav.label}
              </span>
            </div>
          </div>

          {/* Center: Global Quick Search (Cmd + K) */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search by borrower name, loan ID, phone..."
                className="w-full pl-10 pr-16 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-[10px] font-mono text-slate-400">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Right Controls: Currency Indicator, Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Currency Filter Indicator Toggle */}
            <button
              onClick={handleToggleCurr}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition flex items-center gap-1.5 ${
                activeCurrency === 'USD'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
              title="Toggle Active Currency (USD / KHR)"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{activeCurrency === 'USD' ? 'USD | KHR' : 'KHR | USD'}</span>
            </button>

            {/* Notification Bell with Indicator Dot & Interactive Dropdown Flyout */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setNotificationsOpen(prev => !prev)}
                className={`relative p-2 rounded-xl border transition cursor-pointer ${
                  notificationsOpen
                    ? 'border-emerald-500/60 bg-slate-800 text-white shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Notifications & Dispatches"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                )}
              </button>

              {/* Flyout Dropdown Menu */}
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[410px] max-w-[420px] rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Top Bar Header */}
                  <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-wide">
                            Institutional Notifications
                          </span>
                          {unreadNotificationsCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {unreadNotificationsCount} new
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              All caught up
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={handleMarkAll}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition flex items-center gap-1 cursor-pointer"
                          title="Mark all notifications as read"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Subtabs */}
                  <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {[
                      { key: 'ALL', label: `All (${items.length})` },
                      { key: 'UNREAD', label: `Unread (${unreadNotificationsCount})` },
                      { key: 'PAYMENTS', label: 'Payments' },
                      { key: 'KYC', label: 'KYC & System' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setNotifFilter(tab.key as any)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                          notifFilter === tab.key
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-800/60">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-10 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 mx-auto mb-2 flex items-center justify-center text-slate-400">
                          <Bell className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-300">No notifications in this filter</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          You're all set! New alerts and regulatory updates will arrive here in real time.
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map(item => {
                        const isOverdue = item.category === 'OVERDUE';
                        const isPayment = item.category === 'PAYMENT_DUE';
                        const isKyc = item.category === 'APPROVAL';
                        const isDisbursed = item.category === 'DISBURSEMENT';

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3 sm:p-3.5 transition flex items-start gap-3 cursor-pointer group hover:bg-slate-800/60 ${
                              !item.isRead ? 'bg-slate-850/90' : 'bg-transparent'
                            }`}
                          >
                            {/* Category Icon Badge */}
                            <div className="pt-0.5 shrink-0">
                              {isOverdue && (
                                <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {isPayment && (
                                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                  <Clock className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {isKyc && (
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {isDisbursed && (
                                <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                                  <Coins className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {!isOverdue && !isPayment && !isKyc && !isDisbursed && (
                                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                  <Bell className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>

                            {/* Notification Copy */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition truncate">
                                    {item.title}
                                  </h4>
                                  {!item.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950 shrink-0 animate-pulse" />
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                                  {formatRelativeTime(item.timestamp)}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                                {item.message}
                              </p>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isOverdue && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                      Critical Overdue
                                    </span>
                                  )}
                                  {isPayment && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      Installment Due
                                    </span>
                                  )}
                                  {isKyc && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                      KYC Verified
                                    </span>
                                  )}
                                  {isDisbursed && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                      Disbursement
                                    </span>
                                  )}
                                  {item.linkId && (
                                    <span className="text-[10px] text-emerald-400 group-hover:underline flex items-center gap-0.5 font-medium">
                                      Action <ChevronRight className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>

                                {!item.isRead && (
                                  <button
                                    onClick={(e) => handleMarkOne(item.id, e)}
                                    className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-750 transition text-[10px] flex items-center gap-0.5 cursor-pointer"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="px-3.5 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        onNavigate?.('/notifications');
                      }}
                      className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Notification Center</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    {items.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                        title="Clear all alerts"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Authenticated User Badge with Avatar: Johnathan Doe • Client Borrower */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {(currentUser?.fullName || currentUser?.name || 'Johnathan Doe').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <span className="text-xs font-bold text-white block leading-tight truncate">
                  {currentUser?.fullName || currentUser?.name || 'Johnathan Doe'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium block leading-tight">
                  {isBorrower ? 'Client Borrower' : (currentUser?.title || 'Administrator')}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Slide-over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-slate-900 border-r border-slate-800 p-4 flex flex-col z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-xs uppercase text-white">JAM SONG VICH</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto">
                {navLinks.map(item => {
                  const isActive = isItemActive(item);
                  return (
                    <React.Fragment key={item.id}>
                      {item.dividerBefore && (
                        <div className="my-2 mx-1 border-t border-slate-800/80" />
                      )}
                      {item.section && (
                        <div className="pt-2.5 pb-1 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                          {item.section}
                        </div>
                      )}
                      <button
                        onClick={() => handleNavClick(item.id, item.path)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold border border-slate-700/60 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className={`shrink-0 ml-2 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
