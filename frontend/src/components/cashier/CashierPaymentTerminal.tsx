import React, { useState, useMemo } from 'react';
import { LoanAccount, PaymentReceipt, Currency, PaymentMethod } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import {
  Search,
  Printer,
  QrCode,
  CreditCard,
  Building,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  X,
  FileSpreadsheet
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

  // Transactions Ledger State (Point 19)
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerMethodFilter, setLedgerMethodFilter] = useState('ALL');
  const [ledgerDateFilter, setLedgerDateFilter] = useState('');

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState<PaymentReceipt | null>(null);

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
    const receiptNo = `REC-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  // Filtered Ledger (Point 19)
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const q = ledgerSearch.toLowerCase();
      const matchSearch =
        !ledgerSearch ||
        r.receiptNo.toLowerCase().includes(q) ||
        r.loanNumber.toLowerCase().includes(q) ||
        r.borrowerName.toLowerCase().includes(q) ||
        r.transactionRef.toLowerCase().includes(q);

      const matchMethod =
        ledgerMethodFilter === 'ALL' || r.paymentMethod === ledgerMethodFilter;

      const matchDate =
        !ledgerDateFilter || r.paidAt.startsWith(ledgerDateFilter);

      return matchSearch && matchMethod && matchDate;
    });
  }, [receipts, ledgerSearch, ledgerMethodFilter, ledgerDateFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Cashier Desk &amp; Payment Terminal
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
              Terminal Active
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Teller window session: <strong className="text-[#0F172A]">{cashierName}</strong> • Real-time settlement &amp; official thermal banking receipts.
          </p>
        </div>
      </div>

      {/* 2. Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Autocomplete Search & Snapshot Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Autocomplete Search */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 space-y-3">
            <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Quick Account Lookup
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Loan #, Borrower Name, or Phone..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Autocomplete Dropdown List */}
            {matchingLoans.length > 0 && (
              <div className="border border-[#CBD5E1] rounded-[6px] overflow-hidden divide-y divide-[#CBD5E1] max-h-48 overflow-y-auto bg-white shadow-md">
                {matchingLoans.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedLoanId(l.id);
                      setPaymentAmount(l.nextPaymentDueAmountUSD);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#0F172A] block">{l.borrowerName}</span>
                      <span className="font-mono text-[#64748B] text-[11px]">{l.loanNumber} • {l.borrowerPhone}</span>
                    </div>
                    <MoneyText amount={l.outstandingBalanceUSD} currency={currency} className="font-semibold text-[#2563EB]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account Snapshot Card */}
          {selectedLoan ? (
            <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
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
                <div className="w-10 h-10 rounded-[6px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedLoan.borrowerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0F172A] truncate">
                    {selectedLoan.borrowerName}
                  </h3>
                  <p className="text-xs font-mono text-[#64748B]">
                    {selectedLoan.loanNumber} • {selectedLoan.borrowerPhone}
                  </p>
                </div>
              </div>

              {/* Financial Balances */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
                  <span className="text-[11px] font-semibold uppercase text-[#64748B] block">
                    Outstanding Balance
                  </span>
                  <MoneyText
                    amount={selectedLoan.outstandingBalanceUSD}
                    currency={currency}
                    className="text-base font-bold text-[#0F172A] block mt-0.5"
                  />
                  <span className="text-[11px] text-[#64748B]">Active book total</span>
                </div>

                <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
                  <span className="text-[11px] font-semibold uppercase text-[#64748B] block">
                    Overdue Amount
                  </span>
                  <MoneyText
                    amount={overdueAmount}
                    currency={currency}
                    className={`text-base font-bold block mt-0.5 ${
                      overdueAmount > 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'
                    }`}
                  />
                  <span className="text-[11px] text-[#64748B]">
                    {overdueAmount > 0 ? `${selectedLoan.daysOverdue} days past due` : 'Zero overdue'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#64748B] space-y-1 pt-2 border-t border-[#CBD5E1] font-mono">
                <div className="flex justify-between">
                  <span>Regular Installment:</span>
                  <MoneyText amount={selectedLoan.nextPaymentDueAmountUSD} currency={currency} className="font-semibold text-[#0F172A]" />
                </div>
                <div className="flex justify-between">
                  <span>Next Due Date:</span>
                  <span className="text-[#0F172A] font-semibold">{selectedLoan.nextPaymentDueDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-8 text-center text-xs text-[#64748B]">
              No loan selected. Use lookup above.
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Payment Collection Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleConfirmAndPrint}
            className="bg-white border border-[#CBD5E1] rounded-[8px] p-6 space-y-5"
          >
            <div className="pb-3 border-b border-[#CBD5E1]">
              <h2 className="text-base font-bold text-[#0F172A]">
                Payment Collection &amp; Settlement
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Record customer installment, select payment channel, and generate verifiable receipt.
              </p>
            </div>

            {/* Payment Amount Input & 1-Click Presets */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Payment Collection Amount (USD)
                </label>
                <MoneyText
                  amount={paymentAmount}
                  currency={currency}
                  className="font-mono text-lg font-bold text-[#2563EB]"
                />
              </div>

              <input
                type="number"
                step={0.01}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full h-11 px-3.5 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-base font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />

              {/* 1-Click Presets */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePreset('EXACT')}
                  className="p-2 text-xs rounded-[6px] border border-[#CBD5E1] hover:border-[#2563EB] bg-slate-50 hover:bg-blue-50/50 text-[#0F172A] transition-colors text-center cursor-pointer"
                >
                  <span className="block text-[11px] text-[#64748B]">Exact Installment</span>
                  <span className="font-mono font-bold text-[#0F172A]">
                    ${selectedLoan ? selectedLoan.nextPaymentDueAmountUSD.toFixed(2) : '466.67'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreset('TWO_INSTALLMENTS')}
                  className="p-2 text-xs rounded-[6px] border border-[#CBD5E1] hover:border-[#2563EB] bg-slate-50 hover:bg-blue-50/50 text-[#0F172A] transition-colors text-center cursor-pointer"
                >
                  <span className="block text-[11px] text-[#64748B]">Pay 2 Installments</span>
                  <span className="font-mono font-bold text-[#0F172A]">
                    ${selectedLoan ? (selectedLoan.nextPaymentDueAmountUSD * 2).toFixed(2) : '933.34'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreset('PAYOFF')}
                  className="p-2 text-xs rounded-[6px] border border-[#CBD5E1] hover:border-[#2563EB] bg-slate-50 hover:bg-blue-50/50 text-[#0F172A] transition-colors text-center cursor-pointer"
                >
                  <span className="block text-[11px] text-[#64748B]">Full Payoff</span>
                  <span className="font-mono font-bold text-[#2563EB]">
                    ${selectedLoan ? selectedLoan.outstandingBalanceUSD.toFixed(2) : '5,133.33'}
                  </span>
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Payment Method Selector
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote, desc: 'Branch Teller' },
                  { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building, desc: 'ACH / Wire' },
                  { id: 'Card', label: 'Card', icon: CreditCard, desc: 'Debit / Credit' },
                  { id: 'Dynamic QR Code', label: 'KHQR / QR', icon: QrCode, desc: 'Bakong Scan' },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-[6px] border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/60 text-[#0F172A]'
                          : 'border-[#CBD5E1] hover:border-slate-400 bg-white text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{m.label}</span>
                        <span className="text-[11px] text-[#64748B] block">{m.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transaction Reference & Audit Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Transaction Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. KHQR-20260922-8812"
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Cashier Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Regular monthly installment"
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Confirm & Print Receipt action */}
            <div className="pt-3 border-t border-[#CBD5E1] flex items-center justify-between">
              <span className="text-xs text-[#64748B] font-mono">
                Operator: <strong className="text-[#0F172A]">{cashierName}</strong>
              </span>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Confirm &amp; Print Receipt</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Point 19: PAYMENT MANAGEMENT (Transactions Ledger) */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Payment History &amp; Collections Ledger
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Verified transactional log of all installments, payment methods, and reference receipts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search Receipt, Loan, Borrower..."
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Method Filter */}
            <select
              value={ledgerMethodFilter}
              onChange={(e) => setLedgerMethodFilter(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Dynamic QR Code">KHQR / Dynamic QR</option>
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={ledgerDateFilter}
              onChange={(e) => setLedgerDateFilter(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th className="text-right">Amount</th>
                <th>Payment Date</th>
                <th>Payment Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#64748B]">
                    No payment records found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rec) => (
                  <tr key={rec.receiptNo || rec.transactionRef} className="hover:bg-slate-50/70 transition-colors">
                    <td className="font-mono font-bold text-[#2563EB]">
                      {rec.receiptNo}
                    </td>
                    <td className="font-mono text-[#0F172A]">
                      {rec.loanNumber}
                    </td>
                    <td className="font-medium text-[#0F172A]">
                      {rec.borrowerName}
                    </td>
                    <td className="text-right font-mono font-bold text-[#16A34A] tabular-nums">
                      <MoneyText amount={rec.amountPaidUSD} currency={currency} />
                    </td>
                    <td className="font-mono text-xs text-[#64748B]">
                      {rec.paidAt}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {rec.paymentMethod}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-[#64748B]">
                      {rec.transactionRef}
                    </td>
                    <td>
                      <span className="badge badge-success">
                        Completed
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setShowReceiptModal(rec)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default CashierPaymentTerminal;
