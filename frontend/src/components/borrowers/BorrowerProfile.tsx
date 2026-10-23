import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  ShieldCheck,
  Calendar,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Car,
  Home,
  FileCheck2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { StatusBadge } from '../common/StatusBadge';

export interface BorrowerProfileProps {
  borrowerId?: string;
  onBack?: () => void;
  onSelectLoan?: (loanId: string) => void;
}

export const BorrowerProfile: React.FC<BorrowerProfileProps> = ({
  borrowerId = 'BOR-2026-0042',
  onBack,
  onSelectLoan
}) => {
  const [activeTab, setActiveTab] = useState<'loans' | 'history' | 'collateral' | 'guarantor'>('loans');

  // Borrower details
  const borrower = {
    id: borrowerId,
    nameEn: 'Sokha Chan',
    nameKh: 'ចាន់ សុខា',
    nationalId: '010892743',
    phone: '012 345 678',
    email: 'sokha.chan@gmail.com',
    address: 'Building 48, Street 214, Sangkat Boeung Keng Kang 1, Khan BKK, Phnom Penh',
    monthlyIncomeUSD: 1450.00,
    creditTier: 'Tier A (Prime)',
    kycVerified: true,
    activeLoansCount: 1,
    totalBorrowedUSD: 5000.00,
    totalRepaidUSD: 1579.50,
    outstandingBalanceUSD: 3420.50
  };

  const activeLoans = [
    {
      id: 'ln-2024-001',
      loanCode: 'LN-BKK-0081',
      productName: 'SME Working Capital',
      principalUSD: 5000.00,
      balanceUSD: 3420.50,
      termMonths: 12,
      interestRate: 1.5,
      nextDueDate: '2026-10-24',
      nextDueAmountUSD: 459.50,
      status: 'Active'
    }
  ];

  const repaymentHistory = [
    { id: 'pay-1', date: '2026-09-15', amountUSD: 459.50, method: 'Bakong KHQR', ref: 'KHQR-992144', status: 'Paid' },
    { id: 'pay-2', date: '2026-08-15', amountUSD: 459.50, method: 'Cash', ref: 'RCT-00192', status: 'Paid' },
    { id: 'pay-3', date: '2026-07-15', amountUSD: 459.50, method: 'Bank Transfer', ref: 'ABA-88231', status: 'Paid' }
  ];

  const collateralDocs = [
    {
      id: 'doc-1',
      title: 'National Cambodian ID Card (Front & Back)',
      category: 'Identity Proof',
      uploadedAt: '12 Jan 2026',
      preview: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'doc-2',
      title: 'Vehicle Registration Title (Toyota Prius 2015)',
      category: 'Collateral Vehicle',
      uploadedAt: '15 Jan 2026',
      preview: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'doc-3',
      title: 'Residential Property Hard Title Deed',
      category: 'Real Estate Title',
      uploadedAt: '15 Jan 2026',
      preview: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80'
    }
  ];

  const guarantor = {
    nameEn: 'Vanna Chan',
    nameKh: 'ចាន់ វណ្ណា',
    relationship: 'Sibling / Business Partner',
    phone: '017 889 911',
    nationalId: '010554921',
    address: 'Street 310, Boeung Keng Kang, Phnom Penh',
    monthlyIncomeUSD: 1800.00,
    employer: 'Royal Phnom Penh Logistics Co.'
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Borrower Directory</span>
        </button>
      )}

      {/* TOP SUMMARY BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-400 p-[2px] shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-emerald-400">
                {borrower.nameEn.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white">{borrower.nameEn}</h1>
                <span className="text-sm font-medium text-amber-400">({borrower.nameKh})</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {borrower.creditTier}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> KYC Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 mt-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>National ID: <strong className="text-slate-200">{borrower.nationalId}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Phone: <strong className="text-slate-200">{borrower.phone}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 sm:col-span-2 md:col-span-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  <span>Monthly Income: <strong className="text-emerald-400">${borrower.monthlyIncomeUSD.toLocaleString()}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 sm:col-span-2 md:col-span-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{borrower.address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Pillar */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 text-xs shrink-0">
            <div>
              <span className="text-slate-500 block">Active Loans</span>
              <span className="text-lg font-black text-white">{borrower.activeLoansCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Outstanding</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                <CurrencyDisplay amount={borrower.outstandingBalanceUSD} currency="USD" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/60 overflow-x-auto">
          {[
            { id: 'loans', label: 'Active Loans' },
            { id: 'history', label: 'Repayment History' },
            { id: 'collateral', label: 'Collateral & Documents' },
            { id: 'guarantor', label: 'Guarantor Details' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3.5 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: ACTIVE LOANS */}
          {activeTab === 'loans' && (
            <div className="space-y-4">
              {activeLoans.map(loan => (
                <div
                  key={loan.id}
                  className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">{loan.loanCode}</span>
                      <StatusBadge status={loan.status} size="sm" />
                    </div>
                    <p className="text-sm font-bold text-white">{loan.productName}</p>
                    <p className="text-xs text-slate-400">
                      Original: <CurrencyDisplay amount={loan.principalUSD} /> • {loan.termMonths} Months @ {loan.interestRate}%/mo
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Next Installment Due</span>
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        <CurrencyDisplay amount={loan.nextDueAmountUSD} />
                      </span>
                      <span className="text-[10px] text-slate-400 block">{loan.nextDueDate}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Remaining Balance</span>
                      <span className="text-sm font-black text-white font-mono">
                        <CurrencyDisplay amount={loan.balanceUSD} />
                      </span>
                    </div>

                    {onSelectLoan && (
                      <button
                        onClick={() => onSelectLoan(loan.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: REPAYMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Reference No.</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {repaymentHistory.map(row => (
                    <tr key={row.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-200">{row.date}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{row.ref}</td>
                      <td className="py-3 px-4 text-slate-300">{row.method}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        <CurrencyDisplay amount={row.amountUSD} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={row.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: COLLATERAL GALLERY */}
          {activeTab === 'collateral' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collateralDocs.map(doc => (
                <div
                  key={doc.id}
                  className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-lg group hover:border-slate-700 transition"
                >
                  <div className="h-40 overflow-hidden relative bg-slate-900">
                    <img
                      src={doc.preview}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/80 text-emerald-400 border border-slate-700">
                      {doc.category}
                    </div>
                  </div>
                  <div className="p-3.5">
                    <h4 className="text-xs font-bold text-white truncate">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Uploaded: {doc.uploadedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: GUARANTOR DETAILS */}
          {activeTab === 'guarantor' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 max-w-xl space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-sm">{guarantor.nameEn} ({guarantor.nameKh})</span>
                <span className="text-emerald-400 font-semibold">{guarantor.relationship}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-500 block">Phone:</span>
                  <span className="font-mono text-white">{guarantor.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">National ID:</span>
                  <span className="font-mono text-white">{guarantor.nationalId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Monthly Income:</span>
                  <span className="text-emerald-400 font-bold">${guarantor.monthlyIncomeUSD.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Employer:</span>
                  <span className="text-white">{guarantor.employer}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Address:</span>
                  <span className="text-white">{guarantor.address}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BorrowerProfile;
