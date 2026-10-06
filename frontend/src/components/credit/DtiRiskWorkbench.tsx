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
  Send,
  Building,
  DollarSign,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  X,
  History,
  Lock,
  Sliders
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
  const [trackRecordOpen, setTrackRecordOpen] = useState(true);

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
      'Applicant has stable verified income. Debt-to-Income ratio is within acceptable limits. Credit profile is satisfactory.'
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

  // DTI calculation
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
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-[8px] border border-[#CBD5E1]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-[6px] bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 transition-colors"
            title="Return to Credit Reviews"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-mono tracking-tight text-[#0F172A]">
                {application.applicationNo || application.id}
              </h1>
              <span className="text-xs font-semibold text-[#64748B]">Underwriting & DTI Workbench</span>
              <Badge variant="review" dot size="xs">
                {application.status}
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Borrower: <strong className="text-[#0F172A]">{application.borrowerName}</strong> • Target Product:{' '}
              <strong className="text-[#0F172A]">{application.productName}</strong>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider">
            Requested Capital
          </span>
          <MoneyText
            amount={application.requestedAmountUSD}
            currency={currency}
            className="text-lg font-bold text-[#0F172A]"
          />
        </div>
      </div>

      {/* 2. Split-Pane Layout: Left Pane 55%, Right Pane 45% */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT PANE (55% width) — Applicant Dossier */}
        <div className="w-full lg:w-[55%] space-y-4">
          {/* Card 0: Loan Request Summary */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <span>Loan Facility Request Summary</span>
              </span>
              <Badge variant="active" size="xs">
                {application.frequency || 'MONTHLY'} Schedule
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1] font-mono">
                <span className="text-[10px] text-[#64748B] block uppercase">Requested Amount</span>
                <MoneyText
                  amount={application.requestedAmountUSD}
                  currency={currency}
                  className="font-bold text-[#0F172A] text-xs mt-0.5 block"
                />
              </div>
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1] font-mono">
                <span className="text-[10px] text-[#64748B] block uppercase">Requested Tenure</span>
                <span className="font-bold text-[#0F172A] text-xs mt-0.5 block">
                  {application.requestedTermMonths} Months
                </span>
              </div>
              <div className="p-2.5 rounded-[6px] bg-slate-50 border border-[#CBD5E1] font-mono">
                <span className="text-[10px] text-[#64748B] block uppercase">Calculated DTI</span>
                <span className={`font-bold text-xs mt-0.5 block ${isDtiWarning ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
                  {application.dtiRatio}%
                </span>
              </div>
            </div>

            <div className="text-xs bg-slate-50 p-2.5 rounded-[6px] border border-[#CBD5E1]">
              <span className="font-semibold text-[#0F172A] block text-[11px]">Declared Credit Purpose:</span>
              <p className="text-[#64748B] italic mt-0.5">
                "{application.purpose || 'Working Capital & Inventory Expansion'}"
              </p>
            </div>
          </div>

          {/* Card 1: Borrower Profile & Employment */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
            <button
              onClick={() => setEmploymentOpen(!employmentOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-xs text-[#0F172A] bg-slate-50 border-b border-[#CBD5E1] hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#2563EB]" />
                <span>1. Borrower Profile & Employment Tenure</span>
              </div>
              {employmentOpen ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
            </button>

            {employmentOpen && (
              <div className="p-4 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Primary Employer</span>
                    <span className="font-semibold text-[#0F172A]">Ministry of Education / Royal University Institute</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Designation</span>
                    <span className="font-semibold text-[#0F172A]">Senior Systems Specialist & Researcher</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Tenure</span>
                    <span className="font-mono text-[#0F172A]">3 Years, 8 Months (Tenured Permanent)</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Classification</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Full-time Civil Service / Enterprise
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Income & Cashflow */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
            <button
              onClick={() => setIncomeOpen(!incomeOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-xs text-[#0F172A] bg-slate-50 border-b border-[#CBD5E1] hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#16A34A]" />
                <span>2. Stated Monthly Income & Verified Inflow</span>
              </div>
              {incomeOpen ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
            </button>

            {incomeOpen && (
              <div className="p-4 space-y-2 text-xs">
                <div className="divide-y divide-[#CBD5E1]">
                  <div className="py-1.5 flex justify-between">
                    <span className="text-[#64748B]">Base Monthly Salary</span>
                    <MoneyText amount={1450.0} currency="USD" className="font-semibold text-[#0F172A]" />
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-[#64748B]">Specialized Grants & Consulting</span>
                    <MoneyText amount={400.0} currency="USD" className="font-semibold text-[#0F172A]" />
                  </div>
                  <div className="py-2 flex justify-between bg-slate-50 px-2.5 rounded-[4px] font-bold mt-1">
                    <span className="text-[#0F172A]">Total Verified Monthly Income</span>
                    <MoneyText
                      amount={application.borrowerIncomeUSD || 1850.0}
                      currency="USD"
                      className="text-[#16A34A] text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Document Inspector */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <span className="font-semibold text-xs text-[#0F172A]">
                  3. Supporting Document Inspector
                </span>
              </div>

              {/* Document Tabs */}
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
                    className={`px-2 py-0.5 text-xs rounded-[4px] font-semibold transition-colors border ${
                      activeEvidenceDoc === tab.id
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="px-3 py-1.5 bg-slate-50 border-b border-[#CBD5E1] flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-mono text-[10px]">
                Zoom: {Math.round(docZoom * 100)}% • Rotation: {docRotation}°
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1 rounded-[4px] bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1 rounded-[4px] bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded-[4px] bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] transition-colors"
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
                  className="p-1 rounded-[4px] bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] transition-colors"
                  title="Reset View"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Preview Surface */}
            <div className="p-3">
              <div className="h-64 bg-slate-100 rounded-[6px] border border-[#CBD5E1] overflow-hidden relative flex items-center justify-center">
                <div
                  style={{
                    transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                    transition: 'transform 0.15s ease-out',
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
                    alt="Document Preview"
                    className="max-h-full max-w-full object-contain rounded-[4px]"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#64748B] mt-2 font-mono">
                <span>SHA-256: 4a2d89b19e2c4...e18b</span>
                <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Digital Verification Sealed
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Historical Repayment Track Record */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] overflow-hidden">
            <button
              onClick={() => setTrackRecordOpen(!trackRecordOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-xs text-[#0F172A] bg-slate-50 border-b border-[#CBD5E1] hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#2563EB]" />
                <span>4. Historical Repayment Performance</span>
              </div>
              {trackRecordOpen ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
            </button>

            {trackRecordOpen && (
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-emerald-50 rounded-[4px] border border-emerald-200">
                    <span className="text-[10px] text-[#16A34A] font-bold block uppercase">On-Time Rate</span>
                    <span className="text-sm font-bold text-[#16A34A] font-mono">100.0%</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-[4px] border border-[#CBD5E1]">
                    <span className="text-[10px] text-[#64748B] font-bold block uppercase">Delinquency</span>
                    <span className="text-sm font-bold text-[#0F172A] font-mono">0 DPD</span>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-[4px] border border-[#CBD5E1]">
                    <span className="text-[10px] text-[#0F172A] font-bold block uppercase">Bureau Tier</span>
                    <span className="text-sm font-bold text-[#0F172A] font-mono">Prime A1</span>
                  </div>
                </div>

                <div className="border border-[#CBD5E1] rounded-[6px] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-[#64748B] border-b border-[#CBD5E1]">
                      <tr>
                        <th className="py-2 px-3">Prior Facility</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Term</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CBD5E1] text-[11px]">
                      <tr>
                        <td className="py-2 px-3 font-mono font-semibold text-[#0F172A]">LN-2025-0019</td>
                        <td className="py-2 px-3 font-mono">$5,000.00</td>
                        <td className="py-2 px-3">12 Months</td>
                        <td className="py-2 px-3">
                          <span className="text-[#16A34A] font-semibold">Closed • Fully Settled</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono font-semibold text-[#0F172A]">LN-2024-0082</td>
                        <td className="py-2 px-3 font-mono">$2,500.00</td>
                        <td className="py-2 px-3">6 Months</td>
                        <td className="py-2 px-3">
                          <span className="text-[#16A34A] font-semibold">Closed • Fully Settled</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE (45% width) — Underwriting & Decision Workbench */}
        <div className="w-full lg:w-[45%] space-y-4">
          {/* Card 1: Automated Credit Scorecard */}
          <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                <span>Automated Credit Scorecard</span>
              </span>

              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] uppercase border ${
                  dtiTier === 'LOW RISK'
                    ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                    : dtiTier === 'MEDIUM RISK'
                    ? 'bg-amber-50 text-[#D97706] border-amber-200'
                    : 'bg-red-50 text-[#DC2626] border-red-200'
                }`}
              >
                {dtiTier}
              </span>
            </div>

            {/* DTI Gauge */}
            <div className="p-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-semibold block">
                    Underwriting DTI Ratio
                  </span>
                  <span className="text-2xl font-mono font-bold text-[#0F172A]">
                    {dti}%
                  </span>
                </div>
                <span className="text-xs font-mono text-[#64748B]">
                  Regulatory Ceiling: <strong className="text-[#0F172A]">40.0%</strong>
                </span>
              </div>

              {/* Gauge Bar */}
              <div className="h-2 w-full bg-slate-200 rounded-[2px] overflow-hidden">
                <div
                  className={`h-full ${
                    dti <= 30
                      ? 'bg-[#16A34A]'
                      : dti <= 40
                      ? 'bg-[#D97706]'
                      : 'bg-[#DC2626]'
                  }`}
                  style={{ width: `${Math.min(100, (dti / 60) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
                <span>0% Prime</span>
                <span className="text-[#D97706]">30% Moderate</span>
                <span className="text-[#DC2626]">&gt;40% Subprime</span>
              </div>
            </div>

            {/* Rules Checklist */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block">
                Rule Clearance Engine
              </span>
              {ruleChecks.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-2 p-2 rounded-[6px] bg-slate-50 border border-[#CBD5E1] text-xs"
                >
                  {rule.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-[#0F172A] block text-[11px]">{rule.label}</span>
                    <span className="text-[10px] text-[#64748B]">{rule.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Officer Recommendation Form */}
          <form
            onSubmit={handleOfficerSubmit}
            className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 space-y-3"
          >
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">
                Credit Officer Recommendation
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Signed by Underwriter: <strong className="text-[#0F172A]">{currentUserName}</strong>
              </p>
            </div>

            {/* Radio Selector */}
            <div className="space-y-1.5">
              {[
                {
                  id: 'rec-approve',
                  value: 'Recommend Approval',
                  label: 'Recommend Approval',
                  color: 'text-[#16A34A]',
                  desc: 'Eligible for committee authorization'
                },
                {
                  id: 'rec-more-info',
                  value: 'Need More Information',
                  label: 'Need More Info',
                  color: 'text-[#D97706]',
                  desc: 'Request additional collateral or payroll verification'
                },
                {
                  id: 'rec-reject',
                  value: 'Recommend Rejection',
                  label: 'Recommend Rejection',
                  color: 'text-[#DC2626]',
                  desc: 'High default risk or excessive leverage profile'
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-[6px] border cursor-pointer transition-colors ${
                    recommendation === opt.value
                      ? 'border-[#0F172A] bg-slate-50'
                      : 'border-[#CBD5E1] hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value={opt.value}
                    checked={recommendation === opt.value}
                    onChange={(e) => setRecommendation(e.target.value as any)}
                    className="mt-0.5 text-[#0F172A] focus:ring-0"
                  />
                  <div>
                    <span className={`text-xs font-bold block ${opt.color}`}>{opt.label}</span>
                    <span className="text-[10px] text-[#64748B]">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-[#0F172A]">
                Assessment Notes & Credit Rationale
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter detailed credit rationale, mitigating strengths, or required conditions..."
                className="w-full p-2.5 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment to Committee</span>
            </button>
          </form>

          {/* Card 3: Manager Approval Box */}
          <div className="bg-[#0F172A] text-white rounded-[8px] p-4 border border-[#0F172A] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-xs font-bold text-white">Manager Approval Box</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-white/10 text-slate-300">
                Clearance Authority
              </span>
            </div>

            {!isManager ? (
              <div className="p-3 rounded-[6px] bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Executive final decision controls require Manager role authorization.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-300">
                  Calibrate finalized lending facility terms before issuing executive sign-off:
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Approved Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-300 block">
                      Approved Amt ($)
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-[4px] bg-white/10 border border-white/20 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  {/* Approved Term */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-300 block">
                      Approved Term (mo)
                    </label>
                    <input
                      type="number"
                      value={approvedTerm}
                      onChange={(e) => setApprovedTerm(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-[4px] bg-white/10 border border-white/20 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  {/* Approved Rate */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-300 block">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={approvedRate}
                      onChange={(e) => setApprovedRate(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-[4px] bg-white/10 border border-white/20 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Decision Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectReasonModal(true)}
                    className="py-2 px-3 rounded-[6px] bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Reject Loan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowApproveConfirmModal(true)}
                    className="py-2 px-3 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-[8px] max-w-md w-full p-5 border border-[#CBD5E1] shadow-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Approve Facility Authorization</h3>
                <p className="text-[11px] text-[#64748B]">Confirm committee sanction for this credit application.</p>
              </div>
            </div>

            <div className="p-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Applicant:</span>
                <span className="font-bold text-[#0F172A]">{application.borrowerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Sanctioned Amount:</span>
                <span className="font-bold text-[#16A34A]">${approvedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Tenure & Pricing:</span>
                <span className="font-bold text-[#0F172A]">{approvedTerm} Months @ {approvedRate}% p.a.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBD5E1]">
              <button
                type="button"
                onClick={() => setShowApproveConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 text-xs font-semibold rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Disburse</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {showRejectReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-[8px] max-w-md w-full p-5 border border-[#CBD5E1] shadow-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-red-50 text-[#DC2626] border border-red-200 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Mandatory Rejection Documentation</h3>
                <p className="text-[11px] text-[#64748B]">National Bank of Cambodia requires documented adverse action.</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Primary Rejection Cause</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-2.5 h-9 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="HIGH_DTI">Excessive Debt-to-Income Ratio (&gt; 40%)</option>
                  <option value="INSUFFICIENT_INCOME">Stated Inflows Below Product Qualification Floor</option>
                  <option value="ADVERSE_CREDIT_BUREAU">CBC Historical Delinquency / Negative Record</option>
                  <option value="COLLATERAL_DEFICIENCY">Inadequate Collateral or Guarantor Solvency</option>
                  <option value="COMPLIANCE_KYC_FAILURE">Incomplete or Unverified KYC Identity Artifacts</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Adverse Committee Explanation <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Document specific committee findings and risk mitigation failures..."
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBD5E1]">
              <button
                type="button"
                onClick={() => setShowRejectReasonModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-1.5 text-xs font-semibold rounded-[6px] bg-[#DC2626] hover:bg-red-700 text-white transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
