import React, { useState } from 'react';
import { LoanAccount, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  AlertTriangle,
  Play,
  Phone,
  Send,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';

export interface OverdueWatchlistProps {
  loans: LoanAccount[];
  currency: Currency;
  currentUserRole: UserRole;
  onRecordPaymentForLoan?: (loanId: string) => void;
}

export const OverdueWatchlist: React.FC<OverdueWatchlistProps> = ({
  loans,
  currency,
  currentUserRole,
  onRecordPaymentForLoan
}) => {
  const [severityFilter, setSeverityFilter] = useState<
    'ALL' | 'EARLY' | 'MODERATE' | 'SEVERE'
  >('ALL');
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditToast, setAuditToast] = useState<string | null>(null);
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  // Mock delinquent records based on active loans and overdue statuses
  const [delinquentRecords, setDelinquentRecords] = useState([
    {
      id: 'OD-1',
      loanId: 'LN-2026-0012',
      loanNumber: 'LN-2026-0012',
      productName: 'Emergency Loan',
      borrowerName: 'Dara Pich',
      borrowerPhone: '+855 92 612 045',
      installmentNo: 4,
      dueDate: '2026-05-10',
      daysOverdue: 38,
      overdueAmountUSD: 512.0,
      lateFeeUSD: 60.8,
      lastContactedDate: '2026-09-18',
    },
    {
      id: 'OD-2',
      loanId: 'LN-2026-0004',
      loanNumber: 'LN-2026-0004',
      productName: 'SME Working Capital',
      borrowerName: 'Sokha Chea',
      borrowerPhone: '+855 12 889 102',
      installmentNo: 3,
      dueDate: '2026-08-25',
      daysOverdue: 28,
      overdueAmountUSD: 1240.0,
      lateFeeUSD: 45.0,
      lastContactedDate: '2026-09-20',
    },
    {
      id: 'OD-3',
      loanId: 'LN-2026-0089',
      loanNumber: 'LN-2026-0089',
      productName: 'Agricultural Equipment Loan',
      borrowerName: 'Vanna Rath',
      borrowerPhone: '+855 16 772 319',
      installmentNo: 2,
      dueDate: '2026-09-10',
      daysOverdue: 12,
      overdueAmountUSD: 850.0,
      lateFeeUSD: 25.0,
      lastContactedDate: '2026-09-21',
    },
    {
      id: 'OD-4',
      loanId: 'LN-2026-0008',
      loanNumber: 'LN-2026-0008',
      productName: 'Commercial Vehicle Loan',
      borrowerName: 'Dara Chan',
      borrowerPhone: '+855 89 221 440',
      installmentNo: 5,
      dueDate: '2026-09-14',
      daysOverdue: 8,
      overdueAmountUSD: 420.0,
      lateFeeUSD: 15.0,
      lastContactedDate: '2026-09-19',
    },
  ]);

  // Calculations for 3 metric cards
  const totalOverdueAmount = delinquentRecords.reduce(
    (sum, r) => sum + r.overdueAmountUSD,
    0
  );
  const delinquentLoansCount = delinquentRecords.length;
  const par30Count = delinquentRecords.filter((r) => r.daysOverdue >= 30).length;
  const par30Ratio = ((par30Count / Math.max(1, loans.length)) * 100).toFixed(1);
  const isParWarning = Number(par30Ratio) >= 3.0;

  // Filter records
  const filteredRecords = delinquentRecords.filter((rec) => {
    if (severityFilter === 'EARLY') return rec.daysOverdue <= 15;
    if (severityFilter === 'MODERATE') return rec.daysOverdue > 15 && rec.daysOverdue <= 30;
    if (severityFilter === 'SEVERE') return rec.daysOverdue > 30;
    return true;
  });

  const handleRunAudit = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      setAuditToast('Daily Overdue Audit completed: 4 accounts audited, accrued late fees verified against NBC rates.');
      setTimeout(() => setAuditToast(null), 4000);
    }, 1200);
  };

  const handleSendReminder = (name: string, phone: string) => {
    alert(`SMS and notification reminder sent to ${name} (${phone}).`);
  };

  const togglePhoneReveal = (id: string) => {
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskPhone = (phone: string) => {
    const parts = phone.split(' ');
    if (parts.length >= 4) {
      return `${parts[0]} ${parts[1]} *** **${parts[3].slice(-2)}`;
    }
    return phone.slice(0, 7) + '****' + phone.slice(-2);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Top Header with Run Daily Overdue Audit Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Overdue Watchlist
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              {delinquentLoansCount} Delinquent
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            PAR 30+ delinquency management, automated late fee calculation, and recovery actions.
          </p>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={auditRunning}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-sm transition-colors"
        >
          {auditRunning ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>Auditing Core Ledger...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Daily Overdue Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Audit Notification Toast */}
      {auditToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-150 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{auditToast}</span>
          </div>
        </div>
      )}

      {/* 2. Top Metrics Bar (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Overdue Balance */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Total Overdue Balance
          </span>
          <MoneyText
            amount={totalOverdueAmount}
            currency={currency}
            className="text-2xl font-bold text-rose-600 block font-mono"
          />
          <span className="text-[11px] text-slate-400">Total past-due principal across delinquent accounts</span>
        </div>

        {/* Card 2: Total Overdue Accounts */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Total Overdue Accounts
          </span>
          <span className="text-2xl font-mono tabular-nums font-bold text-slate-900 block">
            {delinquentLoansCount} accounts
          </span>
          <span className="text-[11px] text-slate-400">Borrower accounts requiring active loan recovery</span>
        </div>

        {/* Card 3: Portfolio at Risk (PAR 30+) */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Portfolio at Risk (PAR 30+)
            </span>
            {isParWarning ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Breach Warning
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Within Cap
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono tabular-nums font-bold ${isParWarning ? 'text-rose-600' : 'text-amber-600'}`}>
              {par30Ratio}%
            </span>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              ({par30Count} severe NPL accounts)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            NBC Regulatory Cap: <strong className="text-slate-700 font-mono">&lt; 3.0%</strong>
          </span>
        </div>
      </div>

      {/* 3. Severity Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Delinquent' },
            { key: 'EARLY', label: '1–15 Days (Early Watch)' },
            { key: 'MODERATE', label: '16–30 Days (Moderate Risk)' },
            { key: 'SEVERE', label: '30+ Days (Severe / NPL)' },
          ].map((tab) => {
            const active = severityFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSeverityFilter(tab.key as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Delinquency Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Borrower Name &amp; Phone</th>
                <th className="py-3.5 px-4">Loan # &amp; Product</th>
                <th className="py-3.5 px-4 text-center">Overdue Inst #</th>
                <th className="py-3.5 px-4">Original Due Date</th>
                <th className="py-3.5 px-4 text-center">Days Overdue</th>
                <th className="py-3.5 px-4 text-right">Overdue Amount</th>
                <th className="py-3.5 px-4 text-right">Simulated Late Fee</th>
                <th className="py-3.5 px-4">Last Contacted</th>
                <th className="py-3.5 px-4 text-right">Direct Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    No delinquent accounts match this severity filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isRevealed = revealedPhones[r.id];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                    >
                      {/* Borrower Name & Phone (with reveal toggle) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{r.borrowerName}</span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{isRevealed ? r.borrowerPhone : maskPhone(r.borrowerPhone)}</span>
                            <button
                              type="button"
                              onClick={() => togglePhoneReveal(r.id)}
                              className="text-slate-400 hover:text-slate-600 transition-colors ml-0.5"
                              title={isRevealed ? 'Hide phone' : 'Reveal phone'}
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Loan # & Product */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono tabular-nums font-bold text-blue-600 block">
                          {r.loanNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {r.productName}
                        </span>
                      </td>

                      {/* Overdue Installment # */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-700">
                        Inst #{r.installmentNo}
                      </td>

                      {/* Original Due Date */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {r.dueDate}
                      </td>

                      {/* Days Overdue (Color-coded badge: Yellow 1-15d, Orange 16-30d, Red 30+d) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono tabular-nums text-xs font-bold ${
                            r.daysOverdue > 30
                              ? 'bg-rose-50 text-rose-700 border border-rose-300'
                              : r.daysOverdue > 15
                              ? 'bg-orange-50 text-orange-700 border border-orange-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {r.daysOverdue} Days Late
                        </span>
                      </td>

                      {/* Overdue Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={r.overdueAmountUSD}
                          currency={currency}
                          className="font-bold text-rose-600 font-mono"
                        />
                      </td>

                      {/* Simulated Late Fee */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={r.lateFeeUSD}
                          currency={currency}
                          className="font-mono text-xs font-semibold text-slate-700"
                        />
                      </td>

                      {/* Last Contacted Date */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-500">
                        {r.lastContactedDate}
                      </td>

                      {/* Direct Actions: Send Reminder, Collect Payment */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleSendReminder(r.borrowerName, r.borrowerPhone)}
                            title="Send Reminder"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send Reminder</span>
                          </button>
                          <button
                            onClick={() => onRecordPaymentForLoan?.(r.loanId)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Collect Payment</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
