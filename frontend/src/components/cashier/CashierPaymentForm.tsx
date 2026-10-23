import React, { useState, useMemo } from 'react';
import {
  Wallet,
  DollarSign,
  Coins,
  QrCode,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Calculator,
  ShieldAlert,
  X,
  CreditCard
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { ConfirmModal } from '../common/ConfirmModal';
import { Currency } from '../../types';

export interface CashierPaymentFormProps {
  loanDetails?: {
    loanCode: string;
    borrowerName: string;
    borrowerPhone: string;
    currency: Currency;
    totalDueUSD: number;
    interestDueUSD: number;
    remainingPrincipalUSD: number;
  };
  onPaymentSubmitted?: (paymentData: any) => void;
}

export const CashierPaymentForm: React.FC<CashierPaymentFormProps> = ({
  loanDetails = {
    loanCode: 'LN-BKK-0081',
    borrowerName: 'Sokha Chan (ចាន់ សុខា)',
    borrowerPhone: '012 345 678',
    currency: 'USD',
    totalDueUSD: 459.50,
    interestDueUSD: 63.38,
    remainingPrincipalUSD: 3420.50
  },
  onPaymentSubmitted
}) => {
  const EXCHANGE_RATE = 4100; // 1 USD = 4,100 KHR

  // Currency of payment received
  const [tenderCurrency, setTenderCurrency] = useState<'USD' | 'KHR'>('USD');
  const [totalPaymentTargetUSD, setTotalPaymentTargetUSD] = useState<number>(loanDetails.totalDueUSD);

  // Split payment amounts
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [cashAmountUSD, setCashAmountUSD] = useState<number>(loanDetails.totalDueUSD);
  const [khqrAmountUSD, setKhqrAmountUSD] = useState<number>(0);
  const [bankAmountUSD, setBankAmountUSD] = useState<number>(0);

  // Cash change due calculator
  const [cashTendered, setCashTendered] = useState<number>(500);

  // Real-time currency exchange converter tool
  const [khrInputForConverter, setKhrInputForConverter] = useState<number>(2000000);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize when split toggle changes
  const handleSplitToggle = (enabled: boolean) => {
    setIsSplitPayment(enabled);
    if (!enabled) {
      setCashAmountUSD(totalPaymentTargetUSD);
      setKhqrAmountUSD(0);
      setBankAmountUSD(0);
    } else {
      // Half and half split default
      const half = Math.round((totalPaymentTargetUSD / 2) * 100) / 100;
      setCashAmountUSD(half);
      setKhqrAmountUSD(Math.round((totalPaymentTargetUSD - half) * 100) / 100);
      setBankAmountUSD(0);
    }
  };

  // Sum of split allocations
  const splitTotalUSD = useMemo(() => {
    if (!isSplitPayment) return totalPaymentTargetUSD;
    return Math.round((cashAmountUSD + khqrAmountUSD + bankAmountUSD) * 100) / 100;
  }, [isSplitPayment, totalPaymentTargetUSD, cashAmountUSD, khqrAmountUSD, bankAmountUSD]);

  // Cash Change Due
  const cashChangeDue = useMemo(() => {
    const cashRequired = isSplitPayment ? cashAmountUSD : totalPaymentTargetUSD;
    if (tenderCurrency === 'USD') {
      return Math.max(0, cashTendered - cashRequired);
    } else {
      // Tendered in KHR
      const khrRequired = cashRequired * EXCHANGE_RATE;
      return Math.max(0, cashTendered - khrRequired);
    }
  }, [tenderCurrency, cashTendered, cashAmountUSD, totalPaymentTargetUSD, isSplitPayment]);

  // Presets
  const applyPreset = (type: 'exact' | 'min_interest' | 'full_payoff') => {
    let amt = loanDetails.totalDueUSD;
    if (type === 'min_interest') {
      amt = loanDetails.interestDueUSD;
    } else if (type === 'full_payoff') {
      amt = loanDetails.remainingPrincipalUSD + loanDetails.interestDueUSD;
    }

    setTotalPaymentTargetUSD(amt);
    if (!isSplitPayment) {
      setCashAmountUSD(amt);
      setCashTendered(Math.ceil(amt / 10) * 10);
    } else {
      const half = Math.round((amt / 2) * 100) / 100;
      setCashAmountUSD(half);
      setKhqrAmountUSD(Math.round((amt - half) * 100) / 100);
    }
  };

  const handleValidateAndOpenConfirm = () => {
    setErrorMessage(null);
    if (isSplitPayment && Math.abs(splitTotalUSD - totalPaymentTargetUSD) > 0.01) {
      setErrorMessage(`Split payments ($${splitTotalUSD.toFixed(2)}) must exactly equal target total ($${totalPaymentTargetUSD.toFixed(2)}).`);
      return;
    }
    if (totalPaymentTargetUSD <= 0) {
      setErrorMessage('Payment amount must be greater than zero.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecutePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowConfirmModal(false);
      onPaymentSubmitted?.({
        loanCode: loanDetails.loanCode,
        borrowerName: loanDetails.borrowerName,
        totalUSD: totalPaymentTargetUSD,
        isSplit: isSplitPayment,
        splits: isSplitPayment ? { cash: cashAmountUSD, khqr: khqrAmountUSD, bank: bankAmountUSD } : { cash: totalPaymentTargetUSD },
        changeReturned: cashChangeDue,
        tenderCurrency
      });
      alert('Payment Transaction Settled & Confirmed Successfully!');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-400" />
          Cashier POS: Split & Multi-Currency Processing
        </h1>
        <p className="text-xs text-slate-400">
          Support mixed-method settlements (Cash + Bakong KHQR) and dual-currency KHR/USD conversions.
        </p>
      </div>

      {/* Loan & Account Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">{loanDetails.loanCode}</span>
          <h2 className="text-lg font-bold text-white">{loanDetails.borrowerName}</h2>
          <p className="text-xs text-slate-400">{loanDetails.borrowerPhone}</p>
        </div>

        <div className="flex items-center gap-6 text-right text-xs">
          <div>
            <span className="text-slate-500 block">Scheduled Installment</span>
            <span className="text-base font-black text-white font-mono">
              <CurrencyDisplay amount={loanDetails.totalDueUSD} currency="USD" />
            </span>
            <span className="text-[10px] text-amber-400 font-mono block">
              <CurrencyDisplay amount={loanDetails.totalDueUSD * EXCHANGE_RATE} currency="KHR" />
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Remaining Principal</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              <CurrencyDisplay amount={loanDetails.remainingPrincipalUSD} currency="USD" />
            </span>
          </div>
        </div>
      </div>

      {/* QUICK PRESET BUTTONS */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <button
          type="button"
          onClick={() => applyPreset('exact')}
          className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-850 text-white font-bold transition flex flex-col items-center gap-1 shadow-sm"
        >
          <span className="text-emerald-400 font-black">Pay Exactly Due</span>
          <span className="text-slate-400 font-mono">${loanDetails.totalDueUSD.toFixed(2)}</span>
        </button>

        <button
          type="button"
          onClick={() => applyPreset('min_interest')}
          className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-850 text-white font-bold transition flex flex-col items-center gap-1 shadow-sm"
        >
          <span className="text-amber-400 font-black">Pay Minimum Interest</span>
          <span className="text-slate-400 font-mono">${loanDetails.interestDueUSD.toFixed(2)}</span>
        </button>

        <button
          type="button"
          onClick={() => applyPreset('full_payoff')}
          className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-850 text-white font-bold transition flex flex-col items-center gap-1 shadow-sm"
        >
          <span className="text-cyan-400 font-black">Full Payoff</span>
          <span className="text-slate-400 font-mono">${(loanDetails.remainingPrincipalUSD + loanDetails.interestDueUSD).toFixed(2)}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Payment Configuration & Split Methods */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Total Amount Target */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Target Payment Amount ($ USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={totalPaymentTargetUSD}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setTotalPaymentTargetUSD(val);
                if (!isSplitPayment) setCashAmountUSD(val);
              }}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-black text-xl font-mono focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Split Payment Toggle */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Split Payment (Multi-Method)</span>
              <span className="text-[11px] text-slate-400">Accept combined Cash + Bakong KHQR in a single transaction</span>
            </div>
            <button
              type="button"
              onClick={() => handleSplitToggle(!isSplitPayment)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                isSplitPayment ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isSplitPayment ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Split Fields if enabled */}
          {isSplitPayment ? (
            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <span className="font-bold text-emerald-400 block uppercase tracking-wider text-[11px]">
                Allocate Mixed Methods ($ USD)
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Cash
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashAmountUSD}
                    onChange={(e) => setCashAmountUSD(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-rose-400" /> Bakong KHQR
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={khqrAmountUSD}
                    onChange={(e) => setKhqrAmountUSD(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Bank Transfer
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankAmountUSD}
                    onChange={(e) => setBankAmountUSD(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-400">Sum of Splits:</span>
                <span className={`font-mono font-bold ${
                  Math.abs(splitTotalUSD - totalPaymentTargetUSD) < 0.01 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ${splitTotalUSD.toFixed(2)} / ${totalPaymentTargetUSD.toFixed(2)}
                </span>
              </div>
            </div>
          ) : null}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tendered & Cash Change Calculator */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-wider">Cash Tendered & Change Return</span>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setTenderCurrency('USD')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tenderCurrency === 'USD' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setTenderCurrency('KHR')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tenderCurrency === 'KHR' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  ៛ KHR
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Cash Received ({tenderCurrency})
                </label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Change Due to Borrower
                </label>
                <div className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-black text-base">
                  {tenderCurrency === 'USD' ? `$${cashChangeDue.toFixed(2)}` : `៛${Math.round(cashChangeDue).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            onClick={handleValidateAndOpenConfirm}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/40 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Process Payment (${totalPaymentTargetUSD.toFixed(2)})</span>
          </button>
        </div>

        {/* RIGHT COLUMN: Real-Time Currency Exchange Calculator Tool */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Real-Time Exchange Rate Calculator
              </h3>
            </div>

            <div className="text-[11px] p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 flex justify-between">
              <span>Official Pegged Rate:</span>
              <span className="font-mono font-bold text-amber-400">1 USD = 4,100 KHR</span>
            </div>

            {/* Quick Converter Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Received in Riel (៛ KHR)</label>
                <input
                  type="number"
                  step="1000"
                  value={khrInputForConverter}
                  onChange={(e) => setKhrInputForConverter(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-1">Equivalent Credited in USD</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  ${(khrInputForConverter / EXCHANGE_RATE).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION POPUP MODAL (Safety Duplicate Prevention) */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirm Loan Repayment Transaction"
        message={`Are you sure you want to collect and post this payment for ${loanDetails.borrowerName}?`}
        confirmLabel="Confirm & Post Payment"
        variant="success"
        isLoading={isProcessing}
        onConfirm={handleExecutePayment}
        onCancel={() => setShowConfirmModal(false)}
      >
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-slate-300">
            <span>Loan Account:</span>
            <span className="font-bold text-white">{loanDetails.loanCode}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Amount:</span>
            <span className="font-bold text-emerald-400">${totalPaymentTargetUSD.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Method:</span>
            <span className="text-amber-400">{isSplitPayment ? 'Split (Cash + KHQR)' : 'Single Method'}</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default CashierPaymentForm;
