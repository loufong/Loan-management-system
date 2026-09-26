import React, { useState } from 'react';
import {
  Borrower,
  LoanAccount,
  PaymentReceipt,
  BorrowerKYCDocument,
  Currency
} from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
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
  Plus
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'loans' | 'repayments' | 'documents' | 'audit'>('loans');
  const [selectedDocZoom, setSelectedDocZoom] = useState<BorrowerKYCDocument | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(borrower.borrowerId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Mock sample KYC documents for this borrower
  const kycDocuments: BorrowerKYCDocument[] = [
    {
      id: 'doc-1',
      type: 'NATIONAL_ID',
      title: 'National Identity Smartcard',
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
      title: 'Monthly Institutional Salary Slip',
      fileName: 'stipend_salary_confirmation.pdf',
      fileSize: '840 KB',
      uploadedAt: '2026-08-15 09:32',
      status: 'VERIFIED',
      previewUrl:
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'doc-3',
      type: 'EMPLOYMENT_CONTRACT',
      title: 'University Employment Letter',
      fileName: 'faculty_appointment_letter.pdf',
      fileSize: '1.1 MB',
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
      change: 'Verified updated employer contract and national KYC documents.',
    },
    {
      id: 'l2',
      timestamp: '2026-09-01 10:00',
      actor: 'Emily Ross (Cashier)',
      change: 'Disbursed Loan funds ($6,000.00 via ACH).',
    },
    {
      id: 'l3',
      timestamp: '2026-08-18 16:00',
      actor: 'Marcus Vance, MBA (Manager)',
      change: 'Approved Loan Application with standard prime interest rate.',
    },
    {
      id: 'l4',
      timestamp: '2026-08-15 09:30',
      actor: 'David Miller (Loan Officer)',
      change: 'Initial onboarding and biometric identity verification registered.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Navigation Back Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Borrowers Directory</span>
        </button>

        <button
          onClick={() => onOpenCreateApplication?.(borrower.id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Loan Application</span>
        </button>
      </div>

      {/* 2. Top Hero Banner Card with 4-Metric Summary Pill Row */}
      <div className="card-3d-floating p-6 space-y-6">
        {/* Borrower Header & Quick Contact Buttons */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-indigo-600/30 shrink-0 border border-indigo-500/30">
              {borrower.fullName.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {borrower.fullName}
                </h1>
                <span className="badge-3d-emerald flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  KYC Verified
                </span>
                <Badge variant={borrower.status === 'ACTIVE' ? 'active' : 'delinquent'} dot>
                  {borrower.status}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap leading-relaxed">
                <span className="font-mono tabular-nums text-indigo-600 font-bold">
                  {borrower.borrowerId}
                </span>
                <span>•</span>
                <span className="font-mono tabular-nums text-slate-600">
                  National ID: {borrower.nationalId}
                </span>
                <span>•</span>
                <span>{borrower.occupation}</span>
              </div>
            </div>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex items-center gap-2">
            <a
              href={`tel:${borrower.phone}`}
              className="btn-3d-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Call</span>
            </a>
            <a
              href={`mailto:${borrower.email}`}
              className="btn-3d-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Email</span>
            </a>
            <button
              onClick={handleCopyId}
              className="btn-3d-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4-Metric Summary Pill Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Monthly Income
            </span>
            <MoneyText
              amount={borrower.monthlyIncomeUSD}
              currency={currency}
              className="text-lg font-bold text-slate-900 block"
            />
            <span className="text-[11px] text-slate-400">Institutional payroll</span>
          </div>

          <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Current DTI Ratio
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-mono tabular-nums font-bold text-slate-900">
                {borrower.dtiRatio}%
              </span>
              <span
                className={`text-xs font-semibold ${
                  borrower.dtiRatio <= 30
                    ? 'text-emerald-600'
                    : borrower.dtiRatio <= 40
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {borrower.dtiRatio <= 30 ? 'Prime' : borrower.dtiRatio <= 40 ? 'Moderate' : 'High'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">&lt; 40% regulatory limit</span>
          </div>

          <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Lifetime Borrowed
            </span>
            <MoneyText
              amount={borrower.totalBorrowedUSD}
              currency={currency}
              className="text-lg font-bold text-slate-900 block"
            />
            <span className="text-[11px] text-slate-400">
              {borrower.activeLoansCount} active loan accounts
            </span>
          </div>

          <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Current Balance
            </span>
            <MoneyText
              amount={borrower.totalOutstandingUSD}
              currency={currency}
              className="text-lg font-bold text-indigo-600 block"
            />
            <span className="text-[11px] text-slate-400">Principal + interest due</span>
          </div>
        </div>
      </div>

      {/* 3. Tabbed Interface */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'loans', label: `Active & Closed Loans (${loans.length})`, icon: CreditCard },
          { id: 'repayments', label: `Repayment History (${receipts.length})`, icon: History },
          { id: 'documents', label: `Uploaded KYC Documents (${kycDocuments.length})`, icon: FolderLock },
          { id: 'audit', label: 'Audit & Activity Log', icon: Clock },
        ].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: ACTIVE & CLOSED LOANS */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {loans.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-400 text-sm">
              No active or closed loans recorded for this borrower profile.
            </div>
          ) : (
            loans.map((loan) => {
              const progressPct = Math.min(
                100,
                Math.round((loan.totalPaidUSD / loan.totalRepaymentUSD) * 100)
              );
              return (
                <div
                  key={loan.id}
                  className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono tabular-nums text-sm font-bold text-indigo-600">
                          {loan.loanNumber}
                        </span>
                        <Badge
                          variant={
                            loan.status === 'ACTIVE'
                              ? 'active'
                              : loan.status === 'OVERDUE'
                              ? 'overdue'
                              : 'closed'
                          }
                          dot
                        >
                          {loan.status}
                        </Badge>
                        <span className="text-xs font-medium text-slate-700">
                          {loan.productName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono tabular-nums">
                        Disbursed: {loan.disbursedDate} • Maturity: {loan.maturityDate} • Rate:{' '}
                        {loan.interestRate}% p.a.
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectLoan(loan.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors self-start"
                    >
                      View Amortization Schedule →
                    </button>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        Repaid:{' '}
                        <strong className="text-slate-900 font-mono tabular-nums">
                          {progressPct}%
                        </strong>
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        <MoneyText amount={loan.totalPaidUSD} currency={currency} /> /{' '}
                        <MoneyText amount={loan.totalRepaymentUSD} currency={currency} />
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Principal</span>
                      <MoneyText
                        amount={loan.principalUSD}
                        currency={currency}
                        className="font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Interest</span>
                      <MoneyText
                        amount={loan.totalInterestUSD}
                        currency={currency}
                        className="font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Outstanding Balance</span>
                      <MoneyText
                        amount={loan.outstandingBalanceUSD}
                        currency={currency}
                        className="font-bold text-indigo-600"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Next Due Date</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {loan.nextPaymentDueDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: REPAYMENT HISTORY */}
      {activeTab === 'repayments' && (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Loan Account</th>
                  <th className="py-3.5 px-4">Settlement Date</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Reference Code</th>
                  <th className="py-3.5 px-4">Cashier</th>
                  <th className="py-3.5 px-4 text-right">Amount Settled</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                      No payment receipts generated for this borrower yet.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rec) => (
                    <tr
                      key={rec.receiptNo}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                    >
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-indigo-600">
                        {rec.receiptNo}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">
                        {rec.loanNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {rec.paidAt}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-500">
                        {rec.transactionRef}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">{rec.cashierName}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                        <MoneyText amount={rec.amountPaidUSD} currency={currency} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onViewReceipt?.(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
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

      {/* TAB 3: UPLOADED KYC DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kycDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div
                  onClick={() => setSelectedDocZoom(doc)}
                  className="h-36 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden cursor-pointer relative group"
                >
                  <img
                    src={doc.previewUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                    Click to Zoom Preview
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      {doc.type}
                    </span>
                    <Badge variant="active" size="xs">
                      {doc.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 truncate">{doc.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {doc.fileName} • {doc.fileSize}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Zoom Modal */}
          {selectedDocZoom && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white max-w-2xl w-full rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">{selectedDocZoom.title}</h3>
                  <button
                    onClick={() => setSelectedDocZoom(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden max-h-[65vh] flex items-center justify-center bg-slate-50 border border-slate-200">
                  <img
                    src={selectedDocZoom.previewUrl}
                    alt={selectedDocZoom.title}
                    className="max-h-[500px] object-contain"
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="font-mono">
                    {selectedDocZoom.fileName} ({selectedDocZoom.fileSize})
                  </span>
                  <button
                    onClick={() => setSelectedDocZoom(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT & ACTIVITY LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Institutional Dossier Audit Trail</h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative space-y-1">
                <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{log.actor}</span>
                  <span className="text-slate-400 font-mono tabular-nums text-[11px]">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{log.change}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
