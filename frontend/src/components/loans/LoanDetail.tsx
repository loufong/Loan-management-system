import React, { useState } from 'react';
import { LoanAccount, PaymentReceipt, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { RepaymentScheduleTable } from './RepaymentScheduleTable';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  History,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Download
} from 'lucide-react';

export interface LoanDetailProps {
  loan: LoanAccount;
  receipts: PaymentReceipt[];
  currency: Currency;
  currentUserRole: UserRole;
  onBack: () => void;
  onCollectPayment?: (loanId: string, amount: number) => void;
  onViewReceipt?: (receipt: PaymentReceipt) => void;
}

export const LoanDetail: React.FC<LoanDetailProps> = ({
  loan,
  receipts,
  currency,
  currentUserRole,
  onBack,
  onCollectPayment,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'ledger'>('schedules');

  const progressPercent = Math.min(
    100,
    Math.round((loan.totalPaidUSD / loan.totalRepaymentUSD) * 100)
  );
  const isOverdue = loan.status === 'OVERDUE';
  const isCompleted = loan.status === 'COMPLETED';

  const isCashierOrAdmin =
    currentUserRole === 'CASHIER' ||
    currentUserRole === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Core Banking Loans</span>
        </button>
      </div>

      {/* 1. Top Summary Banner Card */}
      <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
                {loan.loanNumber}
              </h1>
              <Badge
                variant={
                  isCompleted ? 'paid' : isOverdue ? 'overdue' : 'active'
                }
                dot
              >
                {loan.status}
              </Badge>
              <span className="text-sm font-semibold text-slate-700">
                {loan.productName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Borrower: <strong className="text-slate-800">{loan.borrowerName}</strong> • Disbursed Date:{' '}
              <span className="font-mono tabular-nums text-slate-700">{loan.disbursedDate}</span> • Maturity Date:{' '}
              <span className="font-mono tabular-nums text-slate-700">{loan.maturityDate}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Disbursed Principal
            </span>
            <MoneyText
              amount={loan.principalUSD}
              currency={currency}
              className="text-2xl font-black text-slate-900"
            />
          </div>
        </div>

        {/* Large Visual Repayment Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-slate-600 font-medium">
              Repayment Progress:{' '}
              <strong className="text-slate-900 font-mono tabular-nums text-sm">
                <MoneyText amount={loan.totalPaidUSD} currency={currency} /> /{' '}
                <MoneyText amount={loan.totalRepaymentUSD} currency={currency} /> ({progressPercent}%)
              </strong>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Remaining Principal Callout:{' '}
              <strong className="text-indigo-600 font-bold">
                <MoneyText amount={loan.outstandingBalanceUSD} currency={currency} />
              </strong>
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-blue-600'
                  : isOverdue
                  ? 'bg-gradient-to-r from-emerald-500 to-rose-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-0.5">
            <span>Interest Rate: {loan.interestRate}% p.a.</span>
            <span>Total Accrued Interest: <MoneyText amount={loan.totalInterestUSD} currency={currency} /></span>
          </div>
        </div>
      </div>

      {/* 2. Next Due Highlighted Card */}
      {!isCompleted && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
            isOverdue
              ? 'bg-rose-50/50 border-rose-200 text-rose-900'
              : 'bg-indigo-50/40 border-indigo-200/80 text-indigo-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                isOverdue
                  ? 'bg-rose-600 text-white'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-bold">
                {isOverdue
                  ? `DELINQUENT: Past Due Installment (${loan.daysOverdue || 38} Days Overdue)`
                  : `Next Due Date: ${loan.nextPaymentDueDate}`}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Current Due Installment Amount:{' '}
                <strong className="font-mono tabular-nums text-slate-900 font-bold">
                  <MoneyText amount={loan.nextPaymentDueAmountUSD} currency={currency} />
                </strong>
                {loan.lateFeeAccruedUSD ? (
                  <span className="text-rose-600 font-mono ml-1.5">
                    (+ <MoneyText amount={loan.lateFeeAccruedUSD} currency={currency} /> Late Fee)
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {isCashierOrAdmin && (
            <button
              onClick={() =>
                onCollectPayment?.(loan.id, loan.nextPaymentDueAmountUSD)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            >
              <DollarSign className="w-4 h-4" />
              <span>Collect Payment</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Tabbed Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'schedules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Amortization Schedule ({loan.schedules.length} Installments)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Repayment History Ledger ({receipts.length})</span>
        </button>
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'schedules' && (
        <RepaymentScheduleTable
          schedules={loan.schedules}
          currency={currency}
          currentUserRole={currentUserRole}
          onCollectInstallment={(instNo, amount) =>
            onCollectPayment?.(loan.id, amount)
          }
          onViewReceipt={() => {
            if (receipts[0]) onViewReceipt?.(receipts[0]);
          }}
        />
      )}

      {activeTab === 'ledger' && (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Payment Channel</th>
                  <th className="py-3.5 px-4">Reference Code</th>
                  <th className="py-3.5 px-4">Received By</th>
                  <th className="py-3.5 px-4 text-right">Amount Settled</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No payment receipts generated for this loan account yet.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rec) => (
                    <tr
                      key={rec.receiptNo}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                    >
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-indigo-600">
                        {rec.receiptNo}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {rec.paidAt}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-500">
                        {rec.transactionRef}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">{rec.cashierName}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                        <MoneyText amount={rec.amountPaidUSD} currency={currency} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onViewReceipt?.(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
