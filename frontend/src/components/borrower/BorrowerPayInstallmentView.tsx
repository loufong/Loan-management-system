import React, { useEffect } from 'react';
import { PayInstallmentWorkflow, LoanFacilityContext } from '../payments/PayInstallmentWorkflow';
import { Currency, UserProfile, LoanAccount } from '../../types';
import { Wallet, ShieldCheck, Plus, ArrowLeft } from 'lucide-react';

export interface BorrowerPayInstallmentViewProps {
  currentUser: UserProfile;
  currency: Currency;
  loans?: LoanAccount[];
  initialAmountUSD?: number;
  initialInstallmentNo?: number;
  onNavigate: (route: string) => void;
  onPaymentSettled?: (receipt: any) => void;
}

export const BorrowerPayInstallmentView: React.FC<BorrowerPayInstallmentViewProps> = ({
  currentUser,
  currency,
  loans,
  initialAmountUSD = 122.5,
  initialInstallmentNo = 1,
  onNavigate,
  onPaymentSettled,
}) => {
  // Clear any legacy test restart flags so real account data always determines UI state
  useEffect(() => {
    try {
      localStorage.removeItem('jam_restart_borrower_zero');
    } catch {
      // ignore
    }
  }, []);

  const userLoans = Array.isArray(loans) ? loans : [];
  const activeLoans = userLoans.filter((l) => {
    const st = (l.status || '').toUpperCase();
    return st === 'ACTIVE' || st === 'OVERDUE' || st === 'IN_REPAYMENT';
  });
  const activeLoan = activeLoans.length > 0 ? activeLoans[0] : null;

  // When user has no active loan facilities (has not borrowed money yet)
  if (!activeLoan) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 font-sans text-slate-100">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Good Standing</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">No Due Installments</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your account currently has zero active loans and no scheduled installments to pay. Outstanding balance is $0.00 because you have not borrowed money yet.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('new-application')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for New Loan</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('borrower_dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const targetSchedule =
    (initialInstallmentNo && activeLoan.schedules?.find((s) => s.installmentNo === initialInstallmentNo)) ||
    activeLoan.schedules?.find((s) => s.status !== 'PAID') ||
    activeLoan.schedules?.[0];

  const facilityContext: LoanFacilityContext = {
    id: activeLoan.id,
    loanNumber: activeLoan.loanNumber || activeLoan.id,
    facilityTitle: activeLoan.productName || 'Personal Credit Facility',
    status: activeLoan.status === 'OVERDUE' ? 'OVERDUE' : activeLoan.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
    originalPrincipalUSD: Number(activeLoan.principalUSD || (activeLoan as any)?.principalAmount || 0),
    outstandingBalanceUSD: Number(activeLoan.outstandingBalanceUSD || (activeLoan as any)?.outstandingBalance || 0),
    interestRateAnnual: Number(activeLoan.interestRate || 6.5),
    totalTenureMonths: Number(activeLoan.termMonths || 12),
    remainingTenureMonths: (activeLoan.schedules?.filter((s) => s.status !== 'PAID').length) || 1,
    currentCycleNo: initialInstallmentNo || targetSchedule?.installmentNo || 1,
    nextCycleDueDate: targetSchedule?.dueDate || (activeLoan as any)?.nextPaymentDueDate || '2026-11-15',
    nextCycleAmountUSD: (() => {
      if (initialAmountUSD && initialAmountUSD > 0) return initialAmountUSD;
      const explicit = Number(
        targetSchedule?.remainingAmountUSD ||
        (targetSchedule as any)?.totalDueUSD ||
        (targetSchedule as any)?.totalDue ||
        (activeLoan as any)?.monthlyEMIUSD ||
        (activeLoan as any)?.nextPaymentDueAmountUSD ||
        0
      );
      if (explicit > 0) return explicit;
      const p = Number(activeLoan.principalUSD || (activeLoan as any)?.principalAmount || 1000);
      const r = (Number(activeLoan.interestRate || 6.5) / 100) / 12;
      const t = Number(activeLoan.termMonths || 12);
      return r > 0
        ? Math.round(((p * r * Math.pow(1 + r, t)) / (Math.pow(1 + r, t) - 1)) * 100) / 100
        : Math.round((p / t) * 100) / 100;
    })(),
    linkedAccount: {
      bankName: 'ACLEDA Bank Plc.',
      accountNumberMasked: '****-****-2026',
      accountHolder: currentUser?.fullName || currentUser?.name || 'Client Borrower',
      accountType: 'Checking / Savings Account',
      availableBalanceUSD: 5420.0,
    },
  };

  return (
    <PayInstallmentWorkflow
      currentUser={currentUser}
      loanFacility={facilityContext}
      currency={currency}
      isModal={false}
      onNavigate={onNavigate}
      onPaymentSettled={onPaymentSettled}
    />
  );
};

export default BorrowerPayInstallmentView;
