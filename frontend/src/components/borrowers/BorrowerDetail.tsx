import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Borrower,
  LoanAccount,
  PaymentReceipt,
  BorrowerKYCDocument,
  Currency
} from '../../types';
import {
  ArrowLeft,
  Phone,
  Mail,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  History,
  FolderLock,
  Clock,
  ExternalLink,
  Download,
  X,
  Plus,
  Calendar,
  Building,
  Briefcase,
  MapPin,
  UserCheck,
  AlertCircle,
  FileCheck,
  Maximize2,
  CheckCircle2,
  DollarSign,
  Printer
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BorrowerDetailProps {
  borrower: Borrower;
  loans: LoanAccount[];
  receipts: PaymentReceipt[];
  currency: Currency;
  onBack: () => void;
  onSelectLoan: (loanId: string) => void;
  onOpenCreateApplication?: (borrowerId: string) => void;
  onViewReceipt?: (receipt: PaymentReceipt) => void;
}

export const BorrowerDetail: React.FC<BorrowerDetailProps> = ({
  borrower,
  loans,
  receipts,
  currency,
  onBack,
  onSelectLoan,
  onOpenCreateApplication,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<
    'loans' | 'repayments' | 'documents' | 'contact' | 'audit'
  >('loans');
  const [selectedDocZoom, setSelectedDocZoom] = useState<BorrowerKYCDocument | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Currency multiplier helper (1 USD = 4,100 KHR)
  const rate = 4100;
  const formatMoney = (usdVal: number) => {
    if (currency === 'KHR') {
      const khr = usdVal * rate;
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0
      }).format(khr);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(usdVal);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(borrower.borrowerId || borrower.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Mock Uploaded KYC Documents (National ID, Salary Slip, Family Book)
  const kycDocuments: BorrowerKYCDocument[] = [
    {
      id: 'doc-1',
      type: 'NATIONAL_ID',
      title: 'National Identity Smartcard (Front & Back)',
      fileName: 'national_id_card_scan.pdf',
      fileSize: '1.4 MB',
      uploadedAt: '2026-08-15 09:30',
      status: 'VERIFIED',
      previewUrl:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'doc-2',
      type: 'SALARY_SLIP',
      title: 'Official Salary Slip / Income Certificate',
      fileName: 'stipend_salary_confirmation.pdf',
      fileSize: '840 KB',
      uploadedAt: '2026-08-15 09:32',
      status: 'VERIFIED',
      previewUrl:
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'doc-3',
      type: 'COLLATERAL_TITLE',
      title: 'Cambodian Family Book (Sievphov Kruosar)',
      fileName: 'family_book_registration.pdf',
      fileSize: '2.1 MB',
      uploadedAt: '2026-08-15 09:35',
      status: 'VERIFIED',
      previewUrl:
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    },
  ];

  // Audit activity logs
  const auditLogs = [
    {
      id: 'l1',
      timestamp: '2026-09-22 14:15',
      actor: 'David Miller (Loan Officer)',
      change: 'Verified updated employer contract and verified national KYC documents.',
    },
    {
      id: 'l2',
      timestamp: '2026-09-01 10:00',
      actor: 'Emily Ross (Cashier)',
      change: 'Disbursed core banking facility balance via Bakong Instant Transfer.',
    },
    {
      id: 'l3',
      timestamp: '2026-08-18 16:00',
      actor: 'Marcus Vance (Manager)',
      change: 'Approved Loan Facility with standard prime tier underwriting clearance.',
    },
    {
      id: 'l4',
      timestamp: '2026-08-15 09:30',
      actor: 'Automated KYC Engine',
      change: 'Created initial 360° Borrower Dossier and recorded biometric ID #010892441.',
    },
  ];

  // DTI calculation & safety categorization
  const dti = borrower.dtiRatio || 24;
  const dtiLabel = dti < 35 ? 'Safe' : dti < 45 ? 'Moderate' : 'High Risk';
  const dtiColor =
    dti < 35
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : dti < 45
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';

  const tabList = [
    { id: 'loans', label: `Active & Closed Loans (${loans.length})` },
    { id: 'repayments', label: `Repayment History (${receipts.length})` },
    { id: 'documents', label: `Uploaded Documents (${kycDocuments.length})` },
    { id: 'contact', label: 'Contact & Personal Info' },
    { id: 'audit', label: 'Audit Trail' },
  ] as const;

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* 1. Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Borrowers Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenCreateApplication && (
            <button
              type="button"
              onClick={() => onOpenCreateApplication(borrower.borrowerId || borrower.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0052FF] hover:bg-[#0040C1] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Create Application</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Hero Card with Avatar, Verification Badge, and 4-Metric Summary Row */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.04)] space-y-6">
        
        {/* Header Profile Info */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar with Status Ring */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 border-2 border-white flex-shrink-0">
              {borrower.fullName.charAt(0)}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                  {borrower.fullName}
                </h2>

                {/* KYC Verification Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Borrower ID + 1-Click Copy */}
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  <span>{borrower.borrowerId}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title="Copy ID"
                    className="hover:text-blue-900 transition p-0.5"
                  >
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{borrower.occupation || 'Self-Employed'}</span>
                </span>

                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{borrower.phone}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Member since: {borrower.createdAt ? borrower.createdAt.split('T')[0] : '2026-08-15'}
            </span>
          </div>
        </div>

        {/* 4-Metric Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          {/* Metric 1: Monthly Income */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Monthly Income
            </span>
            <span className="text-xl font-black font-mono text-slate-900 tabular-nums">
              {formatMoney(borrower.monthlyIncomeUSD)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Verified Salary &amp; Stated Revenue
            </span>
          </div>

          {/* Metric 2: Current DTI Ratio */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Current DTI Ratio
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-mono text-slate-900 tabular-nums">
                {dti}%
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border',
                  dtiColor
                )}
              >
                {dtiLabel}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Underwriting Cap limit &lt; 45%
            </span>
          </div>

          {/* Metric 3: Total Borrowed */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Borrowed
            </span>
            <span className="text-xl font-black font-mono text-slate-900 tabular-nums">
              {formatMoney(borrower.totalBorrowedUSD || 14000.0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Lifetime Facility Drawdowns
            </span>
          </div>

          {/* Metric 4: Current Balance */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Current Balance
            </span>
            <span className="text-xl font-black font-mono text-blue-700 tabular-nums">
              {formatMoney(borrower.totalOutstandingUSD || 6000.0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Principal Outstanding
            </span>
          </div>
        </div>

      </div>

      {/* 3. 5-Tab Navigation (with animated active underline) */}
      <div className="border-b border-slate-200/80 flex items-center gap-1 sm:gap-4 overflow-x-auto scrollbar-none">
        {tabList.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'relative py-3 px-3 sm:px-4 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="borrowerTabUnderline"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0052FF]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB CONTENT VIEWS                                                     */}
      {/* ===================================================================== */}

      {/* TAB 1: Active & Closed Loans */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {loans.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Loan Accounts Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                This borrower does not currently have any active or past commercial loan facilities.
              </p>
              {onOpenCreateApplication && (
                <button
                  type="button"
                  onClick={() => onOpenCreateApplication(borrower.borrowerId || borrower.id)}
                  className="mt-4 px-4 py-2 bg-[#0052FF] text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Create First Loan Application
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loans.map((loan) => {
                const total = loan.principalUSD || 5000;
                const paid = total - (loan.outstandingBalanceUSD || 0);
                const progressPct = Math.min(100, Math.round((paid / total) * 100));

                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-sm">
                          {loan.loanNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                          {loan.productName || 'Personal Loan'}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono',
                          loan.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {loan.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-500">Repayment Progress</span>
                        <span className="font-bold text-slate-800">{progressPct}% Paid</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Balance & Installment Details */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Outstanding Balance</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatMoney(loan.outstandingBalanceUSD || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Monthly Installment</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatMoney(loan.nextPaymentDueAmountUSD || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Detail Link */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onSelectLoan(loan.id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>View Amortization Schedule</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Repayment History */}
      {activeTab === 'repayments' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Chronological Ledger of Repayments
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total Receipts: {receipts.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Facility #</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No repayments recorded for this borrower dossier.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rec) => (
                    <tr key={rec.receiptNo || rec.transactionRef} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {rec.receiptNo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {rec.paidAt}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {rec.loanNumber}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 tabular-nums">
                        {formatMoney(rec.amountPaidUSD)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {rec.cashierName}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewReceipt?.(rec)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Uploaded Documents */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kycDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-3 group cursor-pointer">
                  <img
                    src={doc.previewUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    onClick={() => setSelectedDocZoom(doc)}
                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Enlarge Document</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {doc.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{doc.fileSize}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs leading-snug">{doc.title}</h4>
                <p className="text-[10px] font-mono text-slate-400 mt-1">Uploaded: {doc.uploadedAt}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocZoom(doc)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Inspect Document</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Contact & Personal Info */}
      {activeTab === 'contact' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Verified Dossier Identification &amp; Contact Records
            </h3>
            <p className="text-xs text-slate-500">
              Biometric KYC data verified against the national database
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Residential Address
              </span>
              <p className="font-semibold text-slate-800 leading-snug">
                {borrower.address || 'Street 271, Sangkat Boeng Tumpun, Khan Meanchey, Phnom Penh'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Occupation &amp; Sector
              </span>
              <p className="font-semibold text-slate-800 leading-snug">
                {borrower.occupation || 'Senior Lecturer / Education Sector'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                National Identity #
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm">
                {borrower.nationalId || '010892441'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Primary Phone
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm">
                {borrower.phone}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Email Address
              </span>
              <p className="font-semibold text-slate-800">
                {borrower.email}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Emergency Contact (Guarantor / Spouse)
              </span>
              <p className="font-bold text-slate-800">
                {borrower.emergencyContact?.name || 'Vanna Rath'}
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                {borrower.emergencyContact?.relationship || 'Spouse'} • {borrower.emergencyContact?.phone || '+855-12-998-112'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Immutable KYC &amp; Profile Audit Trail
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Ledger verified
            </span>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-start gap-3 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-slate-900">{log.actor}</span>
                    <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 leading-snug">{log.change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Zoom Modal */}
      <AnimatePresence>
        {selectedDocZoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedDocZoom.title}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedDocZoom.fileName} • {selectedDocZoom.fileSize}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocZoom(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-hidden rounded-2xl border border-slate-200 mb-4 bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedDocZoom.previewUrl}
                  alt={selectedDocZoom.title}
                  className="w-full h-auto max-h-[58vh] object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Status: {selectedDocZoom.status}
                </span>
                <button
                  type="button"
                  onClick={() => alert(`Downloaded copy of ${selectedDocZoom.fileName}`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BorrowerDetail;
