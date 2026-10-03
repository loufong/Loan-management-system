import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Send,
  Building,
  DollarSign,
  CreditCard,
  UserCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  X,
  History,
  AlertTriangle,
  Lock,
  Sliders,
  Calendar,
  Percent
} from 'lucide-react';

export interface DtiRiskWorkbenchProps {
  application: LoanApplication;
  currency: Currency;
  currentUserRole: UserRole;
  currentUserName: string;
  onBack: () => void;
  onSubmitAssessment: (
    appId: string,
    recommendation: 'Recommend Approval' | 'Recommend Rejection' | 'Need More Information',
    notes: string
  ) => void;
  onExecutiveDecision?: (
    appId: string,
    decision: 'APPROVED' | 'REJECTED',
    terms?: { amount: number; term: number; rate: number; reason?: string }
  ) => void;
}

export const DtiRiskWorkbench: React.FC<DtiRiskWorkbenchProps> = ({
  application,
  currency,
  currentUserRole,
  currentUserName,
  onBack,
  onSubmitAssessment,
  onExecutiveDecision,
}) => {
  // Left Column: Collapsible Cards State
  const [employmentOpen, setEmploymentOpen] = useState(true);
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [obligationsOpen, setObligationsOpen] = useState(true);
  const [trackRecordOpen, setTrackRecordOpen] = useState(true);
  const [evidenceViewerOpen, setEvidenceViewerOpen] = useState(true);

  // Document Inspector State
  const [activeEvidenceDoc, setActiveEvidenceDoc] = useState<'paySlip' | 'idCard' | 'bankStatement'>('paySlip');
  const [docZoom, setDocZoom] = useState(1);
  const [docRotation, setDocRotation] = useState(0);

  // Right Column: Credit Officer Recommendation Form State
  const [recommendation, setRecommendation] = useState<
    'Recommend Approval' | 'Recommend Rejection' | 'Need More Information'
  >(
    (application.creditOfficerReview?.recommendation as any) || 'Recommend Approval'
  );
  const [reviewNotes, setReviewNotes] = useState(
    application.creditOfficerReview?.notes ||
      'Applicant possesses verified stable institutional income. Debt-to-Income is well aligned within regulatory tolerances. Clean credit bureau profile.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manager Approval Box State
  const [approvedAmount, setApprovedAmount] = useState<number>(application.requestedAmountUSD);
  const [approvedTerm, setApprovedTerm] = useState<number>(application.requestedTermMonths);
  const [approvedRate, setApprovedRate] = useState<number>(10.5);

  // Modals State
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('HIGH_DTI');
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Automated Rule Checks Checklist
  const ruleChecks = [
    { id: 'rule-1', label: 'Minimum Stated Income Met (> $500/mo)', passed: true, note: `Applicant verified at $${(application.borrowerIncomeUSD || 1850).toLocaleString()}/mo` },
    { id: 'rule-2', label: 'National ID & Biometric Verification Validated', passed: true, note: 'NBC / Ministry of Interior ID match verified' },
    { id: 'rule-3', label: 'Age Eligibility (Between 18 and 65)', passed: true, note: 'Applicant verified eligible (28 years)' },
    { id: 'rule-4', label: 'Clean Repayment History / Zero Delinquencies', passed: true, note: 'Zero 30+ DPD incidents in CBC credit registry' },
    { id: 'rule-5', label: 'Regulatory DTI Ceilings (< 40.0% threshold)', passed: application.dtiRatio <= 40, note: `Calculated DTI is ${application.dtiRatio}%` },
  ];

  // DTI Gauge calculation
  const dti = application.dtiRatio || 24.5;
  const isDtiWarning = dti > 40.0;
  const dtiTier: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' =
    dti <= 30 ? 'LOW RISK' : dti <= 45 ? 'MEDIUM RISK' : 'HIGH RISK';

  const handleOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmitAssessment(application.id, recommendation, reviewNotes);
  };

  const handleConfirmApproval = () => {
    if (onExecutiveDecision) {
      onExecutiveDecision(application.id, 'APPROVED', {
        amount: approvedAmount,
        term: approvedTerm,
        rate: approvedRate,
        reason: 'Authorized by Executive Credit Committee'
      });
    } else {
      alert(`Loan #${application.id} approved for $${approvedAmount.toLocaleString()} at ${approvedRate}% p.a.`);
    }
    setShowApproveConfirmModal(false);
    onBack();
  };

  const handleConfirmRejection = () => {
    if (!rejectionNotes.trim()) {
      alert('A formal, documented rejection explanation is required by regulatory mandate.');
      return;
    }
    if (onExecutiveDecision) {
      onExecutiveDecision(application.id, 'REJECTED', {
        amount: 0,
        term: 0,
        rate: 0,
        reason: `[${rejectionReason}] ${rejectionNotes}`
      });
    } else {
      alert(`Loan #${application.id} rejected. Reason: ${rejectionReason}`);
    }
    setShowRejectReasonModal(false);
    onBack();
  };

  const isManager = currentUserRole === 'MANAGER';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Breadcrumb & ID */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
            title="Return to Credit Reviews"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
                {application.applicationNo || application.id}
              </h1>
              <span className="text-sm font-semibold text-slate-500">Underwriting &amp; DTI Workbench</span>
              <Badge variant="review" dot>
                {application.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Borrower: <strong className="text-slate-800">{application.borrowerName}</strong> • Target Product:{' '}
              <strong className="text-slate-800">{application.productName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Requested Capital
            </span>
            <MoneyText
              amount={application.requestedAmountUSD}
              currency={currency}
              className="text-xl font-black text-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 2. Split-Pane Layout: Left Pane 55%, Right Pane 45% */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ================================================================= */}
        {/* LEFT PANE (55% width) — Applicant Dossier                         */}
        {/* ================================================================= */}
        <div className="w-full lg:w-[55%] space-y-5">
          {/* Card 0: Loan Request Summary */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Loan Facility Request Summary</span>
              </span>
              <Badge variant="active" size="xs">
                {application.frequency || 'MONTHLY'} Schedule
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-mono">
                <span className="text-[11px] text-slate-400 block">Requested Amount</span>
                <MoneyText
                  amount={application.requestedAmountUSD}
                  currency={currency}
                  className="font-bold text-slate-900 text-sm mt-0.5 block"
                />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-mono">
                <span className="text-[11px] text-slate-400 block">Requested Tenure</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {application.requestedTermMonths} Months
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-mono">
                <span className="text-[11px] text-slate-400 block">Calculated DTI</span>
                <span className={`font-bold text-sm mt-0.5 block ${isDtiWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {application.dtiRatio}%
                </span>
              </div>
            </div>

            <div className="text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-700 block text-[11px]">Declared Credit Purpose:</span>
              <p className="text-slate-600 italic mt-0.5">
                "{application.purpose || 'Working Capital & Inventory Expansion'}"
              </p>
            </div>
          </div>

          {/* Card 1: Borrower Profile & Employment Tenure */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
            <button
              onClick={() => setEmploymentOpen(!employmentOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>1. Borrower Profile &amp; Employment Tenure</span>
              </div>
              {employmentOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {employmentOpen && (
              <div className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Institutional Employer</span>
                    <span className="font-semibold text-slate-800">Ministry of Education / Royal University Institute</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Official Position / Designation</span>
                    <span className="font-semibold text-slate-800">Senior Systems Specialist &amp; Researcher</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employment Duration &amp; Tenure</span>
                    <span className="font-mono text-slate-800">3 Years, 8 Months (Tenured Permanent)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employment Classification</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Full-time Civil Service / Enterprise
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Stated Monthly Income & Cashflow */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
            <button
              onClick={() => setIncomeOpen(!incomeOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>2. Stated Monthly Income &amp; Verified Inflow</span>
              </div>
              {incomeOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {incomeOpen && (
              <div className="p-5 space-y-3 text-xs">
                <div className="divide-y divide-slate-100">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Base Institutional Monthly Salary</span>
                    <MoneyText amount={1450.0} currency="USD" className="font-semibold text-slate-900" />
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Secondary Specialized Consulting &amp; Grants</span>
                    <MoneyText amount={400.0} currency="USD" className="font-semibold text-slate-900" />
                  </div>
                  <div className="py-2.5 flex justify-between bg-slate-50/80 px-3 rounded-xl font-bold mt-1">
                    <span className="text-slate-900">Total Verified Monthly Income</span>
                    <MoneyText
                      amount={application.borrowerIncomeUSD || 1850.0}
                      currency="USD"
                      className="text-emerald-700 text-sm font-black"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Document Inspector with Zoom and Rotate Controls */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-900">
                  3. Supporting Document Inspector
                </span>
              </div>

              {/* Document Switcher Tabs */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'paySlip', label: 'Pay Slip' },
                    { id: 'idCard', label: 'National ID' },
                    { id: 'bankStatement', label: 'Bank Statement' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveEvidenceDoc(tab.id);
                      setDocZoom(1);
                      setDocRotation(0);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      activeEvidenceDoc === tab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom & Rotate Controls Toolbar */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono text-[11px] text-slate-400">
                Zoom: {Math.round(docZoom * 100)}% • Rotation: {docRotation}°
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocZoom(1);
                    setDocRotation(0);
                  }}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs transition-colors"
                  title="Reset View"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Render Surface with Zoom/Rotate Transform */}
            <div className="p-4">
              <div className="h-72 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
                <div
                  style={{
                    transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="w-full h-full flex items-center justify-center p-2"
                >
                  <img
                    src={
                      activeEvidenceDoc === 'paySlip'
                        ? 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=700&auto=format&fit=crop&q=80'
                        : activeEvidenceDoc === 'idCard'
                        ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=700&auto=format&fit=crop&q=80'
                        : 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700&auto=format&fit=crop&q=80'
                    }
                    alt="Document Inspection Preview"
                    className="max-h-full max-w-full object-contain rounded shadow-md"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
                <span>SHA-256: 4a2d89b19e2c4...e18b</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Digital Verification Sealed
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Past Repayment Performance Track Record */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
            <button
              onClick={() => setTrackRecordOpen(!trackRecordOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>4. Historical Repayment Performance &amp; Track Record</span>
              </div>
              {trackRecordOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {trackRecordOpen && (
              <div className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2.5 mb-2 text-center">
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block uppercase">On-Time Repayment</span>
                    <span className="text-base font-black text-emerald-800 font-mono">100.0%</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Delinquency Count</span>
                    <span className="text-base font-black text-slate-800 font-mono">0 DPD</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-indigo-700 font-bold block uppercase">CBC Bureau Tier</span>
                    <span className="text-base font-black text-indigo-800 font-mono">Prime A1</span>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Prior Facility</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Term</th>
                        <th className="py-2 px-3">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      <tr>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">LN-2025-0019</td>
                        <td className="py-2 px-3 font-mono">$5,000.00</td>
                        <td className="py-2 px-3">12 Months</td>
                        <td className="py-2 px-3">
                          <span className="text-emerald-700 font-bold">Closed • Fully Settled</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">LN-2024-0082</td>
                        <td className="py-2 px-3 font-mono">$2,500.00</td>
                        <td className="py-2 px-3">6 Months</td>
                        <td className="py-2 px-3">
                          <span className="text-emerald-700 font-bold">Closed • Fully Settled</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE (45% width) — Underwriting & Decision Workbench       */}
        {/* ================================================================= */}
        <div className="w-full lg:w-[45%] space-y-5">
          {/* Card 1: Automated Credit Scorecard Card */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Automated Credit Scorecard</span>
              </span>

              {/* Risk Classification Chip */}
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full uppercase border ${
                  dtiTier === 'LOW RISK'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                    : dtiTier === 'MEDIUM RISK'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
                    : 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                }`}
              >
                {dtiTier}
              </span>
            </div>

            {/* DTI Visual Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Underwriting DTI Ratio
                  </span>
                  <span className="text-3xl font-mono tabular-nums font-black text-slate-900">
                    {dti}%
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Regulatory Ceiling: <strong className="text-slate-700">40.0%</strong>
                </span>
              </div>

              {/* Gradient Gauge Bar */}
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    dti <= 30
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : dti <= 40
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-500 to-red-600'
                  }`}
                  style={{ width: `${Math.min(100, (dti / 60) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0% Prime</span>
                <span className="text-amber-600">30% Moderate</span>
                <span className="text-rose-600">&gt;40% Subprime</span>
              </div>
            </div>

            {/* Automated Rules Checklist */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Rule Clearance Engine
              </span>
              {ruleChecks.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                >
                  {rule.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 block">{rule.label}</span>
                    <span className="text-[11px] text-slate-400">{rule.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Credit Officer Recommendation */}
          <form
            onSubmit={handleOfficerSubmit}
            className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Credit Officer Recommendation
              </h3>
              <p className="text-xs text-slate-500">
                Signed by Underwriter: <strong className="text-slate-800">{currentUserName}</strong>
              </p>
            </div>

            {/* Radio Selector */}
            <div className="space-y-2">
              {[
                {
                  id: 'rec-approve',
                  value: 'Recommend Approval',
                  label: 'Recommend Approval',
                  color: 'text-emerald-700',
                  desc: 'Eligible for committee authorization'
                },
                {
                  id: 'rec-more-info',
                  value: 'Need More Information',
                  label: 'Need More Info',
                  color: 'text-amber-700',
                  desc: 'Request additional collateral or payroll verification'
                },
                {
                  id: 'rec-reject',
                  value: 'Recommend Rejection',
                  label: 'Recommend Rejection',
                  color: 'text-rose-700',
                  desc: 'High default risk or excessive leverage profile'
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    recommendation === opt.value
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value={opt.value}
                    checked={recommendation === opt.value}
                    onChange={(e) => setRecommendation(e.target.value as any)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className={`text-xs font-bold block ${opt.color}`}>{opt.label}</span>
                    <span className="text-[11px] text-slate-400">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Assessment Notes Textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Assessment Notes &amp; Credit Rationale
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter detailed credit rationale, mitigating strengths, or required conditions..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment to Committee</span>
            </button>
          </form>

          {/* Card 3: Manager Approval Box (Restricted to Manager Role) */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Manager Approval Box</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-indigo-200">
                Clearance Authority
              </span>
            </div>

            {!isManager ? (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Executive final decision controls require Manager role authorization.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-300">
                  Calibrate finalized lending facility terms before issuing executive sign-off:
                </p>

                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  {/* Approved Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-indigo-200 block">
                      Approved Amt ($)
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Approved Term */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-indigo-200 block">
                      Approved Term (mo)
                    </label>
                    <input
                      type="number"
                      value={approvedTerm}
                      onChange={(e) => setApprovedTerm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Approved Rate */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-indigo-200 block">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={approvedRate}
                      onChange={(e) => setApprovedRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                {/* 1-Click Executive Decision Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectReasonModal(true)}
                    className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Reject Loan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowApproveConfirmModal(true)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Loan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Approve Loan */}
      {showApproveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Facility Authorization</h3>
                <p className="text-xs text-slate-500">Confirm final committee sanction for this credit application.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{application.borrowerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sanctioned Amount:</span>
                <span className="font-bold text-emerald-700">${approvedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenure &amp; Pricing:</span>
                <span className="font-bold text-slate-800">{approvedTerm} Months @ {approvedRate}% p.a.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Disburse</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {showRejectReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mandatory Rejection Documentation</h3>
                <p className="text-xs text-slate-500">National Bank of Cambodia requires documented adverse action.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Rejection Cause</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="HIGH_DTI">Excessive Debt-to-Income Ratio (&gt; 40%)</option>
                  <option value="INSUFFICIENT_INCOME">Stated Inflows Below Product Qualification Floor</option>
                  <option value="ADVERSE_CREDIT_BUREAU">CBC Historical Delinquency / Negative Record</option>
                  <option value="COLLATERAL_DEFICIENCY">Inadequate Collateral or Guarantor Solvency</option>
                  <option value="COMPLIANCE_KYC_FAILURE">Incomplete or Unverified KYC Identity Artifacts</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mandatory Committee Adverse Explanation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Document specific committee findings and risk mitigation failures..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectReasonModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Confirm Formal Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
