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
  ChevronLeft,
  LogOut,
  Bell,
  Calendar,
  Landmark
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
  isLogout?: boolean;
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

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// Enterprise Standardized Navigation Structure
export const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
    ]
  },
  {
    title: 'Loan Management',
    items: [
      { id: 'applications', label: 'Loan Applications', icon: FileText, badge: '7', badgeVariant: 'amber', allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'loans', label: 'Active Loans', icon: Wallet, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'loan_products', label: 'Loan Products', icon: Layers, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'disbursements', label: 'Disbursement', icon: Landmark, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
    ]
  },
  {
    title: 'Borrowers',
    items: [
      { id: 'borrowers', label: 'All Borrowers', icon: Users, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'borrower_portal', label: 'Borrower Profiles', icon: UserCircle, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'loan_history', label: 'Loan History', icon: History, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
    ]
  },
  {
    title: 'Payments',
    items: [
      { id: 'cashier', label: 'Payments', icon: CreditCard, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'payment_history', label: 'Payment History', icon: Receipt, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'repayment_schedule', label: 'Repayment Schedule', icon: Calendar, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'outstanding_balance', label: 'Outstanding Balance', icon: Wallet, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'overdue', label: 'Overdue Loans', icon: AlertTriangle, badge: '1', badgeVariant: 'rose', allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
    ]
  },
  {
    title: 'Governance & Insights',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'audit_logs', label: 'Audit Logs', icon: History, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
    ]
  },
  {
    title: 'Administration',
    items: [
      { id: 'user_management', label: 'Users', icon: Users, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
      { id: 'system_config', label: 'Settings', icon: Settings, allowedRoles: ['admin', 'ADMIN', 'MANAGER'] },
    ]
  }
];

export const USER_SECTIONS: NavSection[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['user', 'USER', 'BORROWER'] },
    ]
  },
  {
    title: 'Borrower Services',
    items: [
      { id: 'borrower_portal', label: 'My Profile', icon: UserCircle, allowedRoles: ['user', 'USER', 'BORROWER'] },
      { id: 'apply_loan', label: 'Apply for Loan', icon: FilePlus, allowedRoles: ['user', 'USER', 'BORROWER'] },
      { id: 'my_applications', label: 'My Applications', icon: FileText, allowedRoles: ['user', 'USER', 'BORROWER'] },
      { id: 'my_loans', label: 'My Loans', icon: Wallet, allowedRoles: ['user', 'USER', 'BORROWER'] },
      { id: 'repayment_schedule', label: 'Repayment Schedule', icon: Calendar, allowedRoles: ['user', 'USER', 'BORROWER'] },
      { id: 'my_repayments', label: 'Payments', icon: Receipt, allowedRoles: ['user', 'USER', 'BORROWER'] },
    ]
  },
  {
    title: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['user', 'USER', 'BORROWER'] },
      { id: 'system_config', label: 'Settings', icon: Settings, allowedRoles: ['user', 'USER', 'BORROWER'] },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeNavId,
  onNavigate,
  onLogout,
  branchName = 'Main Branch',
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}) => {
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

  const isAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'MANAGER';

  const visibleSections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;

  const isItemActive = (itemId: string) => {
    if (activeNavId === itemId) return true;
    if (itemId === 'borrowers' && activeNavId === 'borrower-detail') return true;
    if (itemId === 'applications' && (activeNavId === 'new-application' || activeNavId === 'my_applications' || activeNavId === 'credit_reviews' || activeNavId === 'risk_assessment' || activeNavId === 'approvals')) return true;
    if (itemId === 'loans' && (activeNavId === 'loan-detail' || activeNavId === 'loan_history' || activeNavId === 'outstanding_balance')) return true;
    if (itemId === 'disbursements' && activeNavId === 'cashier') return true;
    if (itemId === 'payment_history' && activeNavId === 'cashier') return true;
    if (itemId === 'repayment_schedule' && (activeNavId === 'loans' || activeNavId === 'loan-detail')) return true;
    if (itemId === 'borrower_portal' && activeNavId === 'borrower-detail') return true;
    if (itemId === 'apply_loan' && activeNavId === 'new-application') return true;
    if (itemId === 'my_applications' && activeNavId === 'applications') return true;
    if (itemId === 'my_loans' && (activeNavId === 'loans' || activeNavId === 'loan-detail')) return true;
    if (itemId === 'my_repayments' && activeNavId === 'cashier') return true;
    if (itemId === 'user_management' && activeNavId === 'user_management') return true;
    if (itemId === 'system_config' && activeNavId === 'system_config') return true;
    return false;
  };

  const getBadgeStyle = (variant?: 'amber' | 'emerald' | 'rose' | 'blue' | 'indigo') => {
    switch (variant) {
      case 'amber':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'blue':
      case 'indigo':
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 76 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen max-h-screen sticky top-0 shrink-0 flex flex-col bg-[#0F172A] text-slate-300 border-r border-slate-800 z-30 select-none overflow-hidden"
    >
      {/* 1. Header: Logo, Brand Title, Collapse Toggle */}
      <div className="shrink-0 flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-[#0F172A]">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div className="relative w-8 h-8 rounded-[6px] overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#2563EB] text-white font-bold text-xs">
            APX
          </div>

          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-[14px] font-bold text-white tracking-tight truncate font-sans">
                  APEX LMS
                </span>
                <span className="text-[11px] text-slate-400 font-medium tracking-normal truncate">
                  Enterprise Loan System
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleToggle}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent transition focus:outline-none"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* 2. Navigation Links List */}
      <nav
        aria-label="Sidebar Navigation"
        className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 space-y-3"
      >
        {visibleSections.map((section, sIdx) => (
          <div key={section.title || `sec-${sIdx}`} className="space-y-1">
            {!isCollapsed && section.title && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = isItemActive(item.id);
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <button
                    onClick={() => {
                      if (item.isLogout || item.id === 'logout') {
                        onLogout?.();
                      } else {
                        onNavigate(item.id);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-[6px] text-[13px] font-medium transition-colors group relative',
                      isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2',
                      isActive
                        ? 'bg-[#2563EB] text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <div className={cn('flex items-center gap-2.5 min-w-0', isCollapsed && 'justify-center')}>
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />

                      {!isCollapsed && (
                        <span className="truncate text-left font-sans">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-[4px] font-medium flex-shrink-0 border',
                          getBadgeStyle(item.badgeVariant)
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {/* Tooltip when Collapsed */}
                  {isCollapsed && hoveredItemId === item.id && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                      <div className="bg-[#0F172A] text-white text-xs font-medium px-2.5 py-1.5 rounded-[6px] shadow-md border border-slate-700 whitespace-nowrap flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-[4px] border', getBadgeStyle(item.badgeVariant))}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 3. Footer User Profile & Logout */}
      <div className="shrink-0 p-3 border-t border-slate-800 bg-[#0F172A]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[6px] bg-slate-800 text-slate-200 flex items-center justify-center font-semibold text-xs flex-shrink-0 border border-slate-700">
              {currentUser.name ? currentUser.name.charAt(0) : 'U'}
            </div>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-xs font-semibold text-white truncate font-sans">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate uppercase">
                    {currentUser.role}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isCollapsed && onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="p-1.5 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
