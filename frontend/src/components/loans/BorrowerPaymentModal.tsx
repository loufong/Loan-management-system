import React, { useState, useEffect, useRef } from 'react';
import { LoanAccount, Currency, PaymentReceipt, KhqrPaymentSession } from '../../types';
import { MoneyText } from '../common/MoneyText';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  CheckCircle2,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Receipt,
  Clock,
  RefreshCw,
  Printer,
  ExternalLink
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

  // Find all unpaid installments
  const unpaidSchedules = (loan.schedules || []).filter(
    (s) => s.status !== 'PAID'
  );

  // Default target installment
  const initialSchedule =
    (initialInstallmentNo
      ? loan.schedules.find((s) => s.installmentNo === initialInstallmentNo)
      : unpaidSchedules[0]) || loan.schedules[0];

  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(
    initialSchedule?.installmentNo ? String(initialSchedule.installmentNo) : '1'
  );

  const currentSchedule =
    loan.schedules.find(
      (s) =>
        s.id === selectedInstallmentId ||
        String(s.installmentNo) === String(selectedInstallmentId)
    ) || initialSchedule;

  const defaultAmount =
    initialAmount !== undefined && initialAmount > 0
      ? initialAmount
      : currentSchedule?.remainingAmountUSD ||
        loan.nextPaymentDueAmountUSD ||
        loan.outstandingBalanceUSD ||
        50;

  // View state
  const [step, setStep] = useState<'FORM' | 'SCAN_PAY' | 'SUCCESS'>('FORM');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [currencyChoice, setCurrencyChoice] = useState<'USD' | 'KHR'>('USD');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active KHQR Session
  const [khqrSession, setKhqrSession] = useState<KhqrPaymentSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins
  const [pollCount, setPollCount] = useState<number>(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Verified Receipt Result
  const [verifiedReceipt, setVerifiedReceipt] = useState<PaymentReceipt | null>(null);

  // Update amount when user picks different installment in form
  const handleInstallmentChange = (instNoStr: string) => {
    setSelectedInstallmentId(instNoStr);
    const target = loan.schedules.find(
      (s) => String(s.installmentNo) === instNoStr || s.id === instNoStr
    );
    if (target) {
      setAmount(target.remainingAmountUSD || target.totalDueUSD);
    }
  };

  // Timer countdown for active QR
  useEffect(() => {
    if (step !== 'SCAN_PAY' || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, secondsRemaining]);

  // Clean polling cleanup
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Format countdown mm:ss
  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Step 1 -> Step 2: Request real dynamic KHQR from backend
  const handleGenerateKhqr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
      setErrorMessage(
        language === 'km'
          ? `មិនអាចបង់ប្រាក់សម្រាប់ឥណទានក្នុងស្ថានភាព '${loan.status}' បានទេ។ ការទូទាត់អាចធ្វើបានតែលើឥណទានសកម្ម (ACTIVE) ឬ ហួសកាលកំណត់ (OVERDUE) ប៉ុណ្ណោះ។`
          : `Cannot accept payment for loan with status '${loan.status}'. Payments can only be recorded on ACTIVE or OVERDUE loans.`
      );
      return;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      setErrorMessage(
        language === 'km'
          ? 'ចំនួនទឹកប្រាក់ត្រូវបង់ត្រូវតែធំជាង $0.00'
          : 'Payment amount must be greater than $0.00.'
      );
      return;
    }

    const remainingOnInstallment = currentSchedule?.remainingAmountUSD || loan.outstandingBalanceUSD;
    if (amount > remainingOnInstallment + 0.01) {
      setErrorMessage(
        language === 'km'
          ? `ចំនួនទឹកប្រាក់បង់លើសពីសមតុល្យនៅសល់នៃការបង់រំលស់នេះ ($${remainingOnInstallment.toFixed(2)})`
          : `Payment amount exceeds remaining installment balance ($${remainingOnInstallment.toFixed(2)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await api.initiateKhqrPayment({
        loanId: loan.id,
        installmentId: currentSchedule?.id,
        installmentNo: currentSchedule?.installmentNo,
        amount: Number(amount),
        currency: currencyChoice,
        notes: notes.trim() || undefined,
      });

      setKhqrSession(session);
      setSecondsRemaining(900); // 15 mins
      setStep('SCAN_PAY');

      // Start automatic status polling (Section 11)
      startStatusPolling(session.paymentId);
    } catch (err: any) {
      console.error('KHQR Generation error:', err);
      setErrorMessage(
        err?.message ||
          (language === 'km'
            ? 'មិនអាចបង្កើត KHQR បានទេ សូមព្យាយាមម្តងទៀត។'
            : 'Could not generate Bakong KHQR. Please verify and try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Periodic polling every 3.5 seconds
  const startStatusPolling = (paymentId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        setPollCount((prev) => prev + 1);
        const statusRes = await api.getPaymentStatus(paymentId);

        if (statusRes.status === 'SUCCESS' || statusRes.status === 'PAID') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          handlePaymentSuccess(statusRes);
        } else if (statusRes.status === 'EXPIRED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(
            language === 'km'
              ? 'ការទូទាត់បានផុតកំណត់។ សូមបង្កើត QR ថ្មី។'
              : 'Payment session has expired. Please generate a new QR.'
          );
        } else if (statusRes.status === 'FAILED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(
            statusRes.failureReason ||
              statusRes.message ||
              (language === 'km'
                ? 'ការទូទាត់ត្រូវបានបដិសេធ។'
                : 'Payment verification failed.')
          );
        }
      } catch {
        // Continue polling silently
      }
    }, 3500);
  };

  // Manual Check Payment button trigger
  const handleManualCheck = async () => {
    if (!khqrSession || isCheckingStatus) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);

    try {
      // First attempt verification against Bakong
      const verifyRes = await api.verifyPayment(khqrSession.paymentId);

      if (verifyRes.status === 'SUCCESS' || verifyRes.isSuccess) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        handlePaymentSuccess(verifyRes);
      } else if (verifyRes.status === 'EXPIRED') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setErrorMessage(
          language === 'km'
            ? 'ការទូទាត់បានផុតកំណត់។ សូមបង្កើត QR ថ្មី។'
            : 'Payment session has expired. Please generate a new QR.'
        );
      } else if (verifyRes.status === 'FAILED') {
        setErrorMessage(
          verifyRes.message ||
            (language === 'km' ? 'ការទូទាត់មិនជោគជ័យ។' : 'Payment verification failed.')
        );
      } else {
        // Pending
        setErrorMessage(
          verifyRes.message ||
            (language === 'km'
              ? 'កំពុងរង់ចាំការទូទាត់... សូមស្កេន និងបញ្ជាក់ក្នុងកម្មវិធីធនាគាររបស់អ្នក។'
              : 'Waiting for payment. Please scan and authorize in your banking application.')
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (language === 'km'
            ? 'មិនអាចពិនិត្យស្ថានភាពបានទេ សូមព្យាយាមម្តងទៀត។'
            : 'Could not verify payment status. Please try again.')
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Transition to SUCCESS
  const handlePaymentSuccess = (result: any) => {
    const rawReceipt = result.receipt || result;
    const finalReceipt: PaymentReceipt = {
      paymentId: khqrSession?.paymentId || rawReceipt.paymentId,
      receiptNo: rawReceipt.receiptNo || khqrSession?.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
      referenceNo: khqrSession?.referenceNo || rawReceipt.referenceNo || `PAY-${Date.now().toString().slice(-6)}`,
      loanNumber: loan.loanNumber,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      installmentNo: khqrSession?.installmentNo || currentSchedule?.installmentNo,
      amountPaidUSD: khqrSession?.amount || amount,
      amountPaidKHR: Math.round((khqrSession?.amount || amount) * 4100),
      currency: currencyChoice,
      paymentMethod: 'KHQR',
      transactionRef: result.transactionId || khqrSession?.referenceNo || `TRX-${Date.now().toString().slice(-6)}`,
      transactionId: result.transactionId || khqrSession?.referenceNo,
      khqrMd5: khqrSession?.md5,
      status: 'PAID',
      paidAt: result.paidAt || new Date().toISOString(),
      verifiedAt: result.verifiedAt || new Date().toISOString(),
      cashierName: khqrSession?.merchantName || 'Bakong KHQR Universal Gateway',
      principalAllocatedUSD: (khqrSession?.amount || amount) * 0.85,
      interestAllocatedUSD: (khqrSession?.amount || amount) * 0.15,
      lateFeeAllocatedUSD: 0,
      outstandingBalanceAfterUSD: Math.max(0, loan.outstandingBalanceUSD - (khqrSession?.amount || amount)),
      notes: notes || 'Settled via Bakong KHQR dynamic gateway',
    };

    setVerifiedReceipt(finalReceipt);
    setStep('SUCCESS');
    onSuccess(finalReceipt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-[10px] shadow-xl border border-[#E2E8F0] w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header (Clean solid header, no gradient) */}
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-[4px] bg-[#DC2626] text-white font-black text-xs flex items-center justify-center tracking-tighter">
              KHQR
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                {step === 'SUCCESS'
                  ? (language === 'km' ? 'បង្កាន់ដៃបង់ប្រាក់' : 'Payment Receipt')
                  : step === 'SCAN_PAY'
                  ? (language === 'km' ? 'ស្កេនដើម្បីបង់ប្រាក់' : 'Scan to Pay')
                  : (language === 'km' ? 'ការបង់ប្រាក់កម្ចី' : 'Loan Payment')}
              </h2>
              <p className="text-[11px] font-mono text-[#64748B]">
                #{loan.loanNumber} • <span className="text-[#0F172A] font-semibold">{loan.productName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{language === 'km' ? 'កំហុស:' : 'Notice:'}</span> {errorMessage}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 1: SELECT INSTALLMENT & ENTER AMOUNT (Clean Form)
              ======================================================== */}
          {step === 'FORM' && (
            <form onSubmit={handleGenerateKhqr} className="space-y-4 text-xs">
              
              {loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{language === 'km' ? 'ព័ត៌មាន:' : 'Notice:'}</span>{' '}
                    {language === 'km'
                      ? `ឥណទាននេះស្ថិតក្នុងស្ថានភាព '${loan.status}' (រង់ចាំការបើកផ្តល់ប្រាក់កម្ចី)។ អ្នកអាចបង់ប្រាក់បានបន្ទាប់ពីប្រាក់កម្ចីត្រូវបានបើកផ្តល់រួច។`
                      : `This loan is currently '${loan.status}' (pending disbursement). Repayments will be available once funds have been disbursed.`}
                  </div>
                </div>
              )}
              
              {/* Installment Selector Card */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-[6px] p-3.5 space-y-2.5">
                <label className="block font-bold text-[#0F172A] text-xs">
                  {language === 'km' ? 'ជ្រើសរើសការបង់រំលស់' : 'Select Installment to Pay'}
                </label>
                <select
                  value={selectedInstallmentId}
                  onChange={(e) => handleInstallmentChange(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] font-medium text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                >
                  {loan.schedules.map((s) => (
                    <option key={s.id || s.installmentNo} value={s.installmentNo}>
                      Installment #{s.installmentNo} • Due {s.dueDate} • Due: ${s.remainingAmountUSD.toFixed(2)} {s.status === 'PAID' ? '(PAID)' : ''}
                    </option>
                  ))}
                </select>

                {currentSchedule && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 bg-white rounded-[4px] border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Principal</span>
                      <span className="font-bold font-mono text-[#0F172A]">${currentSchedule.principalUSD.toFixed(2)}</span>
                    </div>
                    <div className="p-2 bg-white rounded-[4px] border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Interest</span>
                      <span className="font-bold font-mono text-[#0F172A]">${currentSchedule.interestUSD.toFixed(2)}</span>
                    </div>
                    <div className="p-2 bg-white rounded-[4px] border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block">Total Due</span>
                      <span className="font-bold font-mono text-[#DC2626]">${currentSchedule.remainingAmountUSD.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount to Pay */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-[#0F172A]">
                    {language === 'km' ? 'ចំនួនទឹកប្រាក់ត្រូវបង់ ($)' : 'Payment Amount ($)'}
                  </label>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    Max: ${currentSchedule?.remainingAmountUSD.toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#64748B] font-bold text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={currentSchedule?.remainingAmountUSD || loan.outstandingBalanceUSD}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full h-10 pl-7 pr-3 bg-white border border-[#CBD5E1] rounded-[4px] text-base font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              {/* Currency Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A]">
                  {language === 'km' ? 'រូបិយប័ណ្ណ' : 'Settlement Currency'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrencyChoice('USD')}
                    className={`h-9 rounded-[4px] font-bold border transition ${
                      currencyChoice === 'USD'
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyChoice('KHR')}
                    className={`h-9 rounded-[4px] font-bold border transition ${
                      currencyChoice === 'KHR'
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    KHR (៛)
                  </button>
                </div>
              </div>

              {/* Payment Method Badge */}
              <div className="p-3 bg-slate-50 rounded-[4px] border border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-[2px] bg-[#DC2626] text-white font-black text-[9px] flex items-center justify-center">
                    KHQR
                  </span>
                  <div>
                    <span className="font-bold text-[#0F172A] block text-xs">Bakong KHQR (Universal Mobile Banking)</span>
                    <span className="text-[10px] text-[#64748B]">Supported by ACLEDA, ABA, Wing, Canadia &amp; 30+ banks</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Real-Time
                </span>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[#64748B]">
                  {language === 'km' ? 'កំណត់សម្គាល់ (ស្រេចចិត្ត)' : 'Payment Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. November installment payment"
                  className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-[4px] font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#E2E8F0]"
                >
                  {language === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE')}
                  className="px-5 py-2 rounded-[4px] font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'km' ? 'កំពុងបង្កើត...' : 'Generating KHQR...'}</span>
                    </>
                  ) : (
                    <span>{language === 'km' ? 'បង្កើត QR & បង់ប្រាក់' : 'Generate KHQR & Pay'}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              STEP 2: SCAN & PAY (Authentic Bakong KHQR Display)
              ======================================================== */}
          {step === 'SCAN_PAY' && khqrSession && (
            <div className="space-y-4 text-xs">
              
              {/* KHQR Presentation Card */}
              <div className="bg-slate-50 border border-[#CBD5E1] rounded-[8px] p-4 text-center space-y-3">
                
                {/* Red KHQR Top Banner */}
                <div className="bg-[#DC2626] text-white py-1.5 px-3 rounded-[4px] flex items-center justify-between font-bold">
                  <span className="font-mono tracking-wider text-sm">KHQR</span>
                  <span className="text-[11px] font-normal opacity-95">{khqrSession.bankName} • {khqrSession.merchantName}</span>
                </div>

                {/* Amount Header */}
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-[#64748B]">Installment #{khqrSession.installmentNo || currentSchedule?.installmentNo}</p>
                  <div className="flex items-baseline justify-center gap-1.5 font-mono font-bold">
                    <span className="text-2xl text-[#0F172A]">${Number(khqrSession.amount).toFixed(2)}</span>
                    <span className="text-xs text-[#64748B]">/ {new Intl.NumberFormat('km-KH').format(Math.round(khqrSession.amount * 4100))} ៛</span>
                  </div>
                  <p className="text-[10px] font-mono text-[#64748B]">Ref: {khqrSession.referenceNo}</p>
                </div>

                {/* Visual QR Code Image */}
                <div className="bg-white p-3 rounded-[6px] border border-[#E2E8F0] inline-block shadow-xs">
                  {khqrSession.qrDataUrl ? (
                    <img
                      src={khqrSession.qrDataUrl}
                      alt="Bakong KHQR Payment"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-slate-100 flex items-center justify-center font-mono text-[10px] text-[#64748B]">
                      {khqrSession.qr.slice(0, 30)}...
                    </div>
                  )}
                </div>

                {/* Instruction */}
                <div className="text-[11px] text-[#475569] leading-tight px-4">
                  {language === 'km'
                    ? 'បើកកម្មវិធី Bakong ឬកម្មវិធីធនាគារណាមួយនៅក្នុងប្រទេសកម្ពុជា ដើម្បីស្កេនទូទាត់។'
                    : 'Open Bakong, ACLEDA, ABA, Wing, or any supported Cambodian bank app and scan this QR.'}
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#64748B] pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {language === 'km' ? 'ផុតកំណត់ក្នុងរយៈពេល:' : 'Payment expires in:'}{' '}
                    <strong className="font-mono font-bold text-[#0F172A]">{formatTimer(secondsRemaining)}</strong>
                  </span>
                </div>
              </div>

              {/* Status Polling Card (Section 10 & 11) */}
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-[6px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <div>
                    <span className="font-bold text-[#0F172A] block text-xs">
                      {language === 'km' ? 'កំពុងរង់ចាំការទូទាត់...' : 'Waiting for payment...'}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      Auto-checking Bakong network (Check #{pollCount})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isCheckingStatus}
                  className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-[#0F172A] bg-slate-100 hover:bg-slate-200 border border-[#CBD5E1] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{language === 'km' ? 'ពិនិត្យឥឡូវ' : 'Check Payment'}</span>
                </button>
              </div>

              {/* Back to Edit / Cancel */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setStep('FORM');
                  }}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] underline cursor-pointer"
                >
                  {language === 'km' ? '← កែប្រែចំនួនទឹកប្រាក់' : '← Change amount / installment'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-[#DC2626] hover:text-red-800 font-semibold cursor-pointer"
                >
                  {language === 'km' ? 'បិទបង្អួច' : 'Close'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: SUCCESS & VERIFIED RECEIPT
              ======================================================== */}
          {step === 'SUCCESS' && verifiedReceipt && (
            <div className="space-y-4 text-xs">
              
              {/* Success Badge Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[8px] text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  {language === 'km' ? 'ការទូទាត់ជោគជ័យ!' : 'Payment Successful!'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {language === 'km'
                    ? 'ការទូទាត់របស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់ និងបញ្ជាក់រួចរាល់នៅលើបណ្តាញ Bakong។'
                    : 'Your installment payment was confirmed and reconciled on the Bakong network.'}
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-[6px] p-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between pb-1.5 border-b border-[#E2E8F0] font-sans font-bold text-[#0F172A]">
                  <span>Receipt #{verifiedReceipt.receiptNo}</span>
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded text-[10px]">PAID</span>
                </div>

                <div className="flex justify-between text-[#64748B]">
                  <span>Loan Number:</span>
                  <span className="font-bold text-[#0F172A]">{verifiedReceipt.loanNumber}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Installment:</span>
                  <span className="font-bold text-[#0F172A]">#{verifiedReceipt.installmentNo}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-[#0F172A] text-sm">${verifiedReceipt.amountPaidUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Payment Method:</span>
                  <span className="font-bold text-[#0F172A]">Bakong KHQR</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Transaction ID:</span>
                  <span className="font-bold text-[#0F172A] truncate max-w-[160px]">{verifiedReceipt.transactionId || verifiedReceipt.transactionRef}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-[#2563EB]">${verifiedReceipt.outstandingBalanceAfterUSD.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-[4px] font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#E2E8F0] flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'km' ? 'បោះពុម្ព' : 'Print'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-[4px] font-bold text-white bg-[#0F172A] hover:bg-[#1E293B]"
                >
                  {language === 'km' ? 'រួចរាល់' : 'Done'}
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
