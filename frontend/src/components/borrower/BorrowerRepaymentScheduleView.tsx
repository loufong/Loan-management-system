import React, { useState } from 'react';
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
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export interface BorrowerRepaymentScheduleViewProps {
  currentUser: UserProfile;
  currency: Currency;
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
  txRef?: string;
  paidAt?: string;
}

export const BorrowerRepaymentScheduleView: React.FC<BorrowerRepaymentScheduleViewProps> = ({
  currentUser,
  currency: appCurrency,
  onNavigate,
  onOpenPayInstallment,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km' || (language as string) === 'KH';

  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'DUE_SOON' | 'SCHEDULED'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<ScheduleRow | null>(null);

  const NBC_RATE = 4080;
  const isRestartedToZero = localStorage.getItem('jam_restart_borrower_zero') !== 'false';

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

  // Full 12-cycle Amortization Ledger for LN-2026-6042
  const scheduleData: ScheduleRow[] = isRestartedToZero ? [] : [
    { cycle: 1, dueDate: '2026-05-15', beginningPrincipal: 6000.0, scheduledEMI: 532.5, principal: 500.0, interest: 32.5, lateFees: 0.0, endingBalance: 5500.0, status: 'PAID', txRef: 'BK-88201', paidAt: '2026-05-14 14:22:10' },
    { cycle: 2, dueDate: '2026-06-15', beginningPrincipal: 5500.0, scheduledEMI: 529.79, principal: 500.0, interest: 29.79, lateFees: 0.0, endingBalance: 5000.0, status: 'PAID', txRef: 'BK-88212', paidAt: '2026-06-15 09:11:45' },
    { cycle: 3, dueDate: '2026-07-15', beginningPrincipal: 5000.0, scheduledEMI: 527.08, principal: 500.0, interest: 27.08, lateFees: 0.0, endingBalance: 4500.0, status: 'PAID', txRef: 'BK-88225', paidAt: '2026-07-13 16:40:02' },
    { cycle: 4, dueDate: '2026-08-15', beginningPrincipal: 4500.0, scheduledEMI: 524.38, principal: 650.0, interest: 24.38, lateFees: 0.0, endingBalance: 3850.0, status: 'PAID', txRef: 'BK-88231', paidAt: '2026-08-15 11:05:32' },
    { cycle: 5, dueDate: '2026-09-15', beginningPrincipal: 3850.0, scheduledEMI: 122.5, principal: 101.65, interest: 20.85, lateFees: 0.0, endingBalance: 3748.35, status: 'DUE_SOON' },
    { cycle: 6, dueDate: '2026-10-15', beginningPrincipal: 3748.35, scheduledEMI: 520.3, principal: 500.0, interest: 20.3, lateFees: 0.0, endingBalance: 3248.35, status: 'SCHEDULED' },
    { cycle: 7, dueDate: '2026-11-15', beginningPrincipal: 3248.35, scheduledEMI: 517.6, principal: 500.0, interest: 17.6, lateFees: 0.0, endingBalance: 2748.35, status: 'SCHEDULED' },
    { cycle: 8, dueDate: '2026-12-15', beginningPrincipal: 2748.35, scheduledEMI: 514.89, principal: 500.0, interest: 14.89, lateFees: 0.0, endingBalance: 2248.35, status: 'SCHEDULED' },
    { cycle: 9, dueDate: '2027-01-15', beginningPrincipal: 2248.35, scheduledEMI: 512.18, principal: 500.0, interest: 12.18, lateFees: 0.0, endingBalance: 1748.35, status: 'SCHEDULED' },
    { cycle: 10, dueDate: '2027-02-15', beginningPrincipal: 1748.35, scheduledEMI: 509.47, principal: 500.0, interest: 9.47, lateFees: 0.0, endingBalance: 1248.35, status: 'SCHEDULED' },
    { cycle: 11, dueDate: '2027-03-15', beginningPrincipal: 1248.35, scheduledEMI: 506.76, principal: 500.0, interest: 6.76, lateFees: 0.0, endingBalance: 748.35, status: 'SCHEDULED' },
    { cycle: 12, dueDate: '2027-04-15', beginningPrincipal: 748.35, scheduledEMI: 752.4, principal: 748.35, interest: 4.05, lateFees: 0.0, endingBalance: 0.0, status: 'SCHEDULED' },
  ];

  // Filtered rows
  const filteredSchedule = scheduleData.filter((row) => {
    if (statusFilter === 'ALL') return true;
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
    link.setAttribute('download', 'LN-2026-6042_Amortization_Ledger.csv');
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
                {isRestartedToZero ? 'NO ACTIVE LOANS' : 'LN-2026-6042 • ACTIVE'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              National Bank of Cambodia compliant monthly reducing amortization schedule and digital settlement receipts.
            </p>
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
              <p className="text-sm font-bold text-white">{isRestartedToZero ? 'No Active Facility' : 'Personal Loan'}</p>
              <span className="text-xs font-mono text-emerald-400 font-semibold">{isRestartedToZero ? '$0.00 @ 0.0% p.a.' : '$6,000.00 @ 6.5% p.a.'}</span>
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
                {formatMoney(isRestartedToZero ? 0 : 3850.0)}
              </p>
              <span className="text-[11px] text-slate-400 font-mono">{isRestartedToZero ? '0 Cycles Remaining' : '8 of 12 Cycles Remaining'}</span>
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
                {formatMoney(isRestartedToZero ? 0 : 2540.0)}
              </p>
              <span className="text-[11px] text-slate-400 font-mono">{isRestartedToZero ? '0 Settled Installments (0%)' : '4 Settled Installments (40%)'}</span>
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
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Filter Cycles:
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              {[
                { id: 'ALL', label: 'All (12)' },
                { id: 'PAID', label: 'Paid (4)' },
                { id: 'DUE_SOON', label: 'Due Soon (1)' },
                { id: 'SCHEDULED', label: 'Scheduled (7)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Interest Formula: <strong>NBC Reducing Balance (6.5%)</strong></span>
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
                const isDueSoon = row.status === 'DUE_SOON';
                const isPaid = row.status === 'PAID';

                return (
                  <tr
                    key={row.cycle}
                    className={`transition-colors ${
                      isDueSoon
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
                      <span className={isDueSoon ? 'text-amber-400 font-bold' : isPaid ? 'text-slate-300' : 'text-slate-400'}>
                        {row.dueDate}
                      </span>
                    </td>

                    {/* Beginning Principal */}
                    <td className="py-3 px-4 text-right text-slate-300">
                      {formatMoney(row.beginningPrincipal)}
                    </td>

                    {/* Scheduled EMI */}
                    <td className={`py-3 px-4 text-right font-bold ${isDueSoon ? 'text-amber-400 text-sm' : isPaid ? 'text-slate-200' : 'text-slate-400'}`}>
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
                    <td className="py-3 px-4 text-right text-slate-400">
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
                            <span className="text-[9px] text-slate-500 mt-0.5">{row.txRef}</span>
                          )}
                        </div>
                      )}

                      {isDueSoon && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                          <Clock className="w-3 h-3" />
                          DUE SOON
                        </span>
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
                        <span className="text-[10px] text-slate-600 font-sans italic">Locked</span>
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
                <span className="text-white font-bold">LN-2026-6042</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Cycle Number</span>
                <span className="text-white font-bold">Installment #{selectedReceipt.cycle} of 12</span>
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

