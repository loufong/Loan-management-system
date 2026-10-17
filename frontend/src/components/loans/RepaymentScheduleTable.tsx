import React from 'react';
import { RepaymentInstallment, Currency, UserRole } from '../../types';
import { MoneyText } from '../common/MoneyText';
import { Check, Download, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();

  const isCashierOrAdmin =
    currentUserRole === 'CASHIER' ||
    currentUserRole === 'MANAGER' ||
    currentUserRole === 'admin' ||
    currentUserRole === 'ADMIN';

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr className="text-[12px] font-semibold uppercase tracking-wider text-[#64748B]">
              <th className="py-3 px-4">{t('col_installment_no', 'Installment #')}</th>
              <th className="py-3 px-4">{t('col_due_date', 'Due Date')}</th>
              <th className="py-3 px-4 text-right">{t('col_principal', 'Principal')}</th>
              <th className="py-3 px-4 text-right">{t('col_interest', 'Interest')}</th>
              <th className="py-3 px-4 text-right">{t('col_installment', 'Installment')}</th>
              <th className="py-3 px-4 text-right">{t('col_paid', 'Paid')}</th>
              <th className="py-3 px-4 text-right">{t('col_remaining', 'Remaining')}</th>
              <th className="py-3 px-4 text-center">{t('col_status', 'Status')}</th>
              <th className="py-3 px-4 text-right">{t('col_action', 'Action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {schedules.map((s, idx) => {
              const isOverdue = s.status === 'OVERDUE';
              const isPaid = s.status === 'PAID';
              const isPartial = s.status === 'PARTIAL';
              const isUnpaid = s.status === 'UNPAID';

              return (
                <tr
                  key={s.installmentNo}
                  className={`transition-colors hover:bg-slate-50 ${
                    isOverdue
                      ? 'bg-rose-50/20'
                      : idx % 2 === 1
                      ? 'bg-[#F8FAFC]/50'
                      : 'bg-white'
                  }`}
                >
                  {/* Installment # */}
                  <td className="py-3 px-4 font-mono font-medium text-[#0F172A]">
                    #{s.installmentNo}
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-4 text-[#0F172A]">
                    <div className="flex items-center gap-1.5">
                      {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />}
                      <span>{s.dueDate}</span>
                    </div>
                  </td>

                  {/* Principal */}
                  <td className="py-3 px-4 text-right text-[#0F172A]">
                    <MoneyText
                      amount={s.principalUSD}
                      currency={currency}
                      className="text-[#0F172A]"
                    />
                  </td>

                  {/* Interest */}
                  <td className="py-3 px-4 text-right text-[#64748B]">
                    <MoneyText
                      amount={s.interestUSD}
                      currency={currency}
                      className="text-[#64748B]"
                    />
                  </td>

                  {/* Installment Total Due */}
                  <td className="py-3 px-4 text-right font-semibold text-[#0F172A]">
                    <MoneyText
                      amount={s.totalDueUSD}
                      currency={currency}
                      className="font-semibold text-[#0F172A]"
                    />
                  </td>

                  {/* Amount Paid */}
                  <td className="py-3 px-4 text-right font-medium text-[#16A34A]">
                    <MoneyText
                      amount={s.amountPaidUSD}
                      currency={currency}
                      className="font-medium text-[#16A34A]"
                    />
                  </td>

                  {/* Remaining Balance */}
                  <td className="py-3 px-4 text-right font-semibold text-[#2563EB]">
                    <MoneyText
                      amount={s.remainingAmountUSD}
                      currency={currency}
                      className="font-semibold text-[#2563EB]"
                    />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-[#16A34A] border border-emerald-200">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>{t('status_paid', 'PAID')}</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-rose-50 text-[#DC2626] border border-rose-200">
                        <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                        <span>{t('status_overdue', 'OVERDUE')}</span>
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-amber-50 text-[#D97706] border border-amber-200">
                        {t('status_partial', 'PARTIAL')}
                      </span>
                    ) : isUnpaid ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-blue-50 text-[#2563EB] border border-blue-200">
                        {t('status_unpaid', 'UNPAID')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-slate-50 text-[#64748B] border border-[#E2E8F0]">
                        {t('status_upcoming', 'UPCOMING')}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {!isPaid && isCashierOrAdmin && (
                        <button
                          onClick={() =>
                            onCollectInstallment?.(s.installmentNo, s.remainingAmountUSD)
                          }
                          className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                        >
                          {t('btn_collect', 'Collect')}
                        </button>
                      )}
                      {!isPaid && !isCashierOrAdmin && (
                        <button
                          onClick={() =>
                            onCollectInstallment?.(s.installmentNo, s.remainingAmountUSD)
                          }
                          className="px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-[#2563EB] hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                        >
                          {t('btn_pay', 'Pay')}
                        </button>
                      )}
                      {s.amountPaidUSD > 0 && (
                        <button
                          onClick={() => onViewReceipt?.(s.installmentNo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-[6px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>{t('btn_receipt', 'Receipt')}</span>
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

export default RepaymentScheduleTable;
