import React from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  ShieldCheck
} from 'lucide-react';

export interface BorrowerDetailModalProps {
  borrower: any;
  onClose: () => void;
  onAddLoan?: (borrower: any) => void;
}

export const BorrowerDetailModal: React.FC<BorrowerDetailModalProps> = ({
  borrower,
  onClose,
  onAddLoan
}) => {
  if (!borrower) return null;

  const totalDebt = borrower.totalDebtUSD || 3850;
  const isOverdue = borrower.status === 'OVERDUE' || borrower.riskStatus === 'HIGH';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg">
              {(borrower.nameEn || borrower.name || 'B')[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {borrower.nameEn || borrower.name || 'Borrower Profile'}
                </h3>
                {borrower.nameKh && (
                  <span className="text-xs text-slate-400 font-khmer">({borrower.nameKh})</span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Code: {borrower.code || 'BOR-2026-0001'} • National ID: {borrower.nationalId || '010293847'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* KYC & Identity Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              KYC & Identity Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Primary Phone
                </span>
                <div className="text-sm font-mono font-bold text-white">{borrower.phone || '012 345 678'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Residential Address
                </span>
                <div className="text-sm text-white truncate">{borrower.address || 'Sangkat Boeung Keng Kang I, Phnom Penh'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Monthly Income</span>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  ${(borrower.monthlyIncomeUSD || 1200).toLocaleString()} / month
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Risk Assessment</span>
                <div>
                  {isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" /> High Risk (Overdue)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* National ID Card Preview Placeholder */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              National ID Card Document Preview
            </h4>
            <div className="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-slate-500" />
              <div className="text-xs font-mono text-slate-300">
                CAMBODIAN NATIONAL ID: {borrower.nationalId || '010293847'}
              </div>
              <p className="text-[11px] text-slate-500">Verified by Biometric OCR on 2026-01-10</p>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Guarantor & Emergency Contact
            </h4>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-white">Sokhom Pich (Spouse)</div>
                <div className="text-slate-400 font-mono">012 998 776 • Phnom Penh</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">Guarantor Verified</span>
            </div>
          </div>

          {/* Active Lending Contracts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Contracts ({borrower.activeLoansCount || 1})
              </h4>
              <div className="text-xs font-mono font-bold text-white">
                Total Debt: ${totalDebt.toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white font-mono">LN-2026-0042 • Personal Facility</div>
                <div className="text-xs text-slate-400">Disbursed $5,000 • 12 Months • 1.5% Reducing</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              if (onAddLoan) onAddLoan(borrower);
            }}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
          >
            + Add New Loan
          </button>
        </div>
      </div>
    </div>
  );
};

export default BorrowerDetailModal;
