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
  CreditCard,
  Maximize2,
  CheckCircle2,
  Printer,
  Plus,
  Briefcase,
  X,
  Download
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
    'profile' | 'loans' | 'repayments' | 'documents' | 'audit'
  >('profile');
  const [selectedDocZoom, setSelectedDocZoom] = useState<BorrowerKYCDocument | null>(null);
  const [copiedId, setCopiedId] = useState(false);

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

  // Mock Uploaded KYC Documents
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

  const dti = borrower.dtiRatio || 24;
  const dtiLabel = dti < 35 ? 'Safe' : dti < 45 ? 'Moderate' : 'High Risk';
  const dtiColor =
    dti < 35
      ? 'text-[#16A34A] bg-emerald-50 border-emerald-200'
      : dti < 45
      ? 'text-[#D97706] bg-amber-50 border-amber-200'
      : 'text-[#DC2626] bg-red-50 border-red-200';

  const tabList = [
    { id: 'profile', label: 'Borrower Profile & Dossier' },
    { id: 'loans', label: `Loan History (${loans.length})` },
    { id: 'repayments', label: `Payment History (${receipts.length})` },
    { id: 'documents', label: `Documents (${kycDocuments.length})` },
    { id: 'audit', label: 'Audit Trail' },
  ] as const;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] bg-white hover:bg-slate-50 border border-[#CBD5E1] px-3.5 py-2 rounded-[6px] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Borrowers Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenCreateApplication && (
            <button
              type="button"
              onClick={() => onOpenCreateApplication(borrower.borrowerId || borrower.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Application</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Hero Card */}
      <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-6 space-y-6">
        {/* Header Profile Info */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-14 h-14 rounded-[6px] bg-[#0F172A] text-white font-bold text-xl flex items-center justify-center shrink-0">
              {borrower.fullName.charAt(0)}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#16A34A] ring-2 ring-white flex items-center justify-center">
                <Check className="w-2 h-2 text-white stroke-[3]" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                  {borrower.fullName}
                </h2>
                <span className="badge badge-success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Dossier</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-[4px] border border-blue-200">
                  <span>{borrower.borrowerId}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title="Copy ID"
                    className="hover:text-blue-900 transition p-0.5"
                  >
                    {copiedId ? (
                      <Check className="w-3 h-3 text-[#16A34A]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>{borrower.occupation || 'Standard Account'}</span>
                </span>

                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>{borrower.phone}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#64748B] bg-slate-50 px-3 py-1.5 rounded-[4px] border border-[#CBD5E1]">
              Member Since: {borrower.createdAt ? borrower.createdAt.split('T')[0] : '2026-08-15'}
            </span>
          </div>
        </div>

        {/* 4-Metric Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#CBD5E1]">
          <div className="p-3.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1]">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Monthly Income
            </span>
            <span className="text-xl font-bold font-mono text-[#0F172A] tabular-nums">
              {formatMoney(borrower.monthlyIncomeUSD)}
            </span>
            <span className="text-[11px] text-[#64748B] block mt-0.5">
              Verified Revenue
            </span>
          </div>

          <div className="p-3.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1]">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Current DTI Ratio
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-[#0F172A] tabular-nums">
                {dti}%
              </span>
              <span className={cn('px-2 py-0.5 rounded-[4px] text-[10px] font-bold font-mono border', dtiColor)}>
                {dtiLabel}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] block mt-0.5">
              Regulatory Cap &lt; 45%
            </span>
          </div>

          <div className="p-3.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1]">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Total Borrowed
            </span>
            <span className="text-xl font-bold font-mono text-[#0F172A] tabular-nums">
              {formatMoney(borrower.totalBorrowedUSD || 14000.0)}
            </span>
            <span className="text-[11px] text-[#64748B] block mt-0.5">
              Cumulative Facilities
            </span>
          </div>

          <div className="p-3.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1]">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
              Current Balance
            </span>
            <span className="text-xl font-bold font-mono text-[#2563EB] tabular-nums">
              {formatMoney(borrower.totalOutstandingUSD || 6000.0)}
            </span>
            <span className="text-[11px] text-[#64748B] block mt-0.5">
              Active Principal
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation */}
      <div className="border-b border-[#CBD5E1] flex items-center gap-1 sm:gap-4 overflow-x-auto">
        {tabList.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'relative py-3 px-3 sm:px-4 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                isActive ? 'text-[#2563EB] font-bold' : 'text-[#64748B] hover:text-[#0F172A]'
              )}
            >
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#2563EB]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: Profile & Dossier (Point 16: Personal, Contact, Identification, Employment/Student) */}
      {/* ===================================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Section 1: Personal & Identification Information */}
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5">
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider pb-3 border-b border-[#CBD5E1]">
              Personal Information &amp; Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Full Legal Name</span>
                <span className="text-sm font-bold text-[#0F172A] mt-0.5 block">{borrower.fullName}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">National ID / Smartcard</span>
                <span className="text-sm font-mono font-bold text-[#0F172A] mt-0.5 block">{borrower.nationalId || '010892441'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Date of Birth</span>
                <span className="text-sm font-mono text-[#0F172A] mt-0.5 block">{borrower.dob || '1992-06-14'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Gender</span>
                <span className="text-sm font-medium text-[#0F172A] mt-0.5 block">{borrower.gender || 'Male'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5">
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider pb-3 border-b border-[#CBD5E1]">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Primary Phone</span>
                <span className="text-sm font-mono font-bold text-[#0F172A] mt-0.5 block">{borrower.phone}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Email Address</span>
                <span className="text-sm text-[#0F172A] mt-0.5 block">{borrower.email}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Residential Address</span>
                <span className="text-sm text-[#0F172A] mt-0.5 block">{borrower.address || 'Street 271, Sangkat Boeng Tumpun, Khan Meanchey, Phnom Penh'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Employment / Student Information */}
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5">
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider pb-3 border-b border-[#CBD5E1]">
              Employment / Student Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Occupation / Sector</span>
                <span className="text-sm font-bold text-[#0F172A] mt-0.5 block">{borrower.occupation || 'Senior Lecturer / Education Sector'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Employer / Institution</span>
                <span className="text-sm font-medium text-[#0F172A] mt-0.5 block">{borrower.employerName || 'Royal University of Phnom Penh'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Monthly Income</span>
                <span className="text-sm font-mono font-bold text-[#0F172A] mt-0.5 block">{formatMoney(borrower.monthlyIncomeUSD)}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Emergency Guarantor</span>
                <span className="text-sm font-medium text-[#0F172A] mt-0.5 block">
                  {borrower.emergencyContact?.name || 'Vanna Rath'} ({borrower.emergencyContact?.relationship || 'Spouse'})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: Loan History (Point 16) */}
      {/* ===================================================================== */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {loans.length === 0 ? (
            <div className="bg-white rounded-[8px] p-12 text-center border border-[#CBD5E1]">
              <CreditCard className="w-10 h-10 text-[#64748B] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#0F172A]">No Loan Facilities Found</h3>
              <p className="text-xs text-[#64748B] mt-1">
                This borrower does not currently have any active or past commercial loan facilities.
              </p>
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
                    className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2563EB] text-sm">
                          {loan.loanNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                          {loan.productName || 'Personal Loan'}
                        </span>
                      </div>
                      <span className={cn('badge', loan.status === 'ACTIVE' ? 'badge-info' : 'badge-neutral')}>
                        {loan.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#64748B]">Amortization Progress</span>
                        <span className="font-semibold text-[#0F172A]">{progressPct}% Settled</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#CBD5E1] text-xs font-mono">
                      <div>
                        <span className="text-[#64748B] block text-[11px]">Outstanding Balance</span>
                        <span className="font-bold text-[#0F172A] text-sm">
                          {formatMoney(loan.outstandingBalanceUSD || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[11px]">Monthly Installment</span>
                        <span className="font-bold text-[#0F172A] text-sm">
                          {formatMoney(loan.nextPaymentDueAmountUSD || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onSelectLoan(loan.id)}
                        className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Amortization Schedule &rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: Payment History (Point 16) */}
      {/* ===================================================================== */}
      {activeTab === 'repayments' && (
        <div className="bg-white rounded-[8px] border border-[#CBD5E1] overflow-hidden">
          <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Payment History
            </h3>
            <span className="text-xs text-[#64748B] font-mono">
              Total Receipts: {receipts.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date &amp; Time</th>
                  <th>Loan #</th>
                  <th>Payment Method</th>
                  <th className="text-right">Total Amount</th>
                  <th>Cashier</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#64748B] text-xs">
                      No repayments recorded for this borrower yet.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rec) => (
                    <tr key={rec.receiptNo || rec.transactionRef} className="hover:bg-slate-50/70 transition">
                      <td className="font-mono font-bold text-[#2563EB]">
                        {rec.receiptNo}
                      </td>
                      <td className="font-mono text-[#0F172A]">
                        {rec.paidAt}
                      </td>
                      <td className="font-mono font-medium text-[#0F172A]">
                        {rec.loanNumber}
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-[#16A34A] tabular-nums">
                        {formatMoney(rec.amountPaidUSD)}
                      </td>
                      <td className="text-[#0F172A]">
                        {rec.cashierName}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => onViewReceipt?.(rec)}
                          className="px-2.5 py-1 rounded-[6px] bg-slate-50 hover:bg-slate-100 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
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

      {/* ===================================================================== */}
      {/* TAB 4: Documents (Point 16) */}
      {/* ===================================================================== */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kycDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-[8px] border border-[#CBD5E1] p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="relative h-40 w-full rounded-[6px] overflow-hidden bg-slate-100 border border-[#CBD5E1] mb-3 group cursor-pointer">
                  <img
                    src={doc.previewUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    onClick={() => setSelectedDocZoom(doc)}
                    className="absolute inset-0 bg-[#0F172A]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-[#0F172A] text-white px-3 py-1.5 rounded-[6px]">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Inspect Document</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="badge badge-success">
                    {doc.status}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B]">{doc.fileSize}</span>
                </div>
                <h4 className="font-semibold text-[#0F172A] text-xs leading-snug mt-1">{doc.title}</h4>
                <p className="text-[10px] font-mono text-[#64748B] mt-0.5">Uploaded: {doc.uploadedAt}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocZoom(doc)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-[#0F172A] font-semibold text-xs rounded-[6px] border border-[#CBD5E1] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View Full Scan</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: Audit Trail */}
      {/* ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-[8px] border border-[#CBD5E1] p-5 space-y-3">
          <div className="border-b border-[#CBD5E1] pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Activity &amp; Audit Trail
            </h3>
            <span className="text-xs text-[#64748B] font-mono">
              Cryptographically Sequenced
            </span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-[6px] border border-[#CBD5E1] bg-slate-50 flex items-start gap-3 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-[#0F172A]">{log.actor}</span>
                    <span className="text-[11px] font-mono text-[#64748B]">{log.timestamp}</span>
                  </div>
                  <p className="text-[#64748B] leading-snug">{log.change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Zoom Modal */}
      <AnimatePresence>
        {selectedDocZoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-2xl bg-white rounded-[8px] border border-[#CBD5E1] shadow-xl p-6 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-4">
                <div>
                  <h4 className="font-bold text-[#0F172A] text-sm">{selectedDocZoom.title}</h4>
                  <p className="text-xs text-[#64748B] font-mono">
                    {selectedDocZoom.fileName} • {selectedDocZoom.fileSize}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocZoom(null)}
                  className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-hidden rounded-[6px] border border-[#CBD5E1] mb-4 bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedDocZoom.previewUrl}
                  alt={selectedDocZoom.title}
                  className="w-full h-auto max-h-[58vh] object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="badge badge-success">
                  Status: {selectedDocZoom.status}
                </span>
                <button
                  type="button"
                  onClick={() => alert(`Downloaded copy of ${selectedDocZoom.fileName}`)}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-[6px] font-semibold flex items-center gap-1.5 transition"
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
