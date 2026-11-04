import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  FileText,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building,
  TrendingDown,
  Receipt,
  Filter,
  Plus,
} from 'lucide-react';
import { Currency, UserProfile, LoanAccount } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { generateAmortizationSchedule } from '../../services/loanStorageService';

export interface BorrowerRepaymentScheduleViewProps {
  currentUser: UserProfile;
  currency: Currency;
  loans?: LoanAccount[];
  onNavigate: (route: string) => void;
  onOpenPayInstallment?: (installmentNo?: number, amount?: number) => void;
}

interface ScheduleRow {
  cycle: number;
  dueDate: string;
  beginningPrincipal: number;
  scheduledEMI: number;
  principal: number;
  interest: number;
  lateFees: number;
  endingBalance: number;
  status: 'PAID' | 'DUE_SOON' | 'SCHEDULED' | 'OVERDUE';
  daysOverdue?: number;
  daysRemaining?: number;
  txRef?: string;
  paidAt?: string;
}

export const BorrowerRepaymentScheduleView: React.FC<BorrowerRepaymentScheduleViewProps> = ({
  currentUser,
  currency: appCurrency,
  loans,
  onNavigate,
  onOpenPayInstallment,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km' || (language as string) === 'KH';

  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED' | 'PAID'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<ScheduleRow | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time ledger synchronization on payments
  useEffect(() => {
    const handleLedgerUpdate = () => {
      setCurrentTime(new Date());
    };
    window.addEventListener('ledger_updated', handleLedgerUpdate);
    window.addEventListener('storage', handleLedgerUpdate);
    return () => {
      window.removeEventListener('ledger_updated', handleLedgerUpdate);
      window.removeEventListener('storage', handleLedgerUpdate);
    };
  }, []);

  const NBC_RATE = 4080;

  // Clear any legacy test restart flags so real account data always determines UI state
  useEffect(() => {
    try {
      localStorage.removeItem('jam_restart_borrower_zero');
    } catch {
      // ignore
    }
  }, []);

  // Format currency
  const formatMoney = (valUSD: number) => {
    if (activeCurrency === 'KHR') {
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(valUSD * NBC_RATE);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valUSD);
  };

  // Strictly derive active facility from user's actual loans
  const userLoans = Array.isArray(loans) ? loans : [];
  const activeLoans = userLoans.filter((l) => {
    const st = (l.status || '').toUpperCase();
    return st === 'ACTIVE' || st === 'OVERDUE' || st === 'IN_REPAYMENT';
  });
  const activeLoan = activeLoans.length > 0 ? activeLoans[0] : null;
  const hasActiveLoan = !!activeLoan;

  // Build schedule data strictly from active loan schedules with automatic reducing balance recovery & real-time dates
  const scheduleData: ScheduleRow[] = useMemo(() => {
    if (!hasActiveLoan || !activeLoan) {
      return [];
    }

    const origPrincipal = Number(
      activeLoan.principalUSD || (activeLoan as any)?.principalAmount || (activeLoan as any)?.principal?.disbursedAmountUSD || activeLoan.outstandingBalanceUSD || 0
    );
    const apr = Number(activeLoan.interestRate || (activeLoan as any)?.principal?.aprPercent || 6.5);
    const term = Number(activeLoan.termMonths || (activeLoan as any)?.principal?.termMonths || (activeLoan.schedules?.length || 12));

    const rawSchedules = Array.isArray(activeLoan.schedules) && activeLoan.schedules.length > 0
      ? activeLoan.schedules
      : generateAmortizationSchedule(origPrincipal, apr, term);

    // Reference amortization table to guarantee accurate calculations even if stored items had zero values
    const referenceAmort = generateAmortizationSchedule(origPrincipal, apr, term);

    let runningPrincipal = origPrincipal;
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);

    const rows: ScheduleRow[] = rawSchedules.map((s: any, idx: number) => {
      const cycle = s.installmentNo || idx + 1;
      const refRow = referenceAmort[idx] || referenceAmort[referenceAmort.length - 1];

      // Principal, interest and EMI: extract or fallback to reference
      const principalRaw = Number(s.principalUSD ?? s.principalDue ?? s.principal ?? 0);
      const interestRaw = Number(s.interestUSD ?? s.interestDue ?? s.interest ?? 0);
      const emiRaw = Number(s.totalDueUSD ?? s.totalDue ?? s.totalAmount ?? 0);

      const principal = principalRaw > 0 ? principalRaw : (refRow?.principalDue || 0);
      const interest = interestRaw > 0 ? interestRaw : (refRow?.interestDue || 0);
      const scheduledEMI = emiRaw > 0 ? emiRaw : (principal + interest);

      const beginningPrincipal = s.beginningPrincipal !== undefined && Number(s.beginningPrincipal) > 0
        ? Number(s.beginningPrincipal)
        : (s.startingBalance !== undefined && Number(s.startingBalance) > 0
          ? Number(s.startingBalance)
          : (refRow?.startingBalance ?? runningPrincipal));

      const endingBalance = s.endingBalance !== undefined && Number(s.endingBalance) >= 0
        ? Number(s.endingBalance)
        : (s.remainingBalance !== undefined && Number(s.remainingBalance) >= 0
          ? Number(s.remainingBalance)
          : (refRow?.remainingBalance ?? Math.max(0, beginningPrincipal - principal)));

      runningPrincipal = endingBalance;

      const dueDateStr = s.dueDate || refRow?.dueDate || '';
      const dueDateObj = new Date(dueDateStr + 'T00:00:00');
      dueDateObj.setHours(0, 0, 0, 0);

      // Real-time days difference calculation
      const diffTime = dueDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isPaid =
        (s.status || '').toUpperCase() === 'PAID' ||
        (s.remainingAmountUSD !== undefined && s.remainingAmountUSD <= 0 && s.amountPaidUSD > 0);

      let status: 'PAID' | 'DUE_SOON' | 'SCHEDULED' | 'OVERDUE' = 'SCHEDULED';
      let daysOverdue = 0;
      let daysRemaining = 0;
      let lateFees = Number(s.lateFees || s.lateFeeAccruedUSD || 0);

      if (isPaid) {
        status = 'PAID';
        lateFees = 0;
      } else if (diffDays < 0 || (s.status || '').toUpperCase() === 'OVERDUE') {
        // Due date has passed in real time!
        status = 'OVERDUE';
        daysOverdue = Math.max(1, Math.abs(diffDays));
        if (lateFees === 0) {
          // Standard NBC regulatory formula: $0.50 per day overdue (capped at 10% of principal)
          lateFees = Math.min(Math.round(principal * 0.1 * 100) / 100, Math.round(daysOverdue * 0.50 * 100) / 100);
        }
      } else if (diffDays <= 30 || (s.status || '').toUpperCase() === 'DUE' || idx === 0) {
        // Current billing cycle within 30 days
        status = 'DUE_SOON';
        daysRemaining = Math.max(0, diffDays);
        lateFees = 0;
      } else {
        status = 'SCHEDULED';
        daysRemaining = Math.max(0, diffDays);
        lateFees = 0;
      }

      return {
        cycle,
        dueDate: dueDateStr,
        beginningPrincipal,
        scheduledEMI,
        principal,
        interest,
        lateFees,
        endingBalance,
        status,
        daysOverdue,
        daysRemaining,
        txRef: (s as any).transactionReference || (s as any).txRef || (isPaid ? `TX-${cycle}` : undefined),
        paidAt: (s as any).settledAt || (s as any).paidAt || (isPaid ? s.dueDate : undefined),
      };
    });

    // Ensure the earliest unpaid installment is always payable (DUE_SOON) if none is overdue or due soon
    const hasOverdueOrDueSoon = rows.some((r) => r.status === 'OVERDUE' || r.status === 'DUE_SOON');
    if (!hasOverdueOrDueSoon) {
      const firstUnpaid = rows.find((r) => r.status !== 'PAID');
      if (firstUnpaid) {
        firstUnpaid.status = 'DUE_SOON';
      }
    }

    return rows;
  }, [hasActiveLoan, activeLoan, currentTime]);

  // Filtered rows
  const filteredSchedule = scheduleData.filter((row) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return row.status === 'OVERDUE';
    if (statusFilter === 'PAID') return row.status === 'PAID';
    if (statusFilter === 'DUE_SOON') return row.status === 'DUE_SOON';
    if (statusFilter === 'SCHEDULED') return row.status === 'SCHEDULED';
    return true;
  });

  // Client-side CSV Ledger Generator
  const handleExportCSV = () => {
    const headers = ['Cycle', 'Due Date', 'Beginning Principal', 'Scheduled EMI', 'Principal', 'Interest', 'Late Fees', 'Ending Balance', 'Status', 'Transaction Ref'];
    const rows = scheduleData.map(r => [
      r.cycle,
      r.dueDate,
      r.beginningPrincipal.toFixed(2),
      r.scheduledEMI.toFixed(2),
      r.principal.toFixed(2),
      r.interest.toFixed(2),
      r.lateFees.toFixed(2),
      r.endingBalance.toFixed(2),
      r.status,
      r.txRef || 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeLoan?.loanNumber || 'Amortization'}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side PDF Statement Generator (Print preview)
  const handleDownloadPDF = () => {
    window.print();
  };

  const handlePayInstallment = (cycle: number, amount: number) => {
    if (onOpenPayInstallment) {
      onOpenPayInstallment(cycle, amount);
    } else {
      onNavigate('cashier');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER & SUMMARY BANNER                                                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span className="text-slate-500 font-medium">Core Banking</span>
              <span>/</span>
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                {'Repayment Schedule'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {'Amortization Repayment Ledger'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {hasActiveLoan ? `${activeLoan?.loanNumber || activeLoan?.id || 'LOAN'} • ACTIVE` : 'NO ACTIVE LOANS'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              National Bank of Cambodia compliant monthly reducing amortization schedule and digital settlement receipts.
            </p>

            {/* Real-Time Engine Ticking Clock */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-400">Live Real-Time Engine:</span>
                <strong className="text-emerald-400">
                  {currentTime.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}{' '}
                  {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                </strong>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Timezone: <strong>Asia/Phnom_Penh (UTC+7)</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Utility Controls: PDF Statement, Export CSV & Currency */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveCurrency(activeCurrency === 'USD' ? 'KHR' : 'USD')}
              className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-mono font-bold text-slate-200 transition-all cursor-pointer"
            >
              Currency: <span className="text-emerald-400">{activeCurrency}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Export complete schedule to CSV format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
              title="Download official PDF repayment schedule"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Overview Strip (3 High-Density Core KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Facility & Rate
              </span>
              <p className="text-sm font-bold text-white">{hasActiveLoan ? (activeLoan?.productName || 'Personal Loan') : 'No Active Facility'}</p>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {hasActiveLoan
                  ? `${formatMoney(Number(activeLoan?.principalUSD || (activeLoan as any)?.principalAmount || 0))} @ ${Number(activeLoan?.interestRate || 0)}% p.a.`
                  : '$0.00 @ 0.0% p.a.'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
              <Building className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Remaining Principal
              </span>
              <p className="text-base font-bold font-mono text-white">
                {formatMoney(hasActiveLoan ? Number(activeLoan?.outstandingBalanceUSD || (activeLoan as any)?.outstandingBalance || 0) : 0)}
              </p>
              <span className="text-[11px] text-slate-400 font-mono">
                {hasActiveLoan
                  ? `${scheduleData.filter((s) => s.status !== 'PAID').length} of ${scheduleData.length} Cycles Remaining`
                  : '0 Cycles Remaining'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
              <TrendingDown className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Settle-to-Date
              </span>
              <p className="text-base font-bold font-mono text-emerald-400">
                {formatMoney(hasActiveLoan ? Number(activeLoan?.totalPaidUSD || (activeLoan as any)?.totalPaid || 0) : 0)}
              </p>
              <span className="text-[11px] text-slate-400 font-mono">
                {hasActiveLoan
                  ? `${scheduleData.filter((s) => s.status === 'PAID').length} Settled Installments`
                  : '0 Settled Installments (0%)'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. AMORTIZATION LEDGER TABLE                                              */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filter Tabs Toolbar */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Filter Cycles:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              {[
                { id: 'ALL', label: `All (${scheduleData.length})` },
                ...(scheduleData.filter((s) => s.status === 'OVERDUE').length > 0
                  ? [
                      {
                        id: 'OVERDUE',
                        label: `Overdue (${scheduleData.filter((s) => s.status === 'OVERDUE').length})`,
                        isDanger: true,
                      },
                    ]
                  : []),
                {
                  id: 'DUE_SOON',
                  label: `Due Soon (${scheduleData.filter((s) => s.status === 'DUE_SOON').length})`,
                  isWarn: true,
                },
                {
                  id: 'SCHEDULED',
                  label: `Scheduled (${scheduleData.filter((s) => s.status === 'SCHEDULED').length})`,
                },
                {
                  id: 'PAID',
                  label: `Paid (${scheduleData.filter((s) => s.status === 'PAID').length})`,
                  isSuccess: true,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? (tab as any).isDanger
                        ? 'bg-rose-500 text-white font-bold shadow-md'
                        : (tab as any).isWarn
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : (tab as any).isSuccess
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-2xs'
                        : 'bg-emerald-500 text-slate-950 font-bold shadow-2xs'
                      : (tab as any).isDanger
                      ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 font-bold'
                      : (tab as any).isWarn
                      ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Interest Formula: <strong>NBC Reducing Balance ({Number(activeLoan?.interestRate || 6.5)}% p.a.)</strong></span>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-4 text-center">Cycle #</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Beginning Principal</th>
                <th className="py-3 px-4 text-right">Scheduled EMI</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-right">Interest</th>
                <th className="py-3 px-4 text-right">Late Fees</th>
                <th className="py-3 px-4 text-right">Ending Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">No Active Repayment Schedule</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                      Your account currently has zero active facilities and no scheduled installments due. Once your credit facility is approved, the 12-cycle amortization table will appear here.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('new-application')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Apply for Loan</span>
                    </button>
                  </td>
                </tr>
              ) : filteredSchedule.map((row) => {
                const isOverdue = row.status === 'OVERDUE';
                const isDueSoon = row.status === 'DUE_SOON';
                const isPaid = row.status === 'PAID';

                return (
                  <tr
                    key={row.cycle}
                    className={`transition-colors ${
                      isOverdue
                        ? 'bg-rose-500/10 hover:bg-rose-500/15 border-l-4 border-l-rose-500 text-rose-200'
                        : isDueSoon
                        ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500'
                        : isPaid
                        ? 'bg-slate-900/30 hover:bg-slate-850/50'
                        : 'hover:bg-slate-850/30 text-slate-400'
                    }`}
                  >
                    {/* Cycle # */}
                    <td className="py-3 px-4 text-center font-bold text-slate-300">
                      #{row.cycle}
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={isOverdue ? 'text-rose-400 font-bold flex items-center gap-1.5' : isDueSoon ? 'text-amber-400 font-bold' : isPaid ? 'text-slate-300' : 'text-slate-400'}>
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        {row.dueDate}
                      </span>
                    </td>

                    {/* Beginning Principal */}
                    <td className="py-3 px-4 text-right text-slate-300">
                      {formatMoney(row.beginningPrincipal)}
                    </td>

                    {/* Scheduled EMI */}
                    <td className={`py-3 px-4 text-right font-bold ${isOverdue ? 'text-rose-300 font-mono text-sm' : isDueSoon ? 'text-amber-400 text-sm' : isPaid ? 'text-slate-200' : 'text-slate-400'}`}>
                      {formatMoney(row.scheduledEMI)}
                    </td>

                    {/* Principal Allocation */}
                    <td className="py-3 px-4 text-right text-slate-300">
                      {formatMoney(row.principal)}
                    </td>

                    {/* Interest Allocation */}
                    <td className="py-3 px-4 text-right text-emerald-400/90">
                      {formatMoney(row.interest)}
                    </td>

                    {/* Late Fees */}
                    <td className={`py-3 px-4 text-right ${isOverdue && row.lateFees > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {formatMoney(row.lateFees)}
                    </td>

                    {/* Ending Balance */}
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {formatMoney(row.endingBalance)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isPaid && (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            PAID
                          </span>
                          {row.txRef && (
                            <span className="text-[9px] text-slate-500 mt-0.5 font-mono">{row.txRef}</span>
                          )}
                        </div>
                      )}

                      {isOverdue && (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            OVERDUE
                          </span>
                          {row.daysOverdue !== undefined && row.daysOverdue > 0 && (
                            <span className="text-[9px] text-rose-400/90 font-mono mt-0.5">
                              {row.daysOverdue} days late
                            </span>
                          )}
                        </div>
                      )}

                      {isDueSoon && (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3 h-3" />
                            DUE SOON
                          </span>
                          {row.daysRemaining !== undefined && (
                            <span className="text-[9px] text-amber-400/90 font-mono mt-0.5">
                              {row.daysRemaining === 0 ? 'Due today!' : `Due in ${row.daysRemaining}d`}
                            </span>
                          )}
                        </div>
                      )}

                      {row.status === 'SCHEDULED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60">
                          SCHEDULED
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer font-sans"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      )}

                      {isOverdue && (
                        <button
                          type="button"
                          onClick={() => handlePayInstallment(row.cycle, row.scheduledEMI + row.lateFees)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition-all active:scale-[0.98] cursor-pointer font-sans"
                        >
                          <div className="w-3 h-3 rounded bg-white text-rose-600 flex items-center justify-center font-black text-[7px]">
                            KH
                          </div>
                          <span>Settle Overdue</span>
                        </button>
                      )}

                      {isDueSoon && (
                        <button
                          type="button"
                          onClick={() => handlePayInstallment(row.cycle, row.scheduledEMI)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950/40 transition-all active:scale-[0.98] cursor-pointer font-sans"
                        >
                          <div className="w-3 h-3 rounded bg-white text-red-600 flex items-center justify-center font-black text-[7px]">
                            KH
                          </div>
                          <span>Pay via KHQR</span>
                        </button>
                      )}

                      {row.status === 'SCHEDULED' && (
                        <span className="text-[10px] text-slate-600 font-sans italic">Scheduled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SETTLED RECEIPT DETAILS MODAL                                          */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Header */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Official Repayment Receipt</h3>
              <p className="text-xs text-slate-400 font-mono">Tx Reference: {selectedReceipt.txRef}</p>
            </div>

            {/* Receipt Breakdown */}
            <div className="space-y-2.5 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-850">
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Facility Account</span>
                <span className="text-white font-bold">{activeLoan?.loanNumber || activeLoan?.id || 'NO FACILITY'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Cycle Number</span>
                <span className="text-white font-bold">Installment #{selectedReceipt.cycle} of {scheduleData.length || 12}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Settled Timestamp</span>
                <span className="text-slate-300">{selectedReceipt.paidAt}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Payment Channel</span>
                <span className="text-emerald-400 font-bold">Bakong KHQR (Clearing: ACLEDA)</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-white font-bold text-sm">
                <span className="font-sans">Total Paid</span>
                <span className="text-emerald-400">{formatMoney(selectedReceipt.scheduledEMI)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerRepaymentScheduleView;

