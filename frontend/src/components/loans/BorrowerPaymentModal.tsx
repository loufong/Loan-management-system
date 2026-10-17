import React, { useState } from 'react';
import { LoanAccount, Currency, PaymentReceipt } from '../../types';
import { MoneyText } from '../common/MoneyText';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  CheckCircle2,
  DollarSign,
  Calendar,
  CreditCard,
  Building,
  QrCode,
  Banknote,
  AlertCircle,
  Loader2,
  X,
  Receipt,
  ShieldCheck,
  ArrowRight,
  Clock
} from 'lucide-react';

export interface BorrowerPaymentModalProps {
  loan: LoanAccount;
  currency: Currency;
  initialInstallmentNo?: number;
  initialAmount?: number;
  onClose: () => void;
  onSuccess: (receipt: PaymentReceipt, meta?: any) => void;
}

export const BorrowerPaymentModal: React.FC<BorrowerPaymentModalProps> = ({
  loan,
  currency,
  initialInstallmentNo,
  initialAmount,
  onClose,
  onSuccess,
}) => {
  const { language, t } = useLanguage();

  // Find target installment (default to earliest unpaid installment or matching initialInstallmentNo)
  const unpaidSchedules = (loan.schedules || []).filter(
    (s) => s.status !== 'PAID'
  );
  const targetSchedule =
    (initialInstallmentNo
      ? loan.schedules.find((s) => s.installmentNo === initialInstallmentNo)
      : unpaidSchedules[0]) || loan.schedules[0];

  const defaultAmount =
    initialAmount !== undefined && initialAmount > 0
      ? initialAmount
      : targetSchedule?.remainingAmountUSD ||
        loan.nextPaymentDueAmountUSD ||
        loan.outstandingBalanceUSD ||
        100;

  // Form State
  const [step, setStep] = useState<'FORM' | 'CONFIRM' | 'SUCCESS'>('FORM');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState<string>(
    `TRX-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success result state from backend
  const [paymentResult, setPaymentResult] = useState<{
    receipt: PaymentReceipt;
    reference: string;
    receiptNo: string;
    amountPaid: number;
    remainingBalance: number;
    isCompleted: boolean;
  } | null>(null);

  // Client validation
  const validateForm = (): boolean => {
    setErrorMessage(null);
    if (!amount || isNaN(amount) || amount <= 0) {
      setErrorMessage(language === 'km' ? 'ចំនួនទឹកប្រាក់ត្រូវបង់ត្រូវតែធំជាង $0.00' : 'Payment amount must be greater than $0.00.');
      return false;
    }
    if (amount > loan.outstandingBalanceUSD + 0.01) {
      setErrorMessage(
        language === 'km'
          ? `ចំនួនទឹកប្រាក់បង់លើសពីសមតុល្យនៅសល់សរុប $${loan.outstandingBalanceUSD.toFixed(2)}`
          : `Payment amount exceeds the total remaining loan balance of $${loan.outstandingBalanceUSD.toFixed(2)}.`
      );
      return false;
    }
    return true;
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setStep('CONFIRM');
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Pass client-side idempotency key for mobile & network replay safety
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const res = await api.recordPayment({
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        amount: Number(amount),
        amountUSD: Number(amount),
        paymentMethod,
        method: paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        transactionRef: referenceNo.trim() || undefined,
        notes: notes.trim() || 'Online borrower payment portal',
        idempotencyKey,
      });

      const remainingBalance =
        (res as any).remainingBalance !== undefined
          ? Number((res as any).remainingBalance)
          : Math.max(0, loan.outstandingBalanceUSD - amount);

      const refNumber =
        (res as any).reference ||
        (res as any).referenceNo ||
        res.transactionRef ||
        `PAY-${Date.now()}`;

      const receiptNumber = res.receiptNo || `REC-${Date.now()}`;

      setPaymentResult({
        receipt: res,
        reference: refNumber,
        receiptNo: receiptNumber,
        amountPaid: Number(amount),
        remainingBalance,
        isCompleted: remainingBalance <= 0.001,
      });

      setStep('SUCCESS');
      onSuccess(res, { remainingBalance, reference: refNumber });
    } catch (err: any) {
      console.error('Borrower payment error:', err);
      setErrorMessage(
        err?.message || (language === 'km' ? 'ការបង់ប្រាក់មិនជោគជ័យ សូមផ្ទៀងផ្ទាត់ហើយព្យាយាមម្តងទៀត។' : 'Payment processing failed. Please verify and try again.')
      );
      setStep('FORM');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMethodName = (m: string) => {
    switch (m) {
      case 'BANK_TRANSFER':
        return t('method_bank_transfer');
      case 'CASH':
        return t('method_cash');
      case 'CARD':
        return t('method_card');
      case 'QR_PAYMENT':
        return t('method_qr_payment');
      default:
        return m;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-[10px] shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-blue-100 text-[#2563EB] flex items-center justify-center">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                {step === 'SUCCESS' ? t('modal_confirm_title') : t('modal_payment_title')}
              </h2>
              <p className="text-[11px] font-mono text-[#64748B]">
                {t('slip_loan_number')} #{loan.loanNumber} •{' '}
                <span className="font-semibold text-[#0F172A]">{loan.productName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{language === 'km' ? 'កំហុស:' : 'Payment Error:'}</span> {errorMessage}
              </div>
            </div>
          )}

          {/* STEP 1: MAKE PAYMENT FORM */}
          {step === 'FORM' && (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Installment Summary Card (Section 5 Spec) */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-[8px] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E2E8F0]">
                  <span className="text-[#64748B] font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                    {t('modal_installment_info')} {targetSchedule ? `#${targetSchedule.installmentNo}` : ''}
                  </span>
                  <span className="font-semibold font-mono text-[#0F172A]">
                    {targetSchedule?.dueDate || loan.nextPaymentDueDate || 'Next Scheduled'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-[6px] border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block">{t('amount_due')}</span>
                    <span className="font-bold font-mono text-[#0F172A] mt-0.5 block">
                      <MoneyText
                        amount={targetSchedule?.totalDueUSD || loan.nextPaymentDueAmountUSD}
                        currency={currency}
                      />
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-[6px] border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block">{t('modal_already_paid')}</span>
                    <span className="font-semibold font-mono text-emerald-600 mt-0.5 block">
                      <MoneyText
                        amount={targetSchedule?.amountPaidUSD || 0}
                        currency={currency}
                      />
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-[6px] border border-[#E2E8F0]">
                    <span className="text-[11px] text-[#64748B] block">{t('modal_remaining')}</span>
                    <span className="font-bold font-mono text-[#2563EB] mt-0.5 block">
                      <MoneyText
                        amount={targetSchedule?.remainingAmountUSD || loan.nextPaymentDueAmountUSD}
                        currency={currency}
                      />
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#64748B] flex items-center justify-between pt-1">
                  <span>{t('modal_total_outstanding')}</span>
                  <strong className="text-[#0F172A] font-mono">
                    <MoneyText amount={loan.outstandingBalanceUSD} currency={currency} />
                  </strong>
                </div>
              </div>

              {/* Payment Amount Input (Section 5 & 24) */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  {t('modal_payment_amount')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={loan.outstandingBalanceUSD}
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-8 pr-32 py-2 text-sm font-mono font-bold border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#0F172A]"
                    placeholder="0.00"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAmount(targetSchedule?.remainingAmountUSD || loan.nextPaymentDueAmountUSD)
                      }
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-[#475569] rounded-[4px] transition cursor-pointer"
                    >
                      {t('modal_btn_installment')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(loan.outstandingBalanceUSD)}
                      className="px-2 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-[4px] transition cursor-pointer"
                    >
                      {t('modal_btn_payoff')}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {t('modal_waterfall_note')}
                </p>
              </div>

              {/* Payment Method Selector (Section 6 & 24) */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  {t('modal_payment_method')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'BANK_TRANSFER', label: t('method_bank_transfer'), icon: Building },
                    { id: 'QR_PAYMENT', label: t('method_qr_payment'), icon: QrCode },
                    { id: 'CARD', label: t('method_card'), icon: CreditCard },
                    { id: 'CASH', label: t('method_cash'), icon: Banknote },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2.5 rounded-[6px] border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2563EB] bg-blue-50/50 text-[#0F172A] ring-1 ring-[#2563EB]'
                            : 'border-[#E2E8F0] hover:bg-slate-50 text-[#64748B]'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-[4px] ${
                            isSelected ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-[#64748B]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference / Transaction Number (Section 24) */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  {t('modal_ref_number')}
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. TXN-892301 or Bank Reference"
                  className="w-full px-3 py-2 text-xs font-mono border border-[#CBD5E1] rounded-[6px] focus:outline-none focus:border-[#2563EB] text-[#0F172A]"
                />
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {t('modal_ref_help')}
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-slate-100 rounded-[6px] transition cursor-pointer"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-[6px] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{t('btn_continue')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CONFIRM PAYMENT REVIEW (Section 24 Spec) */}
          {step === 'CONFIRM' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-[8px] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1E40AF]">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  <span>{t('modal_confirm_title')}</span>
                </div>
                <p className="text-xs text-[#1E3A8A]">
                  {t('modal_confirm_desc')}
                </p>

                <div className="divide-y divide-blue-200/60 text-xs pt-1">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#64748B]">{t('modal_loan_account')}</span>
                    <span className="font-mono font-bold text-[#0F172A]">{loan.loanNumber}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#64748B]">{t('modal_amount_label')}</span>
                    <span className="font-mono font-bold text-base text-[#2563EB]">
                      <MoneyText amount={amount} currency={currency} />
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#64748B]">{t('modal_method_label')}</span>
                    <span className="font-semibold text-[#0F172A]">
                      {formatMethodName(paymentMethod)}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#64748B]">{t('modal_ref_label')}</span>
                    <span className="font-mono text-[#0F172A]">{referenceNo}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#64748B]">{t('modal_est_balance_after')}</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      <MoneyText
                        amount={Math.max(0, loan.outstandingBalanceUSD - amount)}
                        currency={currency}
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-xs text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {t('modal_waterfall_rule')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('FORM')}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-slate-100 rounded-[6px] transition cursor-pointer"
                >
                  {t('btn_edit')}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="px-5 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-[6px] transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('modal_processing')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('btn_confirm_payment')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RECEIPT SCREEN (Section 17 & 24 Spec) */}
          {step === 'SUCCESS' && paymentResult && (
            <div className="space-y-5 py-2 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-100 text-[#16A34A] rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">{t('modal_success_title')}</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {t('modal_success_desc')}
                </p>
              </div>

              {/* Exact Section 17 & 24 Result Box */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-[8px] p-4 text-left space-y-2.5 max-w-sm mx-auto font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">{t('modal_paid_amount')}</span>
                  <span className="font-mono font-bold text-sm text-[#16A34A]">
                    <MoneyText amount={paymentResult.amountPaid} currency={currency} />
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">{t('modal_remaining_balance')}</span>
                  <span className="font-mono font-bold text-sm text-[#2563EB]">
                    <MoneyText amount={paymentResult.remainingBalance} currency={currency} />
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">{t('modal_ref_label')}</span>
                  <span className="font-mono font-bold text-xs text-[#0F172A]">
                    {paymentResult.reference}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">{t('modal_receipt_number')}</span>
                  <span className="font-mono text-xs text-[#64748B]">
                    {paymentResult.receiptNo}
                  </span>
                </div>

                {paymentResult.isCompleted && (
                  <div className="pt-2 border-t border-[#E2E8F0] text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-emerald-100 text-emerald-800 text-xs font-bold">
                      {t('modal_fully_completed')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  className="px-5 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-[6px] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{t('btn_view_receipt')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BorrowerPaymentModal;
