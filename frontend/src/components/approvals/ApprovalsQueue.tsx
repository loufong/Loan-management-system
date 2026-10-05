import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  AlertTriangle,
  X,
  Lock,
  UserCheck,
  FileCheck
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

  const isManagerOrAdmin = currentUserRole === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* 1. Header with Audience Callout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Executive Approvals Queue
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {pendingApprovals.length} actionable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Target Audience: Credit Committee Members and Risk Managers. Direct authorization ledger.
          </p>
        </div>
      </div>

      {/* 2. Dense Table Queue */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Borrower Name</th>
                <th className="py-3.5 px-4 text-right">Requested vs Recommended</th>
                <th className="py-3.5 px-4 text-center">Interest Rate</th>
                <th className="py-3.5 px-4">Reviewer Note &amp; Recommendation</th>
                <th className="py-3.5 px-4 text-center">SLA Timer</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-right">Direct Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-slate-800 text-sm">No applications pending approval</p>
                      <p>All submitted loan files have received committee resolution.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((app) => {
                  const rec = app.creditOfficerReview?.recommendation || 'Recommend Approval';
                  const isPositive = rec === 'Recommend Approval';
                  return (
                    <tr
                      key={app.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                    >
                      {/* Application ID */}
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-indigo-600">
                        {app.applicationNo || app.id}
                      </td>

                      {/* Borrower Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {app.borrowerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block truncate">
                              {app.borrowerName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              DTI: {app.dtiRatio}%
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Requested vs Recommended Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="space-y-0.5">
                          <MoneyText
                            amount={app.requestedAmountUSD}
                            currency={currency}
                            className="font-bold text-slate-900 block"
                          />
                          <span className="text-[11px] text-emerald-600 font-mono block">
                            Rec: <MoneyText amount={app.requestedAmountUSD} currency={currency} />
                          </span>
                        </div>
                      </td>

                      {/* Interest Rate */}
                      <td className="py-3.5 px-4 text-center font-mono tabular-nums text-xs font-semibold text-slate-800">
                        10.5% p.a.
                      </td>

                      {/* Reviewer's Note & Recommendation */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <Badge variant={isPositive ? 'approved' : 'rejected'} size="xs">
                            {rec}
                          </Badge>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            "{app.creditOfficerReview?.notes || 'Standard underwriting verified.'}"
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            By {app.creditOfficerReview?.reviewerName || 'Dr. Sarah Chen'}
                          </span>
                        </div>
                      </td>

                      {/* SLA Timer */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>02:45h left</span>
                        </span>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {app.createdAt}
                      </td>

                      {/* Direct Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openApproveModal(app)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openRejectModal(app)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVAL MODAL */}
      {selectedAppForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Committee Loan Approval Sign-off
                  </h3>
                  <p className="text-xs text-slate-500">
                    Authorize or customize disbursement terms for{' '}
                    <strong className="text-slate-700">{selectedAppForApproval.borrowerName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForApproval(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
              {/* Approved Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Approved Principal Amount (USD)
                </label>
                <input
                  type="number"
                  step={100}
                  required
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Approved Term & Interest Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Approved Term (Months)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={approvedTerm}
                    onChange={(e) => setApprovedTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={1}
                    required
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Audit notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Immutable Audit Disclaimer</span>
                </div>
                <p>
                  Approver Identity: <strong className="text-slate-800">{currentUserName}</strong> ({currentUserRole})
                  <br />
                  Timestamp: <span className="font-mono text-slate-700">{new Date().toISOString()}</span>.
                  Executing this action commits funds to the core banking ledger.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAppForApproval(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Mandatory Application Rejection Record
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document formal reason code for {selectedAppForRejection.borrowerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForRejection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Rejection Reason Code
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  <option value="HIGH_DTI">Excessive Debt-to-Income Ratio (&gt; 40%)</option>
                  <option value="INSUFFICIENT_INCOME">Unverified or Insufficient Stated Cashflow</option>
                  <option value="CBC_DELINQUENCY">Adverse Credit Bureau (CBC) Delinquency Record</option>
                  <option value="UNVERIFIED_KYC">Incomplete Identity or Fraud Risk Suspected</option>
                  <option value="SPECULATIVE_PURPOSE">Non-compliant / Speculative Borrowing Purpose</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Formal Committee Explanation Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Enter specific audit explanation and guidance for applicant..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Audit notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audit Trail Notice</span>
                </div>
                <p>
                  Recorded by: <strong className="text-slate-800">{currentUserName}</strong> on{' '}
                  <span className="font-mono text-slate-700">{new Date().toLocaleDateString()}</span>.
                  Official rejection notification will be generated.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAppForRejection(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
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
