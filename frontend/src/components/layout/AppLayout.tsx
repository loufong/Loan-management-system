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
  Building2,
  AlertTriangle
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
  currentPath = '/admin/dashboard',
  activeNav: rawActiveNav = 'dashboard',
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
  const [language, setLanguage] = useState<'EN' | 'KH'>('EN');
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
    khLabel: string;
    icon: any;
    path: string;
    badge?: number | string;
  }

  const staffNavLinks: LayoutNavLink[] = [
    { id: 'dashboard', label: 'Dashboard', khLabel: 'ផ្ទាំងគ្រប់គ្រង', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'borrowers', label: 'Borrowers', khLabel: 'អតិថិជនកម្ចី', icon: Users, path: '/admin/borrowers' },
    { id: 'new-application', label: 'New Loan', khLabel: 'ស្នើសុំឥណទានថ្មី', icon: FilePlus2, path: '/admin/applications' },
    {
      id: 'cashier',
      label: 'Repayments / Cashier',
      khLabel: 'បង់ប្រាក់ / បេឡា',
      icon: Wallet,
      path: '/admin/cashier',
      badge: overdueCount > 0 ? overdueCount : undefined
    },
    { id: 'reports', label: 'Reports', khLabel: 'របាយការណ៍ហិរញ្ញវត្ថុ', icon: BarChart3, path: '/admin/reports' },
    { id: 'settings', label: 'Settings', khLabel: 'ការកំណត់ប្រព័ន្ធ', icon: Settings, path: '/admin/settings' },
  ];

  const borrowerNavLinks: LayoutNavLink[] = [
    { id: 'borrower_dashboard', label: 'My Loans', khLabel: 'កម្ចីរបស់ខ្ញុំ', icon: Wallet, path: '/my-loans' },
    { id: 'new-application', label: 'Apply for Loan', khLabel: 'ស្នើសុំកម្ចីថ្មី', icon: FilePlus2, path: '/apply-loan' },
    { id: 'repayments', label: 'Repayment Schedule', khLabel: 'កាលវិភាគសងប្រាក់', icon: CreditCard, path: '/repayments' },
    { id: 'cashier', label: 'Pay Installment', khLabel: 'បង់រំលស់ប្រាក់កម្ចី', icon: Wallet, path: '/payments' },
    { id: 'profile', label: 'My Profile', khLabel: 'ព័ត៌មានផ្ទាល់ខ្លួន', icon: Shield, path: '/profile' },
    { id: 'settings', label: 'Settings', khLabel: 'ការកំណត់', icon: Settings, path: '/settings' },
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



  const currentNav = navLinks.find(
    l => l.id === activeNav ||
         l.path === activeNav ||
         l.path === currentPath ||
         (l.id === 'borrowers' && (
           activeNav === 'borrowers' ||
           activeNav === 'admin_borrowers' ||
           activeNav === 'borrower-detail' ||
           activeNav === '/admin/borrowers' ||
           currentPath === '/admin/borrowers'
         )) ||
         (l.id === 'borrower_dashboard' && (
           activeNav === 'borrower_dashboard' ||
           activeNav === 'user_dashboard' ||
           currentPath === '/my-loans' ||
           currentPath === '/portal'
         ))
  ) || navLinks[0];

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
            const isActive =
              activeNav === item.id ||
              activeNav === item.path ||
              currentPath === item.path ||
              (item.id === 'borrowers' && (
                activeNav === 'borrowers' ||
                activeNav === 'admin_borrowers' ||
                activeNav === 'borrower-detail' ||
                activeNav === '/admin/borrowers' ||
                currentPath === '/admin/borrowers'
              ));
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 text-left truncate flex items-center justify-between">
                    <span>{language === 'KH' ? item.khLabel : item.label}</span>
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
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.title || (isBorrower ? 'Client Borrower' : 'Administrator')}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
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
                {language === 'KH' ? currentNav.khLabel : currentNav.label}
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

          {/* Right Controls: Language Switcher, Currency Indicator, Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Language Switcher Toggle */}
            <button
              onClick={() => setLanguage(l => l === 'EN' ? 'KH' : 'EN')}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'EN' ? 'EN' : 'ភាសាខ្មែរ'}</span>
            </button>

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
              <span>{activeCurrency}</span>
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
                  const isActive =
                    activeNav === item.id ||
                    activeNav === item.path ||
                    currentPath === item.path ||
                    (item.id === 'borrowers' && (
                      activeNav === 'borrowers' ||
                      activeNav === 'admin_borrowers' ||
                      activeNav === 'borrower-detail' ||
                      activeNav === '/admin/borrowers' ||
                      currentPath === '/admin/borrowers'
                    ));
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id, item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{language === 'KH' ? item.khLabel : item.label}</span>
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
