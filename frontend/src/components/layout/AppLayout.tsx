import React, { useState, useEffect } from 'react';
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
  Landmark
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';

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
  unreadNotificationsCount?: number;
  branchName?: string;
  breadcrumbs?: any[];
  currentRole?: any;
  onRoleSwitch?: (role: any) => void;
  onRoleToggle?: () => void;
  onSearchOpen?: () => void;
  notifications?: any[];
  onMarkNotificationRead?: (id: string) => void;
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
  overdueCount = 6,
  unreadNotificationsCount = 3,
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

  // Sync external currency prop
  useEffect(() => {
    if (currency) setActiveCurrency(currency);
  }, [currency]);

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const userRole = (currentUser?.role || currentRole || 'ADMIN').toUpperCase();
  const isBorrower = ['BORROWER', 'CLIENT', 'USER'].includes(userRole);
  const isStaff = !isBorrower;

  interface LayoutNavLink {
    id: string;
    label: string;
    khLabel?: string;
    icon: any;
    path: string;
    badge?: number | string;
  }

  const staffNavLinks: LayoutNavLink[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'borrowers', label: 'Borrowers', icon: Users, path: '/admin/borrowers' },
    { id: 'new-application', label: 'New Loan', icon: FilePlus2, path: '/admin/applications' },
    {
      id: 'cashier',
      label: 'Repayments / Cashier',
      icon: Wallet,
      path: '/admin/cashier',
      badge: overdueCount > 0 ? overdueCount : undefined
    },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
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
      return ['new-application', 'apply-loan', '/apply-loan', 'apply', '/apply', 'applications', '/admin/applications'].includes(activeNav) ||
        ['/apply-loan', '/apply', '/admin/applications'].includes(currentPath);
    }
    if (item.id === 'repayments') {
      return ['repayments', '/repayments', 'repayment-schedule', '/repayment-schedule', 'user_repayments'].includes(activeNav) ||
        ['/repayments', '/repayment-schedule'].includes(currentPath);
    }
    if (item.id === 'cashier') {
      return ['cashier', 'payments', '/payments', 'pay_installment', 'pay-installment', '/pay-installment', 'user_payments', '/admin/cashier', '/admin/payments'].includes(activeNav) ||
        ['/payments', '/pay-installment', '/admin/cashier', '/admin/payments'].includes(currentPath);
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
          isSidebarCollapsed ? 'w-20' : 'w-64'
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
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 text-left truncate flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {isSidebarCollapsed && item.badge !== undefined && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                )}
              </button>
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

            {/* Notification Bell with Indicator Dot */}
            <button
              className="relative p-2 rounded-xl border border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>

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

              <div className="space-y-1 flex-1">
                {navLinks.map(item => {
                  const isActive = isItemActive(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id, item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500/20 text-rose-400 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
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
