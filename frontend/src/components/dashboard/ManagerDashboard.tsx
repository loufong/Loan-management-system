import React from 'react';
import { Currency, LoanAccount, LoanApplication, PaymentReceipt, Borrower } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  ShieldCheck,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  ArrowRight,
  Layers,
  Landmark
} from 'lucide-react';

export interface ManagerDashboardProps {
  currency: Currency;
  onNavigate: (tab: string) => void;
  loans: LoanAccount[];
  borrowers: Borrower[];
  applications: LoanApplication[];
  receipts: PaymentReceipt[];
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  currency,
  onNavigate,
  loans,
  borrowers,
  applications,
  receipts
}) => {
  // Real calculations
  const totalApps = applications.length;
  const pendingApprovals = applications.filter(
    (a) => a.status === 'UNDER_REVIEW' || (a.status === 'SUBMITTED' && a.creditOfficerReview)
  ).length;
  const approvedApps = applications.filter(
    (a) => a.status === 'APPROVED' || (a.status as any) === 'DISBURSED' || (a.status as any) === 'ACTIVE'
  ).length;
  const rejectedApps = applications.filter((a) => a.status === 'REJECTED').length;
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE').length;
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE' || (l.daysOverdue ?? 0) > 0).length;

  const totalPortfolioValue = loans.reduce((sum, l) => sum + (l.principalUSD || 0), 0);
  const outstandingBalance = loans.reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0);
  const totalCollected = receipts.reduce((sum, r) => sum + (r.amountPaidUSD || 0), 0);

  const approvalRate = totalApps > 0 ? (Math.round((approvedApps / totalApps) * 1000) / 10).toFixed(1) : '0.0';
  const rejectionRate = totalApps > 0 ? (Math.round((rejectedApps / totalApps) * 1000) / 10).toFixed(1) : '0.0';
  const collectionPerformance = (totalCollected + outstandingBalance) > 0
    ? (Math.round((totalCollected / (totalCollected + outstandingBalance)) * 1000) / 10).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Executive Branch Manager Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Credit committee approvals, institutional portfolio performance, and asset quality supervision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('approvals')}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Review Approvals ({pendingApprovals})</span>
          </button>
          <button
            onClick={() => onNavigate('disbursements')}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Disbursements</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            TOTAL PORTFOLIO VALUE
          </span>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            <MoneyText amount={totalPortfolioValue} currency={currency} />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>Cumulative principal</span>
            <span className="text-[#2563EB] font-medium">Loans &rarr;</span>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            OUTSTANDING BALANCE
          </span>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            <MoneyText amount={outstandingBalance} currency={currency} />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>Active servicing debt</span>
            <span className="text-[#2563EB] font-medium">{activeLoans} Active</span>
          </div>
        </div>

        {/* Approval Rate */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            APPROVAL RATE
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {approvalRate}%
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>{approvedApps} approved / {totalApps} apps</span>
            <span className="text-emerald-700 font-medium">{rejectionRate}% rejected</span>
          </div>
        </div>

        {/* Collection Performance */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            COLLECTION RECOVERY
          </span>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {collectionPerformance}%
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span><MoneyText amount={totalCollected} currency={currency} /> collected</span>
            <span className="text-[#2563EB] font-medium">Reports &rarr;</span>
          </div>
        </div>
      </div>

      {/* 3. Facility Status & Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approvals Action Board */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Applications Awaiting Committee Action</h3>
              <p className="text-xs text-[#64748B]">Sanction or reject underwriting submissions</p>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
            >
              View Queue ({pendingApprovals}) &rarr;
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {applications.filter(a => a.status === 'UNDER_REVIEW').slice(0, 4).map((app) => (
              <div key={app.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-[#0F172A]">{app.borrowerName}</div>
                  <div className="text-[11px] text-[#64748B]">
                    {app.applicationNo} • {app.productName} • DTI: {app.dtiRatio}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-[#0F172A]">
                    <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                  </div>
                  <button
                    onClick={() => onNavigate('approvals')}
                    className="text-[11px] text-[#2563EB] hover:underline font-medium"
                  >
                    Decide &rarr;
                  </button>
                </div>
              </div>
            ))}
            {applications.filter(a => a.status === 'UNDER_REVIEW').length === 0 && (
              <div className="py-6 text-center text-xs text-[#64748B]">
                No applications currently pending executive committee approval.
              </div>
            )}
          </div>
        </div>

        {/* Delinquency & Watchlist Overview */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Delinquency Watchlist</h3>
              <p className="text-xs text-[#64748B]">PAR 30+ delinquency risk accounts</p>
            </div>
            <button
              onClick={() => onNavigate('overdue')}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold"
            >
              Overdue Desk ({overdueLoans}) &rarr;
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {loans.filter(l => l.status === 'OVERDUE' || (l.daysOverdue ?? 0) > 0).slice(0, 4).map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-[#0F172A]">{l.borrowerName}</div>
                  <div className="text-[11px] text-red-600 font-medium">
                    {l.loanNumber} • {l.daysOverdue || 14} days overdue
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-red-600">
                    <MoneyText amount={l.nextPaymentDueAmountUSD || 420} currency={currency} />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Bal: <MoneyText amount={l.outstandingBalanceUSD} currency={currency} />
                  </div>
                </div>
              </div>
            ))}
            {loans.filter(l => l.status === 'OVERDUE' || (l.daysOverdue ?? 0) > 0).length === 0 && (
              <div className="py-6 text-center text-xs text-emerald-600">
                All servicing loans are performing within agreed repayment terms.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
