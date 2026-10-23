import React, { useState } from 'react';
import {
  Search,
  QrCode,
  DollarSign,
  Building2,
  Printer,
  CheckCircle2,
  X,
  CreditCard,
  ShieldCheck,
  Receipt,
  User,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { StatusBadge } from '../common/StatusBadge';

export type PaymentMethod = 'Cash' | 'Bakong KHQR' | 'Bank Transfer';

export interface CashierTerminalProps {
  onPaymentSuccess?: (receiptData: any) => void;
}

export const CashierTerminal: React.FC<CashierTerminalProps> = ({
  onPaymentSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState({
    id: 'b-101',
    nameEn: 'Sokha Chan',
    nameKh: 'ចាន់ សុខា',
    nationalId: '010892743',
    phone: '012 345 678',
    loanCode: 'LN-BKK-0081',
    nextDueDate: '2026-10-24',
    isOverdue: false,
    overduePenaltyUSD: 0,
    minimumDueUSD: 459.50,
    principalDueUSD: 396.12,
    interestDueUSD: 63.38,
    remainingBalanceUSD: 3420.50
  });

  const [paymentAmount, setPaymentAmount] = useState<number>(459.50);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  const handleConfirmRepayment = () => {
    const receipt = {
      receiptNo: `RCT-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString(),
      loanCode: selectedBorrower.loanCode,
      borrowerName: `${selectedBorrower.nameEn} (${selectedBorrower.nameKh})`,
      borrowerId: selectedBorrower.nationalId,
      amountPaidUSD: paymentAmount,
      principalPaidUSD: selectedBorrower.principalDueUSD,
      interestPaidUSD: selectedBorrower.interestDueUSD,
      remainingBalanceUSD: Math.max(0, selectedBorrower.remainingBalanceUSD - selectedBorrower.principalDueUSD),
      paymentMethod,
      cashierName: 'Teller Sophea'
    };

    setActiveReceipt(receipt);
    setIsReceiptOpen(true);
    onPaymentSuccess?.(receipt);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-modal, #thermal-receipt-modal * {
            visibility: visible;
          }
          #thermal-receipt-modal {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          Cashier POS & Repayment Collection
        </h1>
        <p className="text-xs text-slate-400">
          Fast borrower lookup, dynamic Bakong KHQR settlement, and thermal receipts.
        </p>
      </div>

      {/* BORROWER LOOKUP BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Borrower Lookup Bar (ស្វែងរកអតិថិជនតាមលេខទូរស័ព្ទ ឬ អត្តសញ្ញាណប័ណ្ណ)
        </label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Scan barcode or type Phone / National ID (e.g. 012 345 678)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>
      </div>

      {/* PAYMENT FORM PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Borrower & Installment Dues Info */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              {selectedBorrower.nameEn.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{selectedBorrower.nameEn}</h3>
              <p className="text-xs text-emerald-400">{selectedBorrower.nameKh}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Loan Reference:</span>
              <span className="font-mono font-bold text-emerald-400">{selectedBorrower.loanCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Due Date:</span>
              <span className="font-semibold text-white">{selectedBorrower.nextDueDate}</span>
            </div>
            {selectedBorrower.isOverdue && (
              <div className="flex justify-between text-rose-400">
                <span>Overdue Penalty:</span>
                <span className="font-mono font-bold">${selectedBorrower.overduePenaltyUSD}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-white">
              <span>Minimum Due:</span>
              <span className="font-mono text-emerald-400">
                <CurrencyDisplay amount={selectedBorrower.minimumDueUSD} />
              </span>
            </div>
          </div>
        </div>

        {/* Repayment Collector & Methods */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Collected Amount ($ USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-400 text-lg">$</span>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Payment Method Radio Buttons */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Payment Method (វិធីសាស្ត្រទូទាត់)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Cash', 'Bakong KHQR', 'Bank Transfer'] as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    paymentMethod === method
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {method === 'Cash' && <DollarSign className="w-5 h-5" />}
                  {method === 'Bakong KHQR' && <QrCode className="w-5 h-5 text-rose-400" />}
                  {method === 'Bank Transfer' && <Building2 className="w-5 h-5 text-cyan-400" />}
                  <span className="text-xs">{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* If Bakong KHQR selected: Render clean QR code with animated pulse */}
          {paymentMethod === 'Bakong KHQR' && (
            <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-5 text-center space-y-3">
              <div className="inline-block p-3 bg-white rounded-xl shadow-lg relative">
                <div className="w-32 h-32 bg-rose-50 border-2 border-rose-600 rounded-lg flex flex-col items-center justify-center text-rose-700 p-2">
                  <QrCode className="w-16 h-16" />
                  <span className="text-[10px] font-bold tracking-tight mt-1">KHQR BAKONG</span>
                </div>
                {/* Checking pulse animation */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-rose-300">Scan to settle with any Mobile Banking App</p>
                <p className="text-[11px] text-slate-400">Auto-detecting KHQR incoming transaction...</p>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmRepayment}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/40 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Repayment & Print Receipt</span>
          </button>
        </div>
      </div>

      {/* THERMAL RECEIPT / INVOICE MODAL */}
      {isReceiptOpen && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full space-y-4">
            {/* Action Bar (no-print) */}
            <div className="flex items-center justify-between no-print px-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Payment Approved
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow hover:bg-emerald-400 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setIsReceiptOpen(false)}
                  className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt Card */}
            <div
              id="thermal-receipt-modal"
              className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-300 text-xs font-sans"
            >
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                <h2 className="text-base font-black tracking-wider text-slate-950">
                  JAM SONG VICH
                </h2>
                <p className="text-[11px] text-slate-600">Official Loan Repayment Slip</p>
                <p className="text-[10px] text-slate-500">Phnom Penh, Cambodia</p>
              </div>

              <div className="py-2.5 space-y-1 border-b border-dashed border-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Receipt Ref:</span>
                  <span className="font-mono font-bold">{activeReceipt.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date:</span>
                  <span>{activeReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Loan ID:</span>
                  <span className="font-mono font-bold">{activeReceipt.loanCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Borrower:</span>
                  <span className="font-bold">{activeReceipt.borrowerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Method:</span>
                  <span className="font-bold">{activeReceipt.paymentMethod}</span>
                </div>
              </div>

              <div className="py-2.5 space-y-1.5 border-b-2 border-slate-900 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Principal Paid:</span>
                  <span className="font-mono">${activeReceipt.principalPaidUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Interest Paid:</span>
                  <span className="font-mono">${activeReceipt.interestPaidUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
                  <span className="font-bold uppercase">Total Paid:</span>
                  <span className="text-base font-black">${activeReceipt.amountPaidUSD.toFixed(2)}</span>
                </div>
              </div>

              <div className="py-2 bg-slate-50 -mx-6 px-6 border-b border-dashed border-slate-400 flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-700">Remaining Balance:</span>
                <span className="font-black">${activeReceipt.remainingBalanceUSD.toFixed(2)}</span>
              </div>

              <div className="pt-4 text-center text-[10px] text-slate-500">
                <span>Cashier: {activeReceipt.cashierName}</span>
                <p className="mt-1">Thank you for your repayment!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierTerminal;
