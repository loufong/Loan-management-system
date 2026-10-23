import React, { useState, useMemo } from 'react';
import {
  Search,
  Phone,
  CreditCard,
  User,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Printer,
  X,
  ArrowRight,
  ShieldCheck,
  Building,
  QrCode,
  Banknote,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import {
  Borrower,
  LoanAccount,
  RepaymentInstallment,
  PaymentReceipt,
  Currency,
} from '../../types';
import { formatCurrency } from '../../lib/loanEngine';
import { useLanguage } from '../../context/LanguageContext';

export interface RepaymentCollectionScreenProps {
  borrowers?: Borrower[];
  loans?: LoanAccount[];
  cashierName?: string;
  currency?: Currency;
  onPaymentSuccess?: (receipt: PaymentReceipt, updatedLoan: LoanAccount) => void;
}

export const RepaymentCollectionScreen: React.FC<RepaymentCollectionScreenProps> = ({
  borrowers = [],
  loans = [],
  cashierName = 'Head Cashier (Emily Ross)',
  currency = 'USD',
  onPaymentSuccess,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km';

  // 1. Search State (Search by Phone Number or National ID)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('');

  // 2. Payment Modal State
  const [activePaymentLoan, setActivePaymentLoan] = useState<LoanAccount | null>(null);
  const [activeInstallment, setActiveInstallment] = useState<RepaymentInstallment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bakong KHQR' | 'Bank Transfer'>('Cash');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // 3. Receipt Modal State
  const [receiptData, setReceiptData] = useState<PaymentReceipt | null>(null);

  // 4. Local loans state for immediate real-time optimistic update
  const [localLoans, setLocalLoans] = useState<LoanAccount[]>(loans);

  // Keep local loans updated if parent loans change
  React.useEffect(() => {
    if (loans.length > 0) setLocalLoans(loans);
  }, [loans]);

  // Filter borrowers matching Phone Number or National ID (or Name)
  const filteredBorrowers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return borrowers.filter(
      (b) =>
        (b.phone && b.phone.toLowerCase().includes(q)) ||
        (b.nationalId && b.nationalId.toLowerCase().includes(q)) ||
        (b.fullName && b.fullName.toLowerCase().includes(q)) ||
        (b.borrowerId && b.borrowerId.toLowerCase().includes(q))
    );
  }, [searchQuery, borrowers]);

  // Selected Borrower Object
  const selectedBorrower = useMemo(() => {
    if (selectedBorrowerId) {
      return borrowers.find((b) => b.id === selectedBorrowerId || b.borrowerId === selectedBorrowerId) || null;
    }
    return null;
  }, [selectedBorrowerId, borrowers]);

  // Active Loans for selected borrower
  const borrowerLoans = useMemo(() => {
    if (!selectedBorrower) return [];
    return localLoans.filter(
      (l) =>
        l.borrowerId === selectedBorrower.id ||
        l.borrowerId === selectedBorrower.borrowerId ||
        (l.borrowerName && selectedBorrower.fullName && l.borrowerName.toLowerCase().includes(selectedBorrower.fullName.toLowerCase()))
    );
  }, [selectedBorrower, localLoans]);

  // Open Payment Modal for a loan & installment
  const handleOpenPaymentModal = (loan: LoanAccount, installment?: RepaymentInstallment) => {
    setActivePaymentLoan(loan);
    const targetInst = installment || loan.schedules?.find((s) => s.status === 'OVERDUE' || s.status === 'UNPAID' || s.status === 'PARTIAL');
    setActiveInstallment(targetInst || null);
    
    const defaultAmount = targetInst
      ? (targetInst.remainingAmountUSD || targetInst.totalDueUSD || 0)
      : (loan.nextPaymentDueAmountUSD || 100);

    setPaymentAmount(defaultAmount);
    setPaymentMethod('Cash');
    setReferenceNo(`TRX-${Date.now().toString().slice(-6)}`);
    setNotes(targetInst ? `Installment #${targetInst.installmentNo} collection` : 'Loan repayment collection');
  };

  // Submit Repayment: update installment status, loan balance & generate receipt
  const handleConfirmRepayment = () => {
    if (!activePaymentLoan || paymentAmount <= 0) return;

    const collectedAmt = paymentAmount;
    const loan = activePaymentLoan;
    const inst = activeInstallment;

    // Waterfall allocation: first interest, then principal
    let interestPaid = 0;
    let principalPaid = 0;

    if (inst) {
      const remainingInterest = Math.max(0, inst.interestUSD - ((inst.amountPaidUSD || 0) > inst.principalUSD ? 0 : 0));
      interestPaid = Math.min(collectedAmt, inst.interestUSD);
      principalPaid = Math.max(0, collectedAmt - interestPaid);
    } else {
      interestPaid = Math.round(collectedAmt * 0.1 * 100) / 100;
      principalPaid = Math.round((collectedAmt - interestPaid) * 100) / 100;
    }

    const newOutstanding = Math.max(0, Math.round((loan.outstandingBalanceUSD - principalPaid) * 100) / 100);

    // Update schedules
    const updatedSchedules = (loan.schedules || []).map((s) => {
      if (inst && s.installmentNo === inst.installmentNo) {
        const totalPaidOnInst = (s.amountPaidUSD || 0) + collectedAmt;
        const isFullyPaid = totalPaidOnInst >= s.totalDueUSD;
        return {
          ...s,
          amountPaidUSD: totalPaidOnInst,
          remainingAmountUSD: Math.max(0, s.totalDueUSD - totalPaidOnInst),
          status: (isFullyPaid ? 'PAID' : 'PARTIAL') as any,
        };
      }
      return s;
    });

    const updatedLoan: LoanAccount = {
      ...loan,
      outstandingBalanceUSD: newOutstanding,
      totalPaidUSD: (loan.totalPaidUSD || 0) + collectedAmt,
      status: newOutstanding === 0 ? 'COMPLETED' : loan.status,
      schedules: updatedSchedules,
    };

    // Update local state
    setLocalLoans((prev) => prev.map((l) => (l.id === loan.id ? updatedLoan : l)));

    // Generate Official Receipt
    const newReceipt: PaymentReceipt = {
      receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      loanNumber: loan.loanNumber || `LN-${loan.id?.slice(0, 8)}`,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      installmentNo: inst?.installmentNo || 1,
      amountPaidUSD: collectedAmt,
      amountPaidKHR: collectedAmt * 4100,
      currency: currency,
      paymentMethod: paymentMethod as any,
      transactionRef: referenceNo || `TX-${Date.now()}`,
      paidAt: new Date().toLocaleString('en-US', { hour12: false }),
      cashierName: cashierName,
      principalAllocatedUSD: principalPaid,
      interestAllocatedUSD: interestPaid,
      lateFeeAllocatedUSD: 0,
      outstandingBalanceAfterUSD: newOutstanding,
      notes: notes || `Installment #${inst?.installmentNo || 1} settled via ${paymentMethod}`,
    };

    if (onPaymentSuccess) {
      onPaymentSuccess(newReceipt, updatedLoan);
    }

    // Close payment modal and display receipt
    setActivePaymentLoan(null);
    setActiveInstallment(null);
    setReceiptData(newReceipt);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[6px] bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
                <Banknote className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
                {isKhmer ? 'តុបេឡាករ & ការប្រមូលប្រាក់សង' : 'Cashier & Payment Collection Terminal'}
              </h1>
            </div>
            <p className="text-xs text-[#64748B]">
              {isKhmer
                ? 'ស្វែងរកអ្នកខ្ចីតាមលេខទូរស័ព្ទ ឬអត្តសញ្ញាណប័ណ្ណ ដើម្បីប្រមូលការបង់ប្រាក់ និងចេញវិក្កយបត្រ'
                : 'Search borrower by Phone or National ID to collect repayments and issue printable receipts.'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-[#64748B] block">
              {isKhmer ? 'បេឡាករប្រចាំការ' : 'Active Cashier'}
            </span>
            <span className="text-xs font-bold text-[#0F172A] font-mono">{cashierName}</span>
          </div>
        </div>
      </div>

      {/* 2. Borrower Quick Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 shadow-sm space-y-3">
        <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider">
          {isKhmer
            ? 'ស្វែងរកអ្នកខ្ចីតាមលេខទូរស័ព្ទ ឬអត្តសញ្ញាណប័ណ្ណ'
            : 'Find Borrower by Phone Number or National ID'}
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isKhmer
                ? 'បញ្ចូលលេខទូរស័ព្ទ (ឧទាហរណ៍ 012...) ឬលេខអត្តសញ្ញាណប័ណ្ណ (010...)'
                : 'Enter Phone Number (e.g. +855 12...) or National ID (010992384)...'
            }
            className="w-full h-11 pl-10 pr-4 text-xs font-semibold bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors shadow-sm"
          />
        </div>

        {/* Live Search Match Dropdown / List */}
        {searchQuery.trim().length > 0 && (
          <div className="border border-[#E2E8F0] rounded-[6px] overflow-hidden divide-y divide-[#E2E8F0] max-h-56 overflow-y-auto">
            {filteredBorrowers.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#64748B]">
                {isKhmer ? 'រកមិនឃើញអ្នកខ្ចីត្រូវគ្នានឹងទិន្នន័យនេះទេ' : 'No borrowers matched this phone or national ID.'}
              </div>
            ) : (
              filteredBorrowers.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBorrowerId(b.id);
                    setSearchQuery('');
                  }}
                  className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                      {b.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">{b.fullName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-[#64748B] font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {b.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {b.nationalId}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#2563EB] flex items-center gap-1">
                    <span>{isKhmer ? 'ជ្រើសរើស' : 'Select'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 3. Selected Borrower Details & Active Loans Display */}
      {selectedBorrower ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Borrower Profile Overview Dossier */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[6px] bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-base">
                  {selectedBorrower.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A]">{selectedBorrower.fullName}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      KYC VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    {selectedBorrower.borrowerId || selectedBorrower.id} • {selectedBorrower.occupation || 'Client'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBorrowerId('')}
                className="text-xs text-[#64748B] hover:text-[#0F172A] px-2.5 py-1 rounded-[4px] border border-[#E2E8F0] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isKhmer ? 'ផ្លាស់ប្តូរអ្នកខ្ចី' : 'Change Borrower'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-[11px] text-[#64748B] block">{isKhmer ? 'លេខទូរស័ព្ទ' : 'Phone Number'}</span>
                <span className="font-mono font-bold text-[#0F172A]">{selectedBorrower.phone}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] block">{isKhmer ? 'អត្តសញ្ញាណប័ណ្ណ' : 'National ID'}</span>
                <span className="font-mono font-bold text-[#0F172A]">{selectedBorrower.nationalId}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] block">{isKhmer ? 'កម្ចីសកម្ម' : 'Active Facilities'}</span>
                <span className="font-bold text-[#2563EB]">{borrowerLoans.length} {isKhmer ? 'គណនី' : 'Accounts'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] block">{isKhmer ? 'អាសយដ្ឋាន' : 'Address'}</span>
                <span className="text-[#0F172A] truncate block max-w-xs">{selectedBorrower.address || 'Phnom Penh, Cambodia'}</span>
              </div>
            </div>
          </div>

          {/* Active Loans & Upcoming Installment List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              <span>{isKhmer ? 'គណនីកម្ចីសកម្ម & កាលវិភាគបង់ប្រាក់បន្ទាប់' : 'Active Loans & Next Installments'}</span>
            </h3>

            {borrowerLoans.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-8 text-center text-xs text-[#64748B]">
                {isKhmer ? 'អ្នកខ្ចីនេះមិនទាន់មានគណនីកម្ចីសកម្មទេ' : 'This borrower currently has no active loans.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {borrowerLoans.map((loan) => {
                  // Find the next overdue or unpaid installment
                  const nextDueInstallment =
                    loan.schedules?.find((s) => s.status === 'OVERDUE') ||
                    loan.schedules?.find((s) => s.status === 'UNPAID' || s.status === 'PARTIAL') ||
                    loan.schedules?.[0];

                  const isOverdue = nextDueInstallment?.status === 'OVERDUE';

                  return (
                    <div
                      key={loan.id}
                      className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-[#2563EB]">
                            {loan.loanNumber || `LN-${loan.id?.slice(0, 8)}`}
                          </span>
                          <span className="text-xs font-semibold text-[#0F172A]">
                            {loan.productName || 'Standard Loan'}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
                              loan.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : loan.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-[11px] text-[#64748B] mr-1.5">{isKhmer ? 'ប្រាក់ដើម:' : 'Principal:'}</span>
                            <span className="font-bold text-[#0F172A]">{formatCurrency(loan.principalUSD, currency)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#64748B] mr-1.5">{isKhmer ? 'សមតុល្យនៅសល់:' : 'Balance:'}</span>
                            <span className="font-extrabold text-[#2563EB]">{formatCurrency(loan.outstandingBalanceUSD, currency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Next Installment Action Card */}
                      {nextDueInstallment ? (
                        <div
                          className={`p-4 rounded-[6px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isOverdue
                              ? 'bg-rose-50/60 border-rose-200'
                              : 'bg-slate-50 border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 ${
                                isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#0F172A]">
                                  {isKhmer ? `ការបង់ដំណាក់កាលទី #${nextDueInstallment.installmentNo}` : `Installment #${nextDueInstallment.installmentNo}`}
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[3px] ${
                                    isOverdue ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {nextDueInstallment.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                                {isKhmer ? 'កាលបរិច្ឆេទកំណត់៖' : 'Due Date:'} {nextDueInstallment.dueDate} •{' '}
                                {isKhmer ? 'ប្រាក់ដើម៖' : 'Principal:'} {formatCurrency(nextDueInstallment.principalUSD, currency)} +{' '}
                                {isKhmer ? 'ការប្រាក់៖' : 'Interest:'} {formatCurrency(nextDueInstallment.interestUSD, currency)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <div className="text-right font-mono">
                              <span className="text-[10px] text-[#64748B] block uppercase tracking-wider">
                                {isKhmer ? 'ទឹកប្រាក់ត្រូវបង់' : 'Total Due'}
                              </span>
                              <span
                                className={`text-base font-extrabold ${
                                  isOverdue ? 'text-rose-600' : 'text-[#0F172A]'
                                }`}
                              >
                                {formatCurrency(nextDueInstallment.remainingAmountUSD || nextDueInstallment.totalDueUSD, currency)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(loan, nextDueInstallment)}
                              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>{isKhmer ? 'ប្រមូលប្រាក់សង' : 'Collect Repayment'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] text-xs text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{isKhmer ? 'គណនីនេះបានទូទាត់រួចរាល់គ្រប់ដំណាក់កាលហើយ' : 'All scheduled installments on this facility are settled in full.'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State Prompt */
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-[#64748B] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-[#0F172A]">
            {isKhmer ? 'ស្វែងរកអ្នកខ្ចីដើម្បីចាប់ផ្តើម' : 'Search for a borrower to begin payment collection'}
          </h2>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {isKhmer
              ? 'បញ្ចូលលេខទូរស័ព្ទ ឬលេខអត្តសញ្ញាណប័ណ្ណខាងលើ ដើម្បីទាញយកទិន្នន័យកម្ចី និងកាលវិភាគបង់ប្រាក់'
              : 'Enter a phone number or national ID in the search bar above to fetch loan accounts and installments.'}
          </p>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. Payment Collection Modal */}
      {/* ================================================================= */}
      {activePaymentLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] shadow-2xl max-w-md w-full overflow-hidden space-y-4">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {isKhmer ? 'កត់ត្រាការបង់ប្រាក់សង' : 'Record Loan Repayment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePaymentLoan(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Loan & Borrower Badge */}
              <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-[6px] space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-[#64748B]">{isKhmer ? 'លេខកម្ចី:' : 'Loan Code:'}</span>
                  <span className="font-bold text-[#0F172A]">{activePaymentLoan.loanNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">{isKhmer ? 'ឈ្មោះអ្នកខ្ចី:' : 'Borrower:'}</span>
                  <span className="font-semibold text-[#0F172A]">{activePaymentLoan.borrowerName}</span>
                </div>
                {activeInstallment && (
                  <div className="flex justify-between font-mono">
                    <span className="text-[#64748B]">{isKhmer ? 'ដំណាក់កាល:' : 'Installment:'}</span>
                    <span className="font-bold text-[#2563EB]">#{activeInstallment.installmentNo} (Due: {activeInstallment.dueDate})</span>
                  </div>
                )}
              </div>

              {/* Amount to Collect Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  {isKhmer ? 'ចំនួនទឹកប្រាក់ទូទាត់' : 'Payment Amount to Collect'}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-[#64748B]">
                    {currency === 'USD' ? '$' : '៛'}
                  </div>
                  <input
                    type="number"
                    step={currency === 'KHR' ? '100' : '0.01'}
                    min="1"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-8 pr-3 font-mono font-bold text-sm bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  {isKhmer ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Cash', label: isKhmer ? 'សាច់ប្រាក់' : 'Cash', icon: Banknote },
                    { key: 'Bakong KHQR', label: 'Bakong KHQR', icon: QrCode },
                    { key: 'Bank Transfer', label: isKhmer ? 'ផ្ទេរប្រាក់' : 'Transfer', icon: Building },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key as any)}
                        className={`p-2.5 rounded-[6px] border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 border-[#2563EB] text-[#2563EB] shadow-xs'
                            : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    {isKhmer ? 'លេខយោងប្រតិបត្តិការ' : 'Reference No.'}
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    {isKhmer ? 'កំណត់ចំណាំ' : 'Notes'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isKhmer ? 'កំណត់ចំណាំបន្ថែម' : 'Remarks'}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActivePaymentLoan(null)}
                className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] rounded-[6px] bg-white cursor-pointer"
              >
                {isKhmer ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={paymentAmount <= 0}
                onClick={handleConfirmRepayment}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isKhmer ? 'បញ្ជាក់ការបង់ប្រាក់' : 'Confirm Repayment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. Printable Receipt Modal with CSS @media print */}
      {/* ================================================================= */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 animate-in fade-in duration-150">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-receipt-card, #printable-receipt-card * {
                visibility: visible !important;
              }
              #printable-receipt-card {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 400px !important;
                margin: 0 auto !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-[8px] shadow-2xl max-w-sm w-full overflow-hidden border border-[#E2E8F0] flex flex-col">
            {/* Modal Controls (Hidden in Print) */}
            <div className="px-4 py-3 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between no-print">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {isKhmer ? 'វិក្កយបត្រផ្លូវការ' : 'Official Payment Receipt'}
              </span>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Slip Container */}
            <div
              id="printable-receipt-card"
              className="p-6 bg-white text-[#0F172A] font-mono text-xs space-y-4 select-text"
            >
              {/* Slip Header */}
              <div className="text-center pb-3 border-b border-dashed border-[#CBD5E1] space-y-1">
                <h2 className="font-extrabold text-base tracking-wider uppercase font-sans text-[#0F172A]">
                  JAM SONG VICH
                </h2>
                <p className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase font-sans">
                  LOAN MANAGEMENT SYSTEM • BURSAR
                </p>
                <div className="pt-1 font-bold text-xs tracking-widest uppercase text-[#2563EB]">
                  OFFICIAL PAYMENT RECEIPT
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-[#CBD5E1]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Receipt No:</span>
                  <span className="font-bold text-[#0F172A]">{receiptData.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Loan ID:</span>
                  <span className="font-bold text-[#2563EB]">{receiptData.loanNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Date & Time:</span>
                  <span className="text-[#0F172A]">{receiptData.paidAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Borrower:</span>
                  <span className="font-bold text-[#0F172A]">{receiptData.borrowerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Method:</span>
                  <span className="text-[#0F172A]">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Cashier:</span>
                  <span className="text-[#0F172A]">{receiptData.cashierName}</span>
                </div>
              </div>

              {/* Waterfall Breakdown */}
              <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-[#CBD5E1]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Principal Paid:</span>
                  <span className="text-[#0F172A]">{formatCurrency(receiptData.principalAllocatedUSD, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Interest Paid:</span>
                  <span className="text-amber-700">{formatCurrency(receiptData.interestAllocatedUSD, currency)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-xs">
                  <span>TOTAL AMOUNT PAID:</span>
                  <span className="text-emerald-600">{formatCurrency(receiptData.amountPaidUSD, currency)}</span>
                </div>
              </div>

              {/* Ending Balance */}
              <div className="flex justify-between text-xs font-bold pt-1">
                <span className="text-[#64748B]">Remaining Balance:</span>
                <span className="text-[#2563EB]">{formatCurrency(receiptData.outstandingBalanceAfterUSD, currency)}</span>
              </div>

              {/* Footer Note */}
              <div className="pt-3 text-center text-[10px] text-[#64748B] border-t border-dashed border-[#CBD5E1] space-y-0.5">
                <p>Thank you for your repayment!</p>
                <p>អរគុណសម្រាប់ការទូទាត់ប្រាក់សងរបស់អ្នក</p>
                <p className="pt-1 font-mono text-[9px] text-slate-400">Ref: {receiptData.transactionRef}</p>
              </div>
            </div>

            {/* Modal Actions (Hidden in Print) */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-[6px] transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepaymentCollectionScreen;
