import React, { useState, useMemo } from 'react';
import {
  Search,
  Banknote,
  QrCode,
  Building,
  Printer,
  CheckCircle2,
  DollarSign,
  Coins,
  ArrowRight,
  Calculator
} from 'lucide-react';
import { MOCK_LOANS } from '../data/mockData';
import { ReceiptModal } from './ReceiptModal';

export const CashierView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('LN-2026-0042');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'KHQR' | 'Bank Transfer'>('Cash');
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>('500');
  const [generatedReceipt, setGeneratedReceipt] = useState<any | null>(null);

  // Matched Loan Facility
  const matchedLoan = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return MOCK_LOANS[0];
    return (
      MOCK_LOANS.find(
        (l) =>
          (l.loanCode || '').toLowerCase().includes(q) ||
          (l.borrowerName || '').toLowerCase().includes(q)
      ) || MOCK_LOANS[0]
    );
  }, [searchQuery]);

  const dueAmount = 450.0;
  const tenderedAmount = parseFloat(amountTenderedStr) || 0;
  const changeDue = Math.max(0, tenderedAmount - dueAmount);

  const handleProcessCollection = () => {
    const receipt = {
      receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
      loanCode: matchedLoan?.loanCode || 'LN-2026-0042',
      borrowerName: matchedLoan?.borrowerName || 'Sokha Chan',
      amountPaid: dueAmount,
      currency,
      method: paymentMethod,
      principalPortion: dueAmount * 0.85,
      interestPortion: dueAmount * 0.15,
      cashierName: 'Sophea Pich',
      paymentDate: new Date().toLocaleString()
    };
    setGeneratedReceipt(receipt);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-slate-100 space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Cashier Collection & Repayment Terminal
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          POS repayment processing, currency change calculator, and 80mm thermal receipts
        </p>
      </div>

      {/* 1. Fast Search Bar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Fast search by Loan ID (e.g. LN-2026-0042) or borrower phone..."
          className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-slate-500 font-mono"
        />
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-mono">
          Enter or type to match
        </span>
      </div>

      {/* 2. Collection Layout (Loan Summary + Cashier POS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Matched Account Details */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Matched Facility
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              ACTIVE
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {matchedLoan?.borrowerName || 'Sokha Chan'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Account: {matchedLoan?.loanCode || 'LN-2026-0042'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Installment Due:</span>
              <span className="text-white font-mono font-bold">Installment #4</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Maturity Date:</span>
              <span className="text-white font-mono">2026-11-15</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span className="font-bold text-white">Total Payable Now:</span>
              <span className="font-mono font-black text-emerald-400 text-base">
                ${dueAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Cashier POS Register */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Payment Method & Currency</span>
            {/* Currency Toggle */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 rounded-lg transition ${
                  currency === 'USD'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('KHR')}
                className={`px-3 py-1 rounded-lg transition ${
                  currency === 'KHR'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ៛ KHR
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Cash', icon: Banknote },
              { id: 'KHQR', icon: QrCode },
              { id: 'Bank Transfer', icon: Building }
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-xs font-bold ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.id}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Change Calculator */}
          {paymentMethod === 'Cash' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  Cash Change Calculator
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Amount Tendered ({currency})
                  </label>
                  <input
                    type="number"
                    value={amountTenderedStr}
                    onChange={(e) => setAmountTenderedStr(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Change Due</label>
                  <div className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono font-bold text-amber-400">
                    ${changeDue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Process Collection Action */}
          <button
            onClick={handleProcessCollection}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Record Payment & Print 80mm Receipt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 80mm Thermal Receipt Modal */}
      {generatedReceipt && (
        <ReceiptModal
          receipt={generatedReceipt}
          onClose={() => setGeneratedReceipt(null)}
        />
      )}
    </div>
  );
};

export default CashierView;
