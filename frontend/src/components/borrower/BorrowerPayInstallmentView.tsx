import React, { useState } from 'react';
import { PayInstallmentWorkflow, LoanFacilityContext } from '../payments/PayInstallmentWorkflow';
import { Currency, UserProfile } from '../../types';
import { Wallet, ShieldCheck, Plus, RefreshCw } from 'lucide-react';

export interface BorrowerPayInstallmentViewProps {
  currentUser: UserProfile;
  currency: Currency;
  initialAmountUSD?: number;
  initialInstallmentNo?: number;
  onNavigate: (route: string) => void;
  onPaymentSettled?: (receipt: any) => void;
}

export const BorrowerPayInstallmentView: React.FC<BorrowerPayInstallmentViewProps> = ({
  currentUser,
  currency,
  initialAmountUSD = 122.5,
  initialInstallmentNo = 5,
  onNavigate,
  onPaymentSettled,
}) => {
  const [isRestartedToZero, setIsRestartedToZero] = useState<boolean>(() => {
    return localStorage.getItem('jam_restart_borrower_zero') === 'true';
  });

  const facilityContext: LoanFacilityContext = {
    id: 'LN-2026-6042',
    loanNumber: 'LN-2026-6042',
    facilityTitle: 'Personal Micro-Credit Facility',
    status: 'ACTIVE',
    originalPrincipalUSD: 6000.0,
    outstandingBalanceUSD: 3850.0,
    interestRateAnnual: 6.5,
    totalTenureMonths: 12,
    remainingTenureMonths: 8,
    currentCycleNo: initialInstallmentNo,
    nextCycleDueDate: '2026-09-15',
    nextCycleAmountUSD: initialAmountUSD,
    linkedAccount: {
      bankName: 'ACLEDA Bank Plc.',
      accountNumberMasked: '****-****-2026',
      accountHolder: currentUser?.fullName || currentUser?.name || 'Johnathan Doe',
      accountType: 'Checking / Savings Account',
      availableBalanceUSD: 5420.0,
    },
  };

  // If user explicitly has zero loans and hasn't toggled workflow testing
  if (isRestartedToZero) {
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
              Your account currently has zero active loans and no scheduled installments to pay. Outstanding balance is $0.00.
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
              onClick={() => {
                setIsRestartedToZero(false);
                localStorage.setItem('jam_restart_borrower_zero', 'false');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open Pay Installment Workflow</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
