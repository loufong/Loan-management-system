import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole, UserProfile } from '../../types';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  CreditCard,
  AlertTriangle,
  Layers,
  BarChart3,
  History,
  UserCircle,
  FilePlus,
  Receipt,
  Settings,
  ShieldAlert,
  ChevronLeft,
  LogOut,
  Building2,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: 'amber' | 'emerald' | 'rose' | 'blue' | 'indigo';
  allowedRoles: UserRole[];
  tooltip?: string;
}

export interface SidebarProps {
  currentUser: UserProfile;
  activeNavId: string;
  onNavigate: (navId: string) => void;
  onLogout?: () => void;
  branchName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  // Executive & Operational Management
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['MANAGER', 'LOAN_OFFICER', 'CASHIER']
  },

  // Borrower Self-Service Portal
  {
    id: 'borrower_portal',
    label: 'My 360° Profile',
    icon: UserCircle,
    allowedRoles: ['BORROWER']
  },
  {
    id: 'apply_loan',
    label: 'Apply for Loan',
    icon: FilePlus,
    allowedRoles: ['BORROWER']
  },
  {
    id: 'my_loans',
    label: 'My Active Loans',
    icon: Wallet,
    allowedRoles: ['BORROWER']
  },
  {
    id: 'my_repayments',
    label: 'Repayments & Receipts',
    icon: Receipt,
    allowedRoles: ['BORROWER']
  },

  // Staff / Loan Officers & Underwriters
  {
    id: 'borrowers',
    label: 'Borrowers Directory',
    icon: Users,
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'applications',
    label: 'Loan Applications',
    icon: FileText,
    badge: '7',
    badgeVariant: 'amber',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'credit_reviews',
    label: 'Credit Review Queue',
    icon: ShieldCheck,
    badge: '3',
    badgeVariant: 'amber',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'approvals',
    label: 'Approvals Queue',
    icon: CheckCircle2,
    badge: '2',
    badgeVariant: 'emerald',
    allowedRoles: ['MANAGER']
  },
  {
    id: 'loans',
    label: 'Core Banking Loans',
    icon: Wallet,
    allowedRoles: ['MANAGER', 'LOAN_OFFICER', 'CASHIER']
  },
  {
    id: 'cashier',
    label: 'Cashier Desk / POS',
    icon: CreditCard,
    allowedRoles: ['MANAGER', 'CASHIER']
  },
  {
    id: 'overdue',
    label: 'Overdue Watchlist',
    icon: AlertTriangle,
    badge: '1',
    badgeVariant: 'rose',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER', 'CASHIER']
  },
  {
    id: 'loan_products',
    label: 'Loan Products',
    icon: Layers,
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'reports',
    label: 'Reports & BI',
    icon: BarChart3,
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'audit_logs',
    label: 'System Audit Trail',
    icon: History,
    allowedRoles: ['MANAGER']
  },
  {
    id: 'user_management',
    label: 'User Roles & Access',
    icon: ShieldAlert,
    allowedRoles: ['MANAGER']
  },
  {
    id: 'system_config',
    label: 'System Settings',
    icon: Settings,
    allowedRoles: ['MANAGER']
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeNavId,
  onNavigate,
  onLogout,
  branchName = 'Phnom Penh Main Branch',
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}) => {
  // Support both internal and controlled collapse state
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  // Filter items matching active role
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  // Helper to determine if a nav item is active
  const isItemActive = (itemId: string) => {
    if (activeNavId === itemId) return true;
    if (itemId === 'borrowers' && activeNavId === 'borrower-detail') return true;
    if (itemId === 'applications' && activeNavId === 'new-application') return true;
    if (itemId === 'credit_reviews' && activeNavId === 'risk_assessment') return true;
    if (itemId === 'loans' && activeNavId === 'loan-detail') return true;
    if (itemId === 'cashier' && (activeNavId === 'cashier_desk' || activeNavId === 'disbursements' || activeNavId === 'receipts')) return true;
    if (itemId === 'borrower_portal' && activeNavId === 'borrower-detail') return true;
    if (itemId === 'apply_loan' && activeNavId === 'new-application') return true;
    if (itemId === 'my_loans' && (activeNavId === 'loans' || activeNavId === 'loan-detail')) return true;
    if (itemId === 'my_repayments' && activeNavId === 'cashier') return true;
    if (itemId === 'system_config' && activeNavId === 'system_config') return true;
    if (itemId === 'user_management' && activeNavId === 'user_management') return true;
    return false;
  };

  // Badge styles
  const getBadgeStyle = (variant?: 'amber' | 'emerald' | 'rose' | 'blue' | 'indigo') => {
    switch (variant) {
      case 'amber':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse';
      case 'blue':
      case 'indigo':
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen max-h-screen sticky top-0 shrink-0 flex flex-col bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] text-slate-300 border-r border-slate-800/80 z-30 select-none overflow-hidden shadow-2xl"
    >
      {/* 1. Header: Logo, Brand Title, Collapse Toggle */}
      <div className="shrink-0 flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          {/* Logo Image Slot with Fallback */}
          <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-[#0B132B] p-0.5 border border-blue-400/30 shadow-lg shadow-blue-500/20">
            <img
              src="/logo.png"
              alt="Apex LMS Logo"
              className="w-full h-full object-contain rounded-[10px]"
              onError={(e) => {
                // Graceful fallback to branded geometric emblem if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-black text-xs tracking-wider text-white select-none pointer-events-none">
              APX
            </div>
          </div>

          {/* Animated Brand Title */}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white tracking-tight truncate font-sans">
                    Apex Core Banking
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase font-mono truncate">
                  Institutional Terminal
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle button with rotate animation */}
        <motion.button
          onClick={handleToggle}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition focus:outline-none"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </div>

      {/* 2. Navigation Links List */}
      <nav
        aria-label="Sidebar Navigation"
        className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {visibleNavItems.map((item) => {
          const isActive = isItemActive(item.id);
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <motion.button
                onClick={() => onNavigate(item.id)}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all duration-200 group relative',
                  isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-blue-500/5 text-blue-400 border-l-2 border-blue-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-l-2 border-transparent'
                )}
              >
                <div className={cn('flex items-center gap-3 min-w-0', isCollapsed && 'justify-center')}>
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors duration-200',
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />

                  {!isCollapsed && (
                    <span className="truncate text-left font-sans tracking-tight">
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Counter Badges (Expanded Mode) */}
                {!isCollapsed && item.badge && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 border',
                      getBadgeStyle(item.badgeVariant)
                    )}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </motion.button>

              {/* Floating Tooltip when Collapsed */}
              {isCollapsed && hoveredItemId === item.id && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/80 whitespace-nowrap flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border',
                          getBadgeStyle(item.badgeVariant)
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 4. Footer User Profile Section */}
      <div className="shrink-0 p-3 border-t border-slate-800/80 bg-[#070B14]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar Circle */}
            <div className="relative w-8 h-8 rounded-full bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-slate-700/80 shadow-md">
              <span>{currentUser.name ? currentUser.name.charAt(0) : 'U'}</span>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#070B14]" />
            </div>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-xs font-semibold text-slate-200 truncate font-sans">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate font-mono uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {!isCollapsed && onLogout && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition focus:outline-none"
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};
