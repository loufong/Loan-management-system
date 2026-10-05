import React, { useState, useMemo } from 'react';
import { LoanAccount, PaymentReceipt, Currency, PaymentMethod } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { QRCodePaymentModal } from './QRCodePaymentModal';
import {
  Search,
  DollarSign,
  Printer,
  QrCode,
  CreditCard,
  Building,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User
} from 'lucide-react';

export interface CashierPaymentTerminalProps {
  loans: LoanAccount[];
  receipts: PaymentReceipt[];
  currency: Currency;
  cashierName: string;
  onRecordPayment: (payment: PaymentReceipt) => void;
  initialSelectedLoanId?: string;
}

export const CashierPaymentTerminal: React.FC<CashierPaymentTerminalProps> = ({
  loans,
  receipts,
  currency,
  cashierName,
  onRecordPayment,
  initialSelectedLoanId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    initialSelectedLoanId || loans[0]?.id || ''
  );

  const selectedLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];

  // Payment Form Configuration State
  const defaultDue = selectedLoan?.nextPaymentDueAmountUSD || 466.67;
  const [paymentAmount, setPaymentAmount] = useState<number>(defaultDue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dynamic QR Code');
  const [transactionRef, setTransactionRef] = useState(`TRX-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('');

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState<PaymentReceipt | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Search Autocomplete filtering
  const matchingLoans = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return loans.filter(
      (l) =>
        l.loanNumber.toLowerCase().includes(q) ||
        l.borrowerName.toLowerCase().includes(q) ||
        l.borrowerPhone.includes(searchQuery)
    );
  }, [searchQuery, loans]);

  // Calculate overdue amount
  const overdueAmount = selectedLoan?.daysOverdue
    ? selectedLoan.nextPaymentDueAmountUSD + (selectedLoan.lateFeeAccruedUSD || 60.8)
    : 0;

  // 1-Click Presets handlers
  const handlePreset = (type: 'EXACT' | 'TWO_INSTALLMENTS' | 'PAYOFF') => {
    if (!selectedLoan) return;
    if (type === 'EXACT') {
      setPaymentAmount(selectedLoan.nextPaymentDueAmountUSD);
    } else if (type === 'TWO_INSTALLMENTS') {
      setPaymentAmount(Math.round((selectedLoan.nextPaymentDueAmountUSD * 2) * 100) / 100);
    } else if (type === 'PAYOFF') {
      setPaymentAmount(selectedLoan.outstandingBalanceUSD);
    }
  };

  const handleConfirmAndPrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (paymentAmount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const receiptNo = `REC-${currentYear}-0982`;
    const interestPart = Math.round(Math.min(paymentAmount * 0.12, 45.0) * 100) / 100;
    const principalPart = Math.round((paymentAmount - interestPart) * 100) / 100;
    const remainingAfter = Math.max(0, Math.round((selectedLoan.outstandingBalanceUSD - paymentAmount) * 100) / 100);

    const newReceipt: PaymentReceipt = {
      receiptNo,
      loanNumber: selectedLoan.loanNumber,
      borrowerId: selectedLoan.borrowerId,
      borrowerName: selectedLoan.borrowerName,
      installmentNo: selectedLoan.schedules[0]?.installmentNo || 1,
      amountPaidUSD: paymentAmount,
      amountPaidKHR: Math.round(paymentAmount * 4100),
      paymentMethod,
      transactionRef: transactionRef.trim() || `TRX-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      cashierName,
      principalAllocatedUSD: principalPart,
      interestAllocatedUSD: interestPart,
      lateFeeAllocatedUSD: selectedLoan.lateFeeAccruedUSD || 0,
      outstandingBalanceAfterUSD: remainingAfter,
      notes: notes || 'Front desk installment collection settled.',
    };

    onRecordPayment(newReceipt);
    setShowReceiptModal(newReceipt);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Cashier Desk &amp; Payment Collection Terminal
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Terminal Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cashier window session: <strong className="text-slate-800">{cashierName}</strong> • Real-time settlement &amp; Thermal POS slip printing.
          </p>
        </div>
      </div>

      {/* 2. Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Autocomplete Search & Snapshot Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Quick Autocomplete Search */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Account Lookup
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Loan #, Borrower Name, or Phone..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Autocomplete Dropdown List */}
            {matchingLoans.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white shadow-md">
                {matchingLoans.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedLoanId(l.id);
                      setPaymentAmount(l.nextPaymentDueAmountUSD);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-indigo-50/60 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{l.borrowerName}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{l.loanNumber} • {l.borrowerPhone}</span>
                    </div>
                    <MoneyText amount={l.outstandingBalanceUSD} currency={currency} className="font-semibold text-indigo-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account Snapshot Card */}
          {selectedLoan ? (
            <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Loan Snapshot
                </span>
                <Badge
                  variant={
                    selectedLoan.status === 'ACTIVE'
                      ? 'active'
                      : selectedLoan.status === 'OVERDUE'
                      ? 'overdue'
                      : 'closed'
                  }
                  dot
                >
                  {selectedLoan.status}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shrink-0">
                  {selectedLoan.borrowerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {selectedLoan.borrowerName}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {selectedLoan.loanNumber} • Phone: {selectedLoan.borrowerPhone}
                  </p>
                </div>
              </div>

              {/* Financial Balances */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Current Loan Balance
                  </span>
                  <MoneyText
                    amount={selectedLoan.outstandingBalanceUSD}
                    currency={currency}
                    className="text-base font-bold text-slate-900 block"
                  />
                  <span className="text-[10px] text-slate-400">Total remaining</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Overdue Amount
                  </span>
                  <MoneyText
                    amount={overdueAmount}
                    currency={currency}
                    className={`text-base font-bold block ${
                      overdueAmount > 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400">
                    {overdueAmount > 0 ? `${selectedLoan.daysOverdue} days past due` : 'Zero overdue'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100 font-mono">
                <div className="flex justify-between">
                  <span>Regular Installment:</span>
                  <MoneyText amount={selectedLoan.nextPaymentDueAmountUSD} currency={currency} className="font-semibold text-slate-800" />
                </div>
                <div className="flex justify-between">
                  <span>Next Due Date:</span>
                  <span className="text-slate-800 font-semibold">{selectedLoan.nextPaymentDueDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center text-xs text-slate-400">
              No loan selected. Use lookup above.
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Payment Collection Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleConfirmAndPrint}
            className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-6 space-y-6"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Payment Collection &amp; Settlement
              </h2>
              <p className="text-xs text-slate-500">
                Record payment, select payment channel, and issue receipt.
              </p>
            </div>

            {/* Payment Amount Input & 1-Click Presets */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-slate-700">
                  Payment Collection Amount (USD)
                </label>
                <MoneyText
                  amount={paymentAmount}
                  currency={currency}
                  className="font-mono text-lg font-black text-indigo-600"
                />
              </div>

              <input
                type="number"
                step={0.01}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              {/* 1-Click Presets */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePreset('EXACT')}
                  className="p-2 text-xs rounded-lg border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 text-slate-700 transition-colors text-center"
                >
                  <span className="block text-[10px] text-slate-400">Exact Installment</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${selectedLoan ? selectedLoan.nextPaymentDueAmountUSD.toFixed(2) : '466.67'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreset('TWO_INSTALLMENTS')}
                  className="p-2 text-xs rounded-lg border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 text-slate-700 transition-colors text-center"
                >
                  <span className="block text-[10px] text-slate-400">Pay 2 Installments</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${selectedLoan ? (selectedLoan.nextPaymentDueAmountUSD * 2).toFixed(2) : '933.34'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreset('PAYOFF')}
                  className="p-2 text-xs rounded-lg border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 text-slate-700 transition-colors text-center"
                >
                  <span className="block text-[10px] text-slate-400">Full Payoff</span>
                  <span className="font-mono font-bold text-indigo-700">
                    ${selectedLoan ? selectedLoan.outstandingBalanceUSD.toFixed(2) : '5,133.33'}
                  </span>
                </button>
              </div>
            </div>

            {/* Payment Method Selector: Segmented Radio Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Payment Method Selector
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote, desc: 'Branch Teller' },
                  { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building, desc: 'ACH / Wire' },
                  { id: 'Card', label: 'Card', icon: CreditCard, desc: 'Debit / Credit' },
                  { id: 'Dynamic QR Code', label: 'KHQR / Dynamic QR', icon: QrCode, desc: 'Bakong Scan' },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600 text-indigo-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{m.label}</span>
                        <span className="text-[10px] text-slate-400 block">{m.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transaction Reference Number Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. KHQR-20260922-8812"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cashier Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Regular monthly installment paid at window"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Confirm & Print Receipt primary action button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Operator: <strong className="text-slate-800">{cashierName}</strong>
              </span>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Confirm &amp; Print Receipt</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Authentic Thermal POS Banking Receipt Modal */}
      {showReceiptModal && (
        <PaymentReceiptModal
          receipt={showReceiptModal}
          onClose={() => setShowReceiptModal(null)}
        />
      )}
    </div>
  );
};
