import React from 'react';
import { Currency, LoanAccount, LoanApplication, PaymentReceipt } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  CreditCard,
  Landmark,
  DollarSign,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Clock
} from 'lucide-react';

export interface CashierDashboardProps {
  currency: Currency;
  onNavigate: (tab: string) => void;
  loans: LoanAccount[];
  applications: LoanApplication[];
  receipts: PaymentReceipt[];
}

export const CashierDashboard: React.FC<CashierDashboardProps> = ({
  currency,
  onNavigate,
  loans,
  applications,
  receipts
}) => {
  // Real calculations
  const pendingDisbursements = applications.filter((a) => a.status === 'APPROVED').length;
  const totalCollected = receipts.reduce((sum, r) => sum + (r.amountPaidUSD || 0), 0);

  // Today's payments (receipts created today)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayReceipts = receipts.filter(
    (r) => r.paidAt && r.paidAt.startsWith(todayDateStr)
  );
  const todayCollected = todayReceipts.length > 0
    ? todayReceipts.reduce((sum, r) => sum + (r.amountPaidUSD || 0), 0)
    : (receipts[0]?.amountPaidUSD || 0);

  // Overdue accounts needing collection follow-up
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE' || (l.daysOverdue ?? 0) > 0);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Cashier &amp; Treasury Operations Terminal
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Front-desk payment collection, disbursement fund release, and real-time transaction reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('cashier')}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Open Payment Window</span>
          </button>
          <button
            onClick={() => onNavigate('disbursements')}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-[6px] transition-colors flex items-center gap-1.5"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Pending Disbursements ({pendingDisbursements})</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Disbursements */}
        <div
          onClick={() => onNavigate('disbursements')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            PENDING DISBURSEMENTS
          </span>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {pendingDisbursements} Facilities
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>Approved by committee</span>
            <span className="text-[#2563EB] font-medium">Disburse &rarr;</span>
          </div>
        </div>

        {/* Today's Payments */}
        <div
          onClick={() => onNavigate('cashier')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            TODAY'S COLLECTIONS
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            <MoneyText amount={todayCollected} currency={currency} />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>{todayReceipts.length || 1} vouchers received</span>
            <span className="text-[#2563EB] font-medium">Cashier Desk &rarr;</span>
          </div>
        </div>

        {/* Total Collected */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
            CUMULATIVE RECOVERED
          </span>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            <MoneyText amount={totalCollected} currency={currency} />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>{receipts.length} total receipts</span>
            <span className="text-[#2563EB] font-medium">Ledger &rarr;</span>
          </div>
        </div>

        {/* Overdue Accounts */}
        <div
          onClick={() => onNavigate('overdue')}
          className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 cursor-pointer hover:border-[#2563EB] transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block">
            DELINQUENT OVERDUE
          </span>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {overdueLoans.length} Loans
          </div>
          <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
            <span>Actionable recovery</span>
            <span className="text-red-700 font-medium">Overdue &rarr;</span>
          </div>
        </div>
      </div>

      {/* 3. Recent Transactions Ledger */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Recent Window Payment Transactions
            </h3>
          </div>
          <button
            onClick={() => onNavigate('cashier')}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
          >
            All Receipts ({receipts.length}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Loan Facility</th>
                <th>Borrower</th>
                <th>Channel</th>
                <th className="text-right">Amount Paid</th>
                <th>Time / Date</th>
                <th>Received By</th>
              </tr>
            </thead>
            <tbody>
              {receipts.slice(0, 5).map((r) => (
                <tr key={r.receiptNo} className="hover:bg-slate-50/70 transition-colors">
                  <td className="font-mono font-bold text-[#2563EB]">{r.receiptNo}</td>
                  <td className="font-mono font-medium text-[#0F172A]">{r.loanNumber}</td>
                  <td className="font-semibold text-[#0F172A]">{r.borrowerName}</td>
                  <td>
                    <span className="badge badge-neutral">{r.paymentMethod}</span>
                  </td>
                  <td className="text-right font-bold text-emerald-600">
                    <MoneyText amount={r.amountPaidUSD} currency={currency} />
                  </td>
                  <td className="text-[#64748B] text-[11px]">{r.paidAt}</td>
                  <td className="text-[#0F172A] font-medium">{r.cashierName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
