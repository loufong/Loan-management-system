import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  X,
  Lock
} from 'lucide-react';

export interface ApprovalsQueueProps {
  applications: LoanApplication[];
  currency: Currency;
  currentUserRole: UserRole;
  currentUserName: string;
  onExecutiveDecision: (
    appId: string,
    decision: 'APPROVED' | 'REJECTED',
    terms?: { amount: number; term: number; rate: number; reason?: string }
  ) => void;
}

export const ApprovalsQueue: React.FC<ApprovalsQueueProps> = ({
  applications,
  currency,
  currentUserRole,
  currentUserName,
  onExecutiveDecision
}) => {
  // Only show applications pending executive sign-off
  const pendingApprovals = applications.filter(
    (a) => a.status === 'UNDER_REVIEW' || (a.status === 'SUBMITTED' && a.creditOfficerReview)
  );

  // Modals state
  const [selectedAppForApproval, setSelectedAppForApproval] = useState<LoanApplication | null>(null);
  const [selectedAppForRejection, setSelectedAppForRejection] = useState<LoanApplication | null>(null);

  // Approval terms adjustment form state
  const [approvedAmount, setApprovedAmount] = useState<number>(5000);
  const [approvedTerm, setApprovedTerm] = useState<number>(12);
  const [approvedRate, setApprovedRate] = useState<number>(10.5);

  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState<string>('HIGH_DTI');
  const [rejectionNote, setRejectionNote] = useState<string>('');

  const openApproveModal = (app: LoanApplication) => {
    setSelectedAppForApproval(app);
    setApprovedAmount(app.requestedAmountUSD);
    setApprovedTerm(app.requestedTermMonths);
    setApprovedRate(10.5);
  };

  const openRejectModal = (app: LoanApplication) => {
    setSelectedAppForRejection(app);
    setRejectionReason('HIGH_DTI');
    setRejectionNote('Applicant debt-to-income ratio exceeds approved credit limits.');
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForApproval) return;
    onExecutiveDecision(selectedAppForApproval.id, 'APPROVED', {
      amount: approvedAmount,
      term: approvedTerm,
      rate: approvedRate,
      reason: 'Approved by Executive Credit Committee'
    });
    setSelectedAppForApproval(null);
  };

  const handleConfirmRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForRejection) return;
    if (!rejectionNote.trim()) {
      alert('A formal rejection note is required.');
      return;
    }
    onExecutiveDecision(selectedAppForRejection.id, 'REJECTED', {
      amount: 0,
      term: 0,
      rate: 0,
      reason: `[${rejectionReason}] ${rejectionNote}`
    });
    setSelectedAppForRejection(null);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Credit Committee Approvals Queue
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
              {pendingApprovals.length} Actionable Files
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Credit Committee and Risk Manager authorization ledger. Sanction disbursements or record adverse determinations.
          </p>
        </div>
      </div>

      {/* 2. Table */}
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Borrower Name</th>
                <th className="text-right">Requested vs Recommended</th>
                <th className="text-center">Interest Rate</th>
                <th>Reviewer Assessment</th>
                <th className="text-center">SLA Clock</th>
                <th className="text-right">Committee Decision</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShieldCheck className="w-8 h-8 text-[#16A34A] mx-auto" />
                      <p className="font-semibold text-[#0F172A] text-sm">No applications pending approval</p>
                      <p>All submitted loan files have received committee resolution.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Application ID */}
                    <td className="font-mono tabular-nums font-bold text-[#2563EB]">
                      {app.applicationNo || app.id}
                    </td>

                    {/* Borrower */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {app.borrowerName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-[#0F172A]">{app.borrowerName}</span>
                      </div>
                    </td>

                    {/* Requested vs Recommended */}
                    <td className="text-right font-mono">
                      <span className="text-[#0F172A] font-bold block">
                        <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        rec: <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                      </span>
                    </td>

                    {/* Interest Rate */}
                    <td className="text-center font-mono font-bold text-[#0F172A]">
                      10.5%
                    </td>

                    {/* Reviewer Assessment */}
                    <td className="text-xs">
                      <p className="text-[#0F172A] line-clamp-1">
                        {app.creditOfficerReview?.notes || 'Acceptable DTI ratio under regulatory ceiling.'}
                      </p>
                      <span className="text-[11px] text-[#64748B]">
                        Analyst: {app.creditOfficerReview?.reviewerName || 'Underwriting Desk'}
                      </span>
                    </td>

                    {/* SLA Clock */}
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#D97706] bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>1.4 hrs remaining</span>
                      </span>
                    </td>

                    {/* Decision Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openApproveModal(app)}
                          className="px-2.5 py-1 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectModal(app)}
                          className="px-2.5 py-1 rounded-[6px] bg-[#DC2626] hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVAL MODAL */}
      {selectedAppForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Loan Sanction Authorization
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Sanction disbursement terms for <strong className="text-[#0F172A]">{selectedAppForApproval.borrowerName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForApproval(null)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Approved Principal Amount (USD)
                </label>
                <input
                  type="number"
                  step={100}
                  required
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono font-bold text-[#0F172A] text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Approved Term (Months)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={approvedTerm}
                    onChange={(e) => setApprovedTerm(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={1}
                    required
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px] space-y-1 text-[11px] text-[#64748B]">
                <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                  <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Immutable Audit Disclaimer</span>
                </div>
                <p>
                  Approver Identity: <strong className="text-[#0F172A]">{currentUserName}</strong> ({currentUserRole})
                  <br />
                  Timestamp: <span className="font-mono text-[#0F172A]">{new Date().toISOString().slice(0, 19)}</span>.
                  Executing this action commits funds to the active credit book.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBD5E1]">
                <button
                  type="button"
                  onClick={() => setSelectedAppForApproval(null)}
                  className="px-4 py-2 rounded-[6px] text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold transition"
                >
                  Confirm Authorization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {selectedAppForRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-red-50 text-[#DC2626] flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Application Rejection Determination
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Document formal reason code for {selectedAppForRejection.borrowerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForRejection(null)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Mandatory Rejection Reason Code
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="HIGH_DTI">Excessive Debt-to-Income Ratio (&gt; 40%)</option>
                  <option value="INSUFFICIENT_INCOME">Unverified or Insufficient Stated Cashflow</option>
                  <option value="CBC_DELINQUENCY">Adverse Credit Bureau (CBC) Delinquency Record</option>
                  <option value="UNVERIFIED_KYC">Incomplete Identity or Fraud Risk Suspected</option>
                  <option value="SPECULATIVE_PURPOSE">Non-compliant / Speculative Borrowing Purpose</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Formal Committee Explanation Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Enter specific audit explanation..."
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CBD5E1]">
                <button
                  type="button"
                  onClick={() => setSelectedAppForRejection(null)}
                  className="px-4 py-2 rounded-[6px] text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] bg-[#DC2626] hover:bg-rose-700 text-white font-semibold transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsQueue;
