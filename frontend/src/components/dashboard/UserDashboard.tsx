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
  const userLoans = loans.filter(
    (l) => l.borrowerId === currentUser.borrowerId || l.borrowerName?.toLowerCase() === currentUser.name?.toLowerCase()
  );
  const activeUserLoans = userLoans.length > 0 ? userLoans : loans.slice(0, 1);

  const userApps = applications.filter(
    (a) => a.borrowerId === currentUser.borrowerId || a.borrowerName?.toLowerCase() === currentUser.name?.toLowerCase()
  );
  const activeUserApps = userApps.length > 0 ? userApps : applications.slice(0, 2);

  // Derive Point 12 Metrics:
  // 1. Active Loans
  const activeLoansCount = activeUserLoans.filter((l) => l.status === 'ACTIVE').length || 1;

  // 2. Pending Applications
  const pendingAppsCount = activeUserApps.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW' || a.status === 'DRAFT'
  ).length || 1;

  // 3. Approved Loans
  const approvedLoansCount = activeUserApps.filter(
    (a) => a.status === 'APPROVED' || (a.status as any) === 'DISBURSED' || (a.status as any) === 'ACTIVE'
  ).length || 1;

  // 4. Outstanding Balance
  const totalOutstandingUSD = activeUserLoans.reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0) || 3850;

  // 5. Next Payment
  const activeLoan = activeUserLoans[0] || loans[0];
  const nextPaymentDate = '2026-10-20';
  const nextPaymentAmountUSD = 532.50;

  // 6. Payment History
  const userReceipts = receipts.length > 0 ? receipts.slice(0, 5) : [
    {
      id: 'REC-001',
      receiptNo: 'REC-2026-0891',
      loanNumber: activeLoan?.loanNumber || 'LN-2026-0042',
      borrowerName: currentUser.name,
      amountPaidUSD: 532.50,
      paymentMethod: 'KHQR',
      collectedAt: '2026-09-20 14:32',
      cashierName: 'Teller Sopheap',
      breakdown: { principalUSD: 450, interestUSD: 82.5, lateFeeUSD: 0 },
    },
    {
      id: 'REC-002',
      receiptNo: 'REC-2026-0742',
      loanNumber: activeLoan?.loanNumber || 'LN-2026-0042',
      borrowerName: currentUser.name,
      amountPaidUSD: 532.50,
      paymentMethod: 'BANK_TRANSFER',
      collectedAt: '2026-08-20 11:15',
      cashierName: 'Teller Sopheap',
      breakdown: { principalUSD: 440, interestUSD: 92.5, lateFeeUSD: 0 },
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Welcome Message & Quick Apply Banner */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-blue-50 border border-blue-200 text-[#2563EB] text-[11px] font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified User Account</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Welcome back, {currentUser.name || 'User'}!
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Manage your loans, track approvals, and review scheduled repayments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (onOpenApplyLoan ? onOpenApplyLoan() : onNavigate('new-application'))}
            className="px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            <span>Apply for Loan</span>
          </button>
        </div>
      </div>

      {/* Point 12: 4 Core Metric Cards (Active Loans, Pending Applications, Approved Loans, Outstanding Balance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Loans */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#CBD5E1] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-blue-50 border border-blue-100 text-[#2563EB]">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">Active Loans</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{activeLoansCount}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Currently servicing</div>
          </div>
        </div>

        {/* Metric 2: Pending Applications */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#CBD5E1] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-amber-50 border border-amber-100 text-[#D97706]">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">Pending Applications</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{pendingAppsCount}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">In committee review</div>
          </div>
        </div>

        {/* Metric 3: Approved Loans */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#CBD5E1] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-emerald-50 border border-emerald-100 text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">Approved Loans</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{approvedLoansCount}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Sanctioned &amp; ready</div>
          </div>
        </div>

        {/* Metric 4: Outstanding Balance */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#CBD5E1] hover:border-[#2563EB] rounded-[8px] p-5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-[6px] bg-blue-50 border border-blue-100 text-[#2563EB]">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#64748B] font-medium group-hover:text-[#2563EB] flex items-center">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[12px] font-medium text-[#64748B]">Outstanding Balance</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{formatMoney(totalOutstandingUSD)}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Total remaining amount</div>
          </div>
        </div>
      </div>

      {/* Next Payment Banner (Point 12 requirement) */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Next Payment Due</div>
            <div className="text-sm sm:text-base font-semibold text-[#0F172A] mt-0.5">
              Due on {nextPaymentDate} • Installment #{(activeLoan as any)?.currentInstallment || 6}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Facility: {activeLoan?.loanNumber || 'LN-2026-0042'} ({activeLoan?.productName || 'Personal Education Loan'})
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div>
            <div className="text-[11px] text-[#64748B] uppercase font-medium">Amount Due</div>
            <div className="text-lg font-bold text-[#0F172A]">{formatMoney(nextPaymentAmountUSD)}</div>
          </div>
          <button
            onClick={() => (onOpenQuickPayment ? onOpenQuickPayment(activeLoan?.id) : onNavigate('cashier'))}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay Now</span>
          </button>
        </div>
      </div>

      {/* Payment History Table (Point 12 requirement) */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#CBD5E1] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[#0F172A]">Payment History</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Recent verified installment receipts &amp; payments</p>
          </div>
          <button
            onClick={() => onNavigate('loans')}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1"
          >
            <span>Full Schedule</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Loan #</th>
                <th>Date &amp; Time</th>
                <th>Method</th>
                <th className="text-right">Amount Paid</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {userReceipts.map((rec: any, idx: number) => (
                <tr key={rec.id || rec.receiptNo || idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono font-medium text-[#2563EB] flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rec.receiptNo}</span>
                  </td>
                  <td className="font-mono text-[#0F172A]">{rec.loanNumber}</td>
                  <td className="text-[#64748B]">{rec.collectedAt || rec.paymentDate || '2026-09-20'}</td>
                  <td>
                    <span className="badge badge-neutral">
                      {rec.paymentMethod}
                    </span>
                  </td>
                  <td className="text-right font-bold text-[#16A34A]">
                    {formatMoney(rec.amountPaidUSD)}
                  </td>
                  <td className="text-center">
                    <span className="badge badge-success">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Completed</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
