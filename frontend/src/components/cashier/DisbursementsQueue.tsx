import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  Landmark,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  Building,
  Banknote,
  Search,
  X,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';

export interface DisbursementsQueueProps {
  applications: LoanApplication[];
  currency: Currency;
  currentUserRole: UserRole;
  currentUserName: string;
  onDisbursementComplete: () => void;
  onNavigateToLoan?: (loanId: string) => void;
}

export const DisbursementsQueue: React.FC<DisbursementsQueueProps> = ({
  applications,
  currency,
  currentUserRole,
  currentUserName,
  onDisbursementComplete,
  onNavigateToLoan
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [disbursementMethod, setDisbursementMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [disbursementRef, setDisbursementRef] = useState(`DISB-${Date.now().toString().slice(-6)}`);
  const [firstPaymentDate, setFirstPaymentDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Applications approved and ready for fund release
  const approvedPendingDisbursement = applications.filter((a) => {
    const isApproved = a.status === 'APPROVED';
    const matchesSearch =
      !searchQuery.trim() ||
      a.applicationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.productName.toLowerCase().includes(searchQuery.toLowerCase());
    return isApproved && matchesSearch;
  });

  const handleOpenDisburseModal = (app: LoanApplication) => {
    setSelectedApp(app);
    setDisbursementRef(`DISB-${Date.now().toString().slice(-6)}`);
    setErrorMessage(null);
  };

  const handleExecuteDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.disburseLoan(selectedApp.id, {
        disbursementMethod,
        disbursementReference: disbursementRef,
        firstPaymentDate,
        notes: notes || `Disbursed by ${currentUserName}`,
      });

      alert(`Funds disbursed successfully for ${selectedApp.applicationNo}! Facility activated.`);
      setSelectedApp(null);
      onDisbursementComplete();
      if (res?.loan?.id && onNavigateToLoan) {
        onNavigateToLoan(res.loan.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disburse loan. Please check server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Loan Disbursement Operations Desk
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {approvedPendingDisbursement.length} Facilities Ready
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Execute final capital disbursements for committee-approved loan applications and generate initial amortized repayment schedules.
          </p>
        </div>
      </div>

      {/* 2. Filter & Search */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approved applications, borrowers, products..."
            className="w-full h-9 pl-8 pr-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <div className="text-xs text-[#64748B]">
          Authorized Treasury Staff: <span className="font-semibold text-[#0F172A]">{currentUserName}</span>
        </div>
      </div>

      {/* 3. Approved Facilities Queue */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Sanctioned Applications Pending Disbursement
            </h3>
          </div>
        </div>

        {approvedPendingDisbursement.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-[#0F172A]">Disbursement Queue Cleared</p>
            <p>There are no sanctioned applications currently awaiting capital release.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>Application #</th>
                  <th>Borrower</th>
                  <th>Product</th>
                  <th className="text-right">Sanctioned Amount</th>
                  <th>Tenure</th>
                  <th>Sanctioned By</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {approvedPendingDisbursement.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="font-mono font-bold text-[#2563EB]">{app.applicationNo}</td>
                    <td>
                      <div className="font-semibold text-[#0F172A]">{app.borrowerName}</div>
                      <div className="text-[11px] font-mono text-[#64748B]">{app.borrowerId}</div>
                    </td>
                    <td className="text-[#0F172A]">{app.productName}</td>
                    <td className="text-right font-bold text-[#0F172A]">
                      <MoneyText
                        amount={app.committeeApproval?.approvedAmountUSD || app.requestedAmountUSD}
                        currency={currency}
                      />
                    </td>
                    <td className="text-[#64748B]">
                      {app.committeeApproval?.approvedTermMonths || app.requestedTermMonths} Months
                    </td>
                    <td>
                      <div className="text-[#0F172A]">{app.committeeApproval?.approverName || 'Executive Committee'}</div>
                      <div className="text-[10px] text-[#64748B]">
                        {app.committeeApproval?.decidedAt ? new Date(app.committeeApproval.decidedAt).toLocaleDateString() : 'Approved'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">APPROVED</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleOpenDisburseModal(app)}
                        className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-[6px] transition-colors inline-flex items-center gap-1.5"
                      >
                        <Landmark className="w-3.5 h-3.5" />
                        <span>Disburse</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Execution Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-[8px] max-w-lg w-full border border-[#CBD5E1] shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#CBD5E1] bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">
                    Execute Loan Capital Release
                  </h3>
                  <p className="text-[11px] text-[#64748B] font-mono">{selectedApp.applicationNo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteDisbursement} className="p-5 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Facility Summary */}
              <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Borrower:</span>
                  <span className="font-semibold text-[#0F172A]">{selectedApp.borrowerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Loan Product:</span>
                  <span className="font-semibold text-[#0F172A]">{selectedApp.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Disbursement Principal:</span>
                  <span className="font-bold text-[#0F172A] text-sm">
                    <MoneyText
                      amount={selectedApp.committeeApproval?.approvedAmountUSD || selectedApp.requestedAmountUSD}
                      currency={currency}
                    />
                  </span>
                </div>
              </div>

              {/* Disbursement Method */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">Disbursement Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('BANK_TRANSFER')}
                    className={`p-2.5 rounded-[6px] border text-center font-medium transition-colors ${
                      disbursementMethod === 'BANK_TRANSFER'
                        ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                        : 'border-[#CBD5E1] bg-white text-[#0F172A]'
                    }`}
                  >
                    <Building className="w-4 h-4 mx-auto mb-1" />
                    <span>Bank Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('CASH')}
                    className={`p-2.5 rounded-[6px] border text-center font-medium transition-colors ${
                      disbursementMethod === 'CASH'
                        ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                        : 'border-[#CBD5E1] bg-white text-[#0F172A]'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mx-auto mb-1" />
                    <span>Cash Counter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('CHEQUE')}
                    className={`p-2.5 rounded-[6px] border text-center font-medium transition-colors ${
                      disbursementMethod === 'CHEQUE'
                        ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                        : 'border-[#CBD5E1] bg-white text-[#0F172A]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1" />
                    <span>Bank Cheque</span>
                  </button>
                </div>
              </div>

              {/* Reference # */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Treasury Reference # / Voucher ID
                </label>
                <input
                  type="text"
                  required
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* First Payment Due Date */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  First Installment Due Date
                </label>
                <input
                  type="date"
                  required
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Operational Notes */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Operational / Treasury Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Funds cleared via National Clearing House / Account #0012384"
                  className="w-full p-2 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBD5E1]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedApp(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Executing Transfer...' : 'Confirm & Disburse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
