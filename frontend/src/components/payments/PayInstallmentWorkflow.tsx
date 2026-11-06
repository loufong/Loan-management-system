import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import companyKhqrImg from '../../assets/company-khqr.png';
import {
  Wallet,
  QrCode,
  CreditCard,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Printer,
  Download,
  ExternalLink,
  ShieldCheck,
  Check,
  FileText,
  UploadCloud,
  X,
  ChevronRight,
  Info,
  Lock,
  Smartphone,
  CheckCheck
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';

export type PaymentWorkflowState = 'INPUT' | 'PROCESSING' | 'SUCCESS' | 'TIMEOUT' | 'ERROR';
export type PaymentOption = 'NEXT' | 'CUSTOM' | 'FULL';
export type PaymentMethod = 'QR_INSTANT' | 'LINKED_ACCOUNT' | 'MANUAL_SLIP';

export interface LoanFacilityContext {
  id: string;
  loanNumber: string;
  facilityTitle: string;
  status: 'ACTIVE' | 'PENDING' | 'OVERDUE' | 'COMPLETED';
  originalPrincipalUSD: number;
  outstandingBalanceUSD: number;
  interestRateAnnual: number;
  totalTenureMonths: number;
  remainingTenureMonths: number;
  currentCycleNo: number;
  nextCycleDueDate: string;
  nextCycleAmountUSD: number;
  linkedAccount?: {
    bankName: string;
    accountNumberMasked: string;
    accountHolder: string;
    accountType: string;
    availableBalanceUSD: number;
  };
}

export interface PaymentSettlementReceipt {
  receiptNumber: string;
  transactionReference: string;
  loanAccountId: string;
  facilityTitle: string;
  installmentCycle: number | string;
  paymentMethod: string;
  settledAmountUSD: number;
  settledAmountKHR: number;
  exchangeRateNBC: number;
  timestamp: string;
  clearingInstitution: string;
  merchantName: string;
  previousBalanceUSD: number;
  newRemainingBalanceUSD: number;
  status: 'SETTLED' | 'CLEARED';
}

export interface PayInstallmentWorkflowProps {
  currentUser?: UserProfile;
  loanFacility?: Partial<LoanFacilityContext>;
  currency?: Currency;
  isModal?: boolean;
  onClose?: () => void;
  onNavigate?: (route: string) => void;
  onPaymentSettled?: (receipt: PaymentSettlementReceipt) => void;
}

const DEFAULT_FACILITY: LoanFacilityContext = {
  id: 'LN-2026-6042',
  loanNumber: 'LN-2026-6042',
  facilityTitle: 'Personal Micro-Credit Facility',
  status: 'ACTIVE',
  originalPrincipalUSD: 6000.0,
  outstandingBalanceUSD: 3850.0,
  interestRateAnnual: 6.5,
  totalTenureMonths: 12,
  remainingTenureMonths: 8,
  currentCycleNo: 5,
  nextCycleDueDate: '2026-09-15',
  nextCycleAmountUSD: 122.5,
  linkedAccount: {
    bankName: 'ACLEDA Bank Plc.',
    accountNumberMasked: '****-****-2026',
    accountHolder: 'Johnathan Doe',
    accountType: 'Checking / Savings Account',
    availableBalanceUSD: 5420.0,
  },
};

export const PayInstallmentWorkflow: React.FC<PayInstallmentWorkflowProps> = ({
  currentUser,
  loanFacility: customFacility,
  currency: appCurrency = 'USD',
  isModal = false,
  onClose,
  onNavigate,
  onPaymentSettled,
}) => {
  // Merge prop facility with enterprise defaults
  const facility: LoanFacilityContext = useMemo(() => {
    const holder = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Client Account';
    return {
      ...DEFAULT_FACILITY,
      ...customFacility,
      linkedAccount: {
        ...DEFAULT_FACILITY.linkedAccount!,
        accountHolder: holder,
        ...(customFacility?.linkedAccount || {}),
      },
    };
  }, [customFacility, currentUser]);

  // NBC Official Reference Rate: 1 USD = 4,080 KHR
  const NBC_RATE = 4080;

  // --- Workflow State Machine ---
  const [workflowState, setWorkflowState] = useState<PaymentWorkflowState>('INPUT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Configuration Form State ---
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('NEXT');
  const [customAmountUSD, setCustomAmountUSD] = useState<number>(300);
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(appCurrency);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QR_INSTANT');

  // Manual Slip Upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [bankReferenceInput, setBankReferenceInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Linked account authorization state
  const [accountPin, setAccountPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // QR Display & Polling State
  const QR_VALIDITY_SECONDS = 180; // 3 minutes validity window
  const [secondsRemaining, setSecondsRemaining] = useState<number>(QR_VALIDITY_SECONDS);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('Listening for Bakong settlement confirmation...');
  const [generatedRefCode, setGeneratedRefCode] = useState<string>('');

  // Settlement Result
  const [settledReceipt, setSettledReceipt] = useState<PaymentSettlementReceipt | null>(null);

  // Calculate payment amounts
  const payableAmountUSD = useMemo(() => {
    if (paymentOption === 'NEXT') return facility.nextCycleAmountUSD;
    if (paymentOption === 'FULL') return facility.outstandingBalanceUSD;
    return Math.max(0, customAmountUSD);
  }, [paymentOption, facility, customAmountUSD]);

  const payableAmountKHR = useMemo(() => {
    return Math.round(payableAmountUSD * NBC_RATE);
  }, [payableAmountUSD, NBC_RATE]);

  // Format currency helpers
  const formatMoney = (valUSD: number, targetCurrency: Currency = selectedCurrency) => {
    if (targetCurrency === 'KHR') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(valUSD * NBC_RATE).replace('KHR', '៛');
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valUSD);
  };

  // Generate Dynamic QR Payload
  const generateKhqrPayload = async (amtUSD: number, refCode: string) => {
    try {
      const payloadString = `00020101021229380016bakong@acleda0010108${refCode}52045999530384054${amtUSD.toFixed(2).length.toString().padStart(2, '0')}${amtUSD.toFixed(2)}5802KH5916JAM SONG VICH LMS6010Phnom Penh62230119${refCode}6304`;
      const dataUrl = await QRCode.toDataURL(payloadString, {
        width: 280,
        margin: 1,
        color: {
          dark: '#020617',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to encode QR canvas:', err);
    }
  };

  // Initiate Payment Execution
  const handleProceedToExecution = () => {
    if (paymentOption === 'CUSTOM') {
      if (!customAmountUSD || customAmountUSD < 10) {
        setCustomInputError('Minimum partial prepayment is $10.00 USD.');
        return;
      }
      if (customAmountUSD > facility.outstandingBalanceUSD) {
        setCustomInputError(`Prepayment cannot exceed total balance ($${facility.outstandingBalanceUSD.toFixed(2)}).`);
        return;
      }
      setCustomInputError(null);
    }

    const uniqueRef = `BK-${facility.loanNumber.slice(-4)}-C0${facility.currentCycleNo}-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedRefCode(uniqueRef);

    if (paymentMethod === 'QR_INSTANT') {
      setSecondsRemaining(QR_VALIDITY_SECONDS);
      generateKhqrPayload(payableAmountUSD, uniqueRef);
      setPollingStatus('Awaiting instant clearing via Bakong Open API...');
      setWorkflowState('PROCESSING');
    } else {
      setWorkflowState('PROCESSING');
    }
  };

  // Dynamic Countdown Timer for QR Validity
  useEffect(() => {
    if (workflowState !== 'PROCESSING' || paymentMethod !== 'QR_INSTANT') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setWorkflowState('TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [workflowState, paymentMethod]);

  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Execute Linked Account Auto-Debit
  const handleExecuteLinkedDebit = () => {
    if (!accountPin || accountPin.length < 4) {
      setPinError('Please enter your 4-digit security PIN to authorize auto-debit.');
      return;
    }
    setPinError(null);
    triggerSuccessfulSettlement('Linked Account Auto-Debit (Direct Clearing)');
  };

  // Execute Manual Slip Upload
  const handleExecuteManualSlip = () => {
    if (!slipFile) {
      setErrorMessage('Please upload a bank payment receipt slip before submitting.');
      return;
    }
    triggerSuccessfulSettlement('Manual Bank Counter Transfer Slip');
  };

  // Settlement Finalizer
  const triggerSuccessfulSettlement = (methodTitle: string) => {
    const receiptNo = `REC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBalance = Math.max(0, facility.outstandingBalanceUSD - payableAmountUSD);

    const receipt: PaymentSettlementReceipt = {
      receiptNumber: receiptNo,
      transactionReference: generatedRefCode || `TXN-BK-${Math.floor(100000 + Math.random() * 900000)}`,
      loanAccountId: facility.loanNumber,
      facilityTitle: facility.facilityTitle,
      installmentCycle: paymentOption === 'NEXT' ? `#${facility.currentCycleNo}` : paymentOption === 'FULL' ? 'Full Settlement' : 'Principal Curtailment',
      paymentMethod: methodTitle,
      settledAmountUSD: payableAmountUSD,
      settledAmountKHR: payableAmountKHR,
      exchangeRateNBC: NBC_RATE,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC+7',
      clearingInstitution: 'ACLEDA Bank Plc. / National Bank of Cambodia',
      merchantName: 'JAM SONG VICH Core Banking LMS',
      previousBalanceUSD: facility.outstandingBalanceUSD,
      newRemainingBalanceUSD: newBalance,
      status: 'SETTLED',
    };

    setSettledReceipt(receipt);
    setWorkflowState('SUCCESS');
    onPaymentSettled?.(receipt);
  };

  // Restart / Fresh QR Refresh
  const handleRefreshQr = () => {
    setSecondsRemaining(QR_VALIDITY_SECONDS);
    const refreshedRef = `BK-${facility.loanNumber.slice(-4)}-C0${facility.currentCycleNo}-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedRefCode(refreshedRef);
    generateKhqrPayload(payableAmountUSD, refreshedRef);
    setWorkflowState('PROCESSING');
  };

  // Handle Drag & Drop Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  // Download Receipt Statement
  const handleExportStatement = () => {
    if (!settledReceipt) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settledReceipt, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `${settledReceipt.receiptNumber}_Settlement.json`);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Return to Dashboard Handler
  const handleReturnToDashboard = () => {
    if (onClose) onClose();
    else if (onNavigate) onNavigate('borrower_dashboard');
  };

  return (
    <div className={`w-full font-sans text-slate-100 ${isModal ? 'p-0' : 'max-w-6xl mx-auto space-y-6 pb-12'}`}>
      {/* ========================================================================= */}
      {/* 1. HEADER & CONTEXT SECTION                                               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Subtle accent highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Dynamic Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500 font-medium">Core Banking</span>
              <span>/</span>
              <button
                type="button"
                onClick={handleReturnToDashboard}
                className="hover:text-slate-200 transition-colors"
              >
                My Loans
              </button>
              <span>/</span>
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                Pay Installment
              </span>
            </div>

            {/* Title & Facility Summary Pill */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Settle Loan Installment
              </h1>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {facility.loanNumber}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {facility.status}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Verified Facility
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              Execute real-time repayments via National Bakong KHQR, linked settlement accounts, or branch counter vouchers with instant ledger balance reconciliation.
            </p>
          </div>

          {/* Modal Close / Quick Action */}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close payment dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Dual Currency Converter Box */}
          <div className="flex items-center gap-2 self-start lg:self-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 px-2 font-mono uppercase tracking-wider">
              Settlement Currency:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${selectedCurrency === 'USD'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCurrency('KHR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${selectedCurrency === 'KHR'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              KHR (៛)
            </button>
          </div>
        </div>

        {/* Financial Overview Strip (4 High-Density Enterprise Metric Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 mt-5 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Original Principal
            </span>
            <div className="text-base font-bold text-white font-mono mt-1">
              {formatMoney(facility.originalPrincipalUSD)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Interest Rate: {facility.interestRateAnnual}% p.a.</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Outstanding Balance
            </span>
            <div className="text-base font-bold text-amber-400 font-mono mt-1">
              {formatMoney(facility.outstandingBalanceUSD)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Principal & Accrued Interest</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Next Due Installment
            </span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-1">
              {formatMoney(facility.nextCycleAmountUSD)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Due on {facility.nextCycleDueDate}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Remaining Tenure
            </span>
            <div className="text-base font-bold text-white font-mono mt-1">
              {facility.remainingTenureMonths} of {facility.totalTenureMonths} Months
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Active Cycle #{facility.currentCycleNo}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKFLOW CONTAINER (STATE TRANSITIONS)                             */}
      {/* ========================================================================= */}
      {workflowState === 'INPUT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Repayment Configuration Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  1. Choose Repayment Amount
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your scheduled monthly installment, specify a custom prepayment, or settle the balance.
                </p>
              </div>

              {/* Payment Type Selector (Radio Cards) */}
              <div className="space-y-3">
                {/* Option A: Pay Current Installment */}
                <div
                  onClick={() => setPaymentOption('NEXT')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${paymentOption === 'NEXT'
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentOption === 'NEXT' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                        }`}>
                        {paymentOption === 'NEXT' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white">Pay Current Installment</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Cycle #{facility.currentCycleNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Scheduled due date: {facility.nextCycleDueDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-base font-black text-emerald-400">
                        {formatMoney(facility.nextCycleAmountUSD, 'USD')}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {formatMoney(facility.nextCycleAmountUSD, 'KHR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Option B: Custom Partial Prepayment */}
                <div
                  onClick={() => setPaymentOption('CUSTOM')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${paymentOption === 'CUSTOM'
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentOption === 'CUSTOM' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                        }`}>
                        {paymentOption === 'CUSTOM' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">Custom Partial Prepayment</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Curtails loan principal balance directly to reduce ongoing interest
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentOption === 'CUSTOM' && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-400 text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min={10}
                            max={facility.outstandingBalanceUSD}
                            value={customAmountUSD}
                            onChange={(e) => setCustomAmountUSD(parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                            placeholder="Enter amount (min $10.00)"
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          ≈ {formatMoney(customAmountUSD, 'KHR')}
                        </span>
                      </div>
                      {customInputError && (
                        <p className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {customInputError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Option C: Full Loan Settlement / Payoff */}
                <div
                  onClick={() => setPaymentOption('FULL')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${paymentOption === 'FULL'
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentOption === 'FULL' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                        }`}>
                        {paymentOption === 'FULL' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white">Full Loan Settlement / Payoff</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Zero Penalty
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Settle all remaining {facility.remainingTenureMonths} cycles and close credit facility
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-base font-black text-white">
                        {formatMoney(facility.outstandingBalanceUSD, 'USD')}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {formatMoney(facility.outstandingBalanceUSD, 'KHR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  2. Select Settlement Channel
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose your preferred payment method to disburse payment directly to ACLEDA Bank Plc.
                </p>
              </div>

              <div className="space-y-3">
                {/* Method 1: Instant QR / Direct Bank Clearing */}
                <div
                  onClick={() => setPaymentMethod('QR_INSTANT')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${paymentMethod === 'QR_INSTANT'
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-black text-xs">
                        KH
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white">Instant QR / Direct Bank Clearing</h3>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            0% Fee
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Scan via Bakong, ACLEDA, ABA, Wing, Canadia, or any mobile banking app
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'QR_INSTANT' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>

                {/* Method 2: Linked Settlement Account */}
                <div
                  onClick={() => setPaymentMethod('LINKED_ACCOUNT')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${paymentMethod === 'LINKED_ACCOUNT'
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white">Linked Settlement Account</h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Available: ${facility.linkedAccount?.availableBalanceUSD.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {facility.linkedAccount?.bankName} ({facility.linkedAccount?.accountNumberMasked}) • Auto-Debit
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'LINKED_ACCOUNT' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>

                {/* Method 3: Manual Counter / Bank Transfer Receipt Upload */}
                <div
                  onClick={() => setPaymentMethod('MANUAL_SLIP')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${paymentMethod === 'MANUAL_SLIP'
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <UploadCloud className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">Manual Counter / Bank Transfer Receipt</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload physical bank deposit slip or counter teller receipt for branch audit
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'MANUAL_SLIP' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Summary & Action Checkout Box */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm sticky top-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Payment Summary
              </h2>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Facility Loan Number:</span>
                  <span className="font-bold text-white">{facility.loanNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Installment Type:</span>
                  <span className="text-slate-200">
                    {paymentOption === 'NEXT' ? `Cycle #${facility.currentCycleNo}` : paymentOption === 'FULL' ? 'Full Settlement' : 'Partial Curtailment'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Settlement Channel:</span>
                  <span className="text-emerald-400 font-sans font-semibold">
                    {paymentMethod === 'QR_INSTANT' ? 'Bakong KHQR' : paymentMethod === 'LINKED_ACCOUNT' ? 'Linked Account' : 'Manual Slip'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Reference Exchange Rate:</span>
                  <span className="text-slate-300">1 USD = 4,080 KHR</span>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-sans font-bold text-white">Total Amount Due:</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {formatMoney(payableAmountUSD, 'USD')}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {formatMoney(payableAmountUSD, 'KHR')}
                  </div>
                </div>
              </div>

              {/* Security & Compliance Notice */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>NBC Encrypted Settlement</span>
                </div>
                <p>
                  Payments are cleared securely according to National Bank of Cambodia EMVCo interoperability protocols.
                </p>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleProceedToExecution}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer active:scale-[0.99]"
              >
                <span>Proceed to Pay {formatMoney(payableAmountUSD, 'USD')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYMENT EXECUTION & QR MODAL / CONTAINER (STATE: PROCESSING)           */}
      {/* ========================================================================= */}
      {workflowState === 'PROCESSING' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
            {/* Top Back Navigation Button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setWorkflowState('INPUT')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modify Payment Options</span>
              </button>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {generatedRefCode}
              </span>
            </div>

            {/* METHOD 1: INSTANT QR / BAKONG KHQR CANVAS CONTAINER */}
            {paymentMethod === 'QR_INSTANT' && (
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Scan Bakong KHQR to Settle
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Open your Cambodian banking app (Bakong, ACLEDA, ABA, Wing, Canadia) and point your camera at the QR code.
                  </p>
                </div>

                {/* Authentic Scannable ACLEDA KHQR Standee Card */}
                <div className="inline-block p-4 rounded-2xl bg-white shadow-2xl ring-4 ring-red-500/20 relative mx-auto max-w-[300px]">
                  <img
                    src={companyKhqrImg}
                    alt="Official JAM SONG VICH Bakong KHQR Standee"
                    className="w-64 h-auto mx-auto object-contain rounded-xl"
                  />
                  <div className="mt-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider font-sans">
                    ACLEDA Bank Plc. • JAM SONG VICH
                  </div>
                </div>

                {/* Receiving Institution & Merchant Badge */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 max-w-sm mx-auto text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Merchant Name:</span>
                    <strong className="text-white">JAM SONG VICH LMS</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Receiving Bank:</span>
                    <strong className="text-white">ACLEDA Bank Plc.</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Payable Amount:</span>
                    <strong className="text-emerald-400">${payableAmountUSD.toFixed(2)} USD (៛ {payableAmountKHR.toLocaleString()})</strong>
                  </div>
                </div>

                {/* Dynamic 3-Minute Validity Timer */}
                <div className="flex items-center justify-center gap-2 text-xs font-mono">
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-slate-400">Valid for:</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {formatTimerDisplay(secondsRemaining)}
                  </span>
                </div>

                {/* Polling Indicator */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{pollingStatus}</span>
                </div>

                {/* Mobile Deep-Link & Simulation Controls */}
                <div className="space-y-3 pt-2">
                  <a
                    href={`bakong://pay?ref=${generatedRefCode}&amount=${payableAmountUSD}`}
                    className="sm:hidden w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Open in Banking App</span>
                  </a>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => triggerSuccessfulSettlement('Bakong KHQR Dual-Currency Instant Clearing')}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                    >
                      Simulate Instant Settlement (Success)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkflowState('TIMEOUT')}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                    >
                      Simulate Timeout
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* METHOD 2: LINKED SETTLEMENT ACCOUNT PIN AUTHORIZATION */}
            {paymentMethod === 'LINKED_ACCOUNT' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Authorize Account Auto-Debit
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Directly debit your on-file checking account to clear installment.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Bank Name:</span>
                    <span className="text-white font-bold">{facility.linkedAccount?.bankName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Account Holder:</span>
                    <span className="text-white">{facility.linkedAccount?.accountHolder}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Account Number:</span>
                    <span className="text-emerald-400 font-bold">{facility.linkedAccount?.accountNumberMasked}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">Total to Debit:</span>
                    <span className="text-white font-bold text-sm">${payableAmountUSD.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
                    Enter 4-Digit Security PIN:
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={accountPin}
                    onChange={(e) => setAccountPin(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center tracking-[1em] py-3 bg-slate-950 border border-slate-700 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  {pinError && (
                    <p className="text-[11px] text-red-400 font-medium">{pinError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExecuteLinkedDebit}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirm and Debit ${payableAmountUSD.toFixed(2)}</span>
                </button>
              </div>
            )}

            {/* METHOD 3: MANUAL COUNTER SLIP UPLOAD */}
            {paymentMethod === 'MANUAL_SLIP' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Upload Bank Deposit Slip / Voucher
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload your counter receipt voucher. Our bursar will reconcile your installment within 1 business hour.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* File Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center space-y-3 cursor-pointer bg-slate-950/50 transition-colors"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,.pdf"
                      className="hidden"
                    />
                    <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-white">Click or drag bank voucher here</p>
                      <p className="text-[10px] text-slate-500">Supports PNG, JPG, or PDF (Max 10MB)</p>
                    </div>
                    {slipFile && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        File selected: {slipFile.name}
                      </span>
                    )}
                  </div>

                  {/* Reference Number Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
                      Bank Deposit / Slip Reference No:
                    </label>
                    <input
                      type="text"
                      value={bankReferenceInput}
                      onChange={(e) => setBankReferenceInput(e.target.value)}
                      placeholder="e.g. ACH-99201924"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteManualSlip}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Submit Voucher for Reconciliation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SETTLEMENT RECONCILIATION & RECEIPT STATE (STATE: SUCCESS)              */}
      {/* ========================================================================= */}
      {workflowState === 'SUCCESS' && settledReceipt && (
        <div className="max-w-2xl mx-auto space-y-6 pt-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-center space-y-6">
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2">
                <CheckCheck className="w-3.5 h-3.5" />
                OFFICIAL SETTLEMENT CONFIRMED
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Installment Payment Cleared
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
                Transaction has been validated and cleared into core general ledger accounts. Outstanding balance has been decremented.
              </p>
            </div>

            {/* Official Digital Banking Receipt Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 sm:p-6 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-850">
                <span className="font-sans font-bold text-white">JAM SONG VICH Core Banking</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  RECEIPT #{settledReceipt.receiptNumber}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans">Loan Account ID:</span>
                <strong className="text-white">{settledReceipt.loanAccountId}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans">Transaction Ref Code:</span>
                <strong className="text-emerald-400">{settledReceipt.transactionReference}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans">Settled Cycle:</span>
                <strong className="text-slate-200">{settledReceipt.installmentCycle}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans">Clearing Channel:</span>
                <span className="text-slate-300">{settledReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans">Settlement Timestamp:</span>
                <span className="text-slate-300">{settledReceipt.timestamp}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                <span className="font-sans text-white">Settled Amount:</span>
                <span className="text-emerald-400 text-base">
                  ${settledReceipt.settledAmountUSD.toFixed(2)} USD (៛ {settledReceipt.settledAmountKHR.toLocaleString()})
                </span>
              </div>

              <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-slate-400">
                <span className="font-sans">New Outstanding Balance:</span>
                <strong className="text-amber-400 text-sm">
                  ${settledReceipt.newRemainingBalanceUSD.toFixed(2)} USD
                </strong>
              </div>
            </div>

            {/* Action Buttons: Print, Download, Return */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleExportStatement}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span>Export Statement</span>
              </button>

              <button
                type="button"
                onClick={handleReturnToDashboard}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-emerald-950/40"
              >
                <span>Return to My Loans</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TIMEOUT / ERROR STATE (STATE: TIMEOUT / ERROR)                         */}
      {/* ========================================================================= */}
      {(workflowState === 'TIMEOUT' || workflowState === 'ERROR') && (
        <div className="max-w-xl mx-auto space-y-6 pt-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-8 text-center space-y-5 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-2">
                SESSION EXPIRED / PENDING
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                QR Payment Validity Window Expired
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                The 3-minute EMVCo security payload has expired. For your safety, cryptographic KHQR tokens must be refreshed before scanning.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRefreshQr}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Generate Fresh QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkflowState('INPUT')}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 cursor-pointer"
              >
                Change Payment Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayInstallmentWorkflow;

