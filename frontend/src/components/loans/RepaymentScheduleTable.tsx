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
    <div className="card-3d-floating overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <th className="py-3.5 px-4">Installment #</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4 text-right">Principal Component</th>
              <th className="py-3.5 px-4 text-right">Interest Component</th>
              <th className="py-3.5 px-4 text-right">Total Due</th>
              <th className="py-3.5 px-4 text-right">Amount Paid</th>
              <th className="py-3.5 px-4 text-right">Remaining Balance</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {schedules.map((s, idx) => {
              const isOverdue = s.status === 'OVERDUE';
              const isPaid = s.status === 'PAID';
              const isPartial = s.status === 'PARTIAL';

              return (
                <tr
                  key={s.installmentNo}
                  className={`border-b border-slate-100 transition-all duration-150 text-sm text-slate-700 hover:shadow-xs hover:-translate-y-0.5 hover:bg-slate-100/50 ${
                    isOverdue
                      ? 'bg-rose-50/40'
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

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center">
                    <Badge
                      variant={
                        isPaid
                          ? 'paid'
                          : isOverdue
                          ? 'overdue'
                          : isPartial
                          ? 'review'
                          : s.status === 'UNPAID'
                          ? 'pending'
                          : 'upcoming'
                      }
                      dot
                    >
                      {s.status}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {!isPaid && isCashierOrAdmin && (
                        <button
                          onClick={() =>
                            onCollectInstallment?.(s.installmentNo, s.remainingAmountUSD)
                          }
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors"
                        >
                          Pay
                        </button>
                      )}
                      {s.amountPaidUSD > 0 && (
                        <button
                          onClick={() => onViewReceipt?.(s.installmentNo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Receipt</span>
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
