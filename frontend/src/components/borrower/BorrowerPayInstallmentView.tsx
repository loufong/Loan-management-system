import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
  CreditCard,
  ArrowRight,
  Sparkles,
  Printer,
  ChevronRight,
  AlertCircle,
  Wallet,
  Check,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

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
  currency: appCurrency,
  initialAmountUSD = 122.5,
  initialInstallmentNo = 5,
  onNavigate,
  onPaymentSettled,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km' || (language as string) === 'KH';

  const NBC_RATE = 4080; // 1 USD = 4,080 KHR (NBC Reference Rate)

  // Options: NEXT (Option A), FULL (Option B), CUSTOM (Option C)
  const [repaymentOption, setRepaymentOption] = useState<'NEXT' | 'FULL' | 'CUSTOM'>('NEXT');
  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');
  const [customAmountUSD, setCustomAmountUSD] = useState<number>(300);

  // Countdown timer: 02:45 min (165 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(165);
  const [isListening, setIsListening] = useState<boolean>(true);
  const [settledReceipt, setSettledReceipt] = useState<any | null>(null);

  // Active amounts
  const nextInstallmentAmount = 122.5;
  const fullBalanceAmount = 3850.0;

  const currentPayAmountUSD =
    repaymentOption === 'NEXT'
      ? nextInstallmentAmount
      : repaymentOption === 'FULL'
      ? fullBalanceAmount
      : customAmountUSD;

  const currentPayAmountKHR = Math.round(currentPayAmountUSD * NBC_RATE);

  // Timer countdown hook
  useEffect(() => {
    if (settledReceipt) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          return 165; // Auto-renew KHQR token
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [settledReceipt]);

  // Format MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} min`;
  };

  // Format currency
  const formatMoney = (valUSD: number) => {
    if (activeCurrency === 'KHR') {
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(valUSD * NBC_RATE);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valUSD);
  };

  // Simulate Instant Settlement
  const handleSimulatePayment = () => {
    const receipt = {
      receiptNo: `REC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      txRef: `BK-${Math.floor(88230 + Math.random() * 1000)}`,
      loanId: 'LN-2026-6042',
      facilityName: 'Personal Loan',
      installmentNo: repaymentOption === 'NEXT' ? initialInstallmentNo : undefined,
      amountUSD: currentPayAmountUSD,
      amountKHR: currentPayAmountKHR,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      merchant: 'JAM SONG VICH LMS',
      clearingBank: 'ACLEDA Bank Plc.',
      settlementChannel: 'Bakong KHQR Dual-Currency',
      remainingBalanceUSD: Math.max(0, fullBalanceAmount - currentPayAmountUSD),
    };

    setSettledReceipt(receipt);
    setIsListening(false);
    onPaymentSettled?.(receipt);
  };

  // Success view when settled
  if (settledReceipt) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 sm:p-10 shadow-xl relative overflow-hidden text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            ● BAKONG KHQR INSTANT SETTLEMENT CONFIRMED
          </span>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            Installment Successfully Settle
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-1 leading-relaxed">
            Payment has been cleared via the National Bank of Cambodia Bakong network. Your facility balance has been updated.
          </p>

          {/* Receipt Breakdown Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 max-w-lg mx-auto my-6 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans">Receipt Number</span>
              <span className="text-white font-bold">{settledReceipt.receiptNo}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans">Bakong Tx Reference</span>
              <span className="text-emerald-400 font-bold">{settledReceipt.txRef}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans">Loan Facility Account</span>
              <span className="text-white font-bold">LN-2026-6042</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans">Timestamp</span>
              <span className="text-slate-300">{settledReceipt.timestamp}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-sans">Receiving Merchant</span>
              <span className="text-slate-200">JAM SONG VICH LMS (ACLEDA Bank Plc.)</span>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-white font-bold text-sm">
              <span className="font-sans">Settled Amount</span>
              <span className="text-emerald-400">
                ${settledReceipt.amountUSD.toFixed(2)} (៛ {settledReceipt.amountKHR.toLocaleString()})
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 pt-1">
              <span className="font-sans">New Outstanding Balance</span>
              <span className="text-slate-200 font-bold">${settledReceipt.remainingBalanceUSD.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Official Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('borrower_dashboard')}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              Return to My Loans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span className="text-slate-500 font-medium">Core Banking</span>
              <span>/</span>
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                {isKhmer ? 'បង់រំលស់ប្រាក់កម្ចី' : 'Pay Installment'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isKhmer ? 'បង់ប្រាក់រំលស់តាម KHQR' : 'Settle Loan Installment'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                LN-2026-6042 • Personal Loan
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Zero-fee instant repayment using any supported Cambodian Mobile Banking App (Bakong, ACLEDA, ABA, Wing, Canadia).
            </p>
          </div>

          {/* Dual-Currency Toggle Box */}
          <div className="flex items-center gap-2 self-start lg:self-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider font-mono">
              Display Currency:
            </span>
            <button
              type="button"
              onClick={() => setActiveCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCurrency === 'USD'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setActiveCurrency('KHR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCurrency === 'KHR'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KHR (៛)
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Repayment Selector (7 Cols) + Live KHQR Container (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Repayment Options & Prepayment Calculator */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Select Settlement Amount
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose to settle your regular monthly cycle, accelerate principal payoff, or clear the balance.
              </p>
            </div>

            {/* Repayment Option Radio Cards */}
            <div className="space-y-3">
              {/* Option A: Next Due Installment */}
              <div
                onClick={() => setRepaymentOption('NEXT')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  repaymentOption === 'NEXT'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      repaymentOption === 'NEXT' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {repaymentOption === 'NEXT' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-white">Pay Next Due Installment (#5)</h3>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Due 2026-09-15
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Regular monthly scheduled installment cycle</p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-base font-black text-emerald-400">${nextInstallmentAmount.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block">៛ {Math.round(nextInstallmentAmount * NBC_RATE).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Option B: Pay Off Full Balance */}
              <div
                onClick={() => setRepaymentOption('FULL')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  repaymentOption === 'FULL'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      repaymentOption === 'FULL' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {repaymentOption === 'FULL' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-white">Pay Off Full Outstanding Balance</h3>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Zero Penalty
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Settle all 8 remaining principal cycles and close facility</p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-base font-black text-white">${fullBalanceAmount.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block">៛ {Math.round(fullBalanceAmount * NBC_RATE).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Option C: Custom Principal Prepayment */}
              <div
                onClick={() => setRepaymentOption('CUSTOM')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  repaymentOption === 'CUSTOM'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      repaymentOption === 'CUSTOM' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {repaymentOption === 'CUSTOM' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Custom Principal Prepayment</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Directly curtail principal to reduce future interest charges</p>
                    </div>
                  </div>
                </div>

                {repaymentOption === 'CUSTOM' && (
                  <div className="pl-7 space-y-3 pt-2 border-t border-slate-850">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold font-mono">$</div>
                        <input
                          type="number"
                          min={50}
                          max={fullBalanceAmount}
                          step={25}
                          value={customAmountUSD}
                          onChange={(e) => setCustomAmountUSD(Math.min(fullBalanceAmount, Math.max(10, parseFloat(e.target.value) || 0)))}
                          className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 min-w-[140px] text-right">
                        ៛ {Math.round(customAmountUSD * NBC_RATE).toLocaleString()}
                      </div>
                    </div>

                    {/* Real-time Balance Reduction Preview */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-sans">Projected Balance After Payment:</span>
                      <span className="text-emerald-400 font-bold">
                        ${(fullBalanceAmount - customAmountUSD).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NBC Dual-Currency Conversion Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  National Bank of Cambodia Reference Rate
                </span>
                <span className="font-mono text-slate-400 text-[11px] font-semibold">1 USD = 4,080 KHR</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Repayments made in either USD or Khmer Riel (KHR) are automatically reconciled to your facility ledger with zero foreign exchange fees.
              </p>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: LIVE BAKONG KHQR CONTAINER (EMVCo Clean White Canvas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            {/* Widget Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-600 text-white flex items-center justify-center font-black text-[9px]">
                  KH
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Bakong KHQR Terminal
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                EMVCo Compliant
              </span>
            </div>

            {/* Clean White Canvas Rendering Official QR Code with Centered Bakong Badge */}
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center relative group">
              <div className="relative w-56 h-56 bg-white p-2 border-2 border-slate-200 rounded-xl flex items-center justify-center shadow-inner">
                {/* Simulated EMVCo High-Density QR Pattern */}
                <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                  {/* Outer Frame & Finder Patterns */}
                  <rect x="5" y="5" width="22" height="22" fill="#0f172a" rx="2" />
                  <rect x="8" y="8" width="16" height="16" fill="#ffffff" rx="1" />
                  <rect x="11" y="11" width="10" height="10" fill="#0f172a" rx="1" />

                  <rect x="73" y="5" width="22" height="22" fill="#0f172a" rx="2" />
                  <rect x="76" y="8" width="16" height="16" fill="#ffffff" rx="1" />
                  <rect x="79" y="11" width="10" height="10" fill="#0f172a" rx="1" />

                  <rect x="5" y="73" width="22" height="22" fill="#0f172a" rx="2" />
                  <rect x="8" y="76" width="16" height="16" fill="#ffffff" rx="1" />
                  <rect x="11" y="79" width="10" height="10" fill="#0f172a" rx="1" />

                  {/* QR Data Matrix Dots */}
                  <circle cx="35" cy="15" r="2.5" />
                  <circle cx="45" cy="15" r="2.5" />
                  <circle cx="55" cy="15" r="2.5" />
                  <circle cx="65" cy="15" r="2.5" />

                  <circle cx="15" cy="35" r="2.5" />
                  <circle cx="25" cy="35" r="2.5" />
                  <circle cx="35" cy="35" r="2.5" />
                  <circle cx="65" cy="35" r="2.5" />
                  <circle cx="75" cy="35" r="2.5" />
                  <circle cx="85" cy="35" r="2.5" />

                  <circle cx="15" cy="45" r="2.5" />
                  <circle cx="25" cy="45" r="2.5" />
                  <circle cx="75" cy="45" r="2.5" />
                  <circle cx="85" cy="45" r="2.5" />

                  <circle cx="15" cy="55" r="2.5" />
                  <circle cx="25" cy="55" r="2.5" />
                  <circle cx="75" cy="55" r="2.5" />
                  <circle cx="85" cy="55" r="2.5" />

                  <circle cx="15" cy="65" r="2.5" />
                  <circle cx="25" cy="65" r="2.5" />
                  <circle cx="35" cy="65" r="2.5" />
                  <circle cx="65" cy="65" r="2.5" />
                  <circle cx="75" cy="65" r="2.5" />
                  <circle cx="85" cy="65" r="2.5" />

                  <circle cx="35" cy="85" r="2.5" />
                  <circle cx="45" cy="85" r="2.5" />
                  <circle cx="55" cy="85" r="2.5" />
                  <circle cx="65" cy="85" r="2.5" />
                </svg>

                {/* Centered Official Bakong Red Logo Emblem */}
                <div className="absolute w-12 h-12 rounded-xl bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white font-black text-sm select-none">
                  KH
                </div>
              </div>

              {/* Amount inside QR Badge */}
              <div className="mt-3 text-center">
                <span className="text-[11px] font-mono text-slate-500 font-semibold block uppercase tracking-wider">
                  Scan to Pay Total
                </span>
                <p className="text-xl font-mono font-black text-slate-950">
                  ${currentPayAmountUSD.toFixed(2)}
                </p>
                <p className="text-xs font-mono font-bold text-red-600">
                  ៛ {currentPayAmountKHR.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Merchant Details Strip */}
            <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Merchant</span>
                <span className="text-white font-bold">JAM SONG VICH LMS</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Receiving Bank</span>
                <span className="text-white font-bold">ACLEDA Bank Plc.</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Reference ID</span>
                <span className="text-emerald-400 font-bold">LN-2026-6042-INS05</span>
              </div>
            </div>

            {/* Dynamic Countdown Timer & Polling Listener */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-slate-300 font-mono font-semibold">
                    Valid for: <strong className="text-amber-400">{formatTimer(secondsRemaining)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSecondsRemaining(165)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                  title="Regenerate QR token"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              {/* Animated State Listener */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs text-slate-300 font-medium">
                  Listening for mobile banking settlement...
                </span>
              </div>

              {/* Deep Link Button for Mobile Viewports */}
              <a
                href={`bakong://pay?merchant=jamsongvich&amount=${currentPayAmountUSD}&currency=USD`}
                className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>Open in Bakong App</span>
              </a>

              {/* Instant Simulation Action for Demo / E2E Verification */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simulate Bank Confirmation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowerPayInstallmentView;
