import React from 'react';
import { UserProfile } from '../../types';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Wallet,
  DollarSign,
  AlertTriangle,
  Bell,
  BarChart3,
  FileCheck,
  Settings,
  LogOut,
  Calendar,
  User,
  Landmark
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
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

// ADMIN Navigation Items
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'user_management', label: 'Users', icon: Users },
  { id: 'loan_products', label: 'Loan Products', icon: CreditCard },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'loans', label: 'Loans', icon: Wallet },
  { id: 'cashier', label: 'Payments', icon: DollarSign },
  { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'audit_logs', label: 'Audit Logs', icon: FileCheck },
];

export const ADMIN_BOTTOM_ITEMS: NavItem[] = [
  { id: 'system_config', label: 'Settings', icon: Settings },
  { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true },
];

// USER Navigation Items
export const USER_NAV_ITEMS: NavItem[] = [
  { id: 'user_dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my_applications', label: 'My Applications', icon: FileText },
  { id: 'my_loans', label: 'My Loans', icon: Wallet },
  { id: 'my_repayments', label: 'Payments', icon: DollarSign },
  { id: 'repayment_schedule', label: 'Repayment Schedule', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'borrower_portal', label: 'Profile', icon: User },
];

export const USER_BOTTOM_ITEMS: NavItem[] = [
  { id: 'logout', label: 'Logout', icon: LogOut, isLogout: true },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeNavId,
  onNavigate,
  onLogout,
}) => {
  const role = (currentUser.role || 'USER').toUpperCase();
  const isAdmin = role === 'ADMIN';

  const mainNavItems = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
  const bottomNavItems = isAdmin ? ADMIN_BOTTOM_ITEMS : USER_BOTTOM_ITEMS;

  const isItemActive = (itemId: string) => {
    if (activeNavId === itemId) return true;
    if (itemId === 'dashboard' && (activeNavId === 'dashboard' || activeNavId === 'admin_dashboard')) return true;
    if (itemId === 'user_dashboard' && (activeNavId === 'user_dashboard' || activeNavId === 'dashboard')) return true;
    if (itemId === 'user_management' && (activeNavId === 'user_management' || activeNavId === 'users')) return true;
    if (itemId === 'applications' && (activeNavId === 'applications' || activeNavId === 'new-application' || activeNavId === 'credit_reviews' || activeNavId === 'approvals')) return true;
    if (itemId === 'loans' && (activeNavId === 'loans' || activeNavId === 'disbursements' || activeNavId === 'loan-detail')) return true;
    if (itemId === 'cashier' && (activeNavId === 'cashier' || activeNavId === 'payments')) return true;
    if (itemId === 'my_applications' && (activeNavId === 'my_applications' || activeNavId === 'new-application')) return true;
    if (itemId === 'my_loans' && (activeNavId === 'my_loans' || activeNavId === 'loan-detail')) return true;
    if (itemId === 'my_repayments' && activeNavId === 'my_repayments') return true;
    if (itemId === 'borrower_portal' && (activeNavId === 'borrower_portal' || activeNavId === 'profile' || activeNavId === 'borrower-detail')) return true;
    if (itemId === 'system_config' && (activeNavId === 'system_config' || activeNavId === 'settings')) return true;
    return false;
  };

  const handleItemClick = (item: NavItem) => {
    if (item.isLogout || item.id === 'logout') {
      onLogout?.();
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <aside
      aria-label="Sidebar"
      className="w-64 h-full bg-white border-r border-[#E2E8F0] flex flex-col justify-between select-none"
    >
      {/* 1. Header: Logo & System Name */}
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#E2E8F0]">
          <div className="w-9 h-9 rounded-[6px] bg-[#2563EB] text-white flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-[#0F172A] tracking-tight truncate">
              Apex LMS
            </span>
            <span className="text-[11px] font-medium text-[#64748B] truncate">
              Loan Management
            </span>
          </div>
        </div>

        {/* 2. Main Navigation List */}
        <nav aria-label="Main Navigation" className="p-3 space-y-1">
          {mainNavItems.map((item) => {
            const active = isItemActive(item.id);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[14px] transition-colors text-left',
                  active
                    ? 'bg-blue-50 text-[#2563EB] font-medium'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 font-normal'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px] shrink-0',
                    active ? 'text-[#2563EB]' : 'text-[#64748B]'
                  )}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-[4px] bg-blue-100 text-[#2563EB] font-medium">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Navigation & User Profile */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-2">
        <div className="space-y-1">
          {bottomNavItems.map((item) => {
            const active = isItemActive(item.id);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[14px] transition-colors text-left',
                  item.isLogout
                    ? 'text-[#DC2626] hover:bg-rose-50 font-normal'
                    : active
                    ? 'bg-blue-50 text-[#2563EB] font-medium'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 font-normal'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px] shrink-0',
                    item.isLogout ? 'text-[#DC2626]' : active ? 'text-[#2563EB]' : 'text-[#64748B]'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current User Badge Card */}
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#0F172A] flex items-center justify-center font-bold text-xs shrink-0 border border-[#E2E8F0]">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-medium text-[#0F172A] truncate">
              {currentUser.name || 'User'}
            </span>
            <span className="text-[11px] text-[#64748B] truncate">
              {isAdmin ? 'Administrator' : 'Standard User'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
