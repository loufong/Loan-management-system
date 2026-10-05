import React from 'react';
import { RepaymentInstallment, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { Check, Download, AlertCircle } from 'lucide-react';

export interface RepaymentScheduleTableProps {
  schedules: RepaymentInstallment[];
  currency: Currency;
  currentUserRole: UserRole;
  onCollectInstallment?: (installmentNo: number, amount: number) => void;
  onViewReceipt?: (installmentNo: number) => void;
}

export const RepaymentScheduleTable: React.FC<RepaymentScheduleTableProps> = ({
  schedules,
  currency,
  currentUserRole,
  onCollectInstallment,
  onViewReceipt
}) => {
  const isCashierOrAdmin =
    currentUserRole === 'CASHIER' ||
    currentUserRole === 'MANAGER';

  return (
    <div className="banking-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <th className="py-3.5 px-4">Installment #</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4 text-right">Principal Amount ($)</th>
              <th className="py-3.5 px-4 text-right">Interest Amount ($)</th>
              <th className="py-3.5 px-4 text-right">Total Due ($)</th>
              <th className="py-3.5 px-4 text-right">Amount Paid ($)</th>
              <th className="py-3.5 px-4 text-right">Remaining Balance ($)</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {schedules.map((s, idx) => {
              const isOverdue = s.status === 'OVERDUE';
              const isPaid = s.status === 'PAID';
              const isPartial = s.status === 'PARTIAL';
              const isUnpaid = s.status === 'UNPAID';
              const isUpcoming = s.status === 'UPCOMING';

              return (
                <tr
                  key={s.installmentNo}
                  className={`border-b border-slate-100 transition-all duration-150 text-sm text-slate-700 hover:bg-slate-100/60 ${
                    isOverdue
                      ? 'bg-rose-50/30'
                      : idx % 2 === 1
                      ? 'bg-slate-50/40'
                      : 'bg-white'
                  }`}
                >
                  {/* Installment # */}
                  <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                    #{s.installmentNo}
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-700">
                    <div className="flex items-center gap-1.5">
                      {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                      <span>{s.dueDate}</span>
                    </div>
                  </td>

                  {/* Principal Component */}
                  <td className="py-3.5 px-4 text-right">
                    <MoneyText
                      amount={s.principalUSD}
                      currency={currency}
                      className="text-slate-700"
                    />
                  </td>

                  {/* Interest Component */}
                  <td className="py-3.5 px-4 text-right">
                    <MoneyText
                      amount={s.interestUSD}
                      currency={currency}
                      className="text-slate-700"
                    />
                  </td>

                  {/* Total Due */}
                  <td className="py-3.5 px-4 text-right">
                    <MoneyText
                      amount={s.totalDueUSD}
                      currency={currency}
                      className="font-bold text-slate-900"
                    />
                  </td>

                  {/* Amount Paid */}
                  <td className="py-3.5 px-4 text-right">
                    <MoneyText
                      amount={s.amountPaidUSD}
                      currency={currency}
                      className="font-semibold text-emerald-600"
                    />
                  </td>

                  {/* Remaining Balance */}
                  <td className="py-3.5 px-4 text-right">
                    <MoneyText
                      amount={s.remainingAmountUSD}
                      currency={currency}
                      className="font-bold text-indigo-600"
                    />
                  </td>

                  {/* Status Chip */}
                  <td className="py-3.5 px-4 text-center">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>PAID</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>OVERDUE (18d)</span>
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                        PARTIAL
                      </span>
                    ) : isUnpaid ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        UNPAID
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200">
                        UPCOMING
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {!isPaid && isCashierOrAdmin && (
                        <button
                          onClick={() =>
                            onCollectInstallment?.(s.installmentNo, s.remainingAmountUSD)
                          }
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors"
                        >
                          Collect
                        </button>
                      )}
                      {s.amountPaidUSD > 0 && (
                        <button
                          onClick={() => onViewReceipt?.(s.installmentNo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
