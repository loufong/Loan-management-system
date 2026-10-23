import React from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  FilePlus,
  ArrowRight,
  Receipt,
  User,
  ShieldCheck,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Currency, LoanAccount, LoanApplication, PaymentReceipt, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface UserDashboardProps {
  currentUser: UserProfile;
  currency: Currency;
  loans: LoanAccount[];
  applications: LoanApplication[];
  receipts: PaymentReceipt[];
  onNavigate: (tab: string) => void;
  onOpenApplyLoan?: () => void;
  onOpenQuickPayment?: (loanId?: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  currency,
  loans,
  applications,
  receipts,
  onNavigate,
  onOpenApplyLoan,
  onOpenQuickPayment,
}) => {
  const { t } = useLanguage();

  const formatMoney = (valUSD: number) => {
    if (currency === 'KHR') {
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(valUSD * 4100);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valUSD);
  };

  // Filter items specifically belonging to or associated with the user
  const clientName = (currentUser.name || currentUser.fullName || '').trim().toLowerCase();
  const currentBorrowerId = currentUser.borrowerId || currentUser.id;

  const userLoans = loans.filter((l) => {
    if (currentBorrowerId && (l.borrowerId === currentBorrowerId || l.borrowerId === currentUser.id)) return true;
    if (l.borrowerName && clientName && (l.borrowerName.toLowerCase().includes(clientName) || clientName.includes(l.borrowerName.toLowerCase()))) return true;
    return false;
  });
  const activeUserLoans = userLoans;

  const userApps = applications.filter((a) => {
    if (currentBorrowerId && (a.borrowerId === currentBorrowerId || a.borrowerId === currentUser.id)) return true;
    if (a.borrowerName && clientName && (a.borrowerName.toLowerCase().includes(clientName) || clientName.includes(a.borrowerName.toLowerCase()))) return true;
    return false;
  });
  const activeUserApps = userApps;

  // Derive Metrics from real database data:
  // 1. Active Loans
  const activeLoansCount = activeUserLoans.filter((l) => l.status === 'ACTIVE').length;

  // 2. Pending Applications
  const pendingAppsCount = activeUserApps.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW' || a.status === 'DRAFT'
  ).length;

  // 3. Approved Loans
  const approvedLoansCount = activeUserApps.filter(
    (a) => a.status === 'APPROVED' || (a.status as any) === 'DISBURSED' || (a.status as any) === 'ACTIVE'
  ).length;

  // 4. Outstanding Balance
  const totalOutstandingUSD = activeUserLoans.reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0);

  // 5. Next Payment
  const activeLoan = activeUserLoans.find((l) => l.status === 'ACTIVE') || activeUserLoans[0];
  const nextPaymentDate = activeLoan?.nextPaymentDueDate || (activeLoan?.schedules && activeLoan.schedules[0]?.dueDate) || 'Pending schedule';
  const nextPaymentAmountUSD = activeLoan?.nextPaymentDueAmountUSD || (activeLoan?.schedules && activeLoan.schedules[0]?.totalDueUSD) || 0;

  // 6. Payment History
  const userReceipts = receipts;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Welcome Message & Quick Apply Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-blue-50 border border-blue-200 text-[#2563EB] text-[11px] font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('verified_account', 'Verified User Account')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            {t('welcome_back', 'Welcome back')}, {currentUser.name || 'User'}!
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            {t('user_dashboard_desc', 'Manage your loans, track approvals, and review scheduled repayments.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (onOpenApplyLoan ? onOpenApplyLoan() : onNavigate('new-application'))}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-none cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>{t('btn_apply_loan', 'Apply for Loan')}</span>
          </button>
        </div>
      </div>

      {/* Point 12: 4 Core Metric Cards (Active Loans, Pending Applications, Approved Loans, Outstanding Balance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Loans */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-blue-50 border border-blue-100 text-[#2563EB]">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              {t('view_text', 'View')} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">{t('stat_active_loans', 'Active Loans')}</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{activeLoansCount}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">{t('stat_active_loans_sub', 'Currently servicing')}</div>
          </div>
        </div>

        {/* Metric 2: Pending Applications */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-amber-50 border border-amber-100 text-[#D97706]">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              {t('view_text', 'View')} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">{t('stat_pending_apps', 'Pending Applications')}</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{pendingAppsCount}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">{t('stat_pending_apps_sub', 'In committee review')}</div>
          </div>
        </div>

        {/* Metric 3: Approved Loans */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-emerald-50 border border-emerald-100 text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              {t('view_text', 'View')} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">{t('stat_approved_loans', 'Approved Loans')}</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{approvedLoansCount}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">{t('stat_approved_loans_sub', 'Sanctioned & ready')}</div>
          </div>
        </div>

        {/* Metric 4: Outstanding Balance */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-blue-50 border border-blue-100 text-[#2563EB]">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              {t('view_text', 'View')} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">{t('stat_outstanding_balance', 'Outstanding Balance')}</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{formatMoney(totalOutstandingUSD)}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">{t('stat_outstanding_balance_sub', 'Total remaining amount')}</div>
          </div>
        </div>
      </div>

      {/* Next Payment Banner or Clean Zero State */}
      {activeUserLoans.length > 0 && activeLoan ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">{t('next_payment_due', 'Next Payment Due')}</div>
              <div className="text-sm sm:text-base font-semibold text-[#0F172A] mt-0.5">
                {t('due_on_date', 'Due on')} {nextPaymentDate} • {t('installment_label', 'Installment')} #{(activeLoan as any)?.currentInstallment || 1}
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">
                {t('facility_label', 'Facility:')} {activeLoan?.loanNumber} ({activeLoan?.productName})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <div>
              <div className="text-[11px] text-[#64748B] uppercase font-medium">{t('amount_due', 'Amount Due')}</div>
              <div className="text-lg font-bold text-[#0F172A]">{formatMoney(nextPaymentAmountUSD)}</div>
            </div>
            <button
              onClick={() => (onOpenQuickPayment ? onOpenQuickPayment(activeLoan?.id) : onNavigate('cashier'))}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t('btn_pay_now', 'Pay Now')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-[6px] bg-slate-50 border border-slate-200 text-[#2563EB] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">{t('No Active Loan Facilities', 'No Active Loan Facilities')}</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {t(
                  'You currently do not have any active loans. Submit an application to get approved for our low-rate loan products.',
                  'You currently do not have any active loans. Submit an application to get approved for our low-rate loan products.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => (onOpenApplyLoan ? onOpenApplyLoan() : onNavigate('new-application'))}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>{t('btn_apply_loan', 'Apply for Loan')}</span>
          </button>
        </div>
      )}

      {/* Payment History Table (Point 12 requirement) */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[#0F172A]">{t('payment_history', 'Payment History')}</h3>
            <p className="text-xs text-[#64748B] mt-0.5">{t('payment_history_sub', 'Recent verified installment receipts & payments')}</p>
          </div>
          <button
            onClick={() => onNavigate('repayments')}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>{t('full_schedule', 'Full Schedule')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>{t('col_receipt_no', 'Receipt #')}</th>
                <th>{t('col_loan_number', 'Loan #')}</th>
                <th>{t('col_date_time', 'Date & Time')}</th>
                <th>{t('col_method', 'Method')}</th>
                <th className="text-right">{t('col_amount_paid', 'Amount Paid')}</th>
                <th className="text-center">{t('col_status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {userReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-[#64748B]">
                    {t(
                      'No payment receipts found yet. Once payments are recorded, your official receipts will be listed here.',
                      'No payment receipts found yet. Once payments are recorded, your official receipts will be listed here.'
                    )}
                  </td>
                </tr>
              ) : (
                userReceipts.map((rec: any, idx: number) => (
                  <tr key={rec.id || rec.receiptNo || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="font-mono font-medium text-[#2563EB] flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rec.receiptNo}</span>
                    </td>
                    <td className="font-mono text-[#0F172A]">{rec.loanNumber}</td>
                    <td className="text-[#64748B]">{rec.collectedAt || rec.paymentDate || '—'}</td>
                    <td>
                      <span className="badge badge-neutral">
                        {rec.paymentMethod}
                      </span>
                    </td>
                    <td className="text-right font-bold text-[#16A34A]">
                      {formatMoney(rec.amountPaidUSD || rec.amount || 0)}
                    </td>
                    <td className="text-center">
                      <span className="badge badge-success">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('status_completed', 'Completed')}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
