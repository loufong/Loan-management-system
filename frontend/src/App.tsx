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
import { LoanApplicationManagement } from './components/admin/applications/LoanApplicationManagement';

// Screen 5: Core Banking Loans & Repayment Schedule
import { LoanList } from './components/loans/LoanList';
import { LoanDetail } from './components/loans/LoanDetail';
import { BorrowerPaymentModal } from './components/loans/BorrowerPaymentModal';

// Screen 6: Cashier Desk & Payment Collection Terminal
import { CashierPaymentTerminal } from './components/cashier/CashierPaymentTerminal';
import { PaymentReceiptModal } from './components/cashier/PaymentReceiptModal';
import { PaymentHistoryManagement } from './components/admin/payments/PaymentHistoryManagement';

// Screen 7: Overdue Delinquency Watchlist
import { OverdueWatchlist } from './components/overdue/OverdueWatchlist';

// Screen 8: Loan Products Catalog & Configuration
import { LoanProductsCatalog } from './components/products/LoanProductsCatalog';

// Screen 9: Portfolio Reports & BI Analytics
import { BIReportingStudio } from './components/reports/BIReportingStudio';
import { ExecutiveAnalyticsDashboard } from './components/analytics/ExecutiveAnalyticsDashboard';
import { loanStorageService, LEDGER_UPDATE_EVENT, generateAmortizationSchedule } from './services/loanStorageService';
import { notificationStorageService, NOTIFICATIONS_UPDATE_EVENT } from './services/notificationStorageService';

// Screen 10: System Audit Trail & Immutable Ledger
import { AuditTrailLedger } from './components/audit/AuditTrailLedger';

// Screen 11: User Roles & Access Control
import { UserRoleManagement } from './components/admin/UserRoleManagement';

// Screen 12: System Settings & Policies
import { SystemSettings } from './components/admin/SystemSettings';

import { Search, X, DollarSign, FileText, User, CreditCard, Shield, AlertCircle, UserCheck, Building2, Landmark, Wallet } from 'lucide-react';
import { api, isStaticHost } from './services/api';
import { AccessDeniedPage } from './components/common/AccessDeniedPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { SetNewPasswordPage } from './components/auth/SetNewPasswordPage';
import { ChangePasswordPage } from './components/auth/ChangePasswordPage';
import { NotificationsCenter } from './components/notifications/NotificationsCenter';
import { UserProfileView } from './components/profile/UserProfileView';
import { UserSettingsView } from './components/settings/UserSettingsView';
import { BorrowerApplyLoanView } from './components/borrower/BorrowerApplyLoanView';
import { BorrowerRepaymentScheduleView } from './components/borrower/BorrowerRepaymentScheduleView';
import { BorrowerPayInstallmentView } from './components/borrower/BorrowerPayInstallmentView';
import { BorrowerProfileView } from './components/borrower/BorrowerProfileView';
import { BorrowerSettingsView } from './components/borrower/BorrowerSettingsView';
import { UserRepaymentsView } from './components/loans/UserRepaymentsView';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';


type AuthView = 'login' | 'register' | 'forgot_password' | 'set_new_password';

// GitHub Pages & Static Environment Route Helpers
// GitHub Pages & Static Environment Route Helpers (HashRouter & Path Dual Support)
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

  // 1. Check HashRouter hash first (e.g., #/my-loans or #/admin/borrowers)
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    let clean = hash.startsWith('#') ? hash.slice(1) : hash;
    if (clean.startsWith('!')) clean = clean.slice(1);
    if (!clean.startsWith('/')) clean = '/' + clean;
    if (clean.includes('?')) clean = clean.split('?')[0];
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean || '/';
  }

  // 2. Check query parameter from 404.html redirect (e.g., /?/my-loans)
  const search = window.location.search;
  if (search && search.startsWith('?/')) {
    let queryRoute = search.slice(1).split('&')[0].replace(/~and~/g, '&');
    if (!queryRoute.startsWith('/')) queryRoute = '/' + queryRoute;
    if (queryRoute.length > 1 && queryRoute.endsWith('/')) {
      queryRoute = queryRoute.slice(0, -1);
    }
    return queryRoute;
  }

  // 3. Fallback to pathname
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
  const cleanRoute = route.startsWith('/') ? route : '/' + route;
  const targetHash = `#${cleanRoute}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
};

const replaceAppRoute = (route: string) => {
  const cleanRoute = route.startsWith('/') ? route : '/' + route;
  const targetHash = `#${cleanRoute}`;
  if (window.location.hash !== targetHash) {
    const urlWithoutHash = window.location.href.split('#')[0];
    window.location.replace(`${urlWithoutHash}${targetHash}`);
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
    if (authUser && authUser.name !== 'Inactive User' && authUser.email !== 'inactive@example.com') {
      const roleUpper = (authUser.role || 'BORROWER').toUpperCase();
      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'MANAGER', 'LOAN_OFFICER', 'CREDIT_OFFICER', 'CASHIER'].includes(roleUpper);
      const nameVal = authUser.name || authUser.fullName || authUser.username || 'User';
      return {
        ...authUser,
        name: nameVal,
        fullName: authUser.fullName || nameVal,
        role: roleUpper as UserRole,
        title: isStaff ? (authUser.title || 'System Administrator') : 'Verified Borrower',
        department: isStaff ? (authUser.department || 'Executive Administration') : 'Client Services',
      };
    }
    return defaultFallbackUser;
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    if (authUser && authUser.name !== 'Inactive User' && authUser.email !== 'inactive@example.com') {
      return ((authUser?.role || 'BORROWER').toUpperCase()) as UserRole;
    }
    return 'ADMIN';
  });

  useEffect(() => {
    if (authUser && authUser.name !== 'Inactive User' && authUser.email !== 'inactive@example.com') {
      const roleUpper = (authUser.role || 'BORROWER').toUpperCase();
      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'MANAGER', 'LOAN_OFFICER', 'CREDIT_OFFICER', 'CASHIER'].includes(roleUpper);
      const nameVal = authUser.name || authUser.fullName || authUser.username || 'User';
      const scopedUser: UserProfile = {
        ...authUser,
        name: nameVal,
        fullName: authUser.fullName || nameVal,
        role: roleUpper as UserRole,
        title: isStaff ? (authUser.title || 'System Administrator') : 'Verified Borrower',
        department: isStaff ? (authUser.department || 'Executive Administration') : 'Client Services',
      };
      setCurrentUser(scopedUser);
      setActiveRole(roleUpper as UserRole);
    } else if (authUser && (authUser.name === 'Inactive User' || authUser.email === 'inactive@example.com')) {
      setCurrentUser(defaultFallbackUser);
      setActiveRole('ADMIN');
    }
  }, [authUser]);

  // Safe 3-second fallback: if backend auth check takes > 3s, bypass loader to login / dashboard
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    // 1. Dismiss splash preloader immediately if already mounted
    if (typeof (window as any).apexHideLoader === 'function') {
      (window as any).apexHideLoader();
    }

    // 2. Maximum 3-second safe timeout fallback
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
      if (typeof (window as any).apexHideLoader === 'function') {
        (window as any).apexHideLoader();
      }
      // Direct DOM removal guard in case window.apexHideLoader wasn't defined or hung
      const splashNode = document.getElementById('apex-splash-loader');
      if (splashNode) {
        splashNode.classList.add('apex-loader-hidden');
        setTimeout(() => splashNode.remove(), 400);
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
        else if (path === '/reset-password') setAuthView('set_new_password');
        else {
          setAuthView('login');
          if (path.startsWith('/admin') || path.startsWith('/user') || path.startsWith('/settings') || path === '/portal' || path === '/my-loans' || path === '/verify-otp' || path === '/verify-email') {
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

      const userRole = (currentUser.role || activeRole || authUser?.role || 'ADMIN').toUpperCase();
      const isStaffRole = [
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERADMIN',
        'MANAGER',
        'ACCOUNTANT',
        'LOAN_OFFICER',
        'CREDIT_OFFICER',
        'CASHIER',
        'TELLER',
        'CHECKER',
      ].includes(userRole);
      const isBorrower = !isStaffRole;
      const isAdmin = isStaffRole;

      // 1. DEDICATED BORROWER PORTAL GATE & REDIRECTION:
      // If user.role === 'borrower', the default landing page must be /portal or /my-loans, NOT /dashboard.
      // Keep /dashboard, /admin/reports, /new-loan, and /borrowers strictly protected for admin, loan_officer, and teller.
      if (isBorrower) {
        if (
          path === '/dashboard' ||
          path === '/user/dashboard' ||
          path === '/admin/dashboard' ||
          path === '/admin' ||
          path === '/admin/reports' ||
          path.startsWith('/admin/reports') ||
          path === '/borrowers' ||
          path === '/admin/borrowers' ||
          path.startsWith('/admin/borrowers') ||
          path.startsWith('/admin') ||
          path === '/access-denied' ||
          path === '/login' ||
          path === '/' ||
          path === ''
        ) {
          replaceAppRoute('/my-loans');
          setCurrentRoute('/my-loans');
          setActiveTab('borrower_dashboard');
          return;
        }

        if (path === '/new-loan' || path === '/apply' || path === '/apply-loan') {
          replaceAppRoute(path === '/apply' ? '/apply' : '/apply-loan');
          setCurrentRoute(path === '/apply' ? '/apply' : '/apply-loan');
          setActiveTab('new-application');
          return;
        }
      }

      // 2. DEDICATED STAFF & ADMIN GATE:
      if (isStaffRole) {
        if (path === '/login' || path === '/' || path === '' || path === '/admin' || path === '/dashboard' || path === '/user/dashboard') {
          replaceAppRoute('/admin/dashboard');
          setCurrentRoute('/admin/dashboard');
          setActiveTab('dashboard');
          return;
        }

        if (path === '/borrowers') {
          replaceAppRoute('/admin/borrowers');
          setCurrentRoute('/admin/borrowers');
          setActiveTab('borrowers');
          return;
        }

        if (path === '/new-loan') {
          setOriginationMode('SELF');
          replaceAppRoute('/apply');
          setCurrentRoute('/apply');
          setActiveTab('new-application');
          return;
        }

        if (path === '/access-denied' || path === '/portal') {
          replaceAppRoute('/admin/dashboard');
          setCurrentRoute('/admin/dashboard');
          setActiveTab('dashboard');
          return;
        }
      }

      // 3. CANONICAL ROUTE DISPATCH
      if (path === '/admin/dashboard' || path === '/admin') {
        setActiveTab('dashboard');
      } else if (path === '/admin/analytics' || path === '/analytics') {
        setActiveTab('analytics');
      } else if (path.startsWith('/admin/borrowers/')) {
        const bId = path.replace('/admin/borrowers/', '');
        setSelectedBorrowerId(bId);
        setActiveTab('borrower-detail');
      } else if (path === '/admin/borrowers') {
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
      } else if (path === '/admin/payments' || path === '/admin/payment-history' || path === '/admin/payment_history') {
        setActiveTab('payment_history');
      } else if (path === '/admin/cashier') {
        setActiveTab('cashier');
      } else if (path === '/admin/overdue') {
        setActiveTab('overdue');
      } else if (path === '/admin/reports' || path === '/reports') {
        setActiveTab('reports');
      } else if (path === '/admin/notifications') {
        setActiveTab('notifications');
      } else if (path === '/admin/audit-logs' || path === '/admin/audit_logs') {
        setActiveTab('audit_logs');
      } else if (path === '/admin/settings' || path === '/admin/system-settings' || path === '/system-settings') {
        setActiveTab('system_config');
      } else if (path === '/admin/profile') {
        setActiveTab('profile');

        // USER & BORROWER ROUTES
      } else if (path === '/portal' || path === '/my-loans') {
        setActiveTab('borrower_dashboard');
      } else if (path === '/applications' || path === '/user/my_applications' || path === '/user/applications') {
        setOriginationMode('CLIENT');
        setActiveTab('applications');
      } else if (path === '/apply-loan' || path === '/apply' || path === '/user/apply_loan') {
        setOriginationMode('SELF');
        setActiveTab('new-application');
      } else if (path === '/loans' || path === '/user/my_loans' || path === '/user/loans') {
        setActiveTab('loans');
      } else if (path === '/repayments' || path === '/user/repayment_schedule' || path === '/user/repayments') {
        setRepaymentViewMode('SELF');
        setActiveTab('repayments');
      } else if (path === '/payments' || path === '/user/payments' || path === '/user/my_repayments' || path === '/pay-installment') {
        setRepaymentViewMode('CLIENT');
        setActiveTab('pay_installment');
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
          setActiveTab('borrowers');
          replaceAppRoute('/admin/borrowers');
        } else {
          setActiveTab('borrower_dashboard');
          replaceAppRoute('/my-loans');
        }
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    window.addEventListener('hashchange', handleUrlSync);
    return () => {
      window.removeEventListener('popstate', handleUrlSync);
      window.removeEventListener('hashchange', handleUrlSync);
    };
  }, [authIsAuthenticated, authUser]);

  // Auth Handlers
  const handleLoginSuccess = (user: UserProfile, token: string, rememberMe = true) => {
    contextSetSession(user, token, rememberMe);
    setAuthNotice(null);
    setAccessDeniedMessage(null);

    const userRole = (user.role || 'ADMIN').toUpperCase();
    const isStaff = [
      'SUPER_ADMIN',
      'ADMIN',
      'SUPERADMIN',
      'MANAGER',
      'ACCOUNTANT',
      'LOAN_OFFICER',
      'CREDIT_OFFICER',
      'CASHIER',
      'TELLER',
      'CHECKER'
    ].includes(userRole);
    if (isStaff) {
      replaceAppRoute('/admin/dashboard');
      setCurrentRoute('/admin/dashboard');
      setActiveTab('dashboard');
    } else {
      replaceAppRoute('/my-loans');
      setCurrentRoute('/my-loans');
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

  // Inactivity Lock permanently disabled
  useEffect(() => {
    try {
      localStorage.removeItem('apex_session_locked');
    } catch {
      // ignore
    }
  }, []);

  // Domain Entity State (Initialized for real database persistence)
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>(MOCK_PRODUCTS);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return notificationStorageService.getNotifications(true);
  });
  const [auditLogs, setAuditLogs] = useState<SystemActivityEvent[]>([]);

  // Selected Entity Keys
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('BOR-2026-0001');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('APP-2026-0014');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('LN-2026-0042');

  // Super Admin / Staff Dual-Mode Operation (Self-Borrowing vs Client Portfolio)
  const [originationMode, setOriginationMode] = useState<'SELF' | 'CLIENT'>('CLIENT');
  const [repaymentViewMode, setRepaymentViewMode] = useState<'SELF' | 'CLIENT'>('CLIENT');
  const [selectedPayInstallmentNo, setSelectedPayInstallmentNo] = useState<number | undefined>();
  const [selectedPayAmountUSD, setSelectedPayAmountUSD] = useState<number | undefined>();

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReceiptModal, setActiveReceiptModal] = useState<PaymentReceipt | null>(null);
  const [borrowerPaymentTarget, setBorrowerPaymentTarget] = useState<{
    loan: LoanAccount;
    installmentNo?: number;
    amount?: number;
  } | null>(null);

  // Sync API Data and Unified Persistent Ledger
  const reloadAllData = async () => {
    try {
      const isStaff = (authUser?.role || '').toUpperCase() === 'ADMIN';
      const [b, p, l, a, r, n, audits, unifiedLoans] = await Promise.all([
        api.getBorrowers().catch(() => []),
        api.getProducts().catch(() => []),
        api.getLoans().catch(() => []),
        api.getApplications().catch(() => []),
        api.getReceipts().catch(() => []),
        api.getNotifications().catch(() => []),
        isStaff ? api.getAuditLogs().catch(() => []) : Promise.resolve([]),
        loanStorageService.getAllLoansForAdmin().catch(() => []),
      ]);
      const unifiedBorrowers = loanStorageService.getBorrowers();
      const combinedBorrowers = (Array.isArray(b) && b.length > 0) ? b : unifiedBorrowers;
      setBorrowers(combinedBorrowers);

      if (Array.isArray(p) && p.length > 0) setProducts(p);

      // Map unified persistent loans to LoanAccount format
      const activeUnifiedLoans = (unifiedLoans || [])
        .filter((u: any) => u?.facility && (u.facility.status === 'ACTIVE' || u.facility.status === 'OVERDUE' || u.facility.status === 'IN_REPAYMENT'))
        .map((u: any) => ({
          id: u.id || `ln-${Date.now()}`,
          loanNumber: u.loanId || u.id || 'LN-2026-0000',
          borrowerId: u.borrower?.id || 'bor-8801',
          borrowerName: u.borrower?.nameEn || u.borrower?.fullName || 'Client Borrower',
          borrowerAvatar: '',
          productId: u.id,
          productName: u.facility?.productName || 'Credit Facility',
          productCode: 'SME-01',
          disbursementDate: u.submittedAt || new Date().toISOString(),
          firstPaymentDueDate: u.nextScheduledPayment?.dueDate || new Date().toISOString().split('T')[0],
          principalUSD: Number(u.principal?.disbursedAmountUSD || 0),
          interestRate: Number(u.principal?.aprPercent || 0),
          termMonths: Number(u.principal?.termMonths || 12),
          frequency: 'MONTHLY' as any,
          interestType: 'REDUCING_BALANCE' as any,
          totalInterestUSD: Math.round(Number(u.principal?.disbursedAmountUSD || 0) * (Number(u.principal?.aprPercent || 0) / 100)),
          totalPayableUSD: Math.round(Number(u.principal?.disbursedAmountUSD || 0) * (1 + Number(u.principal?.aprPercent || 0) / 100)),
          monthlyEMIUSD: Number(u.nextScheduledPayment?.scheduledEMIUSD || 0),
          outstandingBalanceUSD: Number(u.repaymentProgress?.outstandingBalanceUSD || 0),
          totalPaidUSD: Number(u.repaymentProgress?.totalPaidUSD || 0),
          status: (u.facility?.status || 'ACTIVE') as any,
          schedules: (Array.isArray(u.schedules) && u.schedules.length > 0 && !u.schedules.every((s: any) => Number(s.totalDue || s.totalDueUSD || 0) === 0))
            ? u.schedules.map((s: any, idx: number) => {
              const pVal = Number(s.principalUSD ?? s.principalDue ?? s.principal ?? 0);
              const iVal = Number(s.interestUSD ?? s.interestDue ?? s.interest ?? 0);
              const tVal = Number(s.totalDueUSD ?? s.totalDue ?? (pVal + iVal));
              return {
                ...s,
                installmentNo: s.installmentNo || idx + 1,
                dueDate: s.dueDate || '',
                principalUSD: pVal,
                principalDue: pVal,
                interestUSD: iVal,
                interestDue: iVal,
                totalDueUSD: tVal,
                totalDue: tVal,
                remainingAmountUSD: s.status === 'PAID' ? 0 : tVal,
                amountPaidUSD: s.status === 'PAID' ? tVal : (Number(s.amountPaidUSD || 0)),
                status: s.status || (idx === 0 ? 'DUE' : 'UPCOMING'),
              };
            })
            : generateAmortizationSchedule(
              Number(u.principal?.disbursedAmountUSD || (u as any)?.principalAmount || 0),
              Number(u.principal?.aprPercent || (u as any)?.interestRate || 6.5),
              Number(u.principal?.termMonths || (u as any)?.termMonths || 12)
            ),
        }));

      const isLedgerReset = loanStorageService.isLedgerCleared();
      const apiLoans = Array.isArray(l) ? l : [];
      const combinedLoans = isLedgerReset
        ? activeUnifiedLoans
        : [
            ...apiLoans,
            ...activeUnifiedLoans.filter(
              (ul: any) => !apiLoans.some((al: any) => al.loanNumber === ul.loanNumber || al.id === ul.id)
            ),
          ];
      setLoans(combinedLoans as any[]);

      // Map unified pending applications
      let globalRegUsers: Record<string, any> = {};
      try {
        globalRegUsers = JSON.parse(localStorage.getItem('apex_registered_users') || '{}');
      } catch {}

      const pendingUnifiedApps = (unifiedLoans || [])
        .filter((u: any) => u?.facility && (u.facility.status === 'UNDERWRITING_PENDING' || u.facility.status === 'APPROVED'))
        .map((u: any) => {
          const applicantName = u.borrower?.nameEn || u.borrower?.fullName || 'Client Borrower';
          const bId = u.borrower?.clientCode || u.borrower?.id || 'BOR-2026-8801';
          const matchedUser = (u.borrower?.email && globalRegUsers[u.borrower.email.toLowerCase()]) ||
                              globalRegUsers[bId] ||
                              globalRegUsers[applicantName.toLowerCase()] ||
                              Object.values(globalRegUsers).find((ru: any) =>
                                ru.name?.toLowerCase() === applicantName.toLowerCase() ||
                                ru.borrowerId === bId
                              ) || null;

          const email = u.borrower?.email || matchedUser?.email || `${applicantName.toLowerCase().replace(/\s+/g, '.')}@student.edu`;
          const phone = u.borrower?.phone || matchedUser?.phone || '+855 12 000 888';
          const dateOfBirth = (u.borrower as any)?.dateOfBirth || (u.borrower as any)?.dob || matchedUser?.dateOfBirth || matchedUser?.dob || '2001-08-15';
          const gender = (u.borrower as any)?.gender || matchedUser?.gender || 'Female';
          const residentialAddress = (u.borrower as any)?.residentialAddress || (u.borrower as any)?.address || matchedUser?.address || matchedUser?.residentialAddress || 'Preah Monivong Blvd, Sangkat BKK1, Phnom Penh, Cambodia';
          const occupation = u.borrower?.occupation || matchedUser?.occupation || 'Student / Entrepreneur';

          return {
            id: u.id || `app-${Date.now()}`,
            applicationNo: u.loanId || u.id || 'APP-2026-0000',
            borrowerId: bId,
            borrowerName: applicantName,
            borrowerAvatar: '',
            borrowerIncomeUSD: Number(u.borrower?.monthlyIncome || 2400),
            email,
            phone,
            dateOfBirth,
            gender,
            residentialAddress,
            occupation,
            productId: u.id,
            productName: u.facility?.productName || 'Credit Facility',
            requestedAmountUSD: Number(u.principal?.disbursedAmountUSD || 0),
            requestedTermMonths: Number(u.principal?.termMonths || 12),
            frequency: 'MONTHLY' as any,
            purpose: 'Commercial Working Capital',
            dtiRatio: 28.5,
            riskTier: 'LOW' as any,
            status: (u.facility.status === 'APPROVED' ? 'APPROVED' : 'UNDERWRITING_PENDING') as any,
            createdAt: u.submittedAt || new Date().toISOString(),
            documents: (u as any).documents || [],
            salarySlipDoc: (u as any).salarySlipDoc,
            collateralDoc: (u as any).collateralDoc,
          };
        });

      const apiApps = Array.isArray(a) ? a : [];
      const combinedApps = isLedgerReset
        ? pendingUnifiedApps
        : [
            ...pendingUnifiedApps,
            ...apiApps.filter(
              (ap: any) => !pendingUnifiedApps.some((pa: any) => pa.applicationNo === ap.applicationNo || pa.id === ap.id)
            ),
          ];
      setApplications(combinedApps as any[]);

      const unifiedReceipts = loanStorageService.getReceipts();
      const combinedReceipts = isLedgerReset
        ? unifiedReceipts
        : ((Array.isArray(r) && r.length > 0) ? r : unifiedReceipts);
      setReceipts(combinedReceipts);
      const storedNotifs = notificationStorageService.getNotifications(!isStaff);
      const combinedNotifs = (Array.isArray(n) && n.length > 0) ? n : storedNotifs;
      setNotifications(combinedNotifs);
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

  // Real-time DOM event listener for cross-tab and cross-component updates
  useEffect(() => {
    const handleUpdate = () => {
      reloadAllData();
    };
    window.addEventListener(LEDGER_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(LEDGER_UPDATE_EVENT, handleUpdate);
  }, []);

  // Real-time DOM event listener for notifications
  useEffect(() => {
    const unsub = notificationStorageService.subscribe((updated) => {
      setNotifications(updated);
    });
    return unsub;
  }, []);

  // Quick 1-Click Role Toggle (Admin vs Borrower) for development & testing
  const handleRoleToggle = (forcedRole?: 'ADMIN' | 'BORROWER') => {
    const userRole = (authUser?.role || currentUser.role || 'ADMIN').toUpperCase();
    const currentIsBorrower = ['BORROWER', 'CLIENT', 'USER'].includes(userRole);
    const targetRole = forcedRole || (currentIsBorrower ? 'ADMIN' : 'BORROWER');

    if (targetRole === 'ADMIN') {
      const adminProfile: UserProfile = {
        ...USER_PROFILES.ADMIN,
        id: 'user-admin-0001',
        username: 'admin',
        name: 'Sophea Pich',
        fullName: 'Sophea Pich',
        email: 'admin@jamsongvich.com',
        role: 'ADMIN',
        title: 'Senior Loan Director',
        department: 'Credit Operations',
        avatar: 'SP',
        branch: 'Phnom Penh Main Branch',
      };
      setCurrentUser(adminProfile);
      setActiveRole('ADMIN');
      contextSetSession(adminProfile, 'dev-admin-token', true);
      setAccessDeniedMessage(null);
      replaceAppRoute('/admin/dashboard');
      setCurrentRoute('/admin/dashboard');
      setActiveTab('dashboard');
    } else {
      const borrowerProfile: UserProfile = {
        ...USER_PROFILES.BORROWER,
        id: 'usr-borrower-0001',
        username: 'fong.ly',
        name: 'Fong Ly',
        fullName: 'Fong Ly',
        email: 'fong.ly@example.com',
        role: 'BORROWER',
        title: 'Client Borrower',
        department: 'Borrower Self-Service',
        avatar: 'FL',
        borrowerId: undefined,
        nationalId: '010992384',
        branch: 'Phnom Penh Main Branch',
      };
      setCurrentUser(borrowerProfile);
      setActiveRole('BORROWER');
      contextSetSession(borrowerProfile, 'dev-borrower-token', true);
      setAccessDeniedMessage(null);
      replaceAppRoute('/my-loans');
      setCurrentRoute('/my-loans');
      setActiveTab('borrower_dashboard');
    }
    reloadAllData();
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    const roleStr = String(newRole).toUpperCase();
    if (roleStr === 'ADMIN' || roleStr === 'MANAGER' || roleStr === 'LOAN_OFFICER' || roleStr === 'CASHIER' || roleStr === 'TELLER') {
      handleRoleToggle('ADMIN');
    } else {
      handleRoleToggle('BORROWER');
    }
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
    notificationStorageService.markAsRead(id);
    api.markNotificationRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    notificationStorageService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Breadcrumbs builder
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    switch (activeTab) {
      case 'dashboard':
        return [{ label: 'Executive Dashboard' }, { label: 'Operational Overview', active: true }];
      case 'user_dashboard':
        return [{ label: 'User Portal' }, { label: 'My Dashboard', active: true }];
      case 'borrower_dashboard':
        return [{ label: 'Core Banking' }, { label: 'My Loans', active: true }];
      case 'new-application':
        return [{ label: 'Core Banking' }, { label: 'Apply for Loan', active: true }];
      case 'repayments':
        return [{ label: 'Core Banking' }, { label: 'Repayment Schedule', active: true }];
      case 'cashier':
      case 'pay_installment':
        return [{ label: 'Core Banking' }, { label: isBorrowerRole ? 'Pay Installment' : 'Cashier Desk', active: true }];
      case 'payment_history':
        return [{ label: 'Executive Operations', onClick: () => handleNavSelection('/admin/payments') }, { label: 'User Payment History Management', active: true }];
      case 'borrowers':
        return [{ label: 'Core Banking', onClick: () => handleNavSelection('/admin/borrowers') }, { label: 'Active Facilities & Borrowers', active: true }];
      case 'borrower-detail':
        return [{ label: 'Borrowers', onClick: () => handleNavSelection('/admin/borrowers') }, { label: `360° Dossier (${selectedBorrowerId})`, active: true }];
      case 'applications':
        return [{ label: 'Loan Origination', onClick: () => handleNavSelection(currentUser.role === 'admin' ? '/admin/applications' : '/applications') }, { label: 'Pipeline Stages', active: true }];
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
    const activeUserRole = (currentUser.role || activeRole || authUser?.role || 'USER').toUpperCase();
    const isStaffRole = [
      'SUPER_ADMIN',
      'ADMIN',
      'SUPERADMIN',
      'MANAGER',
      'ACCOUNTANT',
      'LOAN_OFFICER',
      'CREDIT_OFFICER',
      'CASHIER',
      'TELLER',
      'CHECKER'
    ].includes(activeUserRole);
    const isAllowedAdminRole = [
      'SUPER_ADMIN',
      'ADMIN',
      'SUPERADMIN',
      'MANAGER',
      'ACCOUNTANT',
      'LOAN_OFFICER',
      'CREDIT_OFFICER',
      'CASHIER'
    ].includes(activeUserRole);
    const isAdmin = isStaffRole;
    const isBorrower = !isStaffRole;

    let targetPath = navTarget;

    // Normalize legacy IDs and targets to canonical routes
    if (navTarget === 'dashboard' || navTarget === '/dashboard' || navTarget === '/admin/dashboard' || navTarget === '/admin' || navTarget === 'admin') {
      targetPath = isAdmin ? '/admin/dashboard' : '/my-loans';
    } else if (
      navTarget === 'analytics' ||
      navTarget === '/admin/analytics' ||
      navTarget === '/analytics' ||
      navTarget === 'portfolio_intelligence' ||
      navTarget === 'risk_engine'
    ) {
      targetPath = isAdmin ? '/admin/analytics' : '/my-loans';
    } else if (navTarget.startsWith('/admin/borrowers/')) {
      const bId = navTarget.replace('/admin/borrowers/', '');
      setSelectedBorrowerId(bId);
      setActiveTab('borrower-detail');
      targetPath = navTarget;
    } else if (
      navTarget === 'borrowers' ||
      navTarget === 'admin_borrowers' ||
      navTarget === 'borrower_directory' ||
      navTarget === '/borrowers' ||
      navTarget === '/admin/borrowers' ||
      navTarget === '/admin/borrower'
    ) {
      targetPath = isAdmin ? '/admin/borrowers' : '/my-loans';
    } else if (
      navTarget === 'user_dashboard' ||
      navTarget === 'borrower_dashboard' ||
      navTarget === 'portal' ||
      navTarget === 'my-loans' ||
      navTarget === '/portal' ||
      navTarget === '/my-loans'
    ) {
      targetPath = isBorrower ? '/my-loans' : '/admin/dashboard';
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
      navTarget === 'self-apply' ||
      navTarget === 'apply_self' ||
      navTarget === '/apply'
    ) {
      setOriginationMode('SELF');
      targetPath = '/apply';
    } else if (
      navTarget === 'my-repayments' ||
      navTarget === 'my_repayments'
    ) {
      setRepaymentViewMode('SELF');
      targetPath = '/repayments';
    } else if (
      navTarget === 'applications' ||
      navTarget === 'admin_applications' ||
      navTarget === '/admin/applications'
    ) {
      setOriginationMode('CLIENT');
      targetPath = isAdmin ? '/admin/applications' : '/applications';
    } else if (navTarget === 'my_applications' || navTarget === '/applications') {
      targetPath = '/applications';
    } else if (
      navTarget === 'new-loan' ||
      navTarget === 'apply_loan' ||
      navTarget === 'apply-loan' ||
      navTarget === 'apply' ||
      navTarget === '/apply' ||
      navTarget === 'new-application' ||
      navTarget === '/apply-loan'
    ) {
      targetPath = '/apply-loan';
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
      navTarget === 'repayment-schedule' ||
      navTarget === '/repayment-schedule' ||
      navTarget === '/repayments'
    ) {
      targetPath = '/repayments';
    } else if (
      navTarget === 'payment_history' ||
      navTarget === 'admin_payments' ||
      navTarget === '/admin/payments' ||
      navTarget === '/admin/payment-history' ||
      navTarget === '/admin/payment_history'
    ) {
      targetPath = '/admin/payments';
    } else if (
      navTarget === 'pay_installment' ||
      navTarget === 'pay-installment' ||
      navTarget === '/pay-installment' ||
      navTarget === 'cashier' ||
      navTarget === 'cashier_desk' ||
      navTarget === 'payments' ||
      navTarget === 'my_repayments' ||
      navTarget === '/admin/cashier' ||
      navTarget === '/payments'
    ) {
      targetPath = isAdmin ? '/admin/cashier' : '/payments';
    } else if (navTarget === 'overdue' || navTarget === 'admin_overdue' || navTarget === '/admin/overdue') {
      targetPath = '/admin/overdue';
    } else if (navTarget === 'reports' || navTarget === 'admin_reports' || navTarget === '/admin/reports' || navTarget === '/reports') {
      targetPath = isAdmin ? '/admin/reports' : '/my-loans';
    } else if (navTarget === 'notifications' || navTarget === 'admin_notifications' || navTarget === '/admin/notifications') {
      targetPath = isAdmin ? '/admin/notifications' : '/notifications';
    } else if (navTarget === 'audit_logs' || navTarget === 'audit-logs' || navTarget === 'admin_audit_logs' || navTarget === '/admin/audit-logs') {
      targetPath = '/admin/audit-logs';
    } else if (
      navTarget === 'system_config' ||
      navTarget === 'admin_settings' ||
      navTarget === '/admin/settings' ||
      navTarget === '/system-settings' ||
      navTarget === '/admin/system-settings'
    ) {
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
    if (isBorrower) {
      if (
        targetPath.startsWith('/admin') ||
        targetPath === '/dashboard' ||
        targetPath === '/borrowers' ||
        targetPath === '/admin/reports'
      ) {
        replaceAppRoute('/my-loans');
        setCurrentRoute('/my-loans');
        setActiveTab('borrower_dashboard');
        return;
      }
      if (targetPath === '/apply-loan' || targetPath === '/new-loan') {
        replaceAppRoute('/apply-loan');
        setCurrentRoute('/apply-loan');
        setActiveTab('new-application');
        return;
      }
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
    } else if (targetPath === '/admin/dashboard' || targetPath === '/admin') {
      setActiveTab('dashboard');
    } else if (targetPath === '/admin/analytics' || targetPath === '/analytics') {
      setActiveTab('analytics');
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
    } else if (targetPath === '/apply-loan' || targetPath === '/apply') {
      setActiveTab('new-application');
    } else if (targetPath === '/admin/credit_reviews' || targetPath === '/admin/credit-reviews') {
      setActiveTab('credit_reviews');
    } else if (targetPath === '/admin/approvals') {
      setActiveTab('approvals');
    } else if (targetPath === '/admin/disbursements') {
      setActiveTab('disbursements');
    } else if (targetPath === '/admin/loans' || targetPath === '/loans') {
      setActiveTab('loans');
    } else if (targetPath === '/repayments' || targetPath === '/repayment-schedule') {
      setActiveTab('repayments');
    } else if (targetPath === '/admin/payments') {
      setActiveTab('cashier');
    } else if (targetPath === '/payments' || targetPath === '/pay-installment') {
      setActiveTab(isBorrower ? 'pay_installment' : 'cashier');
    } else if (targetPath === '/admin/overdue') {
      setActiveTab('overdue');
    } else if (targetPath === '/admin/reports' || targetPath === '/reports') {
      setActiveTab('reports');
    } else if (targetPath === '/admin/notifications' || targetPath === '/notifications') {
      setActiveTab('notifications');
    } else if (targetPath === '/admin/audit-logs' || targetPath === '/admin/audit_logs') {
      setActiveTab('audit_logs');
    } else if (targetPath === '/admin/settings' || targetPath === '/system-settings') {
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
    { type: 'settings', id: 'SETTINGS', title: 'System Settings & Institutional Policies', sub: 'Lending policies, interest rules, currency, security', tab: 'system_config' },
    { type: 'settings', id: 'USER-SETTINGS', title: 'Account Settings & Preferences', sub: 'Profile security, notifications, display currency, credentials', tab: 'user_settings' },
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

  const staffPersonalLoans = loans.filter((l) => {
    if (l.borrowerId === currentUser.id || (currentBorrowerId && l.borrowerId === currentBorrowerId)) return true;
    if (l.borrowerName && currentClientName && (l.borrowerName.toLowerCase().includes(currentClientName) || currentClientName.includes(l.borrowerName.toLowerCase()))) return true;
    return false;
  });

  const userDisplayLoans = isBorrowerRole
    ? userFilteredLoans
    : ((activeTab === 'borrower_dashboard' || activeTab === 'pay_installment' || (activeTab === 'repayments' && repaymentViewMode === 'SELF')) && staffPersonalLoans.length > 0
      ? staffPersonalLoans
      : loans);

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
    const rLoan = r.loanId || r.loanNumber;
    if (rLoan && userDisplayLoans.some((l) => l.id === rLoan || l.loanNumber === rLoan)) return true;
    return false;
  });
  const userDisplayReceipts = isBorrowerRole
    ? userFilteredReceipts
    : receipts;

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
      let receipt: any;
      try {
        receipt = await api.recordPayment({
          loanId: paymentInput.loanNumber || paymentInput.loanId || selectedLoanId,
          amount: paymentInput.amountPaidUSD || paymentInput.amount,
          method: paymentInput.paymentMethod || paymentInput.method || 'CASH',
          referenceNo: paymentInput.transactionRef || paymentInput.referenceNo,
          notes: paymentInput.notes || 'Recorded via window cashier POS',
        });
      } catch {
        receipt = await loanStorageService.recordPayment({
          loanId: paymentInput.loanNumber || paymentInput.loanId || selectedLoanId,
          amount: paymentInput.amountPaidUSD || paymentInput.amount,
          paymentMethod: paymentInput.paymentMethod || paymentInput.method || 'CASH',
          referenceNo: paymentInput.transactionRef || paymentInput.referenceNo,
          receiptNo: paymentInput.receiptNo,
          notes: paymentInput.notes || 'Recorded via window cashier POS',
          cashierName: currentUser.name || 'Emily Ross (Cashier)',
        });
      }
      await reloadAllData();
      setActiveReceiptModal(receipt);
      alert(`Payment of $${(receipt.amountPaidUSD || paymentInput.amount).toFixed(2)} recorded successfully! Receipt #${receipt.receiptNo}`);
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(`Payment failed: ${err.message || 'Error recording payment'}`);
    }
  };

  const handleApplicationSubmit = async (appData: Partial<LoanApplication>, isDraft = false) => {
    try {
      const created = await api.submitApplication({
        ...appData,
        borrowerId: appData.borrowerId || currentUser.borrowerId || selectedBorrowerId || activeBorrower?.id || 'BOR-2026-0001',
        productId: appData.productId || products[0]?.id,
        requestedAmountUSD: appData.requestedAmountUSD || 5000,
        requestedTermMonths: appData.requestedTermMonths || 12,
        purpose: appData.purpose || 'Institutional credit facility',
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
      });
      await reloadAllData();
      if (created?.id) setSelectedApplicationId(created.id);
      if (isBorrowerRole) {
        setActiveTab('borrower_dashboard');
        replaceAppRoute('/my-loans');
        setCurrentRoute('/my-loans');
      } else {
        setActiveTab('applications');
        replaceAppRoute('/admin/applications');
        setCurrentRoute('/admin/applications');
      }
      alert(`Application ${created?.applicationNo || 'submitted'} ${isDraft ? 'saved as draft' : 'submitted for underwriting'}!`);
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
    const targetApp = applications.find((a) => a.id === appId || a.applicationNo === appId);
    const applicantName = targetApp?.borrowerName || 'Applicant';

    try {
      if (decision === 'APPROVED') {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId || a.applicationNo === appId
              ? { ...a, status: 'APPROVED' as any }
              : a
          )
        );

        // Update local unified storage first to guarantee persistence across reloads:
        // Set to ACTIVE immediately so the borrower gets their active loan and repayment schedule
        await loanStorageService.updateLoanStatus(
          appId,
          'ACTIVE',
          terms?.reason || 'Approved by Executive Committee',
          terms
        );

        if (!isStaticHost) {
          try {
            await api.approveApplication(appId, {
              amount: terms?.amount,
              term: terms?.term,
              rate: terms?.rate,
              reason: terms?.reason || 'Approved by Executive Committee',
            });
            // Automatically disburse/activate in backend ledger without manual cashier queue
            await api.disburseLoan(appId, {
              disbursementMethod: 'BANK_TRANSFER',
              disbursementReference: `DISB-${Date.now().toString().slice(-6)}`,
              firstPaymentDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              notes: 'Auto-activated upon Committee Approval'
            }).catch(() => null);
          } catch (apiErr: any) {
            console.warn('API approveApplication issue, synced with unified storage:', apiErr);
          }
        }

        await reloadAllData();
        alert(`Application ${targetApp?.applicationNo || appId} for ${applicantName} successfully APPROVED! Facility is now active.`);
        setActiveTab('approvals');
      } else {
        if (!terms?.reason?.trim()) {
          alert('A rejection reason is strictly mandatory.');
          return;
        }

        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId || a.applicationNo === appId
              ? { ...a, status: 'REJECTED' as any }
              : a
          )
        );

        await loanStorageService.updateLoanStatus(
          appId,
          'REJECTED',
          terms.reason
        );

        if (!isStaticHost) {
          try {
            await api.rejectApplication(appId, terms.reason);
          } catch (apiErr: any) {
            console.warn('API rejectApplication issue, synced with unified storage:', apiErr);
          }
        }

        await reloadAllData();
        alert(`Application ${appId} for ${applicantName} marked as REJECTED.`);
        setActiveTab('approvals');
      }
    } catch (err: any) {
      console.error('Executive decision fallback:', err);
      try {
        await loanStorageService.updateLoanStatus(
          appId,
          decision,
          terms?.reason || `Application ${decision.toLowerCase()} by administrator`,
          terms
        );
        await reloadAllData();
        alert(`Application ${appId} for ${applicantName} successfully ${decision}!`);
      } catch {
        alert(`Application ${appId} for ${applicantName} processed as ${decision}.`);
      }
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
          onRegisterSuccess={(email, user, token) => {
            if (user && token) {
              handleLoginSuccess(user, token, true);
            } else {
              setAuthNotice('Account registered successfully! Welcome to Jam Song Vich.');
              setAuthView('login');
              pushAppRoute('/login');
            }
          }}
          onNavigateToLogin={() => {
            setAuthNotice(null);
            setAuthView('login');
            pushAppRoute('/login');
          }}
        />
      );
    }

    if (authView === 'forgot_password') {
      return (
        <ForgotPasswordPage
          onOtpSent={(email) => {
            setAuthEmail(email);
            setAuthView('set_new_password');
            pushAppRoute('/reset-password');
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

  const activeFacilitiesCount = loans.filter((l: any) => {
    const st = ((l.status || l.facility?.status) || '').toUpperCase();
    return st === 'ACTIVE' || st === 'IN_REPAYMENT' || st === 'OVERDUE';
  }).length;
  const overdueLoansCount = loans.filter((l: any) => {
    const st = ((l.status || l.facility?.status) || '').toUpperCase();
    return st === 'OVERDUE' || (l.daysOverdue && l.daysOverdue > 0);
  }).length;
  const pendingApprovalsCount = applications.filter((a: any) => {
    const st = (a.status || '').toUpperCase();
    return (
      st === 'SUBMITTED' ||
      st === 'PENDING' ||
      st === 'UNDER_REVIEW' ||
      st === 'UNDERWRITING_PENDING'
    );
  }).length;

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
        onRoleToggle={handleRoleToggle}
        currency={currency}
        onToggleCurrency={(c) => setCurrency(c)}
        onSearchOpen={() => setSearchModalOpen(true)}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        activeFacilitiesCount={activeFacilitiesCount}
        overdueCount={overdueLoansCount}
        pendingApprovalsCount={pendingApprovalsCount}
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
            if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN') {
              return (
                <AdminDashboard
                  currency={currency}
                  onNavigate={handleNavSelection}
                  loans={loans}
                  borrowers={borrowers}
                  applications={applications}
                  receipts={receipts}
                  focusMode="OVERVIEW"
                  initialViewMode="LEDGER"
                />
              );
            }
            return (
              <BorrowerDashboard
                currentUser={currentUser}
                currency={currency}
                loans={userDisplayLoans}
                applications={userDisplayApps}
                receipts={userDisplayReceipts}
                onNavigate={handleNavSelection}
                onOpenApplyLoan={() => handleNavSelection('new-application')}
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
              onOpenApplyLoan={() => handleNavSelection('new-application')}
              onOpenQuickPayment={(loanId, instNo, amt) => openPaymentForBorrowerOrStaff(loanId, instNo, amt)}
              onViewReceipt={(rec) => setActiveReceiptModal(rec)}
            />
          )}

          {/* SCREEN 1: Active Facilities & Borrowers Control Center */}
          {isStaffRole && (activeTab === 'borrowers' || activeTab === 'admin_borrowers' || activeTab === 'borrower_directory') && (
            <AdminDashboard
              currency={currency}
              onNavigate={handleNavSelection}
              loans={loans}
              borrowers={borrowers}
              applications={applications}
              receipts={receipts}
              focusMode="FACILITIES"
              initialViewMode="LEDGER"
            />
          )}

          {!isStaffRole && (activeTab === 'borrowers' || activeTab === 'admin_borrowers' || activeTab === 'borrower_directory') && (
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
                (l) => l.borrowerId === activeBorrower.borrowerId ||
                  l.borrowerId === activeBorrower.id ||
                  (l.borrowerName && activeBorrower.fullName && l.borrowerName.toLowerCase().includes(activeBorrower.fullName.toLowerCase()))
              )}
              receipts={receipts.filter(
                (r) => r.borrowerId === activeBorrower.borrowerId ||
                  r.borrowerId === activeBorrower.id ||
                  (r.borrowerName && activeBorrower.fullName && r.borrowerName.toLowerCase().includes(activeBorrower.fullName.toLowerCase()))
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

          {/* SCREEN 2: Loan Applications Pipeline & Management */}
          {activeTab === 'applications' && (
            isBorrowerRole ? (
              <ApplicationPipelineList
                applications={userDisplayApps}
                currency={currency}
                currentUserRole={activeRole}
                onSelectApplication={(appId) => {
                  setSelectedApplicationId(appId);
                  setActiveTab('risk_assessment');
                }}
                onOpenNewApplication={() => setActiveTab('new-application')}
                onAssessApplication={(appId) => {
                  setSelectedApplicationId(appId);
                  setActiveTab('risk_assessment');
                }}
              />
            ) : (
              <LoanApplicationManagement
                applications={applications}
                currency={currency}
                currentUserRole={activeRole}
                currentUserName={currentUser.name}
                onExecutiveDecision={handleExecutiveDecision}
              />
            )
          )}

          {activeTab === 'new-application' && (
            <div className="space-y-4">
              {isStaffRole && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      {originationMode === 'SELF' ? <UserCheck className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          {originationMode === 'SELF' ? 'Executive Self-Borrowing Application' : 'Client Loan Origination Wizard'}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {originationMode === 'SELF' ? 'Borrow for Myself' : 'Originate for Client'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {originationMode === 'SELF'
                          ? `Apply for a personal credit facility under your Super Admin profile (${currentUser.name || 'System Administrator'}). Directly enters Underwriting Queue.`
                          : 'Issue a new credit facility on behalf of a registered borrower in the customer database.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      onClick={() => setOriginationMode('SELF')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${originationMode === 'SELF'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Borrow for Myself
                    </button>
                    <button
                      onClick={() => setOriginationMode('CLIENT')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${originationMode === 'CLIENT'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Originate for Client
                    </button>
                  </div>
                </div>
              )}

              {(!isStaffRole || originationMode === 'SELF') ? (
                <BorrowerApplyLoanView
                  currentUser={currentUser}
                  currency={currency}
                  onNavigate={handleNavSelection}
                  onSubmitSuccess={() => reloadAllData()}
                />
              ) : (
                <LoanApplicationWizard
                  borrowers={borrowers}
                  products={products}
                  currency={currency}
                  currentUser={currentUser}
                  currentUserRole={activeRole}
                  onCancel={() => handleNavSelection('applications')}
                  onSubmitApplication={handleApplicationSubmit}
                />
              )}
            </div>
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

          {/* SCREEN 4: Loan Approvals & Management Desk */}
          {activeTab === 'approvals' && (
            <LoanApplicationManagement
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
            isBorrowerRole ? (
              <BorrowerPayInstallmentView
                currentUser={currentUser}
                currency={currency}
                loans={userDisplayLoans}
                initialAmountUSD={
                  userDisplayLoans[0]?.schedules?.find((s: any) => s.status !== 'PAID')?.totalDueUSD ||
                  (userDisplayLoans[0] as any)?.monthlyEMIUSD ||
                  183.89
                }
                initialInstallmentNo={
                  userDisplayLoans[0]?.schedules?.find((s: any) => s.status !== 'PAID')?.installmentNo || 1
                }
                onNavigate={handleNavSelection}
                onPaymentSettled={async (receipt) => {
                  if (receipt) {
                    await loanStorageService.recordPayment({
                      loanId: (receipt as any).facilityId || (receipt as any).loanAccountId || (userDisplayLoans[0]?.id || 'ln-001'),
                      amount: receipt.settledAmountUSD || receipt.amountUSD || (receipt as any).amountPaidUSD || 183.89,
                      paymentMethod: receipt.paymentMethod || 'KHQR',
                      referenceNo: receipt.transactionReference || (receipt as any).referenceNo,
                      receiptNo: receipt.receiptNumber || (receipt as any).receiptNo,
                      notes: 'Settled via Bakong KHQR dynamic gateway',
                      cashierName: 'Bakong Universal Gateway',
                    });
                  }
                  await reloadAllData();
                }}
              />
            ) : (
              <div className="space-y-4">
                {isStaffRole && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Looking to pay your own personal loan installment?
                        </p>
                        <p className="text-[11px] text-slate-400">
                          This is the institutional Cashier Desk for collecting client payments. Switch to view your personal schedule and pay with Bakong KHQR.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRepaymentViewMode('SELF');
                        handleNavSelection('my-repayments');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Pay My Personal Installment →
                    </button>
                  </div>
                )}
                <CashierPaymentTerminal
                  loans={isBorrowerRole ? userDisplayLoans : loans}
                  receipts={isBorrowerRole ? userDisplayReceipts : receipts}
                  currency={currency}
                  cashierName={currentUser.name}
                  currentUserRole={activeRole}
                  onRecordPayment={handleRecordPayment}
                  initialSelectedLoanId={selectedLoanId}
                />
              </div>
            )
          )}

          {/* SCREEN: Dedicated Borrower Pay Installment (Bakong KHQR) */}
          {activeTab === 'pay_installment' && (
            <BorrowerPayInstallmentView
              currentUser={currentUser}
              currency={currency}
              loans={userDisplayLoans}
              initialAmountUSD={
                selectedPayAmountUSD ||
                userDisplayLoans[0]?.schedules?.find((s: any) => s.status !== 'PAID')?.totalDueUSD ||
                (userDisplayLoans[0] as any)?.monthlyEMIUSD ||
                183.89
              }
              initialInstallmentNo={
                selectedPayInstallmentNo ||
                userDisplayLoans[0]?.schedules?.find((s: any) => s.status !== 'PAID')?.installmentNo || 1
              }
              onNavigate={handleNavSelection}
              onPaymentSettled={async (receipt) => {
                if (receipt) {
                  await loanStorageService.recordPayment({
                    loanId: (receipt as any).facilityId || (receipt as any).loanAccountId || (userDisplayLoans[0]?.id || 'ln-001'),
                    amount: receipt.settledAmountUSD || receipt.amountUSD || (receipt as any).amountPaidUSD || 183.89,
                    paymentMethod: receipt.paymentMethod || 'KHQR',
                    referenceNo: receipt.transactionReference || (receipt as any).referenceNo,
                    receiptNo: receipt.receiptNumber || (receipt as any).receiptNo,
                    notes: 'Settled via Bakong KHQR dynamic gateway',
                    cashierName: 'Bakong Universal Gateway',
                  });
                }
                await reloadAllData();
              }}
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

          {/* SCREEN: Super Admin User Payment History Management */}
          {activeTab === 'payment_history' && (
            <PaymentHistoryManagement
              currency={currency}
              onNavigate={handleNavSelection}
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

          {/* Executive Data Analytics & Portfolio Intelligence Dashboard (Super Admin Core Banking) */}
          {activeTab === 'analytics' && (
            <ExecutiveAnalyticsDashboard
              currency={currency}
              onNavigate={handleNavSelection}
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
              onMarkAllRead={handleMarkAllNotificationsRead}
              onNavigateToAction={(linkId, category) => {
                if (linkId) {
                  if (linkId.startsWith('/')) {
                    handleNavSelection(linkId);
                  } else if (category === 'PAYMENT_DUE' || category === 'OVERDUE') {
                    setSelectedLoanId(linkId);
                    handleNavSelection(isBorrowerRole ? '/repayments' : (currentUser.role === 'admin' ? '/admin/payments' : '/payments'));
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
            isBorrowerRole ? (
              <BorrowerProfileView
                currentUser={currentUser}
                currency={currency}
                onNavigate={handleNavSelection}
                onUpdateUser={(updated) => setCurrentUser(updated)}
              />
            ) : (
              <UserProfileView
                currentUser={currentUser}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onChangePassword={() => handleNavSelection('/settings/change-password')}
              />
            )
          )}

          {/* SCREEN 16: Standard User Settings */}
          {activeTab === 'user_settings' && (
            isBorrowerRole ? (
              <BorrowerSettingsView
                currentUser={currentUser}
                currency={currency}
                onToggleCurrency={(c) => setCurrency(c)}
                onNavigate={handleNavSelection}
                onShowToast={(msg) => alert(msg)}
              />
            ) : (
              <UserSettingsView
                currentUser={currentUser}
                currency={currency}
                onToggleCurrency={(c) => setCurrency(c)}
                onChangePassword={() => handleNavSelection('/settings/change-password')}
                onShowToast={(msg) => alert(msg)}
              />
            )
          )}

          {/* SCREEN 17: User Repayment Schedule */}
          {activeTab === 'repayments' && (
            <div className="space-y-4">
              {isStaffRole && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                      {repaymentViewMode === 'SELF' ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          {repaymentViewMode === 'SELF' ? 'My Personal Repayment Schedule & Bakong Settlement' : 'Portfolio Loan Repayments & Ledger'}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                          {repaymentViewMode === 'SELF' ? 'Personal Account' : 'Institutional Ledger'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {repaymentViewMode === 'SELF'
                          ? `Review your personal 12-month installment schedule (${currentUser.name || 'System Administrator'}) and settle installments with Bakong KHQR.`
                          : 'Monitor customer repayment cycles, overdue aging buckets, and collection journals across all facilities.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      onClick={() => setRepaymentViewMode('SELF')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${repaymentViewMode === 'SELF'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      My Personal Schedule
                    </button>
                    <button
                      onClick={() => setRepaymentViewMode('CLIENT')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${repaymentViewMode === 'CLIENT'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Portfolio Schedule
                    </button>
                  </div>
                </div>
              )}

              {(!isStaffRole || repaymentViewMode === 'SELF') ? (
                <BorrowerRepaymentScheduleView
                  currentUser={currentUser}
                  currency={currency}
                  loans={userDisplayLoans}
                  onNavigate={handleNavSelection}
                  onOpenPayInstallment={(cycle, amt) => {
                    setSelectedPayInstallmentNo(cycle);
                    setSelectedPayAmountUSD(amt);
                    handleNavSelection('/pay-installment');
                  }}
                />
              ) : (
                <UserRepaymentsView
                  loans={loans}
                  currentUser={currentUser}
                  currency={currency}
                  onOpenPaymentForLoan={(loanId, instNo, amt) => openPaymentForBorrowerOrStaff(loanId, instNo, amt)}
                />
              )}
            </div>
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
            await loanStorageService.recordPayment({
              loanId: receipt.loanNumber || borrowerPaymentTarget.loan.loanNumber || borrowerPaymentTarget.loan.id,
              amount: receipt.amountPaidUSD,
              paymentMethod: receipt.paymentMethod,
              referenceNo: receipt.referenceNo || receipt.transactionRef,
              receiptNo: receipt.receiptNo,
              notes: receipt.notes,
              cashierName: receipt.cashierName,
              installmentNo: receipt.installmentNo,
            });
            await reloadAllData();
            setActiveReceiptModal(receipt);
          }}
        />
      )}
    </>
  );
};

export default App;
