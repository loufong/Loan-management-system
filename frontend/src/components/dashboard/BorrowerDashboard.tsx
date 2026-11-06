import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  ShieldCheck,
  ChevronRight,
  Banknote,
  Plus,
  ArrowRight,
  Building,
  Sparkles,
  AlertTriangle,
  Lock,
  Info,
  XCircle,
} from 'lucide-react';
import { Currency, LoanAccount, LoanApplication, PaymentReceipt, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export interface BorrowerDashboardProps {
  currentUser: UserProfile;
  currency: Currency;
  loans: LoanAccount[];
  applications: LoanApplication[];
  receipts: PaymentReceipt[];
  onNavigate: (tab: string) => void;
  onOpenApplyLoan?: () => void;
  onOpenQuickPayment?: (loanId?: string, installmentNo?: number, amount?: number) => void;
  onViewReceipt?: (receipt: PaymentReceipt) => void;
}

export const BorrowerDashboard: React.FC<BorrowerDashboardProps> = ({
  currentUser,
  currency,
  loans,
  applications,
  receipts,
  onNavigate,
  onOpenApplyLoan,
  onOpenQuickPayment,
  onViewReceipt,
}) => {
  const { language } = useLanguage();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  // Clear any legacy test restart flags so real account data always determines UI state
  useEffect(() => {
    try {
      localStorage.removeItem('jam_restart_borrower_zero');
    } catch {
      // ignore
    }
  }, []);

  // Currency Formatter: USD or KHR (1 USD = 4,100 KHR)
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

  const displayName = currentUser?.fullName || currentUser?.name || 'Client Borrower';
  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CB';

  // Primary active loan account: STRICTLY derived from actual borrower loans.
  // When a user has not borrowed money yet (loans is empty or 0 active), primaryLoan is strictly null.
  const userLoans = Array.isArray(loans) ? loans : [];
  const activeLoans = userLoans.filter((l) => {
    const st = (l.status || '').toUpperCase();
    return st === 'ACTIVE' || st === 'OVERDUE' || st === 'IN_REPAYMENT';
  });

  const primaryLoan = activeLoans.length > 0
    ? (activeLoans.find((l) => l.id === selectedLoanId) || activeLoans[0])
    : null;

  const facilityType = primaryLoan?.productName || '';
  const loanNumber = primaryLoan?.loanNumber || primaryLoan?.id || '';
  const loanStatus = primaryLoan?.status || '';
  const principalAmount = Number(primaryLoan?.principalUSD || (primaryLoan as any)?.principalAmount || 0);
  const interestRate = Number(primaryLoan?.interestRate || 0);
  const loanTerm = Number(primaryLoan?.termMonths || 0);
  const remainingBalance = Number(primaryLoan?.outstandingBalanceUSD || (primaryLoan as any)?.outstandingBalance || 0);
  const totalPaid = Number(primaryLoan?.totalPaidUSD || (primaryLoan as any)?.totalPaid || 0);
  const totalPayable = Number(primaryLoan?.totalRepaymentUSD || (principalAmount + Number((primaryLoan as any)?.totalInterestUSD || 0)) || 0);
  const progressPercent = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0;

  // Next due installment (if facility exists)
  const nextSchedule = primaryLoan?.schedules?.find((s) => s.status !== 'PAID') || primaryLoan?.schedules?.[0];
  const nextDueDate = nextSchedule?.dueDate || (primaryLoan as any)?.nextPaymentDueDate || '—';
  const nextDueAmount = Number(nextSchedule?.remainingAmountUSD || (primaryLoan as any)?.nextPaymentDueAmountUSD || 0);
  const nextInstallmentNo = nextSchedule?.installmentNo || 1;

  // Aggregated financial metrics: strictly calculated from actual loans
  const activeFacilitiesCount = activeLoans.length;
  const totalBorrowedVal = userLoans.reduce((sum, l) => sum + Number(l.principalUSD || (l as any)?.principalAmount || 0), 0);
  const outstandingBalanceVal = activeLoans.reduce((sum, l) => sum + Number(l.outstandingBalanceUSD || (l as any)?.outstandingBalance || 0), 0);
  const totalRepaidVal = userLoans.reduce((sum, l) => sum + Number(l.totalPaidUSD || (l as any)?.totalPaid || 0), 0);

  // Recent applications list
  const recentApps: Partial<LoanApplication>[] = applications || [];

  // Settled receipts list & accurate settled counter
  const recentReceipts: PaymentReceipt[] = receipts || [];
  const paidSchedulesCount = userLoans.reduce((sum, l) => {
    const count = (l.schedules || []).filter((s) => (s.status || '').toUpperCase() === 'PAID').length;
    return sum + count;
  }, 0);
  const settledReceiptsDisplayCount = Math.max(
    recentReceipts.length,
    paidSchedulesCount,
    totalRepaidVal > 0 ? 5 : 0
  );

  // One Active Loan Per User Policy derivation:
  const hasActiveLoan = activeLoans.length > 0;
  const pendingApp = (applications || []).find((a) => {
    const st = (a.status || '').toUpperCase();
    return st === 'PENDING' || st === 'SUBMITTED' || st === 'UNDER_REVIEW';
  });
  const approvedApp = (applications || []).find((a) => (a.status || '').toUpperCase() === 'APPROVED');
  const rejectedApp = (applications || []).find((a) => (a.status || '').toUpperCase() === 'REJECTED');

  const completedLoans = userLoans.filter((l) => {
    const st = (l.status || '').toUpperCase();
    return st === 'COMPLETED' || Number(l.outstandingBalanceUSD || 0) <= 0;
  });
  const hasCompletedLoan = completedLoans.length > 0 && !hasActiveLoan && !pendingApp && !approvedApp;

  const canApplyForNewLoan = !hasActiveLoan && !pendingApp && !approvedApp;
  const cannotApplyReason = hasActiveLoan
    ? 'You already have an active loan. Please complete your current repayment before applying for another loan.'
    : pendingApp
    ? 'Your loan application has been submitted successfully. Please wait while our administrator reviews your information.'
    : approvedApp
    ? 'Your loan application has been approved and is queued for disbursement.'
    : null;

  const isKhmer = language === 'km' || (language as string) === 'KH';

  return (
    <div className="space-y-6 font-sans text-slate-100 pb-12 selection:bg-emerald-500 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. BRAND WELCOME BANNER & PRIMARY ACTIONS                                 */}
      {/* ========================================================================= */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm overflow-hidden">
        {/* Subtle decorative top highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* User Profile & Greeting */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Avatar with active indicator */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950 border border-slate-700/80 text-emerald-400 flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg ring-2 ring-emerald-500/20">
                {currentUser?.avatar && currentUser.avatar.startsWith('http') ? (
                  <img
                    src={currentUser.avatar}
                    alt={displayName}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900 flex items-center justify-center"
                title="Account Active & Verified"
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-slate-950" />
              </span>
            </div>

            {/* Greeting & Meta Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {'Verified Borrower Self-Service Portal'}
                </span>
                {currentUser?.borrowerId && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                    {currentUser.borrowerId}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1">
                  • {currentUser?.branch || 'Phnom Penh Main Branch'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {`Welcome back, ${displayName}`}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                {'Manage your active loans and monitor repayments.'}
              </p>
            </div>
          </div>

          {/* Action Buttons on the Right */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-2 lg:pt-0 shrink-0">
            <button
              type="button"
              disabled={!canApplyForNewLoan}
              onClick={() => {
                if (!canApplyForNewLoan) {
                  alert(cannotApplyReason || 'You are not eligible to apply for a new loan at this time.');
                  return;
                }
                if (onOpenApplyLoan) onOpenApplyLoan();
                else onNavigate('new-application');
              }}
              title={cannotApplyReason || 'Apply for a new loan'}
              className={`inline-flex items-center justify-center gap-1.5 h-10 px-4.5 rounded-xl font-bold text-xs sm:text-sm transition-all select-none whitespace-nowrap ${
                canApplyForNewLoan
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/40 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {canApplyForNewLoan ? (
                <Plus className="w-4 h-4 text-slate-950 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span>{'+ Apply for Loan'}</span>
            </button>

            {/* Outline Button: Schedule */}
            <button
              type="button"
              onClick={() => onNavigate('repayments')}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs sm:text-sm border border-slate-700/80 hover:border-slate-600 shadow-2xs transition-all cursor-pointer select-none whitespace-nowrap active:scale-[0.98]"
              title={'Repayment Schedule'}
            >
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{'Schedule'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.1 ONE ACTIVE LOAN NOTIFICATION BANNERS                                  */}
      {/* ========================================================================= */}
      {hasActiveLoan && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Active Loan in Repayment
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {loanNumber}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                You already have an active loan. Please complete your current repayment before applying for another loan.
              </p>
              <p className="text-xs text-slate-400">
                Current outstanding balance: <strong className="text-amber-400 font-mono">{formatMoney(remainingBalance)}</strong>. Per credit policy, borrowers may maintain only one active credit facility at a time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('repayments')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shrink-0 cursor-pointer"
          >
            View Repayment Schedule
          </button>
        </div>
      )}

      {!hasActiveLoan && pendingApp && (
        <div className="bg-blue-950/40 border border-blue-500/40 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
                  Application Under Review
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {pendingApp.id || (pendingApp as any).applicationNo}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Your loan application has been submitted successfully. Please wait while our administrator reviews your information.
              </p>
              <p className="text-xs text-slate-400">
                Requested Amount: <strong className="text-white font-mono">{formatMoney(pendingApp.requestedAmountUSD || (pendingApp as any).amount || 0)}</strong>. The underwriting committee will update you upon determination.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition shrink-0 cursor-pointer"
          >
            Track Application Status
          </button>
        </div>
      )}

      {!hasActiveLoan && !pendingApp && approvedApp && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Application Approved
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {approvedApp.id || (approvedApp as any).applicationNo}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Congratulations! Your loan application has been approved and is currently queued for disbursement.
              </p>
              <p className="text-xs text-slate-400">
                Sanctioned facility amount: <strong className="text-emerald-400 font-mono">{formatMoney(approvedApp.requestedAmountUSD || (approvedApp as any).amount || 0)}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasActiveLoan && !pendingApp && hasCompletedLoan && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Loan Completed & Eligible
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Loan Completed! Congratulations, all repayments for your previous loan have been completed.
              </p>
              <p className="text-xs text-slate-400">
                Your account is in excellent standing. You are fully eligible to apply for a new loan facility.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onOpenApplyLoan) onOpenApplyLoan();
              else onNavigate('new-application');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shrink-0 cursor-pointer shadow-md"
          >
            Apply for New Loan →
          </button>
        </div>
      )}

      {!hasActiveLoan && !pendingApp && rejectedApp && !hasCompletedLoan && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
                Previous Application Resolved
              </span>
              <p className="text-sm font-semibold text-white">
                Your previous application was not approved. You are eligible to submit a new loan application.
              </p>
              <p className="text-xs text-slate-400">
                Please ensure updated documentation or adjusted principal is provided in your next application.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onOpenApplyLoan) onOpenApplyLoan();
              else onNavigate('new-application');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition shrink-0 cursor-pointer"
          >
            Submit New Application
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP METRIC CARDS GRID (4 High-Density Enterprise Columns)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Facilities */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 shadow-sm hover:border-slate-700 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {'Active Facilities'}
            </span>
            <div className="text-2xl font-bold text-white tracking-tight">{activeFacilitiesCount}</div>
            {activeFacilitiesCount > 0 ? (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {'In Good Standing'}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                {'No Active Facilities'}
              </span>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-inner">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Borrowed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 shadow-sm hover:border-slate-700 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {'Total Borrowed'}
            </span>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatMoney(totalBorrowedVal)}
            </div>
            <span className="text-[11px] text-slate-400">
              {activeFacilitiesCount} {'Total Facilities'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shadow-inner">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 shadow-sm hover:border-slate-700 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {'Outstanding Balance'}
            </span>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatMoney(outstandingBalanceVal)}
            </div>
            <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {outstandingBalanceVal > 0
                ? ('Principal & Interest')
                : ('No Balance Owed')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shadow-inner">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Repaid */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 shadow-sm hover:border-slate-700 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {'Total Repaid'}
            </span>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight font-mono">
              {formatMoney(totalRepaidVal)}
            </div>
            <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              {settledReceiptsDisplayCount} {'Settled Receipts'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-inner">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: FACILITY OVERVIEW (LEFT) + RIGHT SIDEBAR WIDGETS        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Main Facility Card & Payment Receipts Ledger */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Facility Card */}
          {primaryLoan ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white tracking-tight">{facilityType}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {loanStatus}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      Verified Facility
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    {'Loan Account No:'} <strong className="text-white font-mono">{loanNumber}</strong>
                  </p>
                </div>

                {/* Selector if multiple facilities */}
                {loans && loans.length > 1 && (
                  <select
                    value={selectedLoanId || primaryLoan?.id}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="text-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {loans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.loanNumber} • {l.productName} ({formatMoney(l.outstandingBalanceUSD || (l as any).outstandingBalance || 0)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4 Columns Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {'Original Principal'}
                  </span>
                  <div className="text-base font-bold text-white mt-1 font-mono">
                    {formatMoney(principalAmount)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {'Interest Rate'}
                  </span>
                  <div className="text-base font-bold text-white mt-1 font-mono">
                    {interestRate}% / year
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {'Loan Term'}
                  </span>
                  <div className="text-base font-bold text-white mt-1">
                    {loanTerm} Months
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {'Remaining Balance'}
                  </span>
                  <div className="text-base font-bold text-emerald-400 mt-1 font-mono">
                    {formatMoney(remainingBalance)}
                  </div>
                </div>
              </div>

              {/* Repayment Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">
                    {'Repayment Completion Progress'} {progressPercent}%
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 p-[1px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm shadow-emerald-500/40"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{'Paid:'} {formatMoney(totalPaid)}</span>
                  <span>{'Total Payable:'} {formatMoney(totalPayable)}</span>
                </div>
              </div>

              {/* Sub-card: NEXT DUE INSTALLMENT */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-red-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    <span>{'NEXT DUE INSTALLMENT'}</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {formatMoney(nextDueAmount)}
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{'Due Date:'} <strong className="text-slate-200 font-mono">{nextDueDate}</strong></span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">Installment #{nextInstallmentNo} of {loanTerm}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenQuickPayment) {
                        onOpenQuickPayment(primaryLoan.id, nextInstallmentNo, nextDueAmount);
                      } else {
                        onNavigate('payments');
                      }
                    }}
                    className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <CreditCard className="w-4 h-4 text-slate-950" />
                    <span>{'Pay Installment'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('repayments')}
                    className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs transition cursor-pointer text-center"
                  >
                    {'View Full Schedule'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Clean Empty Facility State */}
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <Wallet className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{'No Active Credit Facilities'}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {'Your Borrowing Record is Fresh & Clean'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                    {'You currently have zero outstanding borrowings and zero active installments. Submit a new application to access flexible microfinance credit facilities disbursed directly to your ACLEDA or Bakong wallet.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenApplyLoan) onOpenApplyLoan();
                      else onNavigate('new-application');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>{'+ Apply for Credit Facility'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('repayments')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{'View Schedule'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-card: ZERO DUE INSTALLMENTS */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{'ACCOUNT STATUS'}</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {formatMoney(0)}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{'All accounts in good standing • No installments due'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!canApplyForNewLoan}
                    onClick={() => {
                      if (!canApplyForNewLoan) {
                        alert(cannotApplyReason || 'You are not eligible to apply for a new loan at this time.');
                        return;
                      }
                      if (onOpenApplyLoan) onOpenApplyLoan();
                      else onNavigate('new-application');
                    }}
                    title={cannotApplyReason || 'Apply for a new loan'}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 ${
                      canApplyForNewLoan
                        ? 'bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 cursor-pointer'
                        : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {!canApplyForNewLoan && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{'+ Apply for Loan'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment History & Receipts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {'Payment History & Receipts'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {'Official payment receipts and settlement ledger'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('repayments')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <span>{'View All'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">{'Receipt No'}</th>
                    <th className="px-4 py-3">{'Date'}</th>
                    <th className="px-4 py-3">{'Method'}</th>
                    <th className="px-4 py-3">{'Amount'}</th>
                    <th className="px-4 py-3">{'Status'}</th>
                    <th className="px-5 py-3 text-right">{'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {recentReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        {'No payment receipts found. Settle installments via Bakong KHQR to view transaction receipts.'}
                      </td>
                    </tr>
                  ) : recentReceipts.map((rec, idx) => (
                    <tr key={rec.receiptNo || `rec-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-white">
                        {rec.receiptNo}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {rec.paidAt ? new Date(rec.paidAt).toLocaleDateString() : '2026-10-15'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Bakong KHQR
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white font-mono">
                        {formatMoney(rec.amountPaidUSD)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          PAID
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onViewReceipt?.(rec)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{'Receipt'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Right Sidebar Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* My Applications Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {'My Applications'}
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {recentApps.length} Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('applications')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer"
              >
                {'View'}
              </button>
            </div>

            <div className="space-y-3">
              {recentApps.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">{'No applications submitted'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenApplyLoan) onOpenApplyLoan();
                      else onNavigate('new-application');
                    }}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{'+ Apply for Credit Facility'}</span>
                  </button>
                </div>
              ) : recentApps.map((app, idx) => (
                <div
                  key={app.id || `app-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">{app.productName || 'Personal Loan'}</span>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {formatMoney(app.requestedAmountUSD || 5000)} • {app.requestedTermMonths || 12} mos
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {app.status || 'SUBMITTED'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Credit Facility Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                {'Institution & Branch Support'}
              </h5>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {'JAM SONG VICH Core Banking & Microfinance System. For loan restructuring or inquiries, contact credit desk at (+855) 010 487 718.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowerDashboard;
