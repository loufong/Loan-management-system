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
  Layers,
  BarChart3,
  UserCircle,
  Receipt,
  Settings,
  ChevronLeft,
  LogOut,
  Bell,
  Calendar,
  Landmark,
  Clock
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

// Enterprise Standardized Navigation Structure matching exact user requirements
export const ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Core Banking',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    title: 'Loan Management',
    items: [
      { id: 'applications', label: 'Loan Applications', icon: FileText, allowedRoles: ['ADMIN'] },
      { id: 'credit_reviews', label: 'Underwriting Queue', icon: CheckCircle2, allowedRoles: ['ADMIN'] },
      { id: 'approvals', label: 'Approvals Queue', icon: ShieldCheck, allowedRoles: ['ADMIN'] },
      { id: 'loans', label: 'Active Facilities', icon: Wallet, allowedRoles: ['ADMIN'] },
      { id: 'repayment_schedule', label: 'Repayments', icon: Calendar, allowedRoles: ['ADMIN'] },
      { id: 'overdue', label: 'Overdue Delinquencies', icon: Clock, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    title: 'Operations & Cashier',
    items: [
      { id: 'borrowers', label: 'Borrowers Directory', icon: Users, allowedRoles: ['ADMIN'] },
      { id: 'loan_products', label: 'Loan Products', icon: Layers, allowedRoles: ['ADMIN'] },
      { id: 'disbursements', label: 'Loan Disbursements', icon: Landmark, allowedRoles: ['ADMIN'] },
      { id: 'cashier', label: 'Cashier Terminal', icon: CreditCard, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    title: 'Compliance & Reports',
    items: [
      { id: 'reports', label: 'Portfolio Reports', icon: BarChart3, allowedRoles: ['ADMIN'] },
      { id: 'audit_logs', label: 'Audit Trail Ledger', icon: FileText, allowedRoles: ['ADMIN'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['ADMIN'] },
    ]
  },
  {
    title: 'Administration',
    items: [
      { id: 'user_management', label: 'Users & Roles', icon: Users, allowedRoles: ['ADMIN'] },
      { id: 'system_config', label: 'System Settings', icon: Settings, allowedRoles: ['ADMIN'] },
      { id: 'change_password', label: 'Change Password', icon: ShieldCheck, allowedRoles: ['ADMIN'] },
      { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true, allowedRoles: ['ADMIN'] },
    ]
  }
];

export const MANAGER_SECTIONS: NavSection[] = [
  {
    title: 'Management',
    items: [
      { id: 'dashboard', label: 'Manager Dashboard', icon: LayoutDashboard, allowedRoles: ['MANAGER'] },
      { id: 'approvals', label: 'Approvals Queue', icon: ShieldCheck, allowedRoles: ['MANAGER'] },
      { id: 'applications', label: 'Loan Applications', icon: FileText, allowedRoles: ['MANAGER'] },
    ]
  },
  {
    title: 'Portfolio & Facilities',
    items: [
      { id: 'loans', label: 'Active Loans', icon: Wallet, allowedRoles: ['MANAGER'] },
      { id: 'disbursements', label: 'Disbursements', icon: Landmark, allowedRoles: ['MANAGER'] },
      { id: 'overdue', label: 'Overdue Delinquencies', icon: Clock, allowedRoles: ['MANAGER'] },
      { id: 'borrowers', label: 'Borrowers Directory', icon: Users, allowedRoles: ['MANAGER'] },
      { id: 'loan_products', label: 'Loan Products', icon: Layers, allowedRoles: ['MANAGER'] },
    ]
  },
  {
    title: 'Intelligence & Compliance',
    items: [
      { id: 'reports', label: 'Portfolio Reports', icon: BarChart3, allowedRoles: ['MANAGER'] },
      { id: 'audit_logs', label: 'Audit Trail Ledger', icon: FileText, allowedRoles: ['MANAGER'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['MANAGER'] },
      { id: 'system_config', label: 'Settings', icon: Settings, allowedRoles: ['MANAGER'] },
      { id: 'change_password', label: 'Change Password', icon: ShieldCheck, allowedRoles: ['MANAGER'] },
      { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true, allowedRoles: ['MANAGER'] },
    ]
  }
];

export const LOAN_OFFICER_SECTIONS: NavSection[] = [
  {
    title: 'Underwriting Desk',
    items: [
      { id: 'dashboard', label: 'Officer Dashboard', icon: LayoutDashboard, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'applications', label: 'Loan Applications', icon: FileText, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'credit_reviews', label: 'Credit Review Queue', icon: CheckCircle2, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'borrowers', label: 'Borrowers Directory', icon: Users, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'loan_products', label: 'Loan Products', icon: Layers, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'loans', label: 'Active Facilities', icon: Wallet, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'change_password', label: 'Change Password', icon: ShieldCheck, allowedRoles: ['LOAN_OFFICER'] },
      { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true, allowedRoles: ['LOAN_OFFICER'] },
    ]
  }
];

export const CREDIT_OFFICER_SECTIONS: NavSection[] = [
  {
    title: 'Credit Risk Analysis',
    items: [
      { id: 'dashboard', label: 'Credit Dashboard', icon: LayoutDashboard, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'credit_reviews', label: 'Review Queue', icon: CheckCircle2, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'risk_assessment', label: 'DTI Risk Workbench', icon: ShieldCheck, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'applications', label: 'Loan Applications', icon: FileText, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'borrowers', label: 'Borrowers Directory', icon: Users, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'change_password', label: 'Change Password', icon: ShieldCheck, allowedRoles: ['CREDIT_OFFICER'] },
      { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true, allowedRoles: ['CREDIT_OFFICER'] },
    ]
  }
];

export const CASHIER_SECTIONS: NavSection[] = [
  {
    title: 'Treasury & Cashier',
    items: [
      { id: 'dashboard', label: 'Cashier Dashboard', icon: LayoutDashboard, allowedRoles: ['CASHIER'] },
      { id: 'cashier', label: 'Payment Terminal', icon: CreditCard, allowedRoles: ['CASHIER'] },
      { id: 'disbursements', label: 'Execute Disbursements', icon: Landmark, allowedRoles: ['CASHIER'] },
      { id: 'loans', label: 'Repayment Schedules', icon: Calendar, allowedRoles: ['CASHIER'] },
      { id: 'overdue', label: 'Overdue Delinquencies', icon: Clock, allowedRoles: ['CASHIER'] },
      { id: 'reports', label: 'Collection Reports', icon: BarChart3, allowedRoles: ['CASHIER'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['CASHIER'] },
      { id: 'change_password', label: 'Change Password', icon: ShieldCheck, allowedRoles: ['CASHIER'] },
      { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true, allowedRoles: ['CASHIER'] },
    ]
  }
];

export const USER_SECTIONS: NavSection[] = [
  {
    title: 'Borrower Portal',
    items: [
      { id: 'user_dashboard', label: 'My Dashboard', icon: LayoutDashboard, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'borrower_portal', label: 'My Profile & KYC', icon: UserCircle, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'apply_loan', label: 'Apply for Loan', icon: FileText, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'my_applications', label: 'My Applications', icon: Layers, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'my_loans', label: 'My Active Loans', icon: Wallet, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'repayment_schedule', label: 'Repayment Schedule', icon: Calendar, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'my_repayments', label: 'Make Payment', icon: Receipt, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'change_password', label: 'Change Password', icon: ShieldCheck, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowedRoles: ['BORROWER', 'USER', 'user'] },
      { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true, allowedRoles: ['BORROWER', 'USER', 'user'] },
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

  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const role = (currentUser.role || '').toUpperCase();
  const visibleSections =
    role === 'ADMIN' ? ADMIN_SECTIONS :
    role === 'MANAGER' ? MANAGER_SECTIONS :
    role === 'LOAN_OFFICER' ? LOAN_OFFICER_SECTIONS :
    role === 'CREDIT_OFFICER' ? CREDIT_OFFICER_SECTIONS :
    role === 'CASHIER' ? CASHIER_SECTIONS :
    USER_SECTIONS;

  const isItemActive = (itemId: string) => {
    if (activeNavId === itemId) return true;
    if (itemId === 'dashboard' && activeNavId === 'dashboard') return true;
    if (itemId === 'user_dashboard' && (activeNavId === 'user_dashboard' || activeNavId === 'dashboard')) return true;
    if (itemId === 'user_management' && (activeNavId === 'user_management' || activeNavId === 'users')) return true;
    if (itemId === 'roles_permissions' && activeNavId === 'roles_permissions') return true;
    if (itemId === 'borrowers' && (activeNavId === 'borrowers' || activeNavId === 'borrower-detail')) return true;
    if (itemId === 'loan_products' && activeNavId === 'loan_products') return true;
    if (itemId === 'applications' && (activeNavId === 'applications' || activeNavId === 'new-application')) return true;
    if (itemId === 'credit_reviews' && activeNavId === 'credit_reviews') return true;
    if (itemId === 'approvals' && activeNavId === 'approvals') return true;
    if (itemId === 'disbursements' && (activeNavId === 'disbursements' || activeNavId === 'cashier')) return true;
    if (itemId === 'repayment_schedule' && (activeNavId === 'repayment_schedule' || activeNavId === 'loans')) return true;
    if (itemId === 'cashier' && activeNavId === 'cashier') return true;
    if (itemId === 'reports' && activeNavId === 'reports') return true;
    if (itemId === 'notifications' && activeNavId === 'notifications') return true;
    if (itemId === 'system_config' && (activeNavId === 'system_config' || activeNavId === 'settings')) return true;
    if (itemId === 'profile' && activeNavId === 'profile') return true;
    if (itemId === 'borrower_portal' && (activeNavId === 'borrower_portal' || activeNavId === 'borrower-detail')) return true;
    if (itemId === 'my_applications' && (activeNavId === 'my_applications' || activeNavId === 'applications')) return true;
    if (itemId === 'change_password' && activeNavId === 'change_password') return true;
    if (itemId === 'my_loans' && (activeNavId === 'my_loans' || activeNavId === 'loans' || activeNavId === 'loan-detail')) return true;
    if (itemId === 'my_repayments' && (activeNavId === 'my_repayments' || activeNavId === 'cashier')) return true;
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
                    {currentUser.role?.toUpperCase() || 'BORROWER'}
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
              className="p-1.5 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
