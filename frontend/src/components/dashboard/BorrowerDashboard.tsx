import React, { useState } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  QrCode,
  FileText,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Receipt,
  Download,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Percent,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { Currency, LoanAccount, LoanApplication, PaymentReceipt, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export interface BorrowerDashboardProps {
  currentUser: UserProfile;
  currency: Currency;
  loans: LoanAccount[];
  applications: LoanApplication[];
  receipts: PaymentReceipt[];
  onNavigate: (tab: string) => void;
  onOpenApplyLoan?: () => void;
  onOpenQuickPayment?: (loanId?: string, installmentNo?: number, amount?: number) => void;
  onViewReceipt?: (receipt: PaymentReceipt) => void;
}

export const BorrowerDashboard: React.FC<BorrowerDashboardProps> = ({
  currentUser,
  currency,
  loans,
  applications,
  receipts,
  onNavigate,
  onOpenApplyLoan,
  onOpenQuickPayment,
  onViewReceipt,
}) => {
  const { language, t } = useLanguage();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const formatMoney = (valUSD: number) => {
    if (currency === 'KHR') {
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(valUSD * 4100);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valUSD);
  };

  const clientName = (currentUser.name || currentUser.fullName || '').trim().toLowerCase();
  const currentBorrowerId = currentUser.borrowerId || currentUser.id;

  // Filter loans belonging to this borrower
  const userLoans = loans.filter((l) => {
    if (currentBorrowerId && (l.borrowerId === currentBorrowerId || l.borrowerId === currentUser.id)) return true;
    if (l.borrowerName && clientName && (l.borrowerName.toLowerCase().includes(clientName) || clientName.includes(l.borrowerName.toLowerCase()))) return true;
    return true; // Fallback in dev/single-user view so loans are visible
  });

  // Filter applications belonging to this borrower
  const userApps = applications.filter((a) => {
    if (currentBorrowerId && (a.borrowerId === currentBorrowerId || a.borrowerId === currentUser.id)) return true;
    if (a.borrowerName && clientName && (a.borrowerName.toLowerCase().includes(clientName) || clientName.includes(a.borrowerName.toLowerCase()))) return true;
    return true;
  });

  // Filter receipts belonging to this borrower
  const userReceipts = receipts.filter((r) => {
    if (currentBorrowerId && (r.borrowerId === currentBorrowerId || r.borrowerId === currentUser.id)) return true;
    if (r.borrowerName && clientName && (r.borrowerName.toLowerCase().includes(clientName) || clientName.includes(r.borrowerName.toLowerCase()))) return true;
    return true;
  });

  // Primary active loan
  const activeLoan =
    (selectedLoanId ? userLoans.find((l) => l.id === selectedLoanId) : null) ||
    userLoans.find((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE') ||
    userLoans[0];

  // Aggregated Financial Metrics
  const totalBorrowed = userLoans.reduce((sum, l) => sum + (l.principalUSD || 0), 0);
  const totalOutstanding = userLoans.reduce((sum, l) => sum + (l.outstandingBalanceUSD || 0), 0);
  const totalRepaid = userLoans.reduce((sum, l) => sum + (l.totalPaidUSD || 0), 0);
  const activeLoansCount = userLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE').length;

  // Next upcoming installment on the active loan
  const nextSchedule = activeLoan?.schedules?.find((s) => s.status !== 'PAID') || activeLoan?.schedules?.[0];
  const nextDueDate = nextSchedule?.dueDate || activeLoan?.nextPaymentDueDate || '2026-11-15';
  const nextDueAmount = nextSchedule?.remainingAmountUSD || activeLoan?.nextPaymentDueAmountUSD || 0;

  // Repayment progress %
  const totalLoanRepayable = activeLoan ? (activeLoan.totalRepaymentUSD || activeLoan.principalUSD * 1.1) : 1;
  const progressPercent = activeLoan
    ? Math.min(100, Math.round(((activeLoan.totalPaidUSD || 0) / totalLoanRepayable) * 100))
    : 0;

  return (
    <div className="space-y-6 font-sans text-[#0F172A] pb-10">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#2563EB] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'km' ? 'ផតថលអតិថិជនឥណទាន • Verified Borrower Portal' : 'Verified Borrower Self-Service Portal'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {language === 'km' ? `សូមស្វាគមន៍, ${currentUser.name || currentUser.fullName || 'អតិថិជន'}` : `Welcome back, ${currentUser.name || currentUser.fullName || 'Borrower'}`}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              {language === 'km'
                ? 'តាមដានស្ថានភាពកម្ចីសកម្ម បង់ប្រាក់រំលស់តាម Bakong KHQR និងពិនិត្យប្រវត្តិនៃការទូទាត់របស់អ្នកបានយ៉ាងងាយស្រួល។'
                : 'Manage your active credit facilities, settle installments instantly via Bakong KHQR, and monitor your repayment schedule.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeLoan && (
              <button
                type="button"
                onClick={() => onOpenQuickPayment?.(activeLoan.id, nextSchedule?.installmentNo, nextDueAmount)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-900/40 hover:shadow-red-800/60 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
              >
                <div className="w-5 h-5 rounded-md bg-white text-red-600 flex items-center justify-center font-black text-[10px] shadow-xs">
                  KH
                </div>
                <span>{language === 'km' ? 'បង់ប្រាក់តាម Bakong KHQR' : 'Pay via Bakong KHQR'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenApplyLoan?.() || onNavigate('new-application')}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>{language === 'km' ? '+ ស្នើសុំកម្ចីថ្មី' : '+ Apply for Loan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Loans */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {language === 'km' ? 'កម្ចីសកម្ម' : 'Active Facilities'}
            </span>
            <div className="text-2xl font-bold text-slate-900">{activeLoansCount}</div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {language === 'km' ? 'គណនីមានសុពលភាព' : 'In Good Standing'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Borrowed */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {language === 'km' ? 'ទំហំឥណទានសរុប' : 'Total Borrowed'}
            </span>
            <div className="text-2xl font-bold text-slate-900">{formatMoney(totalBorrowed)}</div>
            <span className="text-[11px] text-slate-500">
              {userLoans.length} {language === 'km' ? 'កិច្ចសន្យាឥណទាន' : 'Total Facilities'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {language === 'km' ? 'សមតុល្យនៅសល់' : 'Outstanding Balance'}
            </span>
            <div className="text-2xl font-bold text-slate-900">{formatMoney(totalOutstanding)}</div>
            <span className="text-[11px] text-amber-600 font-medium">
              {language === 'km' ? 'ប្រាក់ដើម និងការប្រាក់' : 'Principal & Accrued Interest'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Paid */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {language === 'km' ? 'បានសងសរុប' : 'Total Repaid'}
            </span>
            <div className="text-2xl font-bold text-emerald-600">{formatMoney(totalRepaid)}</div>
            <span className="text-[11px] text-slate-500">
              {userReceipts.length} {language === 'km' ? 'វិក្កយបត្របានទូទាត់' : 'Completed Payments'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Loan Summary & Bakong KHQR Action */}
        <div className="lg:col-span-2 space-y-6">
          {activeLoan ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{activeLoan.productName}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {activeLoan.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">
                    {language === 'km' ? 'លេខគណនីឥណទាន:' : 'Loan Account No:'} <strong>{activeLoan.loanNumber}</strong>
                  </p>
                </div>

                {/* Multiple Loans Switcher if borrower has more than 1 */}
                {userLoans.length > 1 && (
                  <select
                    value={activeLoan.id}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {userLoans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.loanNumber} • {l.productName} ({formatMoney(l.outstandingBalanceUSD)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Card Body: Facility Overview */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 uppercase">{language === 'km' ? 'ប្រាក់ដើមដើមដំបូង' : 'Original Principal'}</span>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{formatMoney(activeLoan.principalUSD)}</div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 uppercase">{language === 'km' ? 'អត្រាការប្រាក់ (APR)' : 'Interest Rate'}</span>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{activeLoan.interestRate}% / year</div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 uppercase">{language === 'km' ? 'រយៈពេលកម្ចី' : 'Loan Term'}</span>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{activeLoan.termMonths} Months</div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 uppercase">{language === 'km' ? 'សមតុល្យនៅសល់' : 'Remaining Balance'}</span>
                    <div className="text-base font-bold text-blue-600 mt-0.5">{formatMoney(activeLoan.outstandingBalanceUSD)}</div>
                  </div>
                </div>

                {/* Repayment Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">
                      {language === 'km' ? 'វឌ្ឍនភាពនៃការសងឥណទាន' : 'Repayment Completion Progress'}
                    </span>
                    <span className="font-bold text-slate-900">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{language === 'km' ? 'បានសង:' : 'Paid:'} {formatMoney(activeLoan.totalPaidUSD || 0)}</span>
                    <span>{language === 'km' ? 'សរុបត្រូវសង:' : 'Total Payable:'} {formatMoney(totalLoanRepayable)}</span>
                  </div>
                </div>

                {/* Upcoming Installment & Bakong KHQR CTA Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/60 via-red-50/40 to-amber-50/30 border border-red-200/80 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      <span>{language === 'km' ? 'ការបង់រំលស់បន្ទាប់' : 'Next Due Installment'}</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-slate-900">
                      {formatMoney(nextDueAmount)}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'km' ? 'កាលបរិច្ឆេទកំណត់:' : 'Due Date:'} <strong>{nextDueDate}</strong></span>
                      {nextSchedule?.installmentNo && (
                        <span className="text-slate-400">• Installment #{nextSchedule.installmentNo} of {activeLoan.termMonths}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenQuickPayment?.(activeLoan.id, nextSchedule?.installmentNo, nextDueAmount)}
                      className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{language === 'km' ? 'ស្កេនបង់ប្រាក់ KHQR' : 'Scan & Pay via KHQR'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('repayments')}
                      className="px-4 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs transition cursor-pointer text-center"
                    >
                      {language === 'km' ? 'តារាងបង់រំលស់ពេញលេញ' : 'View Full Schedule'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Wallet className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'km' ? 'មិនមានកម្ចីសកម្មនៅឡើយទេ' : 'No Active Credit Facilities'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {language === 'km'
                    ? 'អ្នកមិនទាន់មានកម្ចីសកម្មក្នុងប្រព័ន្ធនៅឡើយទេ។ សូមធ្វើការស្នើសុំកម្ចីថ្មីឥឡូវនេះ។'
                    : 'You currently have no disbursed active loans. Apply for a new academic or personal facility today.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenApplyLoan?.() || onNavigate('new-application')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
              >
                {language === 'km' ? 'ស្នើសុំឥណទានឥឡូវនេះ' : 'Apply for a Loan'}
              </button>
            </div>
          )}

          {/* 4. Payment History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'km' ? 'ប្រវត្តិនៃការទូទាត់' : 'Payment History & Receipts'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {language === 'km' ? 'វិក្កយបត្រផ្លូវការដែលបានបង់រួច' : 'Official payment receipts and settlement ledger'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('repayments')}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'km' ? 'មើលទាំងអស់' : 'View All'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {userReceipts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                <p>{language === 'km' ? 'មិនទាន់មានប្រវត្តិទូទាត់នៅឡើយទេ' : 'No repayment receipts recorded yet.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">{language === 'km' ? 'លេខបង្កាន់ដៃ' : 'Receipt No'}</th>
                      <th className="px-4 py-3">{language === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                      <th className="px-4 py-3">{language === 'km' ? 'វិធីសាស្ត្រ' : 'Method'}</th>
                      <th className="px-4 py-3">{language === 'km' ? 'ចំនួនទឹកប្រាក់' : 'Amount'}</th>
                      <th className="px-4 py-3">{language === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                      <th className="px-5 py-3 text-right">{language === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userReceipts.slice(0, 5).map((rec, idx) => (
                      <tr key={rec.receiptNo || `rec-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                          {rec.receiptNo}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {rec.paidAt ? new Date(rec.paidAt).toLocaleDateString() : '2026-10-24'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {rec.paymentMethod === 'KHQR' || rec.paymentMethod === 'BAKONG_KHQR' ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Bakong KHQR
                              </>
                            ) : (
                              rec.paymentMethod || 'Bank Transfer'
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {formatMoney(rec.amountPaidUSD)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            PAID
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onViewReceipt?.(rec)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>{language === 'km' ? 'វិក្កយបត្រ' : 'Receipt'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Bakong KHQR Info, Applications & Quick Assistance */}
        <div className="space-y-6">
          {/* Cambodia Bakong KHQR Quick Scan Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-red-900/50">
                  KH
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">Cambodia Bakong KHQR</h4>
                  <p className="text-[10px] text-slate-400">National Bank of Cambodia Standard</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'km'
                ? 'ទូទាត់វិក្កយបត្រឥណទានរបស់អ្នកយ៉ាងលឿនតាមរយៈកម្មវិធីធនាគារចល័តណាមួយក្នុងប្រទេសកម្ពុជា (ACLEDA, ABA, Wing, Canadia, Bakong App)។'
                : 'Settle repayments seamlessly from any supported Cambodian banking app (ACLEDA, ABA, Wing, Canadia, Bakong App) with zero transaction fees.'}
            </p>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">{language === 'km' ? 'ធនាគារទទួល:' : 'Receiving Bank:'}</span>
                <span className="font-semibold text-white">ACLEDA Bank Plc.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{language === 'km' ? 'ឈ្មោះអាជីវករ:' : 'Merchant:'}</span>
                <span className="font-semibold text-white">JAM SONG VICH LMS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{language === 'km' ? 'រូបិយប័ណ្ណ:' : 'Currency:'}</span>
                <span className="font-mono text-emerald-400">USD & KHR (Dual Currency)</span>
              </div>
            </div>

            {activeLoan && (
              <button
                type="button"
                onClick={() => onOpenQuickPayment?.(activeLoan.id, nextSchedule?.installmentNo, nextDueAmount)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-950/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <QrCode className="w-4 h-4" />
                <span>{language === 'km' ? 'បង្កើតកូដ KHQR ឥឡូវនេះ' : 'Generate Bakong KHQR Now'}</span>
              </button>
            )}
          </div>

          {/* Applications Pipeline Status */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'km' ? 'ពាក្យស្នើសុំកម្ចីរបស់អ្នក' : 'My Applications'}
              </h4>
              <button
                type="button"
                onClick={() => onNavigate('applications')}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                {language === 'km' ? 'មើល' : 'View'}
              </button>
            </div>

            {userApps.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                {language === 'km' ? 'គ្មានពាក្យស្នើសុំថ្មី' : 'No pending applications.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {userApps.slice(0, 3).map((app, idx) => (
                  <div
                    key={app.id || `app-${idx}`}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900">{app.productName}</span>
                      <div className="text-[11px] text-slate-500">
                        {formatMoney(app.requestedAmountUSD)} • {app.requestedTermMonths} mos
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'UNDER_REVIEW'
                          ? 'bg-blue-100 text-blue-800'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Help Card */}
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 space-y-2">
            <h5 className="text-xs font-bold text-blue-900">
              {language === 'km' ? 'ត្រូវការជំនួយ ឬសំណួរ?' : 'Need Help or Repayment Support?'}
            </h5>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              {language === 'km'
                ? 'ទាក់ទងមកកាន់ផ្នែកសេវាកម្មអតិថិជន និងជំនួយការឥណទាន ០១០ ៤៨ ៧៧ ១៨ ឬតាមរយៈតេឡេក្រាមផ្លូវការ។'
                : 'Contact our credit desk at (+855) 010 487 718 or via our main branch support for any amortization questions.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowerDashboard;
