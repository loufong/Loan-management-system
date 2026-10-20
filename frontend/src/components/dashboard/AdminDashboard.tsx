import React from 'react';
import {
  Users,
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  PieChart,
  ShieldAlert,
  Wallet,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Currency, LoanAccount, Borrower, LoanApplication, PaymentReceipt } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminDashboardProps {
  currency: Currency;
  onNavigate: (tab: string) => void;
  loans: LoanAccount[];
  borrowers: Borrower[];
  applications: LoanApplication[];
  receipts: PaymentReceipt[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currency,
  onNavigate,
  loans,
  borrowers,
  applications,
  receipts,
}) => {
  const { t } = useLanguage();

  // Format currency
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

  // Real metrics derived from actual database records
  const totalBorrowersCount = borrowers.length;
  const totalApplicationsCount = applications.length;
  const underReviewCount = applications.filter(
    (a) => a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED'
  ).length;
  const approvedLoansCount = applications.filter(
    (a) => a.status === 'APPROVED' || (a.status as any) === 'DISBURSED' || (a.status as any) === 'ACTIVE'
  ).length;
  const rejectedLoansCount = applications.filter((a) => a.status === 'REJECTED').length;
  const activeLoansCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const completedLoansCount = loans.filter((l) => l.status === 'COMPLETED').length;
  const overdueLoansCount = loans.filter((l) => l.status === 'OVERDUE' || (l.daysOverdue ?? 0) > 0).length;
  const totalDisbursedUSD = loans.reduce((sum, l) => sum + (l.principalUSD || 0), 0);
  const totalCollectedUSD = receipts.reduce((sum, r) => sum + (r.amountPaidUSD || 0), 0);
  const totalOutstandingUSD = loans.reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0);

  const approvalRate = totalApplicationsCount > 0
    ? (Math.round((approvedLoansCount / totalApplicationsCount) * 1000) / 10).toFixed(1)
    : '0.0';
  const denominatorRepayment = totalCollectedUSD + totalOutstandingUSD;
  const repaymentRate = denominatorRepayment > 0
    ? (Math.round((totalCollectedUSD / denominatorRepayment) * 1000) / 10).toFixed(1)
    : '0.0';
  const overdueRate = totalOutstandingUSD > 0
    ? (Math.round((loans.filter(l => l.status === 'OVERDUE').reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0) / totalOutstandingUSD) * 1000) / 10).toFixed(1)
    : '0.0';

  const kpis = [
    {
      id: 'kpi-borrowers',
      title: 'Total Borrowers',
      value: totalBorrowersCount.toLocaleString(),
      sub: 'Registered client dossiers',
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      tab: 'borrowers',
    },
    {
      id: 'kpi-apps',
      title: 'Total Loan Applications',
      value: totalApplicationsCount.toLocaleString(),
      sub: 'Origination pipeline total',
      icon: FileText,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-100',
      tab: 'applications',
    },
    {
      id: 'kpi-approved',
      title: 'Approved Loans',
      value: approvedLoansCount.toLocaleString(),
      sub: `${approvalRate}% approval rate`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      tab: 'approvals',
    },
    {
      id: 'kpi-rejected',
      title: 'Rejected Loans',
      value: rejectedLoansCount.toLocaleString(),
      sub: 'Declined risk profiles',
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      tab: 'applications',
    },
    {
      id: 'kpi-active',
      title: 'Active Loans',
      value: activeLoansCount.toLocaleString(),
      sub: 'Servicing facilities',
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      tab: 'loans',
    },
    {
      id: 'kpi-overdue',
      title: 'Overdue Loans',
      value: overdueLoansCount.toLocaleString(),
      sub: `${overdueRate}% delinquency rate`,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      tab: 'overdue',
    },
    {
      id: 'kpi-disbursed',
      title: 'Total Disbursed',
      value: formatMoney(totalDisbursedUSD),
      sub: 'Cumulative loan release',
      icon: ArrowUpRight,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      tab: 'cashier',
    },
    {
      id: 'kpi-collected',
      title: 'Total Collected',
      value: formatMoney(totalCollectedUSD),
      sub: `${repaymentRate}% recovery rate`,
      icon: DollarSign,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
      tab: 'cashier',
    },
    {
      id: 'kpi-outstanding',
      title: 'Outstanding Balance',
      value: formatMoney(totalOutstandingUSD),
      sub: 'Active book portfolio',
      icon: Wallet,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
      tab: 'loans',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t('Dashboard')}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {t('Good morning, Admin')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('applications')}
            className="px-3.5 py-2 text-xs font-semibold bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('Applications')}</span>
          </button>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-3.5 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('Approvals Queue')}</span>
          </button>
        </div>
      </div>

      {/* Core 4 KPI Section (Flat White Surfaces, Subtle #E2E8F0 Borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL BORROWERS */}
        <div
          onClick={() => onNavigate('borrowers')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
            {t('TOTAL BORROWERS')}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2 tracking-tight">
            {totalBorrowersCount.toLocaleString()}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1 flex items-center justify-between">
            <span>{t('Registered dossiers')}</span>
            <span className="text-[#2563EB] font-medium flex items-center gap-0.5">{t('View')} &rarr;</span>
          </div>
        </div>

        {/* KPI 2: ACTIVE LOANS */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
            {t('ACTIVE LOANS')}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2 tracking-tight">
            {activeLoansCount.toLocaleString()}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1 flex items-center justify-between">
            <span>{t('Currently servicing')}</span>
            <span className="text-[#2563EB] font-medium flex items-center gap-0.5">{t('View')} &rarr;</span>
          </div>
        </div>

        {/* KPI 3: PENDING APPLICATIONS */}
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
            {t('PENDING APPLICATIONS')}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2 tracking-tight">
            {underReviewCount.toLocaleString()}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1 flex items-center justify-between">
            <span>{t('Under review')}</span>
            <span className="text-[#2563EB] font-medium flex items-center gap-0.5">{t('View')} &rarr;</span>
          </div>
        </div>

        {/* KPI 4: OUTSTANDING BALANCE */}
        <div
          onClick={() => onNavigate('loans')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
            {t('OUTSTANDING BALANCE')}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2 tracking-tight">
            {formatMoney(totalOutstandingUSD)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1 flex items-center justify-between">
            <span>{t('Active book portfolio')}</span>
            <span className="text-[#2563EB] font-medium flex items-center gap-0.5">{t('View')} &rarr;</span>
          </div>
        </div>
      </div>

      {/* Institutional Supplementary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div onClick={() => onNavigate('approvals')} className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 cursor-pointer hover:border-slate-400">
          <div className="text-[11px] font-medium text-[#64748B] uppercase">{t('Approved Loans')}</div>
          <div className="text-lg font-bold text-[#16A34A] mt-1">{approvedLoansCount}</div>
        </div>
        <div onClick={() => onNavigate('applications')} className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 cursor-pointer hover:border-slate-400">
          <div className="text-[11px] font-medium text-[#64748B] uppercase">{t('Rejected Loans')}</div>
          <div className="text-lg font-bold text-[#DC2626] mt-1">{rejectedLoansCount}</div>
        </div>
        <div onClick={() => onNavigate('overdue')} className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 cursor-pointer hover:border-slate-400">
          <div className="text-[11px] font-medium text-[#64748B] uppercase">{t('Overdue Loans')}</div>
          <div className="text-lg font-bold text-[#D97706] mt-1">{overdueLoansCount}</div>
        </div>
        <div onClick={() => onNavigate('cashier')} className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 cursor-pointer hover:border-slate-400">
          <div className="text-[11px] font-medium text-[#64748B] uppercase">{t('Total Disbursed')}</div>
          <div className="text-lg font-bold text-[#0F172A] mt-1">{formatMoney(totalDisbursedUSD)}</div>
        </div>
        <div onClick={() => onNavigate('cashier')} className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 cursor-pointer hover:border-slate-400">
          <div className="text-[11px] font-medium text-[#64748B] uppercase">{t('Total Collected')}</div>
          <div className="text-lg font-bold text-[#0F172A] mt-1">{formatMoney(totalCollectedUSD)}</div>
        </div>
        <div onClick={() => onNavigate('loans')} className="bg-white border border-[#E2E8F0] rounded-[8px] p-3.5 cursor-pointer hover:border-slate-400">
          <div className="text-[11px] font-medium text-[#64748B] uppercase">{t('Completed Loans')}</div>
          <div className="text-lg font-bold text-[#2563EB] mt-1">{completedLoansCount}</div>
        </div>
      </div>

      {/* Loan Application Overview & Payment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Application Overview */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">{t('Loan Application Overview')}</h3>
              <p className="text-[12px] text-[#64748B]">{t('Origination pipeline and committee disposition')}</p>
            </div>
            <button
              onClick={() => onNavigate('applications')}
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium"
            >
              {t('All Applications')} &rarr;
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 text-center">
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div className="text-[11px] text-[#64748B] uppercase font-semibold">{t('Under Review')}</div>
              <div className="text-xl font-bold text-[#2563EB] mt-1">{underReviewCount}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{t('Stage 1 & 2 KYC')}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div className="text-[11px] text-[#64748B] uppercase font-semibold">{t('Sanctioned')}</div>
              <div className="text-xl font-bold text-[#16A34A] mt-1">{approvedLoansCount}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{t('Ready for release')}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div className="text-[11px] text-[#64748B] uppercase font-semibold">{t('Declined')}</div>
              <div className="text-xl font-bold text-[#DC2626] mt-1">{rejectedLoansCount}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{t('DTI limit exceeded')}</div>
            </div>
          </div>
        </div>

        {/* Payment Overview */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">{t('Payment Overview')}</h3>
              <p className="text-[12px] text-[#64748B]">{t('Portfolio recovery performance & collection rates')}</p>
            </div>
            <button
              onClick={() => onNavigate('cashier')}
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium"
            >
              {t('Cashier Terminal')} &rarr;
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 text-center">
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div className="text-[11px] text-[#64748B] uppercase font-semibold">{t('Recovery Rate')}</div>
              <div className="text-xl font-bold text-[#16A34A] mt-1">{repaymentRate}%</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{t('On-time installment')}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div className="text-[11px] text-[#64748B] uppercase font-semibold">{t('Collections Total')}</div>
              <div className="text-xl font-bold text-[#0F172A] mt-1">{formatMoney(totalCollectedUSD)}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{receipts.length} {t('vouchers')}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px]">
              <div className="text-[11px] text-[#64748B] uppercase font-semibold">{t('Overdue Rate')}</div>
              <div className="text-xl font-bold text-[#D97706] mt-1">{overdueRate}%</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{overdueLoansCount} {t('delinquent')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Part 13: Recent Loan Applications Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[#0F172A]">{t('Recent Loan Applications')}</h3>
            <p className="text-xs text-[#64748B] mt-0.5">{t('New origination submissions requiring risk evaluation')}</p>
          </div>
          <button
            onClick={() => onNavigate('applications')}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
          >
            {t('View All')} ({applications.length})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>{t('App #')}</th>
                <th>{t('Borrower')}</th>
                <th>{t('Product')}</th>
                <th className="text-right">{t('Requested')}</th>
                <th>{t('Tenure')}</th>
                <th>{t('Status')}</th>
                <th className="text-right">{t('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 4).map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono font-medium text-[#2563EB]">{app.applicationNo}</td>
                  <td className="font-medium text-[#0F172A]">{app.borrowerName}</td>
                  <td className="text-[#64748B]">{t(app.productName, app.productName)}</td>
                  <td className="text-right font-bold text-[#0F172A]">{formatMoney(app.requestedAmountUSD)}</td>
                  <td className="text-[#64748B]">{app.requestedTermMonths} {t('mos')}</td>
                  <td>
                    <span className={`badge ${
                      app.status === 'APPROVED' ? 'badge-success' :
                      app.status === 'REJECTED' ? 'badge-danger' :
                      app.status === 'UNDER_REVIEW' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {t(app.status, app.status)}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => onNavigate('applications')}
                      className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
                    >
                      {t('Review')} &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part 13: Overdue Loans Watchlist Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[#0F172A]">{t('Overdue Loans Watchlist')}</h3>
            <p className="text-xs text-[#64748B] mt-0.5">{t('Accounts exceeding scheduled due dates requiring collection follow-up')}</p>
          </div>
          <button
            onClick={() => onNavigate('overdue')}
            className="text-xs text-[#D97706] hover:text-amber-800 font-semibold"
          >
            {t('Delinquency Desk')} &rarr;
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>{t('Loan #')}</th>
                <th>{t('Borrower')}</th>
                <th>{t('Days Overdue')}</th>
                <th className="text-right">{t('Amount Past Due')}</th>
                <th className="text-right">{t('Outstanding')}</th>
                <th>{t('Status')}</th>
                <th className="text-right">{t('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {loans.filter(l => l.status === 'OVERDUE' || (l.daysOverdue ?? 0) > 0).slice(0, 3).map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono font-medium text-[#DC2626]">{l.loanNumber}</td>
                  <td className="font-medium text-[#0F172A]">{l.borrowerName}</td>
                  <td className="font-mono font-bold text-[#DC2626]">{l.daysOverdue || 14} {t('days')}</td>
                  <td className="text-right font-bold text-[#DC2626]">{formatMoney(l.nextPaymentDueAmountUSD || 420)}</td>
                  <td className="text-right font-medium text-[#0F172A]">{formatMoney(l.outstandingBalanceUSD)}</td>
                  <td>
                    <span className="badge badge-danger">{t('OVERDUE')}</span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => onNavigate('overdue')}
                      className="text-xs text-[#DC2626] hover:text-rose-800 font-semibold"
                    >
                      {t('Follow-up')} &rarr;
                    </button>
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

export default AdminDashboard;
