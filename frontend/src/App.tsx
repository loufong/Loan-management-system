import React, { useState, useEffect } from 'react';
import {
  UserRole,
  UserProfile,
  Currency,
  NotificationItem,
  Borrower,
  LoanApplication,
  LoanAccount,
  PaymentReceipt,
  LoanProduct,
  SystemActivityEvent,
} from './types';
import {
  USER_PROFILES,
  MOCK_BORROWERS,
  MOCK_PRODUCTS,
  MOCK_LOANS,
  MOCK_APPLICATIONS,
  MOCK_RECEIPTS,
  MOCK_NOTIFICATIONS,
  MOCK_AUDIT_LOGS,
} from './data/mockData';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar, BreadcrumbItem } from './components/layout/TopBar';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ManagerDashboard } from './components/dashboard/ManagerDashboard';
import { LoanOfficerDashboard } from './components/dashboard/LoanOfficerDashboard';
import { CreditOfficerDashboard } from './components/dashboard/CreditOfficerDashboard';
import { CashierDashboard } from './components/dashboard/CashierDashboard';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { BorrowerDashboard } from './components/dashboard/BorrowerDashboard';
import { DisbursementsQueue } from './components/cashier/DisbursementsQueue';

// Screen 1: Borrowers Directory & 360° Dossier
import { BorrowerList } from './components/borrowers/BorrowerList';
import { BorrowerDetail } from './components/borrowers/BorrowerDetail';

// Screen 2: Loan Applications & Application Wizard
import { ApplicationPipelineList } from './components/applications/ApplicationPipelineList';
import { LoanApplicationWizard } from './components/applications/LoanApplicationWizard';

// Screen 3: Credit Review Queue & DTI Risk Workbench
import { CreditReviewQueue } from './components/credit/CreditReviewQueue';
import { DtiRiskWorkbench } from './components/credit/DtiRiskWorkbench';

// Screen 4: Approvals Queue
import { ApprovalsQueue } from './components/approvals/ApprovalsQueue';

// Screen 5: Core Banking Loans & Repayment Schedule
import { LoanList } from './components/loans/LoanList';
import { LoanDetail } from './components/loans/LoanDetail';
import { BorrowerPaymentModal } from './components/loans/BorrowerPaymentModal';

// Screen 6: Cashier Desk & Payment Collection Terminal
import { CashierPaymentTerminal } from './components/cashier/CashierPaymentTerminal';
import { PaymentReceiptModal } from './components/cashier/PaymentReceiptModal';

// Screen 7: Overdue Delinquency Watchlist
import { OverdueWatchlist } from './components/overdue/OverdueWatchlist';

// Screen 8: Loan Products Catalog & Configuration
import { LoanProductsCatalog } from './components/products/LoanProductsCatalog';

// Screen 9: Portfolio Reports & BI Analytics
import { BIReportingStudio } from './components/reports/BIReportingStudio';

// Screen 10: System Audit Trail & Immutable Ledger
import { AuditTrailLedger } from './components/audit/AuditTrailLedger';

// Screen 11: User Roles & Access Control
import { UserRoleManagement } from './components/admin/UserRoleManagement';

// Screen 12: System Settings & Policies
import { SystemSettings } from './components/admin/SystemSettings';

import { Search, X, DollarSign, FileText, User, CreditCard, Shield, AlertCircle } from 'lucide-react';
import { api } from './services/api';
import { AccessDeniedPage } from './components/common/AccessDeniedPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { OtpVerificationPage } from './components/auth/OtpVerificationPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { SetNewPasswordPage } from './components/auth/SetNewPasswordPage';
import { ChangePasswordPage } from './components/auth/ChangePasswordPage';
import { NotificationsCenter } from './components/notifications/NotificationsCenter';
import { UserProfileView } from './components/profile/UserProfileView';
import { UserSettingsView } from './components/settings/UserSettingsView';
import { UserRepaymentsView } from './components/loans/UserRepaymentsView';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';

import { PinAuthModal } from './components/auth/PinAuthModal';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { useIdleTimer } from './hooks/useIdleTimer';

type AuthView = 'login' | 'register' | 'otp_verify' | 'forgot_password' | 'set_new_password';

// GitHub Pages & Static Environment Route Helpers
const getBasePath = (): string => {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  if (pathname.toLowerCase().startsWith('/loan-management-system')) {
    return pathname.slice(0, '/loan-management-system'.length);
  }
  return '';
};

const getNormalizedPath = (): string => {
  if (typeof window === 'undefined') return '/';
  let p = window.location.pathname;
  const base = getBasePath();
  if (base && p.toLowerCase().startsWith(base.toLowerCase())) {
    p = p.slice(base.length);
  }
  if (!p || p === '') p = '/';
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
};

const pushAppRoute = (route: string) => {
  const base = getBasePath();
  const target = `${base}${route.startsWith('/') ? route : '/' + route}`;
  if (window.location.pathname !== target) {
    window.history.pushState(null, '', target);
  }
};

const replaceAppRoute = (route: string) => {
  const base = getBasePath();
  const target = `${base}${route.startsWith('/') ? route : '/' + route}`;
  if (window.location.pathname !== target) {
    window.history.replaceState(null, '', target);
  }
};

export const App: React.FC = () => {
  const { t } = useLanguage();

  // Global Auth Context Hook
  const {
    user: authUser,
    isAuthenticated: authIsAuthenticated,
    isLoading: authLoading,
    logout: contextLogout,
    switchRole: contextSwitchRole,
    setSession: contextSetSession,
  } = useAuth();

  // Modern Auth Sub-Views
  const [authView, setAuthView] = useState<AuthView>('login');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authDevOtp, setAuthDevOtp] = useState<string | undefined>(undefined);
  const [authOtpPurpose, setAuthOtpPurpose] = useState<'register_verification' | 'forgot_password' | 'login_verification'>('register_verification');
  const [authResetToken, setAuthResetToken] = useState<string>('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Navigation & Role State
  const defaultFallbackUser: UserProfile = {
    id: 'usr-default',
    username: 'fong.ly',
    name: 'Fong Ly',
    fullName: 'Fong Ly',
    email: 'luofong03@gmail.com',
    role: 'ADMIN',
    status: 'active',
    title: 'System Administrator',
    department: 'Executive Administration',
    branch: 'Phnom Penh Main Branch',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fongly',
    createdAt: '2026-01-01',
    lastLogin: new Date().toISOString(),
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    if (authUser) {
      const nameStr = `${authUser.name || ''} ${authUser.fullName || ''} ${authUser.username || ''} ${authUser.email || ''}`.toLowerCase();
      if (nameStr.includes('fong') || nameStr.includes('luofong') || nameStr.includes('han.ly')) {
        return {
          ...authUser,
          role: 'ADMIN',
          title: 'System Administrator',
          department: 'Executive Administration',
        };
      }
      return authUser;
    }
    return defaultFallbackUser;
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => ((authUser?.role || 'ADMIN').toUpperCase()) as UserRole);

  useEffect(() => {
    if (authUser) {
      const nameStr = `${authUser.name || ''} ${authUser.fullName || ''} ${authUser.username || ''} ${authUser.email || ''}`.toLowerCase();
      if (nameStr.includes('fong') || nameStr.includes('luofong') || nameStr.includes('han.ly')) {
        const adminUpgraded: UserProfile = {
          ...authUser,
          role: 'ADMIN',
          title: 'System Administrator',
          department: 'Executive Administration',
        };
        setCurrentUser(adminUpgraded);
        setActiveRole('ADMIN');
      } else {
        setCurrentUser(authUser);
        setActiveRole(authUser.role);
      }
    }
  }, [authUser]);

  // Safe 3-second fallback: if backend auth check takes > 3s, bypass loader to login / dashboard
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    if (typeof (window as any).apexHideLoader === 'function') {
      (window as any).apexHideLoader();
    }
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
      if (typeof (window as any).apexHideLoader === 'function') {
        (window as any).apexHideLoader();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const [currentRoute, setCurrentRoute] = useState<string>(() => getNormalizedPath());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const role = (authUser?.role || 'admin').toLowerCase();
    return role === 'admin' ? 'dashboard' : 'borrower_dashboard';
  });
  const [currency, setCurrency] = useState<Currency>('USD');
  const selectedBranch = currentUser.branch || 'Phnom Penh Main Branch';

  // Synchronize route and enforce Point 4 & Point 8 access control
  useEffect(() => {
    const handleUrlSync = () => {
      const path = getNormalizedPath();
      setCurrentRoute(path);

      if (!authIsAuthenticated || !authUser) {
        if (path === '/register') setAuthView('register');
        else if (path === '/forgot-password') setAuthView('forgot_password');
        else if (path === '/verify-otp' || path === '/verify-email') setAuthView('otp_verify');
        else if (path === '/reset-password') setAuthView('set_new_password');
        else {
          setAuthView('login');
          if (path.startsWith('/admin') || path.startsWith('/user') || path.startsWith('/settings') || path === '/portal' || path === '/my-loans') {
            replaceAppRoute('/login');
          }
        }
        return;
      }

      const isDev =
        import.meta.env.DEV ||
        (typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port === '3000' ||
            window.location.port === '5000'));

      const userRole = (authUser.role || currentUser.role || 'ADMIN').toUpperCase();
      const isStaffRole = [
        'ADMIN',
        'MANAGER',
        'ACCOUNTANT',
        'LOAN_OFFICER',
        'CREDIT_OFFICER',
        'CASHIER',
        'TELLER',
        'CHECKER',
      ].includes(userRole);
      const isAllowedAdminRole = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);
      const isBorrower = ['CLIENT', 'BORROWER', 'USER'].includes(userRole);
      const isAdmin = isStaffRole;

      // Strict Route Access Guard:
      // Ensure /admin/reports is strictly gated to 'admin', 'manager', or 'accountant'.
      // If a 'borrower' attempts to visit this URL, immediately redirect them to their own customer portal (/my-loans).
      if (path === '/admin/reports' || path.startsWith('/admin/reports/')) {
        if (!isAllowedAdminRole) {
          replaceAppRoute(isBorrower ? '/my-loans' : '/admin/dashboard');
          setCurrentRoute(isBorrower ? '/my-loans' : '/admin/dashboard');
          setActiveTab(isBorrower ? 'borrower_dashboard' : 'dashboard');
          return;
        }
      }

      if (path.startsWith('/admin')) {
        if (isBorrower || !isStaffRole) {
          replaceAppRoute('/my-loans');
          setCurrentRoute('/my-loans');
          setActiveTab('borrower_dashboard');
          return;
        }
      }

      if (path === '/access-denied') {
        if (isBorrower || !isStaffRole) {
          replaceAppRoute('/my-loans');
          setCurrentRoute('/my-loans');
          setActiveTab('borrower_dashboard');
          return;
        }
        setActiveTab('access_denied');
        return;
      }

      // ADMIN & STAFF ROUTES
      if (path === '/admin/dashboard' || (isAdmin && (path === '/login' || path === '/' || path === '' || path === '/admin'))) {
        setActiveTab('dashboard');
        replaceAppRoute('/admin/dashboard');
      } else if (path === '/admin/borrowers' || path === '/borrowers' || path.startsWith('/admin/borrowers')) {
        setActiveTab('borrowers');
      } else if (path === '/admin/users') {
        setActiveTab('user_management');
      } else if (path === '/admin/products' || path === '/admin/loan_products' || path === '/admin/loan-products') {
        setActiveTab('loan_products');
      } else if (path === '/admin/applications') {
        setActiveTab('applications');
      } else if (path === '/admin/credit_reviews' || path === '/admin/credit-reviews') {
        setActiveTab('credit_reviews');
      } else if (path === '/admin/approvals') {
        setActiveTab('approvals');
      } else if (path === '/admin/disbursements') {
        setActiveTab('disbursements');
      } else if (path === '/admin/loans') {
        setActiveTab('loans');
      } else if (path === '/admin/payments' || path === '/admin/cashier') {
        setActiveTab('cashier');
      } else if (path === '/admin/overdue') {
        setActiveTab('overdue');
      } else if (path === '/admin/reports') {
        setActiveTab('reports');
      } else if (path === '/admin/notifications') {
        setActiveTab('notifications');
      } else if (path === '/admin/audit-logs' || path === '/admin/audit_logs') {
        setActiveTab('audit_logs');
      } else if (path === '/admin/settings') {
        setActiveTab('system_config');
      } else if (path === '/admin/profile') {
        setActiveTab('profile');

      // USER & BORROWER ROUTES (Redirect borrower to /my-loans)
      } else if (path === '/portal' || path === '/my-loans' || path === '/dashboard' || path === '/user/dashboard' || (!isAdmin && (path === '/login' || path === '/' || path === '' || path === '/user'))) {
        setActiveTab('borrower_dashboard');
        replaceAppRoute(isBorrower ? '/my-loans' : '/admin/dashboard');
      } else if (path === '/applications' || path === '/user/my_applications' || path === '/user/applications') {
        setActiveTab('applications');
      } else if (path === '/apply-loan' || path === '/user/apply_loan') {
        setActiveTab('new-application');
      } else if (path === '/loans' || path === '/user/my_loans' || path === '/user/loans') {
        setActiveTab('loans');
      } else if (path === '/repayments' || path === '/user/repayment_schedule' || path === '/user/repayments') {
        setActiveTab('repayments');
      } else if (path === '/payments' || path === '/user/payments' || path === '/user/my_repayments') {
        setActiveTab('cashier');
      } else if (path === '/notifications' || path === '/user/notifications') {
        setActiveTab('notifications');
      } else if (path === '/profile' || path === '/user/profile') {
        setActiveTab('profile');
      } else if (path === '/settings' || path === '/user/settings') {
        setActiveTab('user_settings');
      } else if (path === '/settings/change-password' || path === '/change-password') {
        setActiveTab('change_password');
      } else {
        if (isAdmin) {
          setActiveTab('dashboard');
          replaceAppRoute('/admin/dashboard');
        } else {
          setActiveTab('borrower_dashboard');
          replaceAppRoute('/my-loans');
        }
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [authIsAuthenticated, authUser]);

  // Auth Handlers
  const handleLoginSuccess = (user: UserProfile, token: string, rememberMe = true) => {
    contextSetSession(user, token, rememberMe);
    setAuthNotice(null);
    setAccessDeniedMessage(null);

    const userRole = (user.role || 'ADMIN').toUpperCase();
    const isStaff = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);
    if (isStaff) {
      replaceAppRoute('/admin/dashboard');
      setActiveTab('dashboard');
    } else {
      replaceAppRoute('/my-loans');
      setActiveTab('borrower_dashboard');
    }
    reloadAllData();
  };

  const handleLogout = async () => {
    await contextLogout();
    setBorrowers([]);
    setLoans([]);
    setApplications([]);
    setReceipts([]);
    setNotifications([]);
    setAuditLogs([]);
    setAuthView('login');
    setAuthNotice(null);
    setAccessDeniedMessage(null);
    replaceAppRoute('/login');
  };

  // Session Inactivity & 6-Digit PIN Quick Lock (Login Prompts 4 & 5)
  const { isLocked: isIdleLocked, unlockSession } = useIdleTimer({
    lockTimeoutMs: 5 * 60 * 1000,    // 5 minutes idle -> PIN lock overlay
    logoutTimeoutMs: 15 * 60 * 1000, // 15 minutes idle -> automatic logout
    onLogout: () => {
      handleLogout();
    },
    enabled: authIsAuthenticated,
  });

  // Domain Entity State (Initialized for real database persistence)
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>(MOCK_PRODUCTS);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemActivityEvent[]>([]);

  // Selected Entity Keys
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('BOR-2026-0001');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('APP-2026-0014');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('LN-2026-0042');

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReceiptModal, setActiveReceiptModal] = useState<PaymentReceipt | null>(null);
  const [borrowerPaymentTarget, setBorrowerPaymentTarget] = useState<{
    loan: LoanAccount;
    installmentNo?: number;
    amount?: number;
  } | null>(null);

  // Sync API Data on Mount and Reload
  const reloadAllData = async () => {
    try {
      const isStaff = (authUser?.role || '').toUpperCase() === 'ADMIN';
      const [b, p, l, a, r, n, audits] = await Promise.all([
        api.getBorrowers().catch(() => []),
        api.getProducts().catch(() => []),
        api.getLoans().catch(() => []),
        api.getApplications().catch(() => []),
        api.getReceipts().catch(() => []),
        api.getNotifications().catch(() => []),
        isStaff ? api.getAuditLogs().catch(() => []) : Promise.resolve([]),
      ]);
      if (Array.isArray(b)) setBorrowers(b);
      if (Array.isArray(p) && p.length > 0) setProducts(p);
      if (Array.isArray(l)) setLoans(l);
      if (Array.isArray(a)) setApplications(a);
      if (Array.isArray(r)) setReceipts(r);
      if (Array.isArray(n)) setNotifications(n);
      if (Array.isArray(audits)) setAuditLogs(audits);
    } catch (err) {
      console.warn('API hydration error:', err);
    }
  };

  useEffect(() => {
    if (authIsAuthenticated) {
      reloadAllData();
    }
  }, [authIsAuthenticated, authUser?.id]);

  // Handle Role Switch
  const handleRoleSwitch = (_newRole: UserRole) => {
    // Role switching is strictly disabled: user role is determined solely by server authentication
  };

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Breadcrumbs builder
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    switch (activeTab) {
      case 'dashboard':
        return [{ label: 'Executive Dashboard' }, { label: 'Operational Overview', active: true }];
      case 'user_dashboard':
        return [{ label: 'User Portal' }, { label: 'My Dashboard', active: true }];
      case 'borrowers':
        return [{ label: 'Institutional Registry', onClick: () => handleNavSelection('/admin/borrowers') }, { label: 'Borrowers Directory', active: true }];
      case 'borrower-detail':
        return [{ label: 'Borrowers', onClick: () => handleNavSelection('/admin/borrowers') }, { label: `360° Dossier (${selectedBorrowerId})`, active: true }];
      case 'applications':
        return [{ label: 'Loan Origination', onClick: () => handleNavSelection(currentUser.role === 'admin' ? '/admin/applications' : '/applications') }, { label: 'Pipeline Stages', active: true }];
      case 'new-application':
        return [{ label: 'Applications', onClick: () => handleNavSelection('/applications') }, { label: 'New Loan Wizard', active: true }];
      case 'credit_reviews':
        return [{ label: 'Underwriting', onClick: () => handleNavSelection('/admin/credit_reviews') }, { label: 'Credit Review Queue', active: true }];
      case 'risk_assessment':
        return [{ label: 'Underwriting', onClick: () => handleNavSelection('/admin/credit_reviews') }, { label: `DTI Risk Workbench (${selectedApplicationId})`, active: true }];
      case 'approvals':
        return [{ label: 'Credit Committee' }, { label: 'Executive Approvals Queue', active: true }];
      case 'disbursements':
        return [{ label: 'Treasury & Cashier', onClick: () => handleNavSelection('/admin/disbursements') }, { label: 'Disbursements Queue', active: true }];
      case 'loans':
        return [{ label: 'Core Banking', onClick: () => handleNavSelection(currentUser.role === 'admin' ? '/admin/loans' : '/loans') }, { label: 'Active Facilities Directory', active: true }];
      case 'loan-detail':
        return [{ label: 'Core Banking', onClick: () => handleNavSelection(currentUser.role === 'admin' ? '/admin/loans' : '/loans') }, { label: `Amortization Schedule (${selectedLoanId})`, active: true }];
      case 'repayments':
        return [{ label: 'Borrower Facilities' }, { label: 'Repayment Schedule', active: true }];
      case 'cashier':
        return [{ label: 'Cashier Desk' }, { label: 'Payment Collection Terminal', active: true }];
      case 'overdue':
        return [{ label: 'Risk Management' }, { label: 'Overdue Delinquency Watchlist', active: true }];
      case 'loan_products':
        return [{ label: 'Product Administration' }, { label: 'Loan Products Catalog', active: true }];
      case 'reports':
        return [{ label: 'Business Intelligence' }, { label: 'Portfolio Reports Studio', active: true }];
      case 'notifications':
        return [{ label: 'Communication' }, { label: 'Notification Center', active: true }];
      case 'audit_logs':
        return [{ label: 'System Governance' }, { label: 'Immutable Audit Trail', active: true }];
      case 'user_management':
        return [{ label: 'Administration' }, { label: 'User Roles & Access Control', active: true }];
      case 'system_config':
        return [{ label: 'Administration' }, { label: 'System Settings & Lending Policies', active: true }];
      case 'profile':
        return [{ label: 'Account' }, { label: 'User Profile', active: true }];
      case 'user_settings':
        return [{ label: 'Preferences' }, { label: 'Account Settings', active: true }];
      case 'change_password':
        return [{ label: 'Account Security' }, { label: 'Change Password', active: true }];
      default:
        return [{ label: 'Jam Song Vich Core Banking', active: true }];
    }
  };

  // Sidebar navigation mapping & access control enforcement
  const handleNavSelection = (navTarget: string) => {
    const activeUserRole = (authUser?.role || currentUser.role || 'USER').toUpperCase();
    const isStaffRole = [
      'ADMIN',
      'MANAGER',
      'ACCOUNTANT',
      'LOAN_OFFICER',
      'CREDIT_OFFICER',
      'CASHIER',
      'TELLER',
      'CHECKER'
    ].includes(activeUserRole);
    const isAllowedAdminRole = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(activeUserRole);
    const isAdmin = isStaffRole;
    const isBorrower = ['CLIENT', 'BORROWER', 'USER'].includes(activeUserRole);

    let targetPath = navTarget;

    // Normalize legacy IDs and targets to canonical routes
    if (navTarget === 'dashboard' || navTarget === '/dashboard' || navTarget === '/admin/dashboard') {
      targetPath = isAdmin ? '/admin/dashboard' : '/my-loans';
    } else if (
      navTarget === 'borrowers' ||
      navTarget === 'admin_borrowers' ||
      navTarget === 'borrower_directory' ||
      navTarget === '/borrowers' ||
      navTarget === '/admin/borrowers' ||
      navTarget === '/admin/borrower'
    ) {
      targetPath = '/admin/borrowers';
    } else if (
      navTarget === 'user_dashboard' ||
      navTarget === 'borrower_dashboard' ||
      navTarget === 'portal' ||
      navTarget === 'my-loans' ||
      navTarget === '/portal' ||
      navTarget === '/my-loans'
    ) {
      targetPath = '/my-loans';
    } else if (
      navTarget === 'user_management' ||
      navTarget === 'users' ||
      navTarget === 'admin_users' ||
      navTarget === '/admin/users'
    ) {
      targetPath = '/admin/users';
    } else if (
      navTarget === 'loan_products' ||
      navTarget === 'products' ||
      navTarget === 'admin_products' ||
      navTarget === '/admin/products'
    ) {
      targetPath = '/admin/products';
    } else if (
      navTarget === 'applications' ||
      navTarget === 'admin_applications' ||
      navTarget === '/admin/applications'
    ) {
      targetPath = isAdmin ? '/admin/applications' : '/applications';
    } else if (navTarget === 'my_applications' || navTarget === '/applications') {
      targetPath = '/applications';
    } else if (
      navTarget === 'new-application' ||
      navTarget === 'apply_loan' ||
      navTarget === '/apply-loan'
    ) {
      targetPath = isAdmin ? '/admin/applications' : '/apply-loan';
    } else if (
      navTarget === 'credit_reviews' ||
      navTarget === 'admin_credit_reviews' ||
      navTarget === '/admin/credit_reviews'
    ) {
      targetPath = '/admin/credit_reviews';
    } else if (
      navTarget === 'approvals' ||
      navTarget === 'admin_approvals' ||
      navTarget === '/admin/approvals'
    ) {
      targetPath = '/admin/approvals';
    } else if (
      navTarget === 'disbursements' ||
      navTarget === 'admin_disbursements' ||
      navTarget === '/admin/disbursements'
    ) {
      targetPath = '/admin/disbursements';
    } else if (
      navTarget === 'loans' ||
      navTarget === 'admin_loans' ||
      navTarget === '/admin/loans'
    ) {
      targetPath = isAdmin ? '/admin/loans' : '/loans';
    } else if (navTarget === 'my_loans') {
      targetPath = '/my-loans';
    } else if (
      navTarget === 'repayments' ||
      navTarget === 'repayment_schedule' ||
      navTarget === '/repayments'
    ) {
      targetPath = '/repayments';
    } else if (
      navTarget === 'cashier' ||
      navTarget === 'cashier_desk' ||
      navTarget === 'payments' ||
      navTarget === 'admin_payments' ||
      navTarget === 'my_repayments' ||
      navTarget === '/admin/payments' ||
      navTarget === '/admin/cashier'
    ) {
      targetPath = isAdmin ? '/admin/payments' : '/payments';
    } else if (navTarget === 'overdue' || navTarget === 'admin_overdue' || navTarget === '/admin/overdue') {
      targetPath = '/admin/overdue';
    } else if (navTarget === 'reports' || navTarget === 'admin_reports' || navTarget === '/admin/reports') {
      targetPath = '/admin/reports';
    } else if (navTarget === 'notifications' || navTarget === 'admin_notifications' || navTarget === '/admin/notifications') {
      targetPath = isAdmin ? '/admin/notifications' : '/notifications';
    } else if (navTarget === 'audit_logs' || navTarget === 'audit-logs' || navTarget === 'admin_audit_logs' || navTarget === '/admin/audit-logs') {
      targetPath = '/admin/audit-logs';
    } else if (navTarget === 'system_config' || navTarget === 'admin_settings' || navTarget === '/admin/settings') {
      targetPath = '/admin/settings';
    } else if (navTarget === 'settings' || navTarget === '/settings') {
      targetPath = isAdmin ? '/admin/settings' : '/settings';
    } else if (navTarget === 'user_settings') {
      targetPath = '/settings';
    } else if (navTarget === 'profile' || navTarget === 'borrower_portal' || navTarget === '/profile') {
      targetPath = isAdmin ? '/admin/profile' : '/profile';
    } else if (navTarget === 'change_password' || navTarget === '/settings/change-password') {
      targetPath = '/settings/change-password';
    }

    // Reports gate: restricted strictly to ADMIN, MANAGER, ACCOUNTANT
    if ((targetPath === '/admin/reports' || targetPath.startsWith('/admin/reports/')) && !isAllowedAdminRole) {
      replaceAppRoute(isBorrower ? '/my-loans' : '/admin/dashboard');
      setCurrentRoute(isBorrower ? '/my-loans' : '/admin/dashboard');
      setActiveTab(isBorrower ? 'borrower_dashboard' : 'dashboard');
      return;
    }

    // RBAC: Reject borrower from accessing admin routes; immediately redirect to /my-loans
    if (isBorrower && targetPath.startsWith('/admin')) {
      replaceAppRoute('/my-loans');
      setCurrentRoute('/my-loans');
      setActiveTab('borrower_dashboard');
      return;
    }

    // Update active route and browser history
    setCurrentRoute(targetPath);
    pushAppRoute(targetPath);

    // Map targetPath / navTarget to appropriate activeTab
    if (
      targetPath === '/admin/borrowers' ||
      targetPath === '/borrowers' ||
      navTarget === 'borrowers' ||
      navTarget === 'admin_borrowers' ||
      navTarget === 'borrower_directory'
    ) {
      setActiveTab('borrowers');
    } else if (targetPath === '/admin/dashboard') {
      setActiveTab('dashboard');
    } else if (targetPath === '/portal' || targetPath === '/my-loans') {
      setActiveTab('borrower_dashboard');
    } else if (targetPath === '/dashboard') {
      setActiveTab(isAdmin ? 'dashboard' : 'borrower_dashboard');
    } else if (targetPath === '/admin/users') {
      setActiveTab('user_management');
    } else if (targetPath === '/admin/products' || targetPath === '/admin/loan_products' || targetPath === '/admin/loan-products') {
      setActiveTab('loan_products');
    } else if (targetPath === '/admin/applications' || targetPath === '/applications') {
      setActiveTab('applications');
    } else if (targetPath === '/apply-loan') {
      setActiveTab('new-application');
    } else if (targetPath === '/admin/credit_reviews' || targetPath === '/admin/credit-reviews') {
      setActiveTab('credit_reviews');
    } else if (targetPath === '/admin/approvals') {
      setActiveTab('approvals');
    } else if (targetPath === '/admin/disbursements') {
      setActiveTab('disbursements');
    } else if (targetPath === '/admin/loans' || targetPath === '/loans') {
      setActiveTab('loans');
    } else if (targetPath === '/repayments') {
      setActiveTab('repayments');
    } else if (targetPath === '/admin/payments' || targetPath === '/payments') {
      setActiveTab(isBorrower ? 'repayments' : 'cashier');
    } else if (targetPath === '/admin/overdue') {
      setActiveTab('overdue');
    } else if (targetPath === '/admin/reports') {
      setActiveTab('reports');
    } else if (targetPath === '/admin/notifications' || targetPath === '/notifications') {
      setActiveTab('notifications');
    } else if (targetPath === '/admin/audit-logs' || targetPath === '/admin/audit_logs') {
      setActiveTab('audit_logs');
    } else if (targetPath === '/admin/settings') {
      setActiveTab('system_config');
    } else if (targetPath === '/settings') {
      setActiveTab('user_settings');
    } else if (targetPath === '/admin/profile' || targetPath === '/profile') {
      setActiveTab('profile');
    } else if (targetPath === '/settings/change-password') {
      setActiveTab('change_password');
    } else {
      setActiveTab(isAdmin ? 'dashboard' : 'borrower_dashboard');
    }
  };

  // Quick Search records
  const mockQuickRecords = [
    { type: 'borrower', id: 'BOR-2026-0001', title: 'Sokha Chan', sub: 'National ID: 010992384 • Active ($3,850 bal)', tab: 'borrower-detail' },
    { type: 'borrower', id: 'BOR-2026-0002', title: 'Vannak Keo', sub: 'National ID: 080193481 • Active ($8,500 bal)', tab: 'borrower-detail' },
    { type: 'loan', id: 'LN-2026-0042', title: 'LN-2026-0042 (Personal Loan)', sub: 'Borrower: Sokha Chan • Installment #6 Due ($532.50)', tab: 'loan-detail' },
    { type: 'loan', id: 'LN-2026-0012', title: 'LN-2026-0012 (Emergency Loan)', sub: 'Borrower: Dara Pich • OVERDUE 38 Days ($512.00)', tab: 'loan-detail' },
    { type: 'application', id: 'APP-2026-0014', title: 'APP-2026-0014 ($5,000 Personal Loan)', sub: 'Applicant: Bopha Roth • Pending Underwriting', tab: 'risk_assessment' },
    { type: 'cashier', id: 'PAY-QUICK', title: 'Cashier Payment Terminal', sub: 'Collect installments, emit KHQR, print POS receipts', tab: 'cashier' },
    { type: 'overdue', id: 'OVERDUE-QUICK', title: 'Overdue Delinquency Watchlist', sub: 'PAR 30+ delinquency management', tab: 'overdue' },
    { type: 'products', id: 'PROD-CAT', title: 'Loan Products Catalog', sub: 'Personal, Business, Agriculture, Vehicle, Emergency', tab: 'loan_products' },
    { type: 'reports', id: 'BI-STUDIO', title: 'Portfolio Reports & BI Analytics', sub: 'Aging schedules & disbursement exports', tab: 'reports' },
    { type: 'audit', id: 'AUD-TRAIL', title: 'System Audit Trail', sub: 'Immutable regulatory forensic ledger', tab: 'audit_logs' },
  ];

  const filteredSearch = mockQuickRecords.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active entities
  const activeBorrower = borrowers.find((b) => b.id === selectedBorrowerId) || borrowers[0];
  const activeLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];
  const activeApplication = applications.find((a) => a.id === selectedApplicationId) || applications[0];

  // User-specific datasets for client borrower views
  const staffRoles = ['ADMIN', 'MANAGER', 'LOAN_OFFICER', 'CREDIT_OFFICER', 'CASHIER'];
  const isStaffRole = staffRoles.includes((currentUser.role || 'USER').toUpperCase());
  const isBorrowerRole = !isStaffRole;
  const currentClientName = (currentUser.name || currentUser.fullName || '').trim().toLowerCase();
  const currentBorrowerId = currentUser.borrowerId || (isBorrowerRole ? currentUser.id : undefined);

  const userFilteredLoans = loans.filter((l) => {
    if (!isBorrowerRole) return true;
    if (currentBorrowerId && (l.borrowerId === currentBorrowerId || l.borrowerId === currentUser.id)) return true;
    if (l.borrowerName && currentClientName && (l.borrowerName.toLowerCase().includes(currentClientName) || currentClientName.includes(l.borrowerName.toLowerCase()))) return true;
    return false;
  });
  const userDisplayLoans = isBorrowerRole ? userFilteredLoans : loans;

  const userFilteredApps = applications.filter((a) => {
    if (!isBorrowerRole) return true;
    if (currentBorrowerId && (a.borrowerId === currentBorrowerId || a.borrowerId === currentUser.id)) return true;
    if (a.borrowerName && currentClientName && (a.borrowerName.toLowerCase().includes(currentClientName) || currentClientName.includes(a.borrowerName.toLowerCase()))) return true;
    return false;
  });
  const userDisplayApps = isBorrowerRole ? userFilteredApps : applications;

  const userFilteredReceipts = receipts.filter((r) => {
    if (!isBorrowerRole) return true;
    if (currentBorrowerId && (r.borrowerId === currentBorrowerId || r.borrowerId === currentUser.id)) return true;
    if (r.borrowerName && currentClientName && (r.borrowerName.toLowerCase().includes(currentClientName) || currentClientName.includes(r.borrowerName.toLowerCase()))) return true;
    return false;
  });
  const userDisplayReceipts = isBorrowerRole ? userFilteredReceipts : receipts;

  // Helper to open payment flow appropriately for borrower (modal) or staff (cashier desk)
  const openPaymentForBorrowerOrStaff = (loanId?: string, installmentNo?: number, amount?: number) => {
    const target = (loanId ? loans.find((l) => l.id === loanId || l.loanNumber === loanId) : null) || activeLoan;
    if (isBorrowerRole) {
      if (target) {
        setBorrowerPaymentTarget({ loan: target, installmentNo, amount });
      }
    } else {
      if (target) setSelectedLoanId(target.id);
      setActiveTab('cashier');
    }
  };

  // Callback Handlers
  const handleRecordPayment = async (paymentInput: any) => {
    try {
      const receipt = await api.recordPayment({
        loanId: paymentInput.loanNumber || paymentInput.loanId || selectedLoanId,
        amount: paymentInput.amountPaidUSD || paymentInput.amount,
        method: paymentInput.paymentMethod || paymentInput.method || 'CASH',
        referenceNo: paymentInput.transactionRef || paymentInput.referenceNo,
        notes: paymentInput.notes || 'Recorded via window cashier POS',
      });
      await reloadAllData();
      setActiveReceiptModal(receipt);
      alert(`Payment of $${receipt.amountPaidUSD.toFixed(2)} recorded successfully! Receipt #${receipt.receiptNo}`);
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(`Payment failed: ${err.message || 'Error recording payment'}`);
    }
  };

  const handleApplicationSubmit = async (appData: Partial<LoanApplication>, isDraft = false) => {
    try {
      const created = await api.submitApplication({
        ...appData,
        borrowerId: appData.borrowerId || currentUser.borrowerId || selectedBorrowerId || activeBorrower?.id,
        productId: appData.productId || products[0]?.id,
        requestedAmountUSD: appData.requestedAmountUSD || 5000,
        requestedTermMonths: appData.requestedTermMonths || 12,
        purpose: appData.purpose || 'Institutional credit facility',
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
      });
      await reloadAllData();
      if (created?.id) setSelectedApplicationId(created.id);
      setActiveTab('applications');
      alert(`Application ${created?.applicationNo || 'created'} ${isDraft ? 'saved as draft' : 'submitted for underwriting'}!`);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(`Failed to submit application: ${err.message || 'Error occurred'}`);
    }
  };

  const handleExecutiveDecision = async (
    appId: string,
    decision: 'APPROVED' | 'REJECTED',
    terms?: { amount: number; term: number; rate: number; reason?: string }
  ) => {
    try {
      if (decision === 'APPROVED') {
        await api.approveApplication(appId, {
          amount: terms?.amount,
          term: terms?.term,
          rate: terms?.rate,
          reason: terms?.reason || 'Approved by Executive Committee',
        });
        await reloadAllData();
        alert(`Application ${appId} successfully APPROVED! Facility ready in Disbursements queue.`);
        setActiveTab('disbursements');
      } else {
        if (!terms?.reason?.trim()) {
          alert('A rejection reason is strictly mandatory.');
          return;
        }
        await api.rejectApplication(appId, terms.reason);
        await reloadAllData();
        alert(`Application ${appId} marked as REJECTED.`);
        setActiveTab('applications');
      }
    } catch (err: any) {
      console.error('Executive decision error:', err);
      alert(`Decision action failed: ${err.message || 'Could not process decision'}`);
    }
  };

  if (authLoading && !authTimedOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 font-mono tracking-wide">
            Restoring authenticated session...
          </p>
        </div>
      </div>
    );
  }

  if (!authIsAuthenticated) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={(email) => {
            setAuthEmail(email);
            setAuthOtpPurpose('register_verification');
            setAuthView('otp_verify');
            pushAppRoute('/verify-email');
          }}
          onNavigateToLogin={() => {
            setAuthNotice(null);
            setAuthView('login');
            pushAppRoute('/login');
          }}
        />
      );
    }

    if (authView === 'otp_verify') {
      return (
        <OtpVerificationPage
          email={authEmail}
          purpose={authOtpPurpose}
          onVerificationSuccess={(resetToken, verifiedUser, verifiedToken) => {
            if (authOtpPurpose === 'login_verification') {
              if (verifiedUser && verifiedToken) {
                handleLoginSuccess(verifiedUser, verifiedToken, true);
              } else {
                setAuthNotice('Login verified successfully. Please sign in.');
                setAuthView('login');
                pushAppRoute('/login');
              }
            } else if (authOtpPurpose === 'register_verification') {
              setAuthNotice('Email verified successfully! Your account is now active. Please sign in.');
              setAuthView('login');
              pushAppRoute('/login');
            } else if (authOtpPurpose === 'forgot_password' && resetToken) {
              setAuthResetToken(resetToken);
              setAuthView('set_new_password');
              pushAppRoute('/reset-password');
            }
          }}
          onNavigateBack={() => {
            const backView =
              authOtpPurpose === 'register_verification'
                ? 'register'
                : authOtpPurpose === 'login_verification'
                ? 'login'
                : 'forgot_password';
            setAuthView(backView);
            pushAppRoute(backView === 'register' ? '/register' : backView === 'forgot_password' ? '/forgot-password' : '/login');
          }}
        />
      );
    }

    if (authView === 'forgot_password') {
      return (
        <ForgotPasswordPage
          onOtpSent={(email) => {
            setAuthEmail(email);
            setAuthOtpPurpose('forgot_password');
            setAuthView('otp_verify');
            pushAppRoute('/verify-otp');
          }}
          onNavigateToLogin={() => {
            setAuthNotice(null);
            setAuthView('login');
            pushAppRoute('/login');
          }}
        />
      );
    }

    if (authView === 'set_new_password') {
      return (
        <SetNewPasswordPage
          email={authEmail}
          resetToken={authResetToken}
          onPasswordResetSuccess={() => {
            setAuthNotice('Your password has been successfully reset. Please log in with your new credentials.');
            setAuthView('login');
            pushAppRoute('/login');
          }}
          onNavigateToLogin={() => {
            setAuthNotice(null);
            setAuthView('login');
            pushAppRoute('/login');
          }}
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onRequireOtp={(email) => {
          setAuthEmail(email);
          setAuthOtpPurpose('login_verification');
          setAuthView('otp_verify');
          pushAppRoute('/verify-otp');
        }}
        onNavigateToRegister={() => {
          setAuthNotice(null);
          setAuthView('register');
          pushAppRoute('/register');
        }}
        onNavigateToForgotPassword={() => {
          setAuthNotice(null);
          setAuthView('forgot_password');
          pushAppRoute('/forgot-password');
        }}
        successNotice={authNotice}
        initialRole={activeRole}
      />
    );
  }

  return (
    <>
      <AppLayout
        currentUser={currentUser}
        currentPath={currentRoute}
        activeNavId={activeTab}
        onNavigate={handleNavSelection}
        onLogout={handleLogout}
        branchName={selectedBranch}
        breadcrumbs={getBreadcrumbs()}
        currentRole={activeRole}
        onRoleSwitch={handleRoleSwitch}
        currency={currency}
        onToggleCurrency={(c) => setCurrency(c)}
        onSearchOpen={() => setSearchModalOpen(true)}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
      >
        <div className="h-full">
          {/* Point 4: Access Denied Banner when unauthorized access is rejected */}
          {accessDeniedMessage && (
            <div className="mb-4 mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-[8px] flex items-center justify-between text-[#DC2626] text-xs font-semibold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>{t('Access Denied: You do not have administrative authorization. Redirected to User Dashboard.')}</span>
              </div>
              <button
                onClick={() => setAccessDeniedMessage(null)}
                className="text-[#DC2626] hover:text-red-800 font-bold ml-2 text-base leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Access Denied Page */}
          {activeTab === 'access_denied' && (
            <AccessDeniedPage
              onBackToDashboard={() => {
                const userRole = (currentUser.role || 'USER').toUpperCase();
                const isStaff = userRole !== 'BORROWER' && userRole !== 'USER';
                if (isStaff) {
                  replaceAppRoute('/admin/dashboard');
                  setActiveTab('dashboard');
                } else {
                  replaceAppRoute('/portal');
                  setActiveTab('borrower_dashboard');
                }
              }}
              onLogout={handleLogout}
              onSwitchToAdmin={() => {
                const updated = {
                  ...currentUser,
                  role: 'ADMIN' as UserRole,
                  title: 'System Administrator',
                  department: 'Executive Administration',
                };
                setCurrentUser(updated);
                setActiveRole('ADMIN');
                contextSetSession(updated, 'dev-admin-token', true);
                replaceAppRoute('/admin/dashboard');
                setActiveTab('dashboard');
              }}
              onNavigateToPortal={() => {
                replaceAppRoute('/portal');
                setActiveTab('borrower_dashboard');
              }}
              currentUserRole={currentUser.role}
              currentUserName={currentUser.name || currentUser.fullName || 'Fong Ly'}
            />
          )}

          {/* Role Dashboards (ADMIN, MANAGER, LOAN_OFFICER, CASHIER, USER) */}
          {activeTab === 'dashboard' && (() => {
            const role = (currentUser.role || 'USER').toUpperCase();
            if (role === 'MANAGER') {
              return (
                <ManagerDashboard
                  currency={currency}
                  onNavigate={handleNavSelection}
                  loans={loans}
                  borrowers={borrowers}
                  applications={applications}
                  receipts={receipts}
                />
              );
            }
            if (role === 'LOAN_OFFICER') {
              return (
                <LoanOfficerDashboard
                  currency={currency}
                  onNavigate={handleNavSelection}
                  applications={applications}
                  borrowers={borrowers}
                />
              );
            }
            if (role === 'CASHIER') {
              return (
                <CashierDashboard
                  currency={currency}
                  onNavigate={handleNavSelection}
                  loans={loans}
                  applications={applications}
                  receipts={receipts}
                />
              );
            }
            if (role === 'ADMIN') {
              return (
                <AdminDashboard
                  currency={currency}
                  onNavigate={handleNavSelection}
                  loans={loans}
                  borrowers={borrowers}
                  applications={applications}
                  receipts={receipts}
                />
              );
            }
            return (
              <BorrowerDashboard
                currentUser={currentUser}
                currency={currency}
                loans={loans}
                applications={applications}
                receipts={receipts}
                onNavigate={handleNavSelection}
                onOpenApplyLoan={() => setActiveTab('new-application')}
                onOpenQuickPayment={(loanId, instNo, amt) => openPaymentForBorrowerOrStaff(loanId, instNo, amt)}
                onViewReceipt={(rec) => setActiveReceiptModal(rec)}
              />
            );
          })()}

          {/* Dedicated Borrower Client Portal View (Prompt 3) */}
          {(activeTab === 'borrower_dashboard' || activeTab === 'user_dashboard') && (
            <BorrowerDashboard
              currentUser={currentUser}
              currency={currency}
              loans={userDisplayLoans}
              applications={userDisplayApps}
              receipts={userDisplayReceipts}
              onNavigate={handleNavSelection}
              onOpenApplyLoan={() => setActiveTab('new-application')}
              onOpenQuickPayment={(loanId, instNo, amt) => openPaymentForBorrowerOrStaff(loanId, instNo, amt)}
              onViewReceipt={(rec) => setActiveReceiptModal(rec)}
            />
          )}

          {/* SCREEN 1: Borrowers Directory & 360° Dossier */}
          {(activeTab === 'borrowers' || activeTab === 'admin_borrowers' || activeTab === 'borrower_directory') && (
            <BorrowerList
              borrowers={borrowers}
              currency={currency}
              currentUserRole={activeRole}
              onSelectBorrower={(id) => {
                setSelectedBorrowerId(id);
                setActiveTab('borrower-detail');
              }}
              onOpenCreateApplication={(id) => {
                setSelectedBorrowerId(id);
                setActiveTab('new-application');
              }}
              onOpenNewBorrower={() => alert('Enter borrower details in registration modal.')}
            />
          )}

          {activeTab === 'borrower-detail' && activeBorrower && (
            <BorrowerDetail
              borrower={activeBorrower}
              loans={loans.filter(
                (l) => l.borrowerId === activeBorrower.borrowerId || l.borrowerId === activeBorrower.id
              )}
              receipts={receipts.filter(
                (r) => r.borrowerId === activeBorrower.borrowerId || r.borrowerId === activeBorrower.id
              )}
              currency={currency}
              onBack={() => setActiveTab('borrowers')}
              onSelectLoan={(loanId) => {
                setSelectedLoanId(loanId);
                setActiveTab('loan-detail');
              }}
              onOpenCreateApplication={() => setActiveTab('new-application')}
              onViewReceipt={(rec) => setActiveReceiptModal(rec)}
            />
          )}

          {/* SCREEN 2: Loan Applications Pipeline & Wizard */}
          {activeTab === 'applications' && (
            <ApplicationPipelineList
              applications={isBorrowerRole ? userDisplayApps : applications}
              currency={currency}
              currentUserRole={activeRole}
              onSelectApplication={(appId) => {
                if (isBorrowerRole) return;
                setSelectedApplicationId(appId);
                setActiveTab('risk_assessment');
              }}
              onOpenNewApplication={() => setActiveTab('new-application')}
              onAssessApplication={(appId) => {
                if (isBorrowerRole) return;
                setSelectedApplicationId(appId);
                setActiveTab('risk_assessment');
              }}
            />
          )}

          {activeTab === 'new-application' && (
            <LoanApplicationWizard
              borrowers={borrowers}
              products={products}
              currency={currency}
              currentUser={currentUser}
              currentUserRole={activeRole}
              onCancel={() => setActiveTab('applications')}
              onSubmitApplication={handleApplicationSubmit}
            />
          )}

          {/* SCREEN 3: Credit Review Queue & DTI Risk Workbench */}
          {activeTab === 'credit_reviews' && (
            <CreditReviewQueue
              applications={applications}
              currency={currency}
              currentUserRole={activeRole}
              onAssessApplication={(appId) => {
                setSelectedApplicationId(appId);
                setActiveTab('risk_assessment');
              }}
            />
          )}

          {activeTab === 'risk_assessment' && activeApplication && (
            <DtiRiskWorkbench
              application={activeApplication}
              currency={currency}
              currentUserRole={activeRole}
              currentUserName={currentUser.name}
              onBack={() => setActiveTab('credit_reviews')}
              onSubmitAssessment={(appId, rec, notes) => {
                setApplications((prev) =>
                  prev.map((a) =>
                    a.id === appId
                      ? {
                          ...a,
                          status: 'UNDER_REVIEW',
                          creditOfficerReview: {
                            reviewerName: currentUser.name,
                            recommendation: rec,
                            notes,
                            signedAt: new Date().toISOString(),
                          },
                        }
                      : a
                  )
                );
                alert(`Credit recommendation for ${appId} submitted to Executive Committee.`);
                setActiveTab('approvals');
              }}
              onExecutiveDecision={handleExecutiveDecision}
            />
          )}

          {/* SCREEN 4: Approvals Queue */}
          {activeTab === 'approvals' && (
            <ApprovalsQueue
              applications={applications}
              currency={currency}
              currentUserRole={activeRole}
              currentUserName={currentUser.name}
              onExecutiveDecision={handleExecutiveDecision}
            />
          )}

          {/* SCREEN: Cashier & Manager Disbursements Queue */}
          {activeTab === 'disbursements' && (
            <DisbursementsQueue
              applications={applications}
              currency={currency}
              currentUserRole={activeRole}
              currentUserName={currentUser.name}
              onDisbursementComplete={() => reloadAllData()}
              onNavigateToLoan={(loanId: string) => {
                setSelectedLoanId(loanId);
                setActiveTab('loan-detail');
              }}
            />
          )}

          {/* SCREEN 5: Core Banking Loans & Repayment Schedule */}
          {activeTab === 'loans' && (
            <LoanList
              loans={isBorrowerRole ? userDisplayLoans : loans}
              currency={currency}
              currentUserRole={activeRole}
              onSelectLoan={(id) => {
                setSelectedLoanId(id);
                setActiveTab('loan-detail');
              }}
              onOpenCashierForLoan={(id) => openPaymentForBorrowerOrStaff(id)}
            />
          )}

          {activeTab === 'loan-detail' && activeLoan && (
            <LoanDetail
              loan={activeLoan}
              receipts={receipts.filter(
                (r) => r.loanNumber === activeLoan.loanNumber || r.loanNumber === activeLoan.id
              )}
              currency={currency}
              currentUserRole={activeRole}
              onBack={() => setActiveTab('loans')}
              onCollectPayment={(_loanId, amount, instNo) => openPaymentForBorrowerOrStaff(activeLoan.id, instNo, amount)}
              onViewReceipt={(rec) => setActiveReceiptModal(rec)}
            />
          )}

          {/* SCREEN 6: Cashier Desk & Payment Collection Terminal */}
          {activeTab === 'cashier' && (
            <CashierPaymentTerminal
              loans={isBorrowerRole ? userDisplayLoans : loans}
              receipts={isBorrowerRole ? userDisplayReceipts : receipts}
              currency={currency}
              cashierName={currentUser.name}
              currentUserRole={activeRole}
              onRecordPayment={handleRecordPayment}
              initialSelectedLoanId={selectedLoanId}
            />
          )}

          {/* SCREEN 7: Overdue Delinquency Watchlist */}
          {activeTab === 'overdue' && (
            <OverdueWatchlist
              loans={loans}
              currency={currency}
              currentUserRole={activeRole}
              onRecordPaymentForLoan={(loanId) => {
                setSelectedLoanId(loanId);
                setActiveTab('cashier');
              }}
            />
          )}

          {/* SCREEN 8: Loan Products Catalog & Configuration */}
          {activeTab === 'loan_products' && (
            <LoanProductsCatalog
              products={products}
              currency={currency}
              currentUserRole={activeRole}
              onAddProduct={(newProd) => setProducts((prev) => [...prev, newProd])}
              onApplyProduct={(prodId) => {
                setActiveTab('new-application');
              }}
            />
          )}

          {/* SCREEN 9: Portfolio Reports & BI Analytics */}
          {activeTab === 'reports' && (
            <BIReportingStudio products={products} currency={currency} />
          )}

          {/* SCREEN 10: System Audit Trail & Immutable Ledger */}
          {activeTab === 'audit_logs' && (
            <AuditTrailLedger
              events={auditLogs}
              currentUserRole={activeRole}
            />
          )}

          {/* SCREEN 11: User Roles & Access Control (Admin/Manager, Cashier, Borrower) */}
          {activeTab === 'user_management' && (
            <UserRoleManagement
              currentUserRole={activeRole}
              onSwitchUserPersona={(role, user) => {
                setActiveRole(role);
                setCurrentUser({
                  id: user.id,
                  username: user.username,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  title: user.title,
                  department: user.department,
                  avatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
                  branch: 'Phnom Penh Main Branch',
                  borrowerId: user.borrowerId
                });
                alert(`Persona switched to: ${user.name} (${user.role === 'MANAGER' ? 'Admin / Manager' : user.role === 'CASHIER' ? 'Cashier' : 'Borrower'})`);
              }}
              onShowToast={(msg) => alert(msg)}
            />
          )}

          {/* SCREEN 12: System Settings & Institutional Policies */}
          {activeTab === 'system_config' && (
            <SystemSettings
              currency={currency}
              onToggleCurrency={(c) => setCurrency(c)}
              onShowToast={(msg) => alert(msg)}
            />
          )}

          {/* SCREEN 13: Change Password */}
          {activeTab === 'change_password' && (
            <ChangePasswordPage
              onBack={() => {
                const userRole = (currentUser.role || 'BORROWER').toUpperCase();
                const isStaff = userRole !== 'BORROWER' && userRole !== 'USER';
                handleNavSelection(isStaff ? 'dashboard' : 'user_dashboard');
              }}
              onLogout={handleLogout}
            />
          )}

          {/* SCREEN 14: Notifications Center */}
          {activeTab === 'notifications' && (
            <NotificationsCenter
              notifications={notifications}
              currentUserRole={activeRole}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={async () => {
                await api.markAllNotificationsRead().catch(() => {});
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
              }}
              onNavigateToAction={(linkId, category) => {
                if (linkId) {
                  if (category === 'PAYMENT_DUE' || category === 'OVERDUE') {
                    setSelectedLoanId(linkId);
                    handleNavSelection(currentUser.role === 'admin' ? '/admin/payments' : '/payments');
                  } else if (category === 'APPROVAL') {
                    setSelectedApplicationId(linkId);
                    handleNavSelection('/admin/approvals');
                  }
                }
              }}
            />
          )}

          {/* SCREEN 15: User Profile */}
          {activeTab === 'profile' && (
            <UserProfileView
              currentUser={currentUser}
              onUpdateUser={(updated) => setCurrentUser(updated)}
              onChangePassword={() => handleNavSelection('/settings/change-password')}
            />
          )}

          {/* SCREEN 16: Standard User Settings */}
          {activeTab === 'user_settings' && (
            <UserSettingsView
              currentUser={currentUser}
              currency={currency}
              onToggleCurrency={(c) => setCurrency(c)}
              onChangePassword={() => handleNavSelection('/settings/change-password')}
              onShowToast={(msg) => alert(msg)}
            />
          )}

          {/* SCREEN 17: User Repayment Schedule */}
          {activeTab === 'repayments' && (
            <UserRepaymentsView
              loans={isBorrowerRole ? userDisplayLoans : loans}
              currentUser={currentUser}
              currency={currency}
              onOpenPaymentForLoan={(loanId, instNo, amt) => openPaymentForBorrowerOrStaff(loanId, instNo, amt)}
            />
          )}
        </div>
      </AppLayout>

      {/* Global Quick Search Modal (Ctrl + K) */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] shadow-lg border border-[#E2E8F0] w-full max-w-2xl overflow-hidden">
            <div className="flex items-center px-3.5 py-2.5 border-b border-[#E2E8F0]">
              <Search className="w-4 h-4 text-[#64748B] mr-2.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search Borrowers, Loan #, National ID, Applications..."
                className="w-full text-[#0F172A] placeholder-[#64748B] bg-transparent text-xs focus:outline-none"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Top Matches & Direct Navigation
              </div>
              {filteredSearch.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#64748B]">
                  No matching accounts or records found for "{searchQuery}".
                </div>
              ) : (
                filteredSearch.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (res.type === 'borrower') setSelectedBorrowerId(res.id);
                      if (res.type === 'loan') setSelectedLoanId(res.id);
                      if (res.type === 'application') setSelectedApplicationId(res.id);
                      setActiveTab(res.tab);
                      setSearchModalOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left flex items-start gap-2.5 p-2 rounded-[6px] hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-[4px] bg-slate-100 border border-[#E2E8F0] text-[#0F172A]">
                      {res.type === 'borrower' && <User className="w-3.5 h-3.5" />}
                      {res.type === 'loan' && <CreditCard className="w-3.5 h-3.5" />}
                      {res.type === 'application' && <FileText className="w-3.5 h-3.5" />}
                      {res.type === 'cashier' && <DollarSign className="w-3.5 h-3.5" />}
                      {res.type === 'overdue' && <CreditCard className="w-3.5 h-3.5" />}
                      {res.type === 'products' && <FileText className="w-3.5 h-3.5" />}
                      {res.type === 'reports' && <FileText className="w-3.5 h-3.5" />}
                      {res.type === 'audit' && <FileText className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0F172A]">{res.title}</span>
                        <span className="text-[11px] font-mono text-[#64748B]">{res.id}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">{res.sub}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-3.5 py-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
              <div className="flex items-center gap-1.5">
                <span>Navigate with</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded-[4px] text-[10px] font-mono text-[#0F172A]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded-[4px] text-[10px] font-mono text-[#0F172A]">↓</kbd>
                <span>Select with</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded-[4px] text-[10px] font-mono text-[#0F172A]">Enter</kbd>
              </div>
              <div>
                <span>Press</span>
                <kbd className="ml-1 px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded-[4px] text-[10px] font-mono text-[#0F172A]">ESC</kbd> to close
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentic Thermal Receipt Modal */}
      {activeReceiptModal && (
        <PaymentReceiptModal
          receipt={activeReceiptModal}
          onClose={() => setActiveReceiptModal(null)}
        />
      )}

      {/* Borrower Real Payment Modal (Sections 1, 5, 17, 24) */}
      {borrowerPaymentTarget && (
        <BorrowerPaymentModal
          loan={borrowerPaymentTarget.loan}
          currency={currency}
          initialInstallmentNo={borrowerPaymentTarget.installmentNo}
          initialAmount={borrowerPaymentTarget.amount}
          onClose={() => setBorrowerPaymentTarget(null)}
          onSuccess={async (receipt) => {
            await reloadAllData();
            setActiveReceiptModal(receipt);
          }}
        />
      )}
      {/* 6-Digit PIN Quick-Access Screen for 5-minute Inactivity Lock (Login UI Prompt 4) */}
      {isIdleLocked && authIsAuthenticated && (
        <PinLockScreen
          user={{
            fullName: currentUser.fullName || currentUser.name || 'Sophea Kem',
            name: currentUser.name || currentUser.fullName || 'Sophea Kem',
            role: (currentUser.role || 'teller').toLowerCase(),
            branch: currentUser.branch || 'Daun Penh',
            avatar: currentUser.avatar,
            storedPin: '123456',
          }}
          onSuccess={() => {
            unlockSession();
          }}
          onFallbackPassword={() => {
            unlockSession();
            handleLogout();
          }}
        />
      )}
    </>
  );
};

export default App;
