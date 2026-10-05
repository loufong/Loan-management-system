import React, { useState } from 'react';
import { LoanApplication, UserRole, Currency } from '../../types';

export interface CreditReviewApprovalProps {
  application: LoanApplication;
  currentUserRole: UserRole;
  currentUserName: string;
  currency: Currency;
  onBack: () => void;
  onSubmitReview: (appId: string, rec: string, notes: string) => void;
  onExecutiveDecision: (appId: string, decision: 'APPROVED' | 'REJECTED', approvedTerms?: { amount: number; term: number; rate: number; reason?: string }) => void;
}

export const CreditReviewApproval: React.FC<CreditReviewApprovalProps> = ({
  application,
  currentUserRole,
  currentUserName,
  currency,
  onBack,
  onSubmitReview,
  onExecutiveDecision
}) => {
  // Document Inspector State
  const [activeDocTab, setActiveDocTab] = useState<'ID' | 'INCOME' | 'STATEMENT'>('ID');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Accordion Toggles
  const [personalInfoOpen, setPersonalInfoOpen] = useState(true);
  const [loanSummaryOpen, setLoanSummaryOpen] = useState(true);
  const [docInspectorOpen, setDocInspectorOpen] = useState(true);
  const [trackRecordOpen, setTrackRecordOpen] = useState(true);

  // Credit Officer Recommendation Form
  const [recommendation, setRecommendation] = useState<'Recommend Approval' | 'Recommend Rejection' | 'Request More Info' | 'Need More Information'>(
    application.creditOfficerReview?.recommendation || 'Recommend Approval'
  );

  const [assessmentNotes, setAssessmentNotes] = useState(
    application.creditOfficerReview?.notes ||
    'Borrower possesses verified graduate teaching assistant stipend. DTI ratio is within policy boundaries. Low probability of delinquency.'
  );
  const [isSigned, setIsSigned] = useState(!!application.creditOfficerReview?.signedAt);

  // Manager Committee Approval / Counter-Offer Form
  const [approvedAmount, setApprovedAmount] = useState<number>(
    application.committeeApproval?.approvedAmountUSD || application.requestedAmountUSD
  );
  const [approvedTerm, setApprovedTerm] = useState<number>(
    application.committeeApproval?.approvedTermMonths || application.requestedTermMonths
  );
  const [approvedRate, setApprovedRate] = useState<number>(
    application.committeeApproval?.approvedRate || 4.5
  );
  const [rejectionReason, setRejectionReason] = useState('High Debt-to-Income (DTI) ratio exceeds approved credit limits.');

  // Modals
  const [approveConfirmModalOpen, setApproveConfirmModalOpen] = useState(false);
  const [rejectConfirmModalOpen, setRejectConfirmModalOpen] = useState(false);

  const isManagerOrAdmin = currentUserRole === 'MANAGER';

  const formatMoney = (val: number) => {
    if (currency === 'KHR') {
      return new Intl.NumberFormat('km-KH', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 }).format(val * 4100);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const handleSignReview = () => {
    setIsSigned(true);
    onSubmitReview(application.id, recommendation, assessmentNotes);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            &larr;
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{application.applicationNo}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                application.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                application.status === 'UNDER_REVIEW' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                application.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {application.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">Applicant: <strong className="text-slate-800">{application.borrowerName}</strong> &bull; Submitted on {application.createdAt}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Requested:</span>
          <span className="text-base font-extrabold text-indigo-700">{formatMoney(application.requestedAmountUSD)}</span>
        </div>
      </div>

      {/* Split-Pane Underwriting Layout: 55% Left / 45% Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANE (55% width) — Applicant Dossier */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Accordion 1: Personal & Employment Information */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setPersonalInfoOpen(!personalInfoOpen)}
              className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-slate-900 bg-slate-50 border-b border-slate-200"
            >
              <span>1. Borrower Identity &amp; Stipend Verification</span>
              <span>{personalInfoOpen ? '▲' : '▼'}</span>
            </button>
            {personalInfoOpen && (
              <div className="p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Full Name</span>
                  <span className="font-bold text-slate-800">{application.borrowerName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Monthly Income / Stipend</span>
                  <span className="font-mono font-bold text-emerald-600">{formatMoney(application.borrowerIncomeUSD)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Academic Department</span>
                  <span className="text-slate-700">Graduate Teaching Fellow</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Guarantor</span>
                  <span className="text-slate-700">{application.guarantor?.fullName || 'Not Required'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Loan Request Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setLoanSummaryOpen(!loanSummaryOpen)}
              className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-slate-900 bg-slate-50 border-b border-slate-200"
            >
              <span>2. Loan Request Parameters &amp; Stated Purpose</span>
              <span>{loanSummaryOpen ? '▲' : '▼'}</span>
            </button>
            {loanSummaryOpen && (
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Requested Principal</span>
                    <strong className="text-slate-900">{formatMoney(application.requestedAmountUSD)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Proposed Term</span>
                    <strong className="text-slate-900">{application.requestedTermMonths} Months</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Payment Cycle</span>
                    <strong className="text-slate-900">{application.frequency}</strong>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Loan Academic Purpose</span>
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">{application.purpose}</p>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 3: Document Inspector with Zoom/Rotate Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setDocInspectorOpen(!docInspectorOpen)}
              className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-slate-900 bg-slate-50 border-b border-slate-200"
            >
              <span>3. Document Inspector (KYC &amp; Verification Evidence)</span>
              <span>{docInspectorOpen ? '▲' : '▼'}</span>
            </button>
            {docInspectorOpen && (
              <div className="p-4 space-y-3 text-xs">
                {/* Document Tab Switcher & Zoom/Rotate Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveDocTab('ID')}
                      className={`px-2 py-1 rounded font-bold transition ${activeDocTab === 'ID' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                    >
                      National ID
                    </button>
                    <button
                      onClick={() => setActiveDocTab('INCOME')}
                      className={`px-2 py-1 rounded font-bold transition ${activeDocTab === 'INCOME' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                    >
                      Stipend Slip
                    </button>
                    <button
                      onClick={() => setActiveDocTab('STATEMENT')}
                      className={`px-2 py-1 rounded font-bold transition ${activeDocTab === 'STATEMENT' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                    >
                      Bank Statement
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <button onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">-</button>
                    <span className="font-mono">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">+</button>
                    <button onClick={() => setRotation((r) => (r + 90) % 360)} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 ml-1">Rotate</button>
                  </div>
                </div>

                {/* Document Visual Viewer Canvas */}
                <div className="h-56 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center relative p-4">
                  <img
                    src={
                      activeDocTab === 'ID'
                        ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80'
                        : activeDocTab === 'INCOME'
                        ? 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80'
                        : 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
                    }
                    alt="Document Preview"
                    style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)`, transition: 'transform 0.15s ease' }}
                    className="max-h-full object-contain rounded shadow"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Accordion 4: Past Repayment Track Record */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setTrackRecordOpen(!trackRecordOpen)}
              className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-slate-900 bg-slate-50 border-b border-slate-200"
            >
              <span>4. Historical Lending Repayment Track Record</span>
              <span>{trackRecordOpen ? '▲' : '▼'}</span>
            </button>
            {trackRecordOpen && (
              <div className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="font-bold text-emerald-900">Historical On-Time Payment Score</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">100.0%</span>
                </div>
                <p className="text-[11px] text-slate-500">Applicant completed 1 prior academic microloan (LN-2025-0812) with 0 late installments.</p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT PANE (45% width) — Underwriting & Decision Workbench */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Automated Credit Scorecard Card with DTI Gauge */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Automated Risk Scorecard</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                application.dtiRatio <= 25
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : application.dtiRatio <= 40
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {application.riskTier}
              </span>
            </div>

            {/* DTI Gauge Bar Visual */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>Debt-to-Income (DTI) Ratio</span>
                <span className="font-mono font-bold text-slate-900">{application.dtiRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-2.5" style={{ width: '30%' }} title="Low Risk (< 30%)"></div>
                <div className="bg-amber-400 h-2.5" style={{ width: '20%' }} title="Medium Risk (30-50%)"></div>
                <div className="bg-rose-500 h-2.5" style={{ width: '50%' }} title="High Risk (> 50%)"></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0% Safe</span>
                <span>30% Cap</span>
                <span>50%+ Critical</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
              {application.dtiRatio <= 25
                ? 'Policy Evaluation: Recommended for standard fast-track approval.'
                : 'Policy Evaluation: Requires supervisor sign-off and stipend guarantor verification.'}
            </div>
          </div>

          {/* Credit Officer Recommendation Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Credit Officer Assessment</h3>
            
            <div className="space-y-1.5">
              <label className="block text-slate-600 font-semibold">Recommendation</label>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: 'Recommend Approval', label: 'Recommend Approval' },
                  { value: 'Recommend Rejection', label: 'Recommend Rejection' },
                  { value: 'Request More Info', label: 'Request Additional Documents' }
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="recommendation"
                      value={opt.value}
                      checked={recommendation === opt.value}
                      onChange={(e) => setRecommendation(e.target.value as any)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Underwriter Assessment Notes</label>
              <textarea
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleSignReview}
              className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isSigned
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              {isSigned ? '✓ Underwriting Recommendation Signed' : 'Sign & Submit Credit Review'}
            </button>
          </div>

          {/* Manager Approval Decision Box (Only visible to MANAGER and ADMIN) */}
          {isManagerOrAdmin && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Executive Committee Final Decision</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">Manager Clearance</span>
              </div>

              {/* Counter-Offer Overrides */}
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <label className="block text-slate-500 text-[10px] font-sans font-semibold mb-1">Approved Amount</label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-sans font-semibold mb-1">Term (Mos)</label>
                  <input
                    type="number"
                    value={approvedTerm}
                    onChange={(e) => setApprovedTerm(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-sans font-semibold mb-1">Approved APR %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setApproveConfirmModalOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Approve Loan Application
                </button>
                <button
                  onClick={() => setRejectConfirmModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Audit Trail Timeline */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
            <h4 className="font-bold text-slate-700">Approval Audit Trail</h4>
            <div className="border-l-2 border-slate-200 pl-3 space-y-2 text-[11px]">
              <div>
                <p className="font-bold text-slate-900">Dr. Sarah Chen (Credit Analyst)</p>
                <p className="text-slate-500">Submitted recommendation: Low-risk credit profile &bull; 2026-09-20 11:30</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">David Miller (Loan Officer)</p>
                <p className="text-slate-500">Initiated application intake and document upload &bull; 2026-09-20 09:15</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Dialog: Approval */}
      {approveConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white max-w-md w-full rounded-xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Confirm Formal Loan Approval</h3>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 font-mono">
              <p>Approved Principal: <strong>{formatMoney(approvedAmount)}</strong></p>
              <p>Approved Term: <strong>{approvedTerm} Months</strong></p>
              <p>Interest Rate: <strong>{approvedRate}% APR</strong></p>
            </div>
            <p className="text-xs text-slate-500">
              Upon approval, the Core Banking engine will generate the loan account and queue it for electronic disbursement by the Bursar Cashier.
            </p>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button onClick={() => setApproveConfirmModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">Cancel</button>
              <button
                onClick={() => {
                  setApproveConfirmModalOpen(false);
                  onExecutiveDecision(application.id, 'APPROVED', { amount: approvedAmount, term: approvedTerm, rate: approvedRate });
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold shadow-xs"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Rejection */}
      {rejectConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white max-w-md w-full rounded-xl p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="font-bold text-rose-700 text-sm">Confirm Formal Loan Rejection</h3>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Mandatory Regulatory Rejection Reason</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
              >
                <option>High Debt-to-Income (DTI) ratio exceeds approved credit limits (&gt;40%).</option>
                <option>Insufficient academic enrollment or stipend documentation.</option>
                <option>Unacceptable or speculative borrowing purpose.</option>
                <option>Adverse repayment track record on previous microloan accounts.</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRejectConfirmModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">Cancel</button>
              <button
                onClick={() => {
                  setRejectConfirmModalOpen(false);
                  onExecutiveDecision(application.id, 'REJECTED', { amount: 0, term: 0, rate: 0, reason: rejectionReason });
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
