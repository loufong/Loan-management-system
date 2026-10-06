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

import { Search, X, DollarSign, FileText, User, CreditCard, Shield } from 'lucide-react';
import { api } from './services/api';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { OtpVerificationPage } from './components/auth/OtpVerificationPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { SetNewPasswordPage } from './components/auth/SetNewPasswordPage';
import { useAuth } from './context/AuthContext';

type AuthView = 'login' | 'register' | 'otp_verify' | 'forgot_password' | 'set_new_password';

export const App: React.FC = () => {
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
  const [authOtpPurpose, setAuthOtpPurpose] = useState<'register_verification' | 'forgot_password'>('register_verification');
  const [authResetToken, setAuthResetToken] = useState<string>('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeRole, setActiveRole] = useState<UserRole>(() => authUser?.role || 'MANAGER');
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authUser || USER_PROFILES.MANAGER);
  const [currency, setCurrency] = useState<Currency>('USD');
  const selectedBranch = currentUser.branch || 'Phnom Penh Main Branch';

  // Sync state when authenticated user profile updates
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
      setActiveRole(authUser.role);
    }
  }, [authUser]);

  // Auth Handlers
  const handleLoginSuccess = (user: UserProfile, token: string, rememberMe = true) => {
    contextSetSession(user, token, rememberMe);
    setCurrentUser(user);
    setActiveRole(user.role);
    setAuthNotice(null);

    if (user.role === 'BORROWER') {
      setSelectedBorrowerId(user.borrowerId || 'BOR-2026-0001');
      setActiveTab('dashboard'); // Direct to dynamic borrower dashboard
    } else if (user.role === 'CASHIER') {
      setActiveTab('cashier');
    } else if (user.role === 'LOAN_OFFICER') {
      setActiveTab('credit_reviews');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    await contextLogout();
    setAuthView('login');
    setAuthNotice(null);
  };

  // Domain Entity State
  const [borrowers, setBorrowers] = useState<Borrower[]>(MOCK_BORROWERS);
  const [products, setProducts] = useState<LoanProduct[]>(MOCK_PRODUCTS);
  const [loans, setLoans] = useState<LoanAccount[]>(MOCK_LOANS);
  const [applications, setApplications] = useState<LoanApplication[]>(MOCK_APPLICATIONS);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(MOCK_RECEIPTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<SystemActivityEvent[]>(MOCK_AUDIT_LOGS);

  // Selected Entity Keys
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('BOR-2026-0001');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('APP-2026-0014');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('LN-2026-0042');

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReceiptModal, setActiveReceiptModal] = useState<PaymentReceipt | null>(null);

  // Sync API Data on Mount
  useEffect(() => {
    async function loadData() {
      try {
        const [b, p, l, a] = await Promise.all([
          api.getBorrowers(),
          api.getProducts(),
          api.getLoans(),
          api.getApplications(),
        ]);
        if (b?.length) setBorrowers(b);
        if (p?.length) setProducts(p);
        if (l?.length) setLoans(l);
        if (a?.length) setApplications(a);
      } catch (err) {
        console.warn('Using local demo data (API server unavailable):', err);
      }
    }
    loadData();
  }, []);

  // Handle Role Switch
  const handleRoleSwitch = (newRole: UserRole) => {
    setActiveRole(newRole);
    const profile = USER_PROFILES[newRole] || USER_PROFILES.MANAGER;
    setCurrentUser(profile);
    api.login(profile.username, newRole).catch(() => {});

    if (newRole === 'BORROWER') {
      setSelectedBorrowerId('BOR-2026-0001');
      setActiveTab('borrower-detail');
    } else if (newRole === 'CASHIER') {
      setActiveTab('cashier');
    } else if (newRole === 'LOAN_OFFICER') {
      setActiveTab('credit_reviews');
    } else {
      setActiveTab('dashboard');
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Breadcrumbs builder
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    switch (activeTab) {
      case 'dashboard':
        return [{ label: 'Executive Dashboard' }, { label: 'Operational Overview', active: true }];
      case 'borrowers':
        return [{ label: 'Institutional Registry', onClick: () => setActiveTab('borrowers') }, { label: 'Borrowers Directory', active: true }];
      case 'borrower-detail':
        return [{ label: 'Borrowers', onClick: () => setActiveTab('borrowers') }, { label: `360° Dossier (${selectedBorrowerId})`, active: true }];
      case 'applications':
        return [{ label: 'Loan Origination', onClick: () => setActiveTab('applications') }, { label: 'Pipeline Stages', active: true }];
      case 'new-application':
        return [{ label: 'Applications', onClick: () => setActiveTab('applications') }, { label: 'New Loan Wizard', active: true }];
      case 'credit_reviews':
        return [{ label: 'Underwriting', onClick: () => setActiveTab('credit_reviews') }, { label: 'Credit Review Queue', active: true }];
      case 'risk_assessment':
        return [{ label: 'Underwriting', onClick: () => setActiveTab('credit_reviews') }, { label: `DTI Risk Workbench (${selectedApplicationId})`, active: true }];
      case 'approvals':
        return [{ label: 'Credit Committee' }, { label: 'Executive Approvals Queue', active: true }];
      case 'loans':
        return [{ label: 'Core Banking', onClick: () => setActiveTab('loans') }, { label: 'Active Facilities Directory', active: true }];
      case 'loan-detail':
        return [{ label: 'Core Banking', onClick: () => setActiveTab('loans') }, { label: `Amortization Schedule (${selectedLoanId})`, active: true }];
      case 'cashier':
        return [{ label: 'Cashier Desk' }, { label: 'Payment Collection Terminal', active: true }];
      case 'overdue':
        return [{ label: 'Risk Management' }, { label: 'Overdue Delinquency Watchlist', active: true }];
      case 'loan_products':
        return [{ label: 'Product Administration' }, { label: 'Loan Products Catalog', active: true }];
      case 'reports':
        return [{ label: 'Business Intelligence' }, { label: 'Portfolio Reports Studio', active: true }];
      case 'audit_logs':
        return [{ label: 'System Governance' }, { label: 'Immutable Audit Trail', active: true }];
      case 'user_management':
        return [{ label: 'Administration' }, { label: 'User Roles & Access Control', active: true }];
      case 'system_config':
        return [{ label: 'Administration' }, { label: 'System Settings & Lending Policies', active: true }];
      default:
        return [{ label: 'Apex LMS Core Banking', active: true }];
    }
  };

  // Sidebar navigation mapping
  const handleNavSelection = (navId: string) => {
    if (navId === 'borrower_portal') {
      setSelectedBorrowerId('BOR-2026-0001');
      setActiveTab('borrower-detail');
    } else if (navId === 'apply_loan') {
      setActiveTab('new-application');
    } else if (navId === 'my_loans') {
      setActiveTab('loans');
    } else if (navId === 'my_repayments') {
      setActiveTab('cashier');
    } else if (navId === 'borrowers') {
      setActiveTab('borrowers');
    } else if (navId === 'applications') {
      setActiveTab('applications');
    } else if (navId === 'loan_products') {
      setActiveTab('loan_products');
    } else if (navId === 'credit_reviews') {
      setActiveTab('credit_reviews');
    } else if (navId === 'risk_assessment') {
      setActiveTab('risk_assessment');
    } else if (navId === 'cashier_desk' || navId === 'disbursements' || navId === 'receipts') {
      setActiveTab('cashier');
    } else if (navId === 'approvals') {
      setActiveTab('approvals');
    } else if (navId === 'loans') {
      setActiveTab('loans');
    } else if (navId === 'overdue') {
      setActiveTab('overdue');
    } else if (navId === 'reports') {
      setActiveTab('reports');
    } else if (navId === 'audit_logs') {
      setActiveTab('audit_logs');
    } else if (navId === 'user_management') {
      setActiveTab('user_management');
    } else if (navId === 'system_config') {
      setActiveTab('system_config');
    } else {
      setActiveTab('dashboard');
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

  // Callback Handlers
  const handleRecordPayment = (receipt: PaymentReceipt) => {
    setReceipts((prev) => [receipt, ...prev]);
    // Reconcile loan outstanding balance
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id === receipt.loanNumber || l.loanNumber === receipt.loanNumber) {
          const newOutstanding = Math.max(0, l.outstandingBalanceUSD - receipt.amountPaidUSD);
          const newPaid = l.totalPaidUSD + receipt.amountPaidUSD;
          return {
            ...l,
            outstandingBalanceUSD: newOutstanding,
            totalPaidUSD: newPaid,
            status: newOutstanding <= 0 ? 'COMPLETED' : l.status,
          };
        }
        return l;
      })
    );

    // Record audit event
    const newAudit: SystemActivityEvent = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'PAYMENT_COLLECTED_AT_WINDOW',
      actionCategory: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityReference: receipt.receiptNo,
      ipAddress: '192.168.1.104',
      amountUSD: receipt.amountPaidUSD,
      details: {
        loanNumber: receipt.loanNumber,
        borrower: receipt.borrowerName,
        paymentMethod: receipt.paymentMethod,
        ref: receipt.transactionRef
      }
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
    setActiveReceiptModal(receipt);
  };

  const handleApplicationSubmit = async (appData: Partial<LoanApplication>, isDraft = false) => {
    const created: LoanApplication = {
      id: appData.applicationNo || `APP-2026-00${Math.floor(10 + Math.random() * 90)}`,
      applicationNo: appData.applicationNo || `APP-2026-00${Math.floor(10 + Math.random() * 90)}`,
      borrowerId: appData.borrowerId || selectedBorrowerId,
      borrowerName: appData.borrowerName || activeBorrower.fullName,
      borrowerAvatar: appData.borrowerAvatar || activeBorrower.avatarUrl,
      borrowerIncomeUSD: appData.borrowerIncomeUSD || activeBorrower.monthlyIncomeUSD,
      productId: appData.productId || products[0].id,
      productName: appData.productName || products[0].name,
      requestedAmountUSD: appData.requestedAmountUSD || 5000,
      requestedTermMonths: appData.requestedTermMonths || 12,
      frequency: appData.frequency || 'MONTHLY',
      purpose: appData.purpose || 'Institutional credit request',
      dtiRatio: appData.dtiRatio || 25.0,
      riskTier: appData.riskTier || 'LOW RISK',
      status: isDraft ? 'DRAFT' : 'SUBMITTED',
      createdAt: new Date().toISOString().slice(0, 10),
      documents: [],
    };

    setApplications((prev) => [created, ...prev]);
    setSelectedApplicationId(created.id);
    setActiveTab('applications');
    alert(`Application ${created.applicationNo} ${isDraft ? 'saved as draft' : 'submitted for underwriting'}!`);
  };

  const handleExecutiveDecision = (
    appId: string,
    decision: 'APPROVED' | 'REJECTED',
    terms?: { amount: number; term: number; rate: number; reason?: string }
  ) => {
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id === appId) {
          return {
            ...a,
            status: decision,
            committeeApproval: {
              approverName: currentUser.name,
              decision,
              approvedAmountUSD: terms?.amount || a.requestedAmountUSD,
              approvedTermMonths: terms?.term || a.requestedTermMonths,
              approvedRate: terms?.rate || 10.5,
              rationaleOrRejectionReason: terms?.reason || 'Approved by Executive Committee',
              decidedAt: new Date().toISOString(),
            },
          };
        }
        return a;
      })
    );

    // Audit log insertion
    const audit: SystemActivityEvent = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: decision === 'APPROVED' ? 'LOAN_APPLICATION_APPROVED' : 'LOAN_APPLICATION_REJECTED',
      actionCategory: decision === 'APPROVED' ? 'LOAN_APPROVED' : 'SECURITY',
      entityType: 'APPLICATION',
      entityReference: appId,
      ipAddress: '10.0.4.12',
      amountUSD: terms?.amount,
      details: {
        decision,
        terms,
        approver: currentUser.name
      }
    };
    setAuditLogs((prev) => [audit, ...prev]);

    alert(`Application ${appId} marked as ${decision}.`);
    if (decision === 'APPROVED') {
      setActiveTab('loans');
    }
  };

  if (authLoading) {
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
          onRegisterSuccess={(email, devOtp) => {
            setAuthEmail(email);
            setAuthDevOtp(devOtp);
            setAuthOtpPurpose('register_verification');
            setAuthView('otp_verify');
          }}
          onNavigateToLogin={() => {
            setAuthNotice(null);
            setAuthView('login');
          }}
        />
      );
    }

    if (authView === 'otp_verify') {
      return (
        <OtpVerificationPage
          email={authEmail}
          purpose={authOtpPurpose}
          devOtp={authDevOtp}
          onVerificationSuccess={(resetToken) => {
            if (authOtpPurpose === 'register_verification') {
              setAuthNotice('Email verified successfully! Your account is now active. Please sign in.');
              setAuthView('login');
            } else if (authOtpPurpose === 'forgot_password' && resetToken) {
              setAuthResetToken(resetToken);
              setAuthView('set_new_password');
            }
          }}
          onNavigateBack={() => {
            setAuthView(authOtpPurpose === 'register_verification' ? 'register' : 'forgot_password');
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
          }}
          onNavigateToLogin={() => {
            setAuthNotice(null);
            setAuthView('login');
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
        }}
        onNavigateToForgotPassword={() => {
          setAuthNotice(null);
          setAuthView('forgot_password');
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
          {/* Executive Dashboard */}
          {activeTab === 'dashboard' && (
            <Dashboard
              currency={currency}
              onNavigate={(tab) => {
                if (tab === 'new-borrower') setActiveTab('borrowers');
                else if (tab === 'new-application') setActiveTab('new-application');
                else if (tab === 'quick-payment') setActiveTab('cashier');
                else handleNavSelection(tab);
              }}
              onOpenNewBorrower={() => setActiveTab('borrowers')}
              onOpenNewApplication={() => setActiveTab('new-application')}
              onOpenQuickPayment={(loanId) => {
                if (loanId) setSelectedLoanId(loanId);
                setActiveTab('cashier');
              }}
            />
          )}

          {/* SCREEN 1: Borrowers Directory & 360° Dossier */}
          {activeTab === 'borrowers' && (
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
              applications={applications}
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
          )}

          {activeTab === 'new-application' && (
            <LoanApplicationWizard
              borrowers={borrowers}
              products={products}
              currency={currency}
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

          {/* SCREEN 5: Core Banking Loans & Repayment Schedule */}
          {activeTab === 'loans' && (
            <LoanList
              loans={loans}
              currency={currency}
              currentUserRole={activeRole}
              onSelectLoan={(id) => {
                setSelectedLoanId(id);
                setActiveTab('loan-detail');
              }}
              onOpenCashierForLoan={(id) => {
                setSelectedLoanId(id);
                setActiveTab('cashier');
              }}
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
              onCollectPayment={() => {
                setSelectedLoanId(activeLoan.id);
                setActiveTab('cashier');
              }}
              onViewReceipt={(rec) => setActiveReceiptModal(rec)}
            />
          )}

          {/* SCREEN 6: Cashier Desk & Payment Collection Terminal */}
          {activeTab === 'cashier' && (
            <CashierPaymentTerminal
              loans={loans}
              receipts={receipts}
              currency={currency}
              cashierName={currentUser.name}
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
        </div>
      </AppLayout>

      {/* Global Quick Search Modal (Ctrl + K) */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-slate-200">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search Borrowers, Loan #, National ID, Applications..."
                className="w-full text-slate-800 placeholder-slate-400 bg-transparent text-sm focus:outline-none"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Top Matches &amp; Direct Navigations
              </div>
              {filteredSearch.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
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
                    className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-indigo-50/70 group transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 transition-colors">
                      {res.type === 'borrower' && <User className="w-4 h-4" />}
                      {res.type === 'loan' && <CreditCard className="w-4 h-4" />}
                      {res.type === 'application' && <FileText className="w-4 h-4" />}
                      {res.type === 'cashier' && <DollarSign className="w-4 h-4" />}
                      {res.type === 'overdue' && <CreditCard className="w-4 h-4" />}
                      {res.type === 'products' && <FileText className="w-4 h-4" />}
                      {res.type === 'reports' && <FileText className="w-4 h-4" />}
                      {res.type === 'audit' && <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-900">{res.title}</span>
                        <span className="text-xs font-mono font-medium text-slate-400">{res.id}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{res.sub}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Navigate with</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">↓</kbd>
                <span>Select with</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Enter</kbd>
              </div>
              <div>
                <span>Press</span>
                <kbd className="ml-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">ESC</kbd> to close
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
    </>
  );
};

export default App;
