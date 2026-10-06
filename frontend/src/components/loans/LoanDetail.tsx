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
  DollarSign,
  Download,
  Zap,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';

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
  const [isSimulating, setIsSimulating] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const handleSimulateOverdue = async () => {
    setIsSimulating(true);
    setDemoNotice(null);
    try {
      const res = await api.simulateOverdue(loan.id);
      setDemoNotice(res.message || 'Overdue fast-forward simulated! Earliest installment set to 5 days past due.');
      loan.status = 'OVERDUE';
      loan.daysOverdue = 5;
      const targetSchedule = loan.schedules.find((s) => s.status !== 'PAID');
      if (targetSchedule) {
        targetSchedule.status = 'OVERDUE';
        targetSchedule.dueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        (targetSchedule as any).daysLate = 5;
      }
    } catch (err: any) {
      setDemoNotice(err?.message || 'Simulation error');
    } finally {
      setIsSimulating(false);
    }
  };

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
    <div className="space-y-6 font-sans">
      {/* Back Button & Action Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#CBD5E1]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Active Loans</span>
        </button>

        {!isCompleted && (
          <button
            onClick={handleSimulateOverdue}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors"
            title="Simulate past-due installment to test overdue interest and penalties"
          >
            {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Simulating...' : 'Simulate Past Due'}</span>
          </button>
        )}
      </div>

      {/* Notice Banner */}
      {demoNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[11px] px-2 py-0.5 bg-amber-100 text-amber-900 rounded-[4px]">Notice</span>
            <span className="font-medium">{demoNotice}</span>
          </div>
          <button
            onClick={() => setDemoNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Point 15: Institutional LOAN INFORMATION Panel */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#CBD5E1]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                LOAN INFORMATION
              </span>
              <Badge
                variant={
                  isCompleted ? 'paid' : isOverdue ? 'overdue' : 'active'
                }
                dot
              >
                {loan.status}
              </Badge>
            </div>
            <h1 className="text-xl font-bold font-mono text-[#0F172A] mt-1">
              {loan.loanNumber}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase block">
              Outstanding Balance
            </span>
            <MoneyText
              amount={loan.outstandingBalanceUSD}
              currency={currency}
              className="text-2xl font-bold text-[#2563EB] font-mono"
            />
          </div>
        </div>

        {/* 11 Institutional Fields Grid (Point 15 verbatim) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Loan ID</span>
            <span className="font-mono font-bold text-[#0F172A] mt-1 block">{loan.loanNumber}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Borrower</span>
            <span className="font-bold text-[#0F172A] mt-1 block truncate">{loan.borrowerName}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Loan Product</span>
            <span className="font-semibold text-[#0F172A] mt-1 block truncate">{loan.productName}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Principal</span>
            <MoneyText amount={loan.principalUSD} currency={currency} className="font-bold text-[#0F172A] mt-1 block" />
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Interest Rate</span>
            <span className="font-mono font-bold text-[#0F172A] mt-1 block">{loan.interestRate}% p.a.</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Term</span>
            <span className="font-bold text-[#0F172A] mt-1 block">{loan.schedules.length || 12} months</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Monthly Installment</span>
            <MoneyText amount={loan.nextPaymentDueAmountUSD} currency={currency} className="font-bold text-[#0F172A] mt-1 block" />
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Disbursement Date</span>
            <span className="font-mono text-[#0F172A] mt-1 block">{loan.disbursedDate}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Next Payment</span>
            <span className="font-mono text-[#0F172A] mt-1 block">{loan.nextPaymentDueDate}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Outstanding</span>
            <MoneyText amount={loan.outstandingBalanceUSD} currency={currency} className="font-bold text-[#2563EB] mt-1 block" />
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Loan Status</span>
            <span className="font-bold text-[#0F172A] mt-1 block">{loan.status}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
            <span className="text-[11px] text-[#64748B] uppercase font-semibold block">Maturity Date</span>
            <span className="font-mono text-[#0F172A] mt-1 block">{loan.maturityDate}</span>
          </div>
        </div>

        {/* Amortization Progress Bar */}
        <div className="pt-2 border-t border-[#CBD5E1] space-y-1.5">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-[#64748B]">
              Principal Settled: <strong className="text-[#0F172A] font-mono tabular-nums"><MoneyText amount={loan.totalPaidUSD} currency={currency} /> / <MoneyText amount={loan.totalRepaymentUSD} currency={currency} /></strong> ({progressPercent}%)
            </span>
            <span className="text-[#64748B] font-mono">
              Total Accrued Interest: <strong className="text-[#0F172A]"><MoneyText amount={loan.totalInterestUSD} currency={currency} /></strong>
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-[#16A34A]'
                  : isOverdue
                  ? 'bg-[#DC2626]'
                  : 'bg-[#2563EB]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Next Payment / Overdue Alert Banner */}
      {!isCompleted && (
        <div
          className={`p-4 rounded-[8px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isOverdue
              ? 'bg-red-50 border-red-200 text-red-950'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-[6px] flex items-center justify-center font-bold text-sm shrink-0 ${
                isOverdue
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-[#2563EB] text-white'
              }`}
            >
              {isOverdue ? <AlertTriangle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-bold">
                {isOverdue
                  ? `Overdue Account: ${loan.daysOverdue || 38} Days Past Due`
                  : `Next Payment Due: ${loan.nextPaymentDueDate}`}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Installment Amount Due:{' '}
                <strong className="font-mono tabular-nums text-[#0F172A] font-bold">
                  <MoneyText amount={loan.nextPaymentDueAmountUSD} currency={currency} />
                </strong>
                {loan.lateFeeAccruedUSD ? (
                  <span className="text-[#DC2626] font-mono ml-1.5 font-semibold">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>
          )}
        </div>
      )}

      {/* Tabbed Navigation */}
      <div className="flex items-center gap-2 border-b border-[#CBD5E1]">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'schedules'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Amortization Schedule ({loan.schedules.length} Installments)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payment History ({receipts.length})</span>
        </button>
      </div>

      {/* Tab Content */}
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
        <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
          <div className="overflow-x-auto">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Timestamp</th>
                  <th>Payment Channel</th>
                  <th>Reference Code</th>
                  <th>Received By</th>
                  <th className="text-right">Amount Settled</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#64748B]">
                      No payment receipts generated for this loan account yet.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rec) => (
                    <tr
                      key={rec.receiptNo}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="font-mono tabular-nums font-bold text-[#2563EB]">
                        {rec.receiptNo}
                      </td>
                      <td className="font-mono tabular-nums text-xs text-[#0F172A]">
                        {rec.paidAt}
                      </td>
                      <td className="text-xs">
                        <span className="badge badge-neutral">
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="font-mono tabular-nums text-xs text-[#64748B]">
                        {rec.transactionRef}
                      </td>
                      <td className="text-xs text-[#0F172A]">{rec.cashierName}</td>
                      <td className="text-right font-bold text-[#16A34A]">
                        <MoneyText amount={rec.amountPaidUSD} currency={currency} />
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => onViewReceipt?.(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] transition-colors"
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

export default LoanDetail;
