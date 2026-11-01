import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { LoanAccount, PaymentReceipt, Currency, PaymentMethod, UserRole } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { generateBakongKHQRString } from './BakongPaymentModal';
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
  FileSpreadsheet,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

export interface CashierPaymentTerminalProps {
  loans: LoanAccount[];
  receipts: PaymentReceipt[];
  currency: Currency;
  cashierName: string;
  currentUserRole?: UserRole;
  onRecordPayment: (payment: PaymentReceipt) => void;
  initialSelectedLoanId?: string;
}

export const CashierPaymentTerminal: React.FC<CashierPaymentTerminalProps> = ({
  loans,
  receipts,
  currency,
  cashierName,
  currentUserRole,
  onRecordPayment,
  initialSelectedLoanId,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    initialSelectedLoanId || loans[0]?.id || ''
  );

  const selectedLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];

  // Dynamic regular installment calculation (handles both new and existing facilities without float zeros)
  const regularInstallment = useMemo(() => {
    if (!selectedLoan) return 183.89;
    const fromSchedules = selectedLoan.schedules?.find((s: any) => s.status !== 'PAID')?.totalDueUSD
      || selectedLoan.schedules?.[0]?.totalDueUSD
      || (selectedLoan.schedules?.[0] as any)?.totalDue;
    const emi = Number((selectedLoan as any)?.monthlyEMIUSD || fromSchedules || selectedLoan.nextPaymentDueAmountUSD || 0);
    return emi > 0 ? emi : 183.89;
  }, [selectedLoan]);

  // Payment Form Configuration State
  const [paymentAmount, setPaymentAmount] = useState<number>(regularInstallment);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dynamic QR Code');
  const [transactionRef, setTransactionRef] = useState(`TRX-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('');

  // Bakong Dynamic KHQR Generation & Polling State
  const [bakongQrUrl, setBakongQrUrl] = useState<string | null>(null);
  const [isVerifyingBakong, setIsVerifyingBakong] = useState<boolean>(false);
  const [bakongSettledSuccess, setBakongSettledSuccess] = useState<boolean>(false);

  // Sync paymentAmount whenever selected loan or regular installment changes
  useEffect(() => {
    if (regularInstallment > 0) {
      setPaymentAmount(regularInstallment);
    }
  }, [selectedLoanId, regularInstallment]);

  // Transactions Ledger State
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
    ? regularInstallment + (selectedLoan.lateFeeAccruedUSD || 60.8)
    : 0;

  // Generate authentic EMVCo Bakong KHQR Canvas URL
  useEffect(() => {
    if (paymentMethod === 'Dynamic QR Code' && selectedLoan && paymentAmount > 0) {
      const billNumber = `BK-${(selectedLoan.loanNumber || 'LOAN').slice(-4)}-${Date.now().toString().slice(-4)}`;
      const qrString = generateBakongKHQRString({
        merchantId: 'khqr@aclb',
        merchantName: 'JAM SONG VICH LMS',
        amount: paymentAmount,
        currency: currency === 'KHR' ? 'KHR' : 'USD',
        billNumber,
      });

      QRCode.toDataURL(qrString, {
        width: 260,
        margin: 1,
        color: { dark: '#020617', light: '#FFFFFF' },
      })
        .then((url) => setBakongQrUrl(url))
        .catch(() => setBakongQrUrl(null));
    }
  }, [paymentMethod, selectedLoan, paymentAmount, currency]);

  // 1-Click Presets handlers
  const handlePreset = (type: 'EXACT' | 'TWO_INSTALLMENTS' | 'PAYOFF') => {
    if (!selectedLoan) return;
    if (type === 'EXACT') {
      setPaymentAmount(regularInstallment);
    } else if (type === 'TWO_INSTALLMENTS') {
      setPaymentAmount(Math.round((regularInstallment * 2) * 100) / 100);
    } else if (type === 'PAYOFF') {
      setPaymentAmount(selectedLoan.outstandingBalanceUSD || 2130.0);
    }
  };

  const handleSimulateBakongSettlement = () => {
    setIsVerifyingBakong(true);
    const bkRef = `BK-${Date.now().toString().slice(-8)}`;
    setTransactionRef(bkRef);
    setTimeout(() => {
      setIsVerifyingBakong(false);
      setBakongSettledSuccess(true);
      setTimeout(() => {
        setBakongSettledSuccess(false);
        finalizePaymentSubmission(bkRef);
      }, 600);
    }, 900);
  };

  const finalizePaymentSubmission = (customRef?: string) => {
    if (!selectedLoan) return;
    if (paymentAmount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const receiptNo = `REC-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const interestPart = Math.round(Math.min(paymentAmount * 0.12, 45.0) * 100) / 100;
    const principalPart = Math.round((paymentAmount - interestPart) * 100) / 100;
    const remainingAfter = Math.max(0, Math.round(((selectedLoan.outstandingBalanceUSD || paymentAmount) - paymentAmount) * 100) / 100);

    const newReceipt: PaymentReceipt = {
      receiptNo,
      loanNumber: selectedLoan.loanNumber,
      borrowerId: selectedLoan.borrowerId,
      borrowerName: selectedLoan.borrowerName,
      installmentNo: selectedLoan.schedules[0]?.installmentNo || 1,
      amountPaidUSD: paymentAmount,
      amountPaidKHR: Math.round(paymentAmount * 4080),
      paymentMethod,
      transactionRef: customRef || transactionRef.trim() || `TRX-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      cashierName,
      principalAllocatedUSD: principalPart,
      interestAllocatedUSD: interestPart,
      lateFeeAllocatedUSD: selectedLoan.lateFeeAccruedUSD || 0,
      outstandingBalanceAfterUSD: remainingAfter,
      notes: notes || (paymentMethod === 'Dynamic QR Code' ? 'Settled via Bakong KHQR dynamic gateway' : 'Front desk installment collection settled.'),
    };

    onRecordPayment(newReceipt);
    setShowReceiptModal(newReceipt);
  };

  const handleConfirmAndPrint = (e: React.FormEvent) => {
    e.preventDefault();
    finalizePaymentSubmission();
  };

  // Filtered Ledger
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
    <div className="space-y-6 font-sans text-slate-100">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {currentUserRole === 'USER' ? t('Make a Loan Payment') : t('Cashier Desk & Payment Terminal')}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {currentUserRole === 'USER' ? t('Payment Gateway Ready') : t('Terminal Active')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {currentUserRole === 'USER' ? (
              t('Pay your monthly loan installment with real-time settlement and instant verified digital receipts.', 'Pay your monthly loan installment with real-time settlement and instant verified digital receipts.')
            ) : (
              <>Teller window session: <strong className="text-slate-200">{cashierName}</strong> • Real-time settlement &amp; official Bakong KHQR banking receipts.</>
            )}
          </p>
        </div>
      </div>

      {/* 2. Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols): Autocomplete Search & Snapshot Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Autocomplete Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {currentUserRole === 'USER' ? t('Select Your Loan Facility') : t('Quick Account Lookup')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Loan #, Borrower Name, or Phone..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </div>

            {/* Autocomplete Dropdown List */}
            {matchingLoans.length > 0 && (
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto bg-slate-950 shadow-xl">
                {matchingLoans.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setSelectedLoanId(l.id);
                      setSearchQuery('');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-850 flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white block">{l.borrowerName}</span>
                      <span className="font-mono text-[11px] text-slate-400">{l.loanNumber} • {l.productName}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ${Number((l as any)?.monthlyEMIUSD || l.nextPaymentDueAmountUSD || 183.89).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Target Loan Snapshot Card */}
          {selectedLoan ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Target Loan Snapshot
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {selectedLoan.status}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedLoan.borrowerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {selectedLoan.borrowerName}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {selectedLoan.loanNumber} • {selectedLoan.borrowerPhone || '+855 12 345 678'}
                  </p>
                </div>
              </div>

              {/* Financial Balances */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Outstanding Balance
                  </span>
                  <MoneyText
                    amount={selectedLoan.outstandingBalanceUSD}
                    currency={currency}
                    className="text-base font-bold text-white block mt-0.5 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">Active book total</span>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Overdue Amount
                  </span>
                  <MoneyText
                    amount={overdueAmount}
                    currency={currency}
                    className={`text-base font-bold block mt-0.5 font-mono ${
                      overdueAmount > 0 ? 'text-rose-400' : 'text-white'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    {overdueAmount > 0 ? `${selectedLoan.daysOverdue} days past due` : 'Zero overdue'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80 font-mono">
                <div className="flex justify-between">
                  <span>Regular Installment:</span>
                  <span className="font-bold text-emerald-400 font-mono">${regularInstallment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Due Date:</span>
                  <span className="text-slate-200 font-semibold">{selectedLoan.nextPaymentDueDate || '2026-12-14'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No loan selected. Use lookup above.
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Payment Collection & Settlement Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleConfirmAndPrint}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
          >
            <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">
                  {t('Payment Collection & Settlement')}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record installment, generate real-time Bakong KHQR, and finalize receipts.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
                ${paymentAmount.toFixed(2)} USD
              </span>
            </div>

            {/* Payment Amount Input & 1-Click Presets */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                  {t('Payment Amount')} (USD)
                </label>
                <span className="text-xs font-mono text-slate-400">
                  ≈ ៛ {Math.round(paymentAmount * 4080).toLocaleString()} KHR
                </span>
              </div>

              <input
                type="number"
                step={0.01}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-base font-bold text-white focus:outline-none focus:border-emerald-500 transition"
              />

              {/* 1-Click Presets */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePreset('EXACT')}
                  className="p-2.5 text-xs rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/80 hover:bg-slate-850 text-slate-300 hover:text-white transition-all text-center cursor-pointer font-sans"
                >
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('Exact Installment')}</span>
                  <span className="font-mono font-bold text-white text-xs mt-0.5 block">
                    ${regularInstallment.toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreset('TWO_INSTALLMENTS')}
                  className="p-2.5 text-xs rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/80 hover:bg-slate-850 text-slate-300 hover:text-white transition-all text-center cursor-pointer font-sans"
                >
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('Pay 2 Installments')}</span>
                  <span className="font-mono font-bold text-white text-xs mt-0.5 block">
                    ${(regularInstallment * 2).toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreset('PAYOFF')}
                  className="p-2.5 text-xs rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-950/80 hover:bg-slate-850 text-slate-300 hover:text-white transition-all text-center cursor-pointer font-sans"
                >
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('Full Payoff')}</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
                    ${(selectedLoan?.outstandingBalanceUSD || 2130.0).toFixed(2)}
                  </span>
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Payment Channel Selector
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Dynamic QR Code', label: 'Bakong KHQR', icon: QrCode, desc: 'Real-Time Scan' },
                  { id: 'Cash', label: 'Branch Cash', icon: Banknote, desc: 'Teller Desk' },
                  { id: 'Bank Transfer', label: 'Interbank ACH', icon: Building, desc: 'ACLEDA / ABA' },
                  { id: 'Card', label: 'Debit / Card', icon: CreditCard, desc: 'Visa / Mastercard' },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/30 shadow-md shadow-emerald-950/20'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{m.label}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{m.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC BAKONG KHQR PRESENTATION BLOCK */}
            {paymentMethod === 'Dynamic QR Code' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-red-600 text-white font-black text-[9px] flex items-center justify-center shadow">
                      KH
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">Official NBC Bakong KHQR</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ACLEDA Interbank Clearing
                  </span>
                </div>

                {/* EMVCo QR Canvas Container */}
                <div className="inline-block p-3.5 rounded-2xl bg-white shadow-2xl ring-4 ring-emerald-500/20 relative mx-auto">
                  {bakongQrUrl ? (
                    <img
                      src={bakongQrUrl}
                      alt="Bakong KHQR Dynamic Canvas"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-900 font-mono text-xs">
                      Encoding EMVCo Payload...
                    </div>
                  )}

                  {/* Red KH Center Overlay */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-red-600 border-2 border-white flex items-center justify-center text-white font-black text-[10px] shadow pointer-events-none">
                    KH
                  </div>
                </div>

                {/* Dual-Currency Settlement Summary */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono max-w-sm mx-auto flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Total Settlement:</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    ${paymentAmount.toFixed(2)} USD • ៛ {Math.round(paymentAmount * 4080).toLocaleString()}
                  </span>
                </div>

                {/* Simulated Real-Time Clearing Controls */}
                <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={isVerifyingBakong || bakongSettledSuccess}
                    onClick={handleSimulateBakongSettlement}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 cursor-pointer transition active:scale-[0.98]"
                  >
                    {bakongSettledSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        <span>Settlement Confirmed via Bakong!</span>
                      </>
                    ) : isVerifyingBakong ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Listening for Bakong Webhook...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simulate Bakong App Scan &amp; Settle</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Transaction Reference & Audit Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
                  Transaction Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. BK-2026-8812"
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
                  Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Regular monthly installment"
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Confirm & Print Receipt action */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Operator: <strong className="text-slate-200">{cashierName}</strong>
              </span>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{t('Confirm & Print Receipt')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. PAYMENT MANAGEMENT (Transactions Ledger) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              {t('Payment History & Collections Ledger')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified double-entry transactional log of all installments, payment channels, and Bakong hashes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder={t('Search Receipt, Loan, Borrower...', 'Search Receipt, Loan, Borrower...')}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </div>

            {/* Method Filter */}
            <select
              value={ledgerMethodFilter}
              onChange={(e) => setLedgerMethodFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">{t('All Methods')}</option>
              <option value="Dynamic QR Code">Bakong KHQR</option>
              <option value="Cash">{t('Cash')}</option>
              <option value="Bank Transfer">{t('Bank Transfer')}</option>
              <option value="Card">{t('Card')}</option>
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={ledgerDateFilter}
              onChange={(e) => setLedgerDateFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">{t('Payment ID')}</th>
                <th className="py-3 px-4">{t('Loan ID')}</th>
                <th className="py-3 px-4">{t('Borrower')}</th>
                <th className="py-3 px-4 text-right">{t('Amount')}</th>
                <th className="py-3 px-4">{t('Payment Date')}</th>
                <th className="py-3 px-4">{t('Payment Method')}</th>
                <th className="py-3 px-4">{t('Reference', 'Reference')}</th>
                <th className="py-3 px-4 text-center">{t('Status')}</th>
                <th className="py-3 px-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                    {t('No payments recorded yet')}
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rec) => (
                  <tr key={rec.receiptNo || rec.transactionRef} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {rec.receiptNo}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {rec.loanNumber}
                    </td>
                    <td className="py-3 px-4 text-white font-sans font-semibold">
                      {rec.borrowerName}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">
                      <MoneyText amount={rec.amountPaidUSD} currency={currency} />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {rec.paidAt}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {rec.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {rec.transactionRef}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Settled
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setShowReceiptModal(rec)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition inline-flex items-center gap-1 cursor-pointer font-sans"
                      >
                        <Printer className="w-3 h-3 text-emerald-400" />
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
