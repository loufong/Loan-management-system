import React, { useState } from 'react';
import { LoanAccount, Currency, UserRole } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  Play,
  Phone,
  Send,
  DollarSign,
  CheckCircle2,
  Clock,
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

  // Mock delinquent records
  const delinquentRecords = [
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
  ];

  const totalOverdueAmount = delinquentRecords.reduce(
    (sum, r) => sum + r.overdueAmountUSD,
    0
  );
  const delinquentLoansCount = delinquentRecords.length;
  const par30Count = delinquentRecords.filter((r) => r.daysOverdue >= 30).length;
  const par30Ratio = ((par30Count / Math.max(1, loans.length)) * 100).toFixed(1);
  const isParWarning = Number(par30Ratio) >= 3.0;

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
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Overdue Watchlist &amp; Delinquency Desk
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-red-50 text-[#DC2626] border border-red-200">
              {delinquentLoansCount} Delinquent
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            PAR 30+ delinquency management, regulatory non-performing loan watchlist, and recovery actions.
          </p>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={auditRunning}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors cursor-pointer"
        >
          {auditRunning ? (
            <>
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Auditing Core Ledger...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Run Daily Overdue Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Audit Notification Toast */}
      {auditToast && (
        <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span className="font-semibold">{auditToast}</span>
          </div>
        </div>
      )}

      {/* 2. Top Metrics Bar (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Overdue Balance */}
        <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
            Total Overdue Balance
          </span>
          <MoneyText
            amount={totalOverdueAmount}
            currency={currency}
            className="text-2xl font-bold text-[#DC2626] block font-mono"
          />
          <span className="text-[11px] text-[#64748B]">Total past-due principal across delinquent accounts</span>
        </div>

        {/* Card 2: Total Overdue Accounts */}
        <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
            Total Overdue Accounts
          </span>
          <span className="text-2xl font-mono tabular-nums font-bold text-[#0F172A] block">
            {delinquentLoansCount} accounts
          </span>
          <span className="text-[11px] text-[#64748B]">Borrower accounts requiring active loan recovery</span>
        </div>

        {/* Card 3: Portfolio at Risk (PAR 30+) */}
        <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Portfolio at Risk (PAR 30+)
            </span>
            {isParWarning ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-red-50 text-[#DC2626] border border-red-200">
                Breach Warning
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-emerald-50 text-[#16A34A] border border-emerald-200">
                Within Cap
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono tabular-nums font-bold ${isParWarning ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
              {par30Ratio}%
            </span>
            <span className="text-xs font-semibold text-[#64748B] font-mono">
              ({par30Count} severe NPL accounts)
            </span>
          </div>
          <span className="text-[11px] text-[#64748B]">
            NBC Regulatory Cap: <strong className="text-[#0F172A] font-mono">&lt; 3.0%</strong>
          </span>
        </div>
      </div>

      {/* 3. Severity Filter Tabs */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-0.5 rounded-[6px] border border-[#CBD5E1]">
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-[#0F172A] shadow-xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Delinquency Data Table */}
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Borrower Name &amp; Phone</th>
                <th>Loan # &amp; Product</th>
                <th className="text-center">Installment #</th>
                <th>Due Date</th>
                <th className="text-center">Days Overdue</th>
                <th className="text-right">Overdue Amount</th>
                <th className="text-right">Accrued Late Fee</th>
                <th>Last Contacted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#64748B]">
                    No delinquent accounts match this severity filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isRevealed = revealedPhones[r.id];
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Borrower Name & Phone */}
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0F172A]">{r.borrowerName}</span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B] mt-0.5">
                            <Phone className="w-3 h-3 text-[#64748B]" />
                            <span>{isRevealed ? r.borrowerPhone : maskPhone(r.borrowerPhone)}</span>
                            <button
                              type="button"
                              onClick={() => togglePhoneReveal(r.id)}
                              className="text-[#64748B] hover:text-[#0F172A] ml-0.5"
                              title={isRevealed ? 'Hide phone' : 'Reveal phone'}
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Loan # & Product */}
                      <td>
                        <span className="font-mono tabular-nums font-bold text-[#2563EB] block">
                          {r.loanNumber}
                        </span>
                        <span className="text-[11px] text-[#64748B] block truncate">
                          {r.productName}
                        </span>
                      </td>

                      {/* Overdue Installment # */}
                      <td className="text-center font-mono text-xs text-[#0F172A]">
                        Inst #{r.installmentNo}
                      </td>

                      {/* Due Date */}
                      <td className="font-mono tabular-nums text-xs text-[#0F172A]">
                        {r.dueDate}
                      </td>

                      {/* Days Overdue */}
                      <td className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-[4px] font-mono tabular-nums text-xs font-bold border ${
                            r.daysOverdue > 30
                              ? 'bg-red-50 text-[#DC2626] border-red-200'
                              : r.daysOverdue > 15
                              ? 'bg-amber-50 text-[#D97706] border-amber-200'
                              : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          }`}
                        >
                          {r.daysOverdue} Days Late
                        </span>
                      </td>

                      {/* Overdue Amount */}
                      <td className="text-right">
                        <MoneyText
                          amount={r.overdueAmountUSD}
                          currency={currency}
                          className="font-bold text-[#DC2626] font-mono"
                        />
                      </td>

                      {/* Late Fee */}
                      <td className="text-right">
                        <MoneyText
                          amount={r.lateFeeUSD}
                          currency={currency}
                          className="font-mono text-xs font-bold text-[#0F172A]"
                        />
                      </td>

                      {/* Last Contacted */}
                      <td className="font-mono tabular-nums text-xs text-[#64748B]">
                        {r.lastContactedDate}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleSendReminder(r.borrowerName, r.borrowerPhone)}
                            title="Send Reminder"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reminder</span>
                          </button>
                          <button
                            onClick={() => onRecordPaymentForLoan?.(r.loanId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Collect</span>
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

export default OverdueWatchlist;
