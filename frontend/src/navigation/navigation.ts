import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wallet,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Bell,
  ClipboardList,
  Settings,
  Calendar,
  User,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types';

export interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number | string;
  requiredRole?: UserRole | 'ANY';
  aliases?: string[];
}

export interface NavSectionConfig {
  sectionTitle?: string;
  items: NavItemConfig[];
}

// 1. ADMIN NAVIGATION STRUCTURE
export const ADMIN_SECTIONS: NavSectionConfig[] = [
  {
    // Top standalone item without section header
    items: [
      {
        id: 'admin_dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        icon: LayoutDashboard,
        requiredRole: 'ADMIN',
        aliases: ['/admin', '/admin/dashboard'],
      },
    ],
  },
  {
    sectionTitle: 'LOAN MANAGEMENT',
    items: [
      {
        id: 'admin_borrowers',
        label: 'Borrowers',
        path: '/admin/borrowers',
        icon: Users,
        requiredRole: 'ADMIN',
        aliases: ['/admin/borrowers', '/borrowers', 'borrowers', 'admin_borrowers'],
      },
      {
        id: 'admin_applications',
        label: 'Applications',
        path: '/admin/applications',
        icon: FileText,
        requiredRole: 'ADMIN',
        aliases: ['/admin/applications', '/admin/credit_reviews', '/admin/approvals'],
      },
      {
        id: 'admin_loans',
        label: 'Loans',
        path: '/admin/loans',
        icon: Wallet,
        requiredRole: 'ADMIN',
        aliases: ['/admin/loans', '/admin/disbursements'],
      },
      {
        id: 'admin_payments',
        label: 'Payments',
        path: '/admin/payments',
        icon: CreditCard,
        requiredRole: 'ADMIN',
        aliases: ['/admin/payments', '/admin/cashier'],
      },
      {
        id: 'admin_overdue',
        label: 'Overdue',
        path: '/admin/overdue',
        icon: AlertTriangle,
        requiredRole: 'ADMIN',
        aliases: ['/admin/overdue'],
      },
    ],
  },
  {
    sectionTitle: 'MANAGEMENT',
    items: [
      {
        id: 'admin_users',
        label: 'Users',
        path: '/admin/users',
        icon: Users,
        requiredRole: 'ADMIN',
        aliases: ['/admin/users'],
      },
      {
        id: 'admin_products',
        label: 'Loan Products',
        path: '/admin/products',
        icon: Package,
        requiredRole: 'ADMIN',
        aliases: ['/admin/products', '/admin/loan_products', '/admin/loan-products'],
      },
      {
        id: 'admin_reports',
        label: 'Reports',
        path: '/admin/reports',
        icon: BarChart3,
        requiredRole: 'ADMIN',
        aliases: ['/admin/reports'],
      },
    ],
  },
  {
    sectionTitle: 'SYSTEM',
    items: [
      {
        id: 'admin_notifications',
        label: 'Notifications',
        path: '/admin/notifications',
        icon: Bell,
        requiredRole: 'ADMIN',
        aliases: ['/admin/notifications'],
      },
      {
        id: 'admin_audit_logs',
        label: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: ClipboardList,
        requiredRole: 'ADMIN',
        aliases: ['/admin/audit-logs', '/admin/audit_logs'],
      },
      {
        id: 'admin_settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: Settings,
        requiredRole: 'ADMIN',
        aliases: ['/admin/settings'],
      },
    ],
  },
];

// 2. USER NAVIGATION STRUCTURE
export const USER_SECTIONS: NavSectionConfig[] = [
  {
    items: [
      {
        id: 'user_dashboard',
        label: 'Dashboard',
        path: '/portal',
        icon: LayoutDashboard,
        requiredRole: 'USER',
        aliases: ['/portal', '/dashboard', '/user/dashboard', '/my-loans', '/'],
      },
    ],
  },
  {
    sectionTitle: 'MY LOANS',
    items: [
      {
        id: 'user_applications',
        label: 'My Applications',
        path: '/applications',
        icon: FileText,
        requiredRole: 'USER',
        aliases: ['/applications', '/user/my_applications', '/user/applications', '/user/apply_loan'],
      },
      {
        id: 'user_loans',
        label: 'My Loans',
        path: '/loans',
        icon: Wallet,
        requiredRole: 'USER',
        aliases: ['/loans', '/user/my_loans', '/user/loans', '/my-loans'],
      },
      {
        id: 'user_repayments',
        label: 'Repayment Schedule',
        path: '/repayments',
        icon: Calendar,
        requiredRole: 'USER',
        aliases: ['/repayments', '/user/repayment_schedule', '/user/repayments'],
      },
      {
        id: 'user_payments',
        label: 'Payments',
        path: '/payments',
        icon: CreditCard,
        requiredRole: 'USER',
        aliases: ['/payments', '/user/payments', '/user/my_repayments'],
      },
    ],
  },
  {
    sectionTitle: 'ACCOUNT',
    items: [
      {
        id: 'user_notifications',
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        requiredRole: 'USER',
        aliases: ['/notifications', '/user/notifications'],
      },
      {
        id: 'user_profile',
        label: 'Profile',
        path: '/profile',
        icon: User,
        requiredRole: 'USER',
        aliases: ['/profile', '/user/profile'],
      },
      {
        id: 'user_settings',
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        requiredRole: 'USER',
        aliases: ['/settings', '/user/settings', '/settings/change-password', '/change-password'],
      },
    ],
  },
];

/**
 * Route Matcher: Determines if a NavItem matches the active path.
 * Checks both direct path prefixes and declared aliases.
 */
export function isRouteActive(item: NavItemConfig, currentPath: string): boolean {
  const normCurrent = currentPath.toLowerCase();
  const normPath = item.path.toLowerCase();

  // Exact match
  if (normCurrent === normPath) return true;

  // Root or dashboard match
  if ((normPath === '/dashboard' || normPath === '/admin/dashboard') && (normCurrent === '/' || normCurrent === '/app')) {
    return true;
  }

  // Check aliases
  if (item.aliases && item.aliases.some((alias) => normCurrent === alias.toLowerCase())) {
    return true;
  }

  // Prefix matching for sub-resources (e.g. /admin/loans/LN-2026-0042)
  if (normPath !== '/' && normPath !== '/dashboard' && normPath !== '/admin/dashboard') {
    if (normCurrent.startsWith(normPath + '/')) {
      return true;
    }
  }

  return false;
}
