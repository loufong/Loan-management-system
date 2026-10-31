import React from 'react';
import { PayInstallmentWorkflow, LoanFacilityContext, PaymentSettlementReceipt } from './PayInstallmentWorkflow';
import { Currency, UserProfile } from '../../types';

export interface PayInstallmentModalProps {
  isOpen: boolean;
  currentUser?: UserProfile;
  loanFacility?: Partial<LoanFacilityContext>;
  currency?: Currency;
  onClose: () => void;
  onPaymentSettled?: (receipt: PaymentSettlementReceipt) => void;
  onNavigate?: (route: string) => void;
}

export const PayInstallmentModal: React.FC<PayInstallmentModalProps> = ({
  isOpen,
  currentUser,
  loanFacility,
  currency,
  onClose,
  onPaymentSettled,
  onNavigate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 selection:bg-emerald-500 selection:text-slate-950">
        <PayInstallmentWorkflow
          currentUser={currentUser}
          loanFacility={loanFacility}
          currency={currency}
          isModal={true}
          onClose={onClose}
          onNavigate={onNavigate}
          onPaymentSettled={onPaymentSettled}
        />
      </div>
    </div>
  );
};

export default PayInstallmentModal;

