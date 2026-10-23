import React, { useState } from 'react';
import { LoanAccount, Currency, UserProfile } from '../../types';
import { RepaymentScheduleTable } from './RepaymentScheduleTable';
import { MoneyText } from '../common/MoneyText';
import { Calendar, CreditCard, DollarSign, Wallet, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface UserRepaymentsViewProps {
  loans: LoanAccount[];
  currentUser: UserProfile;
  currency: Currency;
  onOpenPaymentForLoan: (loanId: string, installmentNo?: number, amount?: number) => void;
  onViewReceipt?: (receipt: any) => void;
}

export const UserRepaymentsView: React.FC<UserRepaymentsViewProps> = ({
  loans,
  currentUser,
  currency,
  onOpenPaymentForLoan,
}) => {
  const { t } = useLanguage();

  // Filter user's active or relevant loans
  const clientName = (currentUser.name || currentUser.fullName || '').trim().toLowerCase();
  const currentBorrowerId = currentUser.borrowerId || currentUser.id;

  const userLoans = loans.filter((l) => {
    if (currentBorrowerId && (l.borrowerId === currentBorrowerId || l.borrowerId === currentUser.id)) return true;
    if (l.borrowerName && clientName && (l.borrowerName.toLowerCase().includes(clientName) || clientName.includes(l.borrowerName.toLowerCase()))) return true;
    return false;
  });

  const displayLoans = userLoans.length > 0 ? userLoans : loans;
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    displayLoans[0]?.id || ''
  );

  const activeLoan = displayLoans.find((l) => l.id === selectedLoanId) || displayLoans[0];

  if (!activeLoan) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-8 text-center max-w-2xl mx-auto my-12">
        <Calendar className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#0F172A]">{t('no_schedules_title', 'No Active Amortization Schedules')}</h2>
        <p className="text-xs text-[#64748B] mt-1">
          {t('no_schedules_desc', 'You currently have no disbursed facilities with scheduled installments.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Loan Selector */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{t('repayments_title', 'Repayment Schedule')}</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t('repayments_subtitle', 'View full amortization breakdown, due dates, principal/interest allocation, and payment history.')}
          </p>
        </div>

        {displayLoans.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">{t('select_facility', 'Select Facility:')}</span>
            <select
              value={activeLoan.id}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="text-xs font-semibold bg-white border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            >
              {displayLoans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loanNumber} ({l.productName} - ${(l.principalUSD || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Loan Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">{t('stat_outstanding_balance', 'Outstanding Balance')}</span>
            <Wallet className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A]">
            <MoneyText amount={activeLoan.outstandingBalanceUSD || 0} currency={currency} />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {t('original_amount', 'Original:')} ${(activeLoan.principalUSD || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">{t('total_repaid', 'Total Repaid')}</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">
            <MoneyText amount={activeLoan.totalPaidUSD || 0} currency={currency} />
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {(activeLoan.schedules || []).filter((s) => s.status === 'PAID').length} {t('of_installments', 'of')} {activeLoan.termMonths} {t('installments_settled', 'installments settled')}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">{t('next_due_date', 'Next Due Date')}</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold text-[#0F172A]">
            {activeLoan.nextPaymentDueDate || t('matured_settled', 'Matured / Settled')}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {t('facility_label', 'Facility:')} <span className="font-mono text-[#0F172A]">{activeLoan.loanNumber}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-medium">{t('next_installment', 'Next Installment')}</span>
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-lg font-bold text-[#0F172A]">
            <MoneyText amount={activeLoan.nextPaymentDueAmountUSD || 0} currency={currency} />
          </div>
          <button
            type="button"
            onClick={() => onOpenPaymentForLoan(activeLoan.id)}
            className="mt-2 w-full py-1.5 px-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-[4px] transition text-center cursor-pointer"
          >
            {t('btn_pay_now', 'Pay Now')}
          </button>
        </div>
      </div>

      {/* 3. Amortization Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            {t('installment_breakdown', 'Installment Breakdown')} ({activeLoan.loanNumber})
          </h2>
          <span className="text-xs font-mono text-[#64748B]">
            {t('interest_rate', 'Interest Rate')}: {activeLoan.interestRate}% {t('apr_rate', 'APR')}
          </span>
        </div>

        <RepaymentScheduleTable
          schedules={activeLoan.schedules || []}
          currency={currency}
          currentUserRole="USER"
          onCollectInstallment={(no, amt) => onOpenPaymentForLoan(activeLoan.id, no, amt)}
        />
      </div>
    </div>
  );
};
