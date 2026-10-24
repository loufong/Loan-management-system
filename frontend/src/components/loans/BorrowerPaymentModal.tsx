import React, { useState, useEffect, useRef } from 'react';
import { LoanAccount, Currency, PaymentReceipt, KhqrPaymentSession, RepaymentInstallment } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Clock,
  RefreshCw,
  Printer,
  ChevronDown,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

export interface BorrowerPaymentModalProps {
  loan: LoanAccount;
  currency: Currency;
  initialInstallmentNo?: number;
  initialAmount?: number;
  onClose: () => void;
  onSuccess: (receipt: PaymentReceipt, meta?: any) => void;
}

/**
 * Helper to extract schedule unique identifier (UUID id or schedule_id or installmentNo)
 */
function getScheduleId(schedule?: RepaymentInstallment | any): string {
  if (!schedule) return '';
  return String(schedule.id || schedule.schedule_id || schedule.installmentNo || '');
}

/**
 * Helper to get the exact total due / remaining payable amount for an installment
 */
function getInstallmentTotalDue(schedule?: RepaymentInstallment | any): number {
  if (!schedule) return 0;
  if (schedule.total_due !== undefined && schedule.total_due !== null) {
    return Number(schedule.total_due);
  }
  if (schedule.totalDueUSD !== undefined && schedule.totalDueUSD !== null) {
    return Number(schedule.totalDueUSD);
  }
  if (schedule.totalDue !== undefined && schedule.totalDue !== null) {
    return Number(schedule.totalDue);
  }
  if (schedule.remainingAmountUSD !== undefined && schedule.remainingAmountUSD !== null) {
    return Number(schedule.remainingAmountUSD);
  }
  if (schedule.remaining_amount !== undefined && schedule.remaining_amount !== null) {
    return Number(schedule.remaining_amount);
  }
  return 0;
}

/**
 * Helper to find the first pending/unpaid installment in the schedule list
 */
function findDefaultSchedule(
  schedules: (RepaymentInstallment | any)[] = [],
  preferredInstallmentNo?: number
): RepaymentInstallment | any | null {
  if (!schedules || schedules.length === 0) return null;

  // If a specific installment was requested (e.g. clicked from a table row)
  if (preferredInstallmentNo) {
    const match = schedules.find((s) => s.installmentNo === preferredInstallmentNo);
    if (match) return match;
  }

  // Find all unpaid / pending / overdue installments
  const unpaid = schedules.filter((s) => {
    const st = String(s.status || '').toUpperCase();
    return st !== 'PAID' && st !== 'COMPLETED';
  });

  if (unpaid.length > 0) {
    // Sort ascending by installment number
    const sorted = [...unpaid].sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0));
    return sorted[0];
  }

  // Fallback to first schedule in list if all marked paid
  return schedules[0] || null;
}

/**
 * Sanitizes raw amount string:
 * 1. Strips non-digit and non-period characters (removes letters, currency symbols, negatives)
 * 2. Restricts to a single decimal separator
 * 3. Strips accidental leading zeroes (e.g. "02130" -> "2130", "0050" -> "50") while preserving "0.xx" or "0"
 */
function sanitizeAmountInput(raw: string): string {
  if (!raw) return '';

  // 1. Strip non-numeric/non-decimal characters
  let cleaned = raw.replace(/[^0-9.]/g, '');

  // 2. Allow only a single decimal point
  const dotParts = cleaned.split('.');
  if (dotParts.length > 2) {
    cleaned = dotParts[0] + '.' + dotParts.slice(1).join('');
  }

  // 3. Strip accidental leading zeroes before integer numbers (e.g., "02130" -> "2130")
  if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned === '' || cleaned.startsWith('.')) {
      cleaned = '0' + cleaned;
    }
  }

  return cleaned;
}

export const BorrowerPaymentModal: React.FC<BorrowerPaymentModalProps> = ({
  loan,
  currency,
  initialInstallmentNo,
  initialAmount,
  onClose,
  onSuccess,
}) => {
  const { language } = useLanguage();

  // Find initial unpaid installment immediately on mount
  const defaultSchedule = findDefaultSchedule(loan.schedules, initialInstallmentNo);
  const initialScheduleId = getScheduleId(defaultSchedule);

  const initialCalculatedAmount =
    initialAmount !== undefined && initialAmount > 0
      ? initialAmount
      : defaultSchedule
      ? getInstallmentTotalDue(defaultSchedule)
      : loan.nextPaymentDueAmountUSD || loan.outstandingBalanceUSD || 0;

  // ========================================================
  // STATE MANAGEMENT
  // ========================================================
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(initialScheduleId);
  const [amountInput, setAmountInput] = useState<string>(
    initialCalculatedAmount > 0 ? String(initialCalculatedAmount) : ''
  );
  const [currencyChoice, setCurrencyChoice] = useState<'USD' | 'KHR'>('USD');
  const [notes, setNotes] = useState<string>('');

  // Step flow: FORM -> SCAN_PAY -> SUCCESS
  const [step, setStep] = useState<'FORM' | 'SCAN_PAY' | 'SUCCESS'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inlineWarning, setInlineWarning] = useState<string | null>(null);

  // Active KHQR Session & Polling
  const [khqrSession, setKhqrSession] = useState<KhqrPaymentSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins
  const [pollCount, setPollCount] = useState<number>(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Verified Receipt Result
  const [verifiedReceipt, setVerifiedReceipt] = useState<PaymentReceipt | null>(null);

  // ========================================================
  // AUTO-SELECTION & NULL PROTECTION
  // ========================================================
  // When modal opens or loan schedules change, automatically find & select first unpaid schedule
  useEffect(() => {
    if (loan.schedules && loan.schedules.length > 0) {
      const target = findDefaultSchedule(loan.schedules, initialInstallmentNo);
      if (target) {
        const id = getScheduleId(target);
        setSelectedScheduleId(id);
        const due = getInstallmentTotalDue(target);
        if (due > 0) {
          setAmountInput(String(due));
        }
        setInlineWarning(null);
      }
    }
  }, [loan, initialInstallmentNo]);

  // Resolve currently active schedule based on selectedScheduleId
  const currentSchedule =
    (loan.schedules || []).find((s) => {
      const sId = getScheduleId(s);
      return (
        sId === selectedScheduleId ||
        String(s.installmentNo) === String(selectedScheduleId) ||
        (s.id && String(s.id) === String(selectedScheduleId))
      );
    }) || defaultSchedule;

  // Handle installment dropdown change: updates selectedScheduleId and auto-populates exact total_due
  const handleInstallmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedScheduleId(newId);
    setInlineWarning(null);
    setErrorMessage(null);

    const target = (loan.schedules || []).find((s) => {
      const sId = getScheduleId(s);
      return (
        sId === newId ||
        String(s.installmentNo) === String(newId) ||
        (s.id && String(s.id) === String(newId))
      );
    });

    if (target) {
      const due = getInstallmentTotalDue(target);
      setAmountInput(due > 0 ? String(due) : '');
    }
  };

  // Handle amount text change with sanitization
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitized = sanitizeAmountInput(rawValue);
    setAmountInput(sanitized);
    if (inlineWarning) setInlineWarning(null);
    if (errorMessage) setErrorMessage(null);
  };

  // ========================================================
  // COUNTDOWN & POLLING LIFECYCLE
  // ========================================================
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

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ========================================================
  // STEP 1 -> STEP 2: DISPATCH & VALIDATE KHQR REQUEST
  // ========================================================
  const handleGenerateKhqr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInlineWarning(null);

    // Strict client-side validation guard: ensure selectedScheduleId is not null/empty
    if (!selectedScheduleId || !currentSchedule) {
      setInlineWarning(
        language === 'km'
          ? 'សូមជ្រើសរើសវគ្គបង់រំលស់ជាមុនសិន'
          : 'Please select an installment period'
      );
      return;
    }

    if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
      setErrorMessage(
        language === 'km'
          ? `មិនអាចបង់ប្រាក់សម្រាប់ឥណទានក្នុងស្ថានភាព '${loan.status}' បានទេ។ ការទូទាត់អាចធ្វើបានតែលើឥណទានសកម្ម (ACTIVE) ឬ ហួសកាលកំណត់ (OVERDUE) ប៉ុណ្ណោះ។`
          : `Cannot accept payment for loan with status '${loan.status}'. Payments can only be recorded on ACTIVE or OVERDUE loans.`
      );
      return;
    }

    const numericAmount = parseFloat(amountInput);
    if (!amountInput || isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage(
        language === 'km'
          ? 'ចំនួនទឹកប្រាក់ត្រូវបង់ត្រូវតែធំជាង $0.00'
          : 'Payment amount must be greater than $0.00.'
      );
      return;
    }

    const remainingOnInstallment =
      getInstallmentTotalDue(currentSchedule) ||
      currentSchedule.remainingAmountUSD ||
      loan.outstandingBalanceUSD;

    if (numericAmount > remainingOnInstallment + 0.01) {
      setErrorMessage(
        language === 'km'
          ? `ចំនួនទឹកប្រាក់បង់លើសពីសមតុល្យនៅសល់នៃការបង់រំលស់នេះ ($${remainingOnInstallment.toFixed(2)})`
          : `Payment amount exceeds remaining installment balance ($${remainingOnInstallment.toFixed(2)}).`
      );
      return;
    }

    // Resolve non-null schedule ID for database foreign key constraint
    const resolvedScheduleId =
      currentSchedule.id ||
      (currentSchedule as any).schedule_id ||
      selectedScheduleId;

    setIsSubmitting(true);
    try {
      const payload: any = {
        loanId: loan.id,
        installmentId: resolvedScheduleId,
        schedule_id: resolvedScheduleId,
        installmentNo: currentSchedule.installmentNo,
        amount: Number(numericAmount),
        currency: currencyChoice,
        notes: notes.trim() || undefined,
      };

      const session = await api.initiateKhqrPayment(payload);

      setKhqrSession(session);
      setSecondsRemaining(900); // 15 mins
      setStep('SCAN_PAY');

      // Start automatic polling on Bakong network
      startStatusPolling(session.paymentId);
    } catch (err: any) {
      console.error('KHQR Generation error:', err);
      setErrorMessage(
        err?.message ||
          (language === 'km'
            ? 'មិនអាចបង្កើត KHQR បានទេ សូមពិនិត្យព័ត៌មានរួចព្យាយាមម្តងទៀត។'
            : 'Could not generate Bakong KHQR. Please verify and try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // BAKONG POLLING & VERIFICATION
  // ========================================================
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
              (language === 'km' ? 'ការទូទាត់ត្រូវបានបដិសេធ។' : 'Payment verification failed.')
          );
        }
      } catch {
        // Silently continue polling
      }
    }, 3500);
  };

  const handleManualCheck = async () => {
    if (!khqrSession || isCheckingStatus) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);

    try {
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

  const handlePaymentSuccess = (result: any) => {
    const rawReceipt = result.receipt || result;
    const finalAmount = khqrSession?.amount || parseFloat(amountInput) || 0;

    const finalReceipt: PaymentReceipt = {
      paymentId: khqrSession?.paymentId || rawReceipt.paymentId,
      receiptNo:
        rawReceipt.receiptNo || khqrSession?.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
      referenceNo:
        khqrSession?.referenceNo || rawReceipt.referenceNo || `PAY-${Date.now().toString().slice(-6)}`,
      loanNumber: loan.loanNumber,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      installmentNo: khqrSession?.installmentNo || currentSchedule?.installmentNo || 1,
      amountPaidUSD: finalAmount,
      amountPaidKHR: Math.round(finalAmount * 4100),
      currency: currencyChoice,
      paymentMethod: 'KHQR',
      transactionRef:
        result.transactionId || khqrSession?.referenceNo || `TRX-${Date.now().toString().slice(-6)}`,
      transactionId: result.transactionId || khqrSession?.referenceNo,
      khqrMd5: khqrSession?.md5,
      status: 'PAID',
      paidAt: result.paidAt || new Date().toISOString(),
      verifiedAt: result.verifiedAt || new Date().toISOString(),
      cashierName: khqrSession?.merchantName || 'Bakong KHQR Universal Gateway',
      principalAllocatedUSD: finalAmount * 0.85,
      interestAllocatedUSD: finalAmount * 0.15,
      lateFeeAllocatedUSD: 0,
      outstandingBalanceAfterUSD: Math.max(0, loan.outstandingBalanceUSD - finalAmount),
      notes: notes || 'Settled via Bakong KHQR dynamic gateway',
    };

    setVerifiedReceipt(finalReceipt);
    setStep('SUCCESS');
    onSuccess(finalReceipt);
  };

  // ========================================================
  // RENDER: BANK-GRADE OVERHAULED MODAL
  // ========================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-300 font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ========================================================
            MODAL HEADER: Bakong Badge + Loan Ref + Close Button
            ======================================================== */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Red Bakong KHQR Brand Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-600 text-white shadow-xs">
              <span className="font-black text-[11px] tracking-wider uppercase font-mono">KHQR</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {step === 'SUCCESS'
                    ? (language === 'km' ? 'បង្កាន់ដៃបង់ប្រាក់' : 'Payment Receipt')
                    : step === 'SCAN_PAY'
                    ? (language === 'km' ? 'ស្កេនដើម្បីបង់ប្រាក់' : 'Scan to Pay')
                    : (language === 'km' ? 'ការបង់ប្រាក់កម្ចី' : 'Loan Payment')}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  #{loan.loanNumber || 'LN-2026-0010'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {loan.productName || 'Personal Loan Facility'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================
            MODAL BODY CONTENT
            ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* General Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{language === 'km' ? 'កំហុស:' : 'Notice:'}</span> {errorMessage}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 1: INSTALLMENT SELECTION & AMOUNT INPUT
              ======================================================== */}
          {step === 'FORM' && (
            <form onSubmit={handleGenerateKhqr} className="space-y-5 text-xs">
              
              {/* Inactive Loan Warning */}
              {loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{language === 'km' ? 'ព័ត៌មាន:' : 'Notice:'}</span>{' '}
                    {language === 'km'
                      ? `ឥណទាននេះស្ថិតក្នុងស្ថានភាព '${loan.status}' (រង់ចាំការបើកផ្តល់)។ អ្នកអាចបង់ប្រាក់បានបន្ទាប់ពីប្រាក់កម្ចីត្រូវបានបើកផ្តល់រួច។`
                      : `This loan is currently '${loan.status}'. Repayments will be unlocked once funds have been disbursed.`}
                  </div>
                </div>
              )}

              {/* Installment Selector with Calendar Icon */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'km' ? 'ជ្រើសរើសវគ្គបង់រំលស់' : 'Select Installment to Pay'}</span>
                  </label>
                  {currentSchedule && (
                    <span className="text-[11px] font-medium text-slate-500">
                      {currentSchedule.status === 'PAID' ? (
                        <span className="text-emerald-600 font-semibold">PAID</span>
                      ) : (
                        <span>Due {currentSchedule.dueDate}</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </div>
                  <select
                    value={selectedScheduleId}
                    onChange={handleInstallmentChange}
                    className={`w-full h-11 pl-10 pr-9 bg-slate-50/80 hover:bg-slate-50 border rounded-2xl font-medium text-slate-900 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                      inlineWarning ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    {(loan.schedules || []).length === 0 ? (
                      <option value="">
                        {language === 'km' ? 'គ្មានកាលវិភាគបង់ប្រាក់' : 'No schedules available'}
                      </option>
                    ) : (
                      loan.schedules.map((s) => {
                        const schedId = getScheduleId(s);
                        const dueAmount = getInstallmentTotalDue(s);
                        const isPaid = String(s.status || '').toUpperCase() === 'PAID';
                        return (
                          <option key={schedId} value={schedId}>
                            Installment #{s.installmentNo} • Due {s.dueDate} • Due: ${dueAmount.toFixed(2)} {isPaid ? '(PAID)' : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Inline warning guard for null protection */}
                {inlineWarning && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium">{inlineWarning}</span>
                  </div>
                )}

                {/* Selected Installment Breakdown Chip Card */}
                {currentSchedule && (
                  <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50/80 border border-slate-200/70 rounded-2xl text-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                        Principal
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        ${(currentSchedule.principalUSD ?? (currentSchedule as any).principal_due ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-0.5 border-x border-slate-200/80">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                        Interest
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        ${(currentSchedule.interestUSD ?? (currentSchedule as any).interest_due ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-red-600 block">
                        Total Due
                      </span>
                      <span className="font-mono font-black text-red-600 text-xs">
                        ${getInstallmentTotalDue(currentSchedule).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount to Pay (Sanitized + Auto-Populated) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800">
                    {language === 'km' ? 'ចំនួនទឹកប្រាក់ត្រូវបង់ ($)' : 'Payment Amount ($)'}
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    Max: ${getInstallmentTotalDue(currentSchedule).toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-sm font-mono">$</span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    required
                    className="w-full h-11 pl-9 pr-3.5 bg-white border border-slate-200 rounded-2xl text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Currency Toggle (High-Contrast Pill Toggle) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  {language === 'km' ? 'រូបិយប័ណ្ណទូទាត់' : 'Settlement Currency'}
                </label>
                <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setCurrencyChoice('USD')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      currencyChoice === 'USD'
                        ? 'bg-slate-950 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyChoice('KHR')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      currencyChoice === 'KHR'
                        ? 'bg-slate-950 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    KHR (៛)
                  </button>
                </div>
              </div>

              {/* Payment Gateway Pill: Official Bakong KHQR Badge */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    KHQR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Bakong KHQR Gateway</span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                        Instant Settlement
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Multi-bank real-time clearance (ACLEDA, ABA, Wing &amp; 30+ banks)
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  {language === 'km' ? 'កំណត់សម្គាល់ (ស្រេចចិត្ត)' : 'Payment Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly installment payment"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Action Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {language === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !selectedScheduleId ||
                    (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE')
                  }
                  className="px-6 py-2.5 rounded-2xl font-bold text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-950/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{language === 'km' ? 'កំពុងបង្កើត...' : 'Generating KHQR...'}</span>
                    </>
                  ) : (
                    <span>{language === 'km' ? 'បង្កើត KHQR & បង់ប្រាក់' : 'Generate KHQR & Pay'}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              STEP 2: SCAN & PAY (Authentic Bakong KHQR Presentation)
              ======================================================== */}
          {step === 'SCAN_PAY' && khqrSession && (
            <div className="space-y-5 text-xs">
              
              {/* KHQR Presentation Card */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-3xl p-5 text-center space-y-4">
                
                {/* Red KHQR Top Banner */}
                <div className="bg-red-600 text-white py-2 px-4 rounded-2xl flex items-center justify-between font-bold shadow-xs">
                  <span className="font-mono tracking-wider text-sm font-black">KHQR</span>
                  <span className="text-xs font-medium opacity-95">
                    {khqrSession.bankName || 'Bakong Network'} • {khqrSession.merchantName || 'Apex LMS'}
                  </span>
                </div>

                {/* Amount Header */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">
                    Installment #{khqrSession.installmentNo || currentSchedule?.installmentNo || 1}
                  </p>
                  <div className="flex items-baseline justify-center gap-2 font-mono font-bold">
                    <span className="text-3xl text-slate-950">${Number(khqrSession.amount).toFixed(2)}</span>
                    <span className="text-xs text-slate-500">
                      / {new Intl.NumberFormat('km-KH').format(Math.round(Number(khqrSession.amount) * 4100))} ៛
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">
                    Ref: {khqrSession.referenceNo || khqrSession.reference}
                  </p>
                </div>

                {/* QR Code Presentation Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block shadow-sm">
                  {khqrSession.qrDataUrl ? (
                    <img
                      src={khqrSession.qrDataUrl}
                      alt="Bakong KHQR Payment"
                      className="w-52 h-52 mx-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-52 h-52 bg-slate-50 flex items-center justify-center font-mono text-[10px] text-slate-500 p-2 text-center rounded-lg">
                      {khqrSession.qr?.slice(0, 36)}...
                    </div>
                  )}
                </div>

                {/* Customer Instructions */}
                <p className="text-xs text-slate-600 leading-relaxed px-4">
                  {language === 'km'
                    ? 'បើកកម្មវិធី Bakong ឬកម្មវិធីធនាគារណាមួយនៅក្នុងប្រទេសកម្ពុជា (ABA, ACLEDA, Wing) ដើម្បីស្កេនទូទាត់។'
                    : 'Scan with Bakong, ABA Mobile, ACLEDA, Wing, or any Cambodian banking app.'}
                </p>

                {/* Expiration Countdown Timer */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 pt-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>
                    {language === 'km' ? 'ផុតកំណត់ក្នុងរយៈពេល:' : 'Expires in:'}{' '}
                    <strong className="font-mono font-bold text-slate-900">{formatTimer(secondsRemaining)}</strong>
                  </span>
                </div>
              </div>

              {/* Status Polling Card */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      {language === 'km' ? 'កំពុងរង់ចាំការទូទាត់...' : 'Waiting for payment...'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Auto-checking settlement network (Check #{pollCount})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isCheckingStatus}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{language === 'km' ? 'ពិនិត្យឥឡូវ' : 'Check Payment'}</span>
                </button>
              </div>

              {/* Navigation Back / Close */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setStep('FORM');
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-950 underline cursor-pointer"
                >
                  {language === 'km' ? '← កែប្រែចំនួនទឹកប្រាក់' : '← Change amount / installment'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
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
            <div className="space-y-5 text-xs">
              
              {/* Success Banner */}
              <div className="p-5 bg-emerald-50 border border-emerald-200/80 rounded-3xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'km' ? 'ការទូទាត់ជោគជ័យ!' : 'Payment Successful!'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  {language === 'km'
                    ? 'ការទូទាត់របស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់ និងបញ្ជាក់រួចរាល់នៅលើបណ្តាញ Bakong។'
                    : 'Your installment payment was confirmed and settled on the Bakong interbank network.'}
                </p>
              </div>

              {/* Bank-Grade Receipt Card */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-5 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-200 font-sans font-bold text-slate-900">
                  <span>Receipt #{verifiedReceipt.receiptNo}</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    PAID
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Loan Reference:</span>
                  <span className="font-bold text-slate-900">{verifiedReceipt.loanNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Installment Period:</span>
                  <span className="font-bold text-slate-900">#{verifiedReceipt.installmentNo}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Settled:</span>
                  <span className="font-bold text-slate-950 text-sm">
                    ${verifiedReceipt.amountPaidUSD.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Settlement Method:</span>
                  <span className="font-bold text-slate-900">Bakong KHQR (Real-Time)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transaction ID:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">
                    {verifiedReceipt.transactionId || verifiedReceipt.transactionRef}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-blue-600">
                    ${verifiedReceipt.outstandingBalanceAfterUSD.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-2xl font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'km' ? 'បោះពុម្ព' : 'Print Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl font-bold text-white bg-slate-950 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-950/20 cursor-pointer"
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
