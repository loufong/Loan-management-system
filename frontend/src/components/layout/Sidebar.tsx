import React, { useState } from 'react';
import { UserRole, UserProfile } from '../../types';
import {
  LayoutDashboard,
  UserCircle,
  FilePlus,
  CreditCard,
  Receipt,
  Users,
  FileText,
  Sliders,
  ShieldCheck,
  Scale,
  Banknote,
  Send,
  Printer,
  CheckCircle2,
  Landmark,
  AlertTriangle,
  BarChart3,
  History,
  ShieldAlert,
  Settings,
  ChevronLeft,
  LogOut,
  Sparkles
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number | string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'indigo';
  allowedRoles: UserRole[];
}

export interface SidebarProps {
  currentUser: UserProfile;
  activeNavId: string;
  onNavigate: (navId: string) => void;
  onLogout?: () => void;
  branchName?: string;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  // Common / Management
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    icon: 'LayoutDashboard',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER', 'CASHIER']
  },
  // Borrower Specific
  {
    id: 'borrower_portal',
    label: 'My 360° Profile',
    icon: 'UserCircle',
    allowedRoles: ['BORROWER']
  },
  {
    id: 'apply_loan',
    label: 'Apply for Loan',
    icon: 'FilePlus',
    allowedRoles: ['BORROWER']
  },
  {
    id: 'my_loans',
    label: 'My Active Loans',
    icon: 'CreditCard',
    allowedRoles: ['BORROWER']
  },
  {
    id: 'my_repayments',
    label: 'Repayments & Receipts',
    icon: 'Receipt',
    allowedRoles: ['BORROWER']
  },
  // Staff / Loan Officers
  {
    id: 'borrowers',
    label: 'Borrowers Directory',
    icon: 'Users',
    badge: '142',
    badgeColor: 'indigo',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'applications',
    label: 'Loan Applications',
    icon: 'FileText',
    badge: '7',
    badgeColor: 'amber',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'loan_products',
    label: 'Loan Products',
    icon: 'Sliders',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  // Credit Underwriting Workbench
  {
    id: 'credit_reviews',
    label: 'Credit Review Queue',
    icon: 'ShieldCheck',
    badge: '3',
    badgeColor: 'amber',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'risk_assessment',
    label: 'DTI Risk Workbench',
    icon: 'Scale',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  // Cashier & Treasury Desk
  {
    id: 'cashier_desk',
    label: 'Cashier Terminal',
    icon: 'Banknote',
    allowedRoles: ['MANAGER', 'CASHIER']
  },

  {
    id: 'disbursements',
    label: 'Pending Disbursements',
    icon: 'Send',
    badge: '2',
    badgeColor: 'indigo',
    allowedRoles: ['MANAGER', 'CASHIER']
  },
  {
    id: 'receipts',
    label: 'Issued Receipts',
    icon: 'Printer',
    allowedRoles: ['MANAGER', 'CASHIER']
  },
  // Executive Committee / Management
  {
    id: 'approvals',
    label: 'Approvals Queue',
    icon: 'CheckCircle2',
    badge: '2',
    badgeColor: 'emerald',
    allowedRoles: ['MANAGER']
  },
  {
    id: 'loans',
    label: 'Core Banking Loans',
    icon: 'Landmark',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER', 'CASHIER']
  },
  {
    id: 'overdue',
    label: 'Overdue Watchlist',
    icon: 'AlertTriangle',
    badge: '1 Urgent',
    badgeColor: 'rose',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER', 'CASHIER']
  },
  {
    id: 'reports',
    label: 'Portfolio Reports & BI',
    icon: 'BarChart3',
    allowedRoles: ['MANAGER', 'LOAN_OFFICER']
  },
  {
    id: 'audit_logs',
    label: 'System Audit Trail',
    icon: 'History',
    allowedRoles: ['MANAGER']
  },
  // Administrator Management
  {
    id: 'user_management',
    label: 'User Management',
    icon: 'ShieldAlert',
    allowedRoles: ['MANAGER']
  },
  {
    id: 'system_config',
    label: 'System Settings',
    icon: 'Settings',
    allowedRoles: ['MANAGER']
  }
];

function renderNavIcon(iconName: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'LayoutDashboard': return <LayoutDashboard className={className} />;
    case 'UserCircle': return <UserCircle className={className} />;
    case 'FilePlus': return <FilePlus className={className} />;
    case 'CreditCard': return <CreditCard className={className} />;
    case 'Receipt': return <Receipt className={className} />;
    case 'Users': return <Users className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'Sliders': return <Sliders className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Scale': return <Scale className={className} />;
    case 'Banknote': return <Banknote className={className} />;
    case 'Send': return <Send className={className} />;
    case 'Printer': return <Printer className={className} />;
    case 'CheckCircle2': return <CheckCircle2 className={className} />;
    case 'Landmark': return <Landmark className={className} />;
    case 'AlertTriangle': return <AlertTriangle className={className} />;
    case 'BarChart3': return <BarChart3 className={className} />;
    case 'History': return <History className={className} />;
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    case 'Settings': return <Settings className={className} />;
    default: return <Sparkles className={className} />;
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeNavId,
  onNavigate,
  onLogout,
  branchName = 'Phnom Penh Main Branch'
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Filter navigation items strictly by active role
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  return (
    <aside
      className={`relative flex flex-col bg-gradient-to-b from-[#0F172A] to-[#090D1A] border-r border-slate-800/80 transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. Header Section with Minimalist Logo & Title */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 font-black text-xs tracking-wider border border-indigo-400/30">
            APX
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight leading-none truncate">
                Apex LMS
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1 truncate">
                Enterprise Core Banking
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition focus:outline-none"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-200 ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* 2. Branch Context Pill */}
      {!collapsed && (
        <div className="px-3.5 py-2.5 border-b border-slate-800/50 bg-slate-950/20">
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
              <span className="font-medium text-slate-300 truncate">{branchName}</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
      )}

      {/* 3. Navigation Links List */}
      <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {visibleNavItems.map((item) => {
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-white border border-indigo-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] shadow-indigo-500/20'
                  : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex-shrink-0 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {renderNavIcon(item.icon, 'w-4 h-4')}
                </span>

                {!collapsed && (
                  <span className="truncate text-left">{item.label}</span>
                )}
              </div>

              {/* Minimal Counter Badge */}
              {!collapsed && item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
                  isActive ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. Footer User Profile Section */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070B14]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-slate-700/60">
              {currentUser.name[0]}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-slate-200 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {currentUser.role}
                </span>
              </div>
            )}
          </div>

          {!collapsed && onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
