// ============================================================================
// APEX LMS - ENTERPRISE LOAN MANAGEMENT SYSTEM
// Global TypeScript Domain Definitions & Interfaces
// ============================================================================

export type UserRole =
  | 'BORROWER'
  | 'LOAN_OFFICER'
  | 'CASHIER'
  | 'MANAGER';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  avatar: string;
  avatarUrl?: string;
  branch: string;
  borrowerId?: string;
  nationalId?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface UserSettings {
  id?: string;
  userId?: string;
  theme?: string;
  currency?: Currency;
  branch?: string;
  notificationsEnabled?: boolean;
}

export interface UserDashboardSummary {
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    role: UserRole;
    avatarUrl: string;
    department?: string;
    position?: string;
    createdAt: string;
    lastLogin: string;
  };
  settings: UserSettings;
  isNewUser: boolean;
  metrics: {
    activeLoansCount: number;
    overdueLoansCount?: number;
    totalApplications?: number;
    totalBorrowedUSD?: number;
    totalOutstandingUSD: number;
    totalCollectedUSD?: number;
    totalRepaidUSD?: number;
    totalOverdueUSD: number;
    approvalRate?: number;
    repaymentRate?: number;
    staffCreatedApps?: number;
    staffApprovedApps?: number;
    nextPaymentDue?: {
      installmentNo: number;
      dueDate: string;
      amountUSD: number;
      remainingAmountUSD: number;
      loanNumber: string;
    } | null;
    overdueCount?: number;
    accountStanding?: 'GOOD_STANDING' | 'DELINQUENT' | 'NEW_ACCOUNT';
  };
  cashflowTrend: {
    month: string;
    fullMonth: string;
    disbursedUSD: number;
    collectedUSD: number;
  }[];
  productDistribution: {
    name: string;
    percentage: number;
    color: string;
    valUSD: number;
  }[];
  overdueWatchlist: {
    id: string;
    loanId: string;
    loanNumber: string;
    borrowerName: string;
    initials: string;
    avatarColor: string;
    borrowerPhone: string;
    installmentNo: number;
    daysOverdue: number;
    urgency: string;
    urgencyVariant: string;
    overdueAmountUSD: number;
  }[];
  recentActivities: {
    id: string;
    time: string;
    timestamp: string;
    actor: string;
    text: string;
    type: string;
    badge: string;
    badgeStyle: string;
    iconStyle: string;
  }[];
}

export type Currency = 'USD' | 'KHR';

export interface ExchangeRateConfig {
  baseCurrency: Currency;
  rateToKHR: number; // e.g. 4,100 KHR per 1 USD
  lastUpdated: string;
}

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type RiskClassification = 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';

export type RepaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type LoanAccountStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'WRITTEN_OFF';

export type ScheduleInstallmentStatus =
  | 'UPCOMING'
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE';

export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'Card'
  | 'Dynamic QR Code';

export interface LoanProduct {
  id: string;
  name: string;
  category: 'Personal' | 'Business' | 'Agriculture' | 'Vehicle' | 'Emergency';
  minAmount: number;
  maxAmount: number;
  interestRate: number; // Annual % APR
  minTerm: number; // months
  maxTerm: number;
  frequency: RepaymentFrequency;
  description: string;
  activeCount: number;
}

export interface BorrowerKYCDocument {
  id: string;
  type: 'NATIONAL_ID' | 'SALARY_SLIP' | 'BANK_STATEMENT' | 'EMPLOYMENT_CONTRACT' | 'COLLATERAL_TITLE';
  title: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  previewUrl: string;
}

export interface Borrower {
  id: string;
  borrowerId: string; // e.g. BOR-2026-0042
  fullName: string;
  avatarUrl: string;
  nationalId: string; // e.g. ***-**-5678 or raw
  phone: string;
  email: string;
  address: string;
  occupation: string;
  monthlyIncomeUSD: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  activeLoansCount: number;
  totalBorrowedUSD: number;
  totalRepaidUSD: number;
  totalOutstandingUSD: number;
  dtiRatio: number; // Debt to Income %
  createdAt: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  familyMembersCount?: number;
}

export interface RepaymentInstallment {
  installmentNo: number;
  dueDate: string;
  principalUSD: number;
  interestUSD: number;
  totalDueUSD: number;
  amountPaidUSD: number;
  remainingAmountUSD: number;
  status: ScheduleInstallmentStatus;
  daysLate?: number;
}

export interface LoanAccount {
  id: string;
  loanNumber: string; // e.g. LN-2026-0042
  applicationNo: string;
  borrowerId: string;
  borrowerName: string;
  borrowerAvatar: string;
  borrowerPhone: string;
  productId: string;
  productName: string;
  currency: Currency;
  principalUSD: number;
  interestRate: number;
  termMonths: number;
  frequency: RepaymentFrequency;
  totalInterestUSD: number;
  totalRepaymentUSD: number;
  totalPaidUSD: number;
  outstandingBalanceUSD: number;
  status: LoanAccountStatus;
  disbursedDate: string;
  maturityDate: string;
  nextPaymentDueDate: string;
  nextPaymentDueAmountUSD: number;
  daysOverdue?: number;
  lateFeeAccruedUSD?: number;
  schedules: RepaymentInstallment[];
}

export interface PaymentReceipt {
  receiptNo: string; // e.g. REC-2026-0982
  loanNumber: string;
  borrowerId: string;
  borrowerName: string;
  installmentNo?: number;
  amountPaidUSD: number;
  amountPaidKHR: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  paidAt: string;
  cashierName: string;
  principalAllocatedUSD: number;
  interestAllocatedUSD: number;
  lateFeeAllocatedUSD: number;
  outstandingBalanceAfterUSD: number;
  notes: string;
}

export interface LoanApplication {
  id: string;
  applicationNo: string; // e.g. APP-2026-0042
  borrowerId: string;
  borrowerName: string;
  borrowerAvatar: string;
  borrowerIncomeUSD: number;
  productId: string;
  productName: string;
  requestedAmountUSD: number;
  requestedTermMonths: number;
  frequency: RepaymentFrequency;
  purpose: string;
  dtiRatio: number;
  riskTier: RiskClassification;
  status: ApplicationStatus;
  createdAt: string;
  documents: BorrowerKYCDocument[];
  guarantor?: {
    fullName: string;
    phone: string;
    relationship: string;
    nationalId: string;
  };
  collateral?: {
    assetType: string;
    estimatedValueUSD: number;
    proofDocumentUrl?: string;
  };
  creditOfficerReview?: {
    reviewerName: string;
    recommendation: 'Recommend Approval' | 'Recommend Rejection' | 'Request More Info' | 'Need More Information';
    notes: string;
    signedAt: string;
  };

  committeeApproval?: {
    approverName: string;
    decision: 'APPROVED' | 'REJECTED';
    approvedAmountUSD: number;
    approvedTermMonths: number;
    approvedRate: number;
    rationaleOrRejectionReason: string;
    decidedAt: string;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'PAYMENT_DUE' | 'OVERDUE' | 'APPROVAL';
  timestamp: string;
  isRead: boolean;
  linkId?: string;
}

export interface SystemActivityEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  actionCategory: 'LOGIN' | 'APPLICATION_SUBMITTED' | 'LOAN_APPROVED' | 'DISBURSEMENT' | 'PAYMENT_RECORDED' | 'SECURITY';
  entityType: 'LOAN' | 'PAYMENT' | 'APPLICATION' | 'BORROWER' | 'AUTH';
  entityReference: string;
  ipAddress: string;
  amountUSD?: number;
  details?: Record<string, any>;
}

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  phone?: string;
  lastLogin?: string;
  avatar?: string;
  borrowerId?: string;
  createdAt?: string;
}

export interface RoleDefinition {
  key: UserRole;
  label: string;
  badge: string;
  description: string;
  color: string;
  khmerLabel: string;
  responsibilities: string[];
}

export interface PermissionMatrixRow {
  module: string;
  permission: string;
  description: string;
  manager: boolean;
  cashier: boolean;
  borrower: boolean;
}

