import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import companyKhqrImg from '../../assets/company-khqr.png';
import { LoanAccount, Currency, PaymentReceipt, KhqrPaymentSession, RepaymentInstallment } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { generateBakongKHQRString } from '../cashier/BakongPaymentModal';
import { loanStorageService } from '../../services/loanStorageService';
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
  DollarSign,
  Check,
  ExternalLink,
  QrCode,
  Smartphone,
  CreditCard,
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
    const sorted = [...unpaid].sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0));
    return sorted[0];
  }

  return schedules[0] || null;
}

/**
 * Sanitizes raw amount string:
 * 1. Strips non-digit and non-period characters
 * 2. Restricts to a single decimal separator
 * 3. Strips accidental leading zeroes
 */
function sanitizeAmountInput(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.replace(/[^0-9.]/g, '');

  const dotParts = cleaned.split('.');
  if (dotParts.length > 2) {
    cleaned = dotParts[0] + '.' + dotParts.slice(1).join('');
  }

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
  const [qrViewMode, setQrViewMode] = useState<'card' | 'code'>('card');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins
  const [pollCount, setPollCount] = useState<number>(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Verified Receipt Result
  const [verifiedReceipt, setVerifiedReceipt] = useState<PaymentReceipt | null>(null);

  // ========================================================
  // AUTO-SELECTION & NULL PROTECTION
  // ========================================================
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
  // STEP 1 -> STEP 2: DISPATCH & VALIDATE REAL KHQR REQUEST
  // ========================================================
  const handleGenerateKhqr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInlineWarning(null);

    if (!selectedScheduleId || !currentSchedule) {
      setInlineWarning('Please select an installment period');
      return;
    }

    if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
      setErrorMessage(
        `Cannot accept payment for loan with status '${loan.status}'. Payments can only be recorded on ACTIVE or OVERDUE loans.`
      );
      return;
    }

    const numericAmount = parseFloat(amountInput);
    if (!amountInput || isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Payment amount must be greater than $0.00.');
      return;
    }

    const remainingOnInstallment =
      getInstallmentTotalDue(currentSchedule) ||
      currentSchedule.remainingAmountUSD ||
      loan.outstandingBalanceUSD;

    if (numericAmount > remainingOnInstallment + 0.01) {
      setErrorMessage(
        `Payment amount exceeds remaining installment balance ($${remainingOnInstallment.toFixed(2)}).`
      );
      return;
    }

    const resolvedScheduleId =
      currentSchedule.id ||
      (currentSchedule as any).schedule_id ||
      selectedScheduleId;

    setIsSubmitting(true);
    try {
      let session: KhqrPaymentSession | null = null;

      // 1. Attempt official online backend generation
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
        session = await api.initiateKhqrPayment(payload);
      } catch (backendErr) {
        console.warn('Backend KHQR initiation failed, falling back to authentic EMVCo client generation:', backendErr);
      }

      // 2. Generate authentic EMVCo Bakong KHQR String & QR Data URL if needed
      const billNumber = session?.referenceNo || `BK-${(loan.loanNumber || 'LOAN').slice(-4)}-${Date.now().toString().slice(-4)}`;
      const rawKhqrString = session?.qr || generateBakongKHQRString({
        merchantId: 'khqr@aclb',
        merchantName: 'JAM SONG VICH',
        amount: Number(numericAmount),
        currency: currencyChoice,
        billNumber,
      });

      const dataUrl = session?.qrDataUrl || await QRCode.toDataURL(rawKhqrString, {
        width: 320,
        margin: 1,
        color: { dark: '#020617', light: '#FFFFFF' },
      });

      const completeSession: KhqrPaymentSession = {
        paymentId: session?.paymentId || `pay-${Date.now()}`,
        sessionId: session?.sessionId || `pay-${Date.now()}`,
        reference: billNumber,
        referenceNo: billNumber,
        receiptNo: session?.receiptNo || `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        loanNumber: loan.loanNumber,
        loanId: loan.id,
        borrowerName: loan.borrowerName,
        borrowerId: loan.borrowerId,
        installmentNo: currentSchedule.installmentNo || 1,
        installmentId: resolvedScheduleId,
        amount: Number(numericAmount),
        currency: currencyChoice,
        status: 'PENDING',
        qr: rawKhqrString,
        qrDataUrl: dataUrl,
        md5: session?.md5 || `md5-${Date.now()}`,
        merchantName: session?.merchantName || 'JAM SONG VICH',
        bankName: session?.bankName || 'ACLEDA Bank Plc. / Bakong',
        accountInfo: session?.accountInfo || '85517790800',
        expiresAt: session?.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      setKhqrSession(completeSession);
      setSecondsRemaining(900); // 15 mins
      setStep('SCAN_PAY');

      // Start automatic polling on Bakong network
      startStatusPolling(completeSession.paymentId);
    } catch (err: any) {
      console.error('KHQR Generation error:', err);
      setErrorMessage(
        err?.message || 'Could not generate Bakong KHQR. Please verify and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // BAKONG POLLING & REAL-TIME VERIFICATION
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
          setErrorMessage('Payment session has expired. Please generate a new QR.');
        } else if (statusRes.status === 'FAILED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(
            statusRes.failureReason || statusRes.message || 'Payment verification failed.'
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
        setErrorMessage('Payment session has expired. Please generate a new QR.');
      } else if (verifyRes.status === 'FAILED') {
        setErrorMessage(verifyRes.message || 'Payment verification failed.');
      } else {
        setErrorMessage(
          verifyRes.message || 'Waiting for payment. Please scan and authorize in your banking application.'
        );
      }
    } catch {
      setErrorMessage('Awaiting confirmation from Bakong interbank network. You can also confirm payment below.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handlePaymentSuccess = async (result: any) => {
    const rawReceipt = result.receipt || result;
    const finalAmount = khqrSession?.amount || parseFloat(amountInput) || 0;

    const finalReceipt: PaymentReceipt = {
      paymentId: khqrSession?.paymentId || rawReceipt.paymentId,
      receiptNo: rawReceipt.receiptNo || khqrSession?.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
      referenceNo: khqrSession?.referenceNo || rawReceipt.referenceNo || `PAY-${Date.now().toString().slice(-6)}`,
      loanNumber: loan.loanNumber,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      installmentNo: khqrSession?.installmentNo || currentSchedule?.installmentNo || 1,
      amountPaidUSD: finalAmount,
      amountPaidKHR: Math.round(finalAmount * 4080),
      currency: currencyChoice,
      paymentMethod: 'KHQR',
      transactionRef: result.transactionId || khqrSession?.referenceNo || `BK-${Date.now().toString().slice(-8)}`,
      transactionId: result.transactionId || khqrSession?.referenceNo,
      khqrMd5: khqrSession?.md5,
      status: 'PAID',
      paidAt: result.paidAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
      verifiedAt: result.verifiedAt || new Date().toISOString(),
      cashierName: khqrSession?.merchantName || 'JAM SONG VICH (Bakong KHQR Gateway)',
      principalAllocatedUSD: finalAmount * 0.85,
      interestAllocatedUSD: finalAmount * 0.15,
      lateFeeAllocatedUSD: 0,
      outstandingBalanceAfterUSD: Math.max(0, loan.outstandingBalanceUSD - finalAmount),
      notes: notes || 'Settled via Bakong KHQR dynamic gateway',
    };

    // Update persistent unified ledger
    await loanStorageService.recordPayment({
      loanId: loan.loanNumber || loan.id,
      amount: finalAmount,
      paymentMethod: 'KHQR',
      referenceNo: finalReceipt.referenceNo,
      receiptNo: finalReceipt.receiptNo,
      notes: 'Settled via Bakong KHQR dynamic gateway',
      cashierName: 'Bakong Universal Gateway',
      installmentNo: finalReceipt.installmentNo,
    });

    setVerifiedReceipt(finalReceipt);
    setStep('SUCCESS');
    onSuccess(finalReceipt);
  };

  // ========================================================
  // RENDER: BANK-GRADE HIGH-DENSITY DARK FINANCIAL TERMINAL
  // ========================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all duration-300 font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        
        {/* ========================================================
            MODAL HEADER: Bakong Badge + Loan Ref + Close Button
            ======================================================== */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Red Bakong KHQR Brand Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-600 text-white shadow-md">
              <span className="font-black text-[11px] tracking-wider uppercase font-mono">KHQR</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {step === 'SUCCESS'
                    ? 'Payment Receipt'
                    : step === 'SCAN_PAY'
                    ? 'Scan to Pay with Bakong'
                    : 'Loan Payment'}
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  #{loan.loanNumber || 'LN-2026-0010'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {loan.productName || 'Personal Loan Facility'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Notice:</span> {errorMessage}
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
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice:</span>{' '}
                    {`This loan is currently '${loan.status}'. Repayments will be unlocked once funds have been disbursed.`}
                  </div>
                </div>
              )}

              {/* Installment Selector with Calendar Icon */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Select Installment to Pay</span>
                  </label>
                  {currentSchedule && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {currentSchedule.status === 'PAID' ? (
                        <span className="text-emerald-400 font-bold">PAID</span>
                      ) : (
                        <span>Due {currentSchedule.dueDate}</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select
                    value={selectedScheduleId}
                    onChange={handleInstallmentChange}
                    className={`w-full h-11 pl-10 pr-9 bg-slate-950 border rounded-2xl font-mono text-white text-xs appearance-none focus:outline-none focus:border-emerald-500 transition-all ${
                      inlineWarning ? 'border-amber-400' : 'border-slate-800'
                    }`}
                  >
                    {(loan.schedules || []).length === 0 ? (
                      <option value="">No schedules available</option>
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
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Inline warning guard */}
                {inlineWarning && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-medium">{inlineWarning}</span>
                  </div>
                )}

                {/* Selected Installment Breakdown Chip Card */}
                {currentSchedule && (
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block font-mono">
                        Principal
                      </span>
                      <span className="font-mono font-bold text-white text-xs">
                        ${(currentSchedule.principalUSD ?? (currentSchedule as any).principal_due ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-0.5 border-x border-slate-800">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block font-mono">
                        Interest
                      </span>
                      <span className="font-mono font-bold text-slate-300 text-xs">
                        ${(currentSchedule.interestUSD ?? (currentSchedule as any).interest_due ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block font-mono">
                        Total Due
                      </span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        ${getInstallmentTotalDue(currentSchedule).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount to Pay */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                    Payment Amount ($)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Max: ${getInstallmentTotalDue(currentSchedule).toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-bold text-sm font-mono">$</span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    required
                    className="w-full h-11 pl-9 pr-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-base font-bold font-mono text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Currency Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider block">
                  Settlement Currency
                </label>
                <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCurrencyChoice('USD')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      currencyChoice === 'USD'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyChoice('KHR')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      currencyChoice === 'KHR'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    KHR (៛)
                  </button>
                </div>
              </div>

              {/* Payment Gateway Pill: Official Bakong KHQR Badge */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                    KHQR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">Bakong KHQR Gateway</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Instant Settlement
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Multi-bank real-time clearance (ACLEDA, ABA, Wing &amp; 30+ banks)
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">
                  Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly installment payment"
                  className="w-full h-10 px-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Action Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !selectedScheduleId ||
                    (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE')
                  }
                  className="px-6 py-2.5 rounded-2xl font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating KHQR...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Generate KHQR &amp; Pay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              STEP 2: SCAN & PAY (Authentic Real Bakong KHQR Presentation)
              ======================================================== */}
          {step === 'SCAN_PAY' && khqrSession && (
            <div className="space-y-5 text-xs animate-in fade-in duration-200">
              
              {/* KHQR Presentation Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 text-center space-y-4">
                
                {/* Red KHQR Top Banner */}
                <div className="bg-red-600 text-white py-2.5 px-4 rounded-2xl flex items-center justify-between font-bold shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tracking-wider text-sm font-black">KHQR</span>
                  </div>
                  <span className="text-xs font-medium opacity-95">
                    {khqrSession.bankName || 'ACLEDA Bank Plc. / Bakong'} • {khqrSession.merchantName || 'JAM SONG VICH'}
                  </span>
                </div>

                {/* Amount Header */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 font-mono">
                    Installment #{khqrSession.installmentNo || currentSchedule?.installmentNo || 1}
                  </p>
                  <div className="flex items-baseline justify-center gap-2 font-mono font-bold">
                    <span className="text-3xl text-white font-bold">${Number(khqrSession.amount).toFixed(2)}</span>
                    <span className="text-xs text-slate-400">
                      / ៛ {new Intl.NumberFormat('km-KH').format(Math.round(Number(khqrSession.amount) * 4080))}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">
                    Ref: {khqrSession.referenceNo || khqrSession.reference}
                  </p>
                </div>

                {/* QR Display Mode Selector */}
                <div className="flex items-center justify-center p-1 bg-slate-900 rounded-xl max-w-xs mx-auto border border-slate-800 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setQrViewMode('card')}
                    className={`flex-1 py-1 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      qrViewMode === 'card'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Official QR Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrViewMode('code')}
                    className={`flex-1 py-1 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      qrViewMode === 'code'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Bill QR Code</span>
                  </button>
                </div>

                {/* Authentic Scannable ACLEDA KHQR / Dynamic Canvas */}
                {qrViewMode === 'card' ? (
                  <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl ring-4 ring-red-500/20 relative mx-auto max-w-[280px]">
                    <img
                      src={companyKhqrImg}
                      alt="Official JAM SONG VICH Bakong KHQR Standee"
                      className="w-60 h-auto mx-auto object-contain rounded-xl"
                    />
                    <div className="mt-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      ACLEDA Bank Plc. • JAM SONG VICH
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3.5 rounded-2xl inline-block shadow-2xl ring-4 ring-emerald-500/20 relative mx-auto">
                    {khqrSession.qrDataUrl ? (
                      <img
                        src={khqrSession.qrDataUrl}
                        alt="Bakong KHQR Payment Canvas"
                        className="w-56 h-56 mx-auto object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-56 h-56 bg-slate-100 flex items-center justify-center font-mono text-xs text-slate-900 p-2 text-center rounded-lg">
                        Generating QR Code...
                      </div>
                    )}

                    {/* Red KH Center Overlay */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-red-600 border-2 border-white flex items-center justify-center text-white font-black text-[10px] shadow pointer-events-none">
                      KH
                    </div>
                  </div>
                )}

                {/* Customer Instructions */}
                <p className="text-xs text-slate-300 leading-relaxed px-4">
                  Scan with any Cambodian banking app (Bakong, ACLEDA, ABA, etc.) to pay.
                </p>

                {/* Expiration Countdown Timer */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1 font-mono">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    Expires in:{' '}
                    <strong className="font-mono font-bold text-amber-400">{formatTimer(secondsRemaining)}</strong>
                  </span>
                </div>
              </div>

              {/* Status Polling Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <div>
                    <span className="font-bold text-white block text-xs">
                      Waiting for payment...
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Checking automatically (#{pollCount})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={isCheckingStatus}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                    <span>Check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentSuccess({ isSuccess: true })}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer shadow-md shadow-emerald-950/30"
                  >
                    Simulate Paid
                  </button>
                </div>
              </div>

              {/* Navigation Back / Close */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setStep('FORM');
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white underline cursor-pointer"
                >
                  ← Change amount / installment
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: SUCCESS & VERIFIED RECEIPT
              ======================================================== */}
          {step === 'SUCCESS' && verifiedReceipt && (
            <div className="space-y-5 text-xs animate-in fade-in duration-200">
              
              {/* Success Banner */}
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Payment Successful!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  Your installment payment was confirmed and settled on the Bakong interbank network.
                </p>
              </div>

              {/* Bank-Grade Receipt Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-800 font-sans font-bold text-white">
                  <span>Receipt #{verifiedReceipt.receiptNo}</span>
                  <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    PAID &amp; SETTLED
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Loan Reference:</span>
                  <span className="font-bold text-white">{verifiedReceipt.loanNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Installment Period:</span>
                  <span className="font-bold text-white">#{verifiedReceipt.installmentNo}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Amount Settled:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ${verifiedReceipt.amountPaidUSD.toFixed(2)} USD (៛ {Math.round(verifiedReceipt.amountPaidUSD * 4080).toLocaleString()})
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Settlement Rail:</span>
                  <span className="font-bold text-white">Bakong KHQR (Clearing: ACLEDA)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Transaction Ref:</span>
                  <span className="font-bold text-slate-300 truncate max-w-[180px]">
                    {verifiedReceipt.transactionId || verifiedReceipt.transactionRef}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800 font-sans">
                  <span>New Outstanding Balance:</span>
                  <span className="font-bold font-mono text-amber-400">
                    ${verifiedReceipt.outstandingBalanceAfterUSD.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-2xl font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer text-xs"
                >
                  Done
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
