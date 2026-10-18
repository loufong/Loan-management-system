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
  Building2,
  DollarSign,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  X,
  History,
  Lock,
  Sliders,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  FileCheck2,
  Calendar,
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
  // Collapsible sections
  const [employmentOpen, setEmploymentOpen] = useState(true);
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [trackRecordOpen, setTrackRecordOpen] = useState(true);

  // Document Inspector State
  const [activeEvidenceDoc, setActiveEvidenceDoc] = useState<'paySlip' | 'idCard' | 'bankStatement'>('paySlip');
  const [docZoom, setDocZoom] = useState(1);
  const [docRotation, setDocRotation] = useState(0);

  // Recommendation Form State
  const [recommendation, setRecommendation] = useState<
    'Recommend Approval' | 'Recommend Rejection' | 'Need More Information'
  >(
    (application.creditOfficerReview?.recommendation as any) || 'Recommend Approval'
  );
  const [reviewNotes, setReviewNotes] = useState(
    application.creditOfficerReview?.notes ||
      'Applicant has stable verified income. Debt-to-Income ratio is well within regulatory limits. Satisfactory credit track record.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Executive Decision State
  const [approvedAmount, setApprovedAmount] = useState<number>(application.requestedAmountUSD || 1000);
  const [approvedTerm, setApprovedTerm] = useState<number>(application.requestedTermMonths || 2);
  const [approvedRate, setApprovedRate] = useState<number>(9.5);

  // Modals
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('HIGH_DTI');
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Math-consistent income breakdown
  const verifiedMonthlyIncome = application.borrowerIncomeUSD && application.borrowerIncomeUSD > 0
    ? application.borrowerIncomeUSD
    : 1850;
  const baseSalary = Math.round(verifiedMonthlyIncome * 0.78);
  const consultingInflow = verifiedMonthlyIncome - baseSalary;

  // DTI calculation
  const dti = application.dtiRatio || 20;
  const isDtiWarning = dti > 40.0;
  const dtiTier: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' =
    dti <= 30 ? 'LOW RISK' : dti <= 40 ? 'MEDIUM RISK' : 'HIGH RISK';

  // Rule Clearance Items
  const ruleChecks = [
    {
      id: 'rule-1',
      label: 'Minimum Stated Income Floor',
      passed: true,
      badge: 'Verified',
      note: `Monthly inflow $${verifiedMonthlyIncome.toLocaleString()} exceeds minimum threshold ($500/mo)`,
    },
    {
      id: 'rule-2',
      label: 'National ID & Identity Validation',
      passed: true,
      badge: 'Passed',
      note: 'Verified against national credit bureau registry records',
    },
    {
      id: 'rule-3',
      label: 'Age & Tenure Qualification',
      passed: true,
      badge: 'Passed',
      note: 'Applicant age is within acceptable credit policy parameters (18-65)',
    },
    {
      id: 'rule-4',
      label: 'Repayment & Delinquency History',
      passed: true,
      badge: 'Zero Delinquency',
      note: 'Zero 30+ DPD overdue records across all historical accounts',
    },
    {
      id: 'rule-5',
      label: 'Regulatory Debt-to-Income Ceiling',
      passed: dti <= 40,
      badge: dti <= 40 ? `${dti}% ≤ 40%` : `${dti}% > 40%`,
      note: `Calculated facility DTI ratio is ${dti}% (Cap: 40.0%)`,
    },
  ];

  const handleOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmitAssessment(application.id, recommendation, reviewNotes);
    setIsSubmitting(false);
  };

  const handleConfirmApproval = () => {
    if (onExecutiveDecision) {
      onExecutiveDecision(application.id, 'APPROVED', {
        amount: approvedAmount,
        term: approvedTerm,
        rate: approvedRate,
        reason: 'Authorized by Executive Credit Committee',
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
        reason: `[${rejectionReason}] ${rejectionNotes}`,
      });
    } else {
      alert(`Loan #${application.id} rejected. Reason: ${rejectionReason}`);
    }
    setShowRejectReasonModal(false);
    onBack();
  };

  const isExecutive = currentUserRole === 'MANAGER' || currentUserRole === 'ADMIN';

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Clean Top Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2 rounded-[6px] bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-[#0F172A] transition-colors cursor-pointer shrink-0"
            title="Return to Pipeline"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm sm:text-base font-bold text-[#0F172A]">
                {application.applicationNo || application.id}
              </span>
              <span className="text-xs text-[#94A3B8]">•</span>
              <span className="text-xs font-semibold text-[#64748B]">Credit &amp; DTI Underwriting</span>
              <Badge variant={application.status === 'APPROVED' ? 'active' : 'review'} dot size="xs">
                {application.status}
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Applicant: <strong className="text-[#0F172A]">{application.borrowerName}</strong> &bull; Product:{' '}
              <strong className="text-[#0F172A]">{application.productName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:border-l sm:border-[#E2E8F0] sm:pl-5 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
              Requested Capital
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-[#0F172A]">
              ${application.requestedAmountUSD?.toLocaleString() || '1,000.00'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Split Layout (58% / 42%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 Cols / ~58%) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card: Facility Summary & Purpose */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Facility Request Summary
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-[4px] border border-blue-100">
                {application.frequency || 'MONTHLY'} Installments
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50/80 border border-[#E2E8F0] rounded-[6px] p-3">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Facility Amount</span>
                <span className="text-sm font-bold font-mono text-[#0F172A] mt-0.5 block">
                  ${application.requestedAmountUSD?.toLocaleString() || '1,000.00'}
                </span>
              </div>
              <div className="bg-slate-50/80 border border-[#E2E8F0] rounded-[6px] p-3">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Tenure</span>
                <span className="text-sm font-bold font-mono text-[#0F172A] mt-0.5 block">
                  {application.requestedTermMonths || 2} Months
                </span>
              </div>
              <div className="bg-slate-50/80 border border-[#E2E8F0] rounded-[6px] p-3">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Calculated DTI</span>
                <span className={`text-sm font-bold font-mono mt-0.5 block ${dti <= 40 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {dti}%
                </span>
              </div>
            </div>

            <div className="bg-slate-50/60 border border-[#E2E8F0] rounded-[6px] p-3 text-xs">
              <span className="text-[11px] font-semibold text-[#0F172A] block mb-0.5">
                Stated Loan Purpose:
              </span>
              <p className="text-[#475569] italic leading-relaxed">
                "{application.purpose || 'Short-term departmental bridge loan for research symposium registration'}"
              </p>
            </div>
          </div>

          {/* Card: Borrower Profile & Employment */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            <button
              onClick={() => setEmploymentOpen(!employmentOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-[#0F172A] bg-white hover:bg-slate-50 transition-colors border-b border-[#F1F5F9] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2563EB]" />
                <span>Borrower Profile &amp; Employment Tenure</span>
              </div>
              {employmentOpen ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
            </button>

            {employmentOpen && (
              <div className="p-4 sm:p-5 text-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-medium text-[#64748B] block">Primary Employer</span>
                    <span className="font-semibold text-[#0F172A] text-xs mt-0.5 block">
                      Ministry of Education / Royal University Institute
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[#64748B] block">Designation</span>
                    <span className="font-semibold text-[#0F172A] text-xs mt-0.5 block">
                      Senior Systems Specialist &amp; Researcher
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[#64748B] block">Tenure Duration</span>
                    <span className="font-mono text-[#0F172A] text-xs mt-0.5 block">
                      3 Years, 8 Months (Tenured Permanent)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[#64748B] block">Employment Classification</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A] text-xs mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Full-time Civil Service / Enterprise
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card: Verified Income Breakdown */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            <button
              onClick={() => setIncomeOpen(!incomeOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-[#0F172A] bg-white hover:bg-slate-50 transition-colors border-b border-[#F1F5F9] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#16A34A]" />
                <span>Stated Monthly Income &amp; Verified Inflow</span>
              </div>
              {incomeOpen ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
            </button>

            {incomeOpen && (
              <div className="p-4 sm:p-5 text-xs space-y-2.5">
                <div className="divide-y divide-[#F1F5F9]">
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[#64748B]">Base Monthly Salary</span>
                    <span className="font-mono font-semibold text-[#0F172A]">
                      ${baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[#64748B]">Specialized Grants &amp; Inflows</span>
                    <span className="font-mono font-semibold text-[#0F172A]">
                      ${consultingInflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center bg-slate-50 px-3 rounded-[6px] mt-1 font-bold">
                    <span className="text-[#0F172A]">Total Verified Monthly Inflow</span>
                    <span className="font-mono text-[#16A34A] text-sm">
                      ${verifiedMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card: Supporting Document Inspector */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            <div className="p-3.5 sm:p-4 bg-white border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#2563EB]" />
                <span className="font-bold text-xs text-[#0F172A]">
                  Supporting Document Inspector
                </span>
              </div>

              {/* Document Tabs */}
              <div className="flex items-center gap-1.5">
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
                    className={`px-2.5 py-1 text-xs rounded-[5px] font-semibold transition-colors cursor-pointer border ${
                      activeEvidenceDoc === tab.id
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Controls */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-mono text-[11px]">
                Scale: {Math.round(docZoom * 100)}% &bull; Rotation: {docRotation}&deg;
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1.5 rounded-[4px] bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#0F172A] transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 rounded-[4px] bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#0F172A] transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-[4px] bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#0F172A] transition-colors cursor-pointer"
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
                  className="p-1.5 rounded-[4px] bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#0F172A] transition-colors cursor-pointer"
                  title="Reset View"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Preview Surface */}
            <div className="p-4">
              <div className="h-56 bg-slate-100 rounded-[6px] border border-[#E2E8F0] overflow-hidden relative flex items-center justify-center">
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
                  <CheckCircle2 className="w-3 h-3" /> Sealed &amp; Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols / ~42%) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card: Automated Credit Scorecard */}
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Automated Credit Scorecard
                </h3>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] uppercase border ${
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

            {/* DTI Gauge Box */}
            <div className="p-3.5 rounded-[6px] bg-slate-50 border border-[#E2E8F0] space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
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

              {/* Progress bar */}
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
                <span className="text-[#16A34A] font-medium">0% Prime</span>
                <span className="text-[#D97706] font-medium">30% Moderate</span>
                <span className="text-[#DC2626] font-medium">&gt;40% Subprime</span>
              </div>
            </div>

            {/* Clearance Rules Engine */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                Rule Clearance Engine
              </span>
              <div className="space-y-1.5">
                {ruleChecks.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-[6px] bg-slate-50/70 border border-[#E2E8F0] text-xs"
                  >
                    {rule.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[#0F172A] text-[11px] leading-tight">
                          {rule.label}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-[#16A34A] shrink-0">
                          {rule.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#64748B] block mt-0.5 leading-snug">
                        {rule.note}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Credit Officer Recommendation Form */}
          <form
            onSubmit={handleOfficerSubmit}
            className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 sm:p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">
                Credit Officer Recommendation
              </h3>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Underwriter: <strong className="text-[#0F172A]">{currentUserName}</strong>
              </p>
            </div>

            {/* Radio Selectors */}
            <div className="space-y-2">
              {[
                {
                  id: 'rec-approve',
                  value: 'Recommend Approval',
                  label: 'Recommend Approval',
                  color: 'text-[#16A34A]',
                  desc: 'Eligible for committee authorization and disbursement',
                },
                {
                  id: 'rec-more-info',
                  value: 'Need More Information',
                  label: 'Request More Information',
                  color: 'text-[#D97706]',
                  desc: 'Request additional pay slips or secondary guarantor details',
                },
                {
                  id: 'rec-reject',
                  value: 'Recommend Rejection',
                  label: 'Recommend Rejection',
                  color: 'text-[#DC2626]',
                  desc: 'High default risk or leverage exceeds lending criteria',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-[6px] border cursor-pointer transition-colors ${
                    recommendation === opt.value
                      ? 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB]/20'
                      : 'border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value={opt.value}
                    checked={recommendation === opt.value}
                    onChange={(e) => setRecommendation(e.target.value as any)}
                    className="mt-0.5 text-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className={`text-xs font-bold block ${opt.color}`}>{opt.label}</span>
                    <span className="text-[10px] text-[#64748B] mt-0.5 block">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-[#0F172A]">
                Assessment Notes &amp; Credit Rationale
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter detailed credit findings, mitigating strengths, or required conditions..."
                className="w-full p-2.5 text-xs bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors cursor-pointer shadow-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment to Committee</span>
            </button>
          </form>

          {/* Card: Executive Decision Box (For Manager & Admin) */}
          <div className="bg-white rounded-[8px] p-4 sm:p-5 border border-[#CBD5E1] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-xs font-bold text-[#0F172A]">Executive Sanction Controls</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-slate-100 font-bold text-[#475569]">
                Clearance Authority
              </span>
            </div>

            {!isExecutive ? (
              <div className="p-3 rounded-[6px] bg-slate-50 border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Executive decision controls require Admin or Manager authorization.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-[#64748B]">
                  Calibrate finalized lending terms before issuing executive sign-off:
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Approved Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#64748B] block">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-[4px] bg-white border border-[#CBD5E1] text-[#0F172A] font-mono text-xs focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {/* Approved Term */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#64748B] block">
                      Term (Mo)
                    </label>
                    <input
                      type="number"
                      value={approvedTerm}
                      onChange={(e) => setApprovedTerm(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-[4px] bg-white border border-[#CBD5E1] text-[#0F172A] font-mono text-xs focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {/* Approved Rate */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#64748B] block">
                      Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={approvedRate}
                      onChange={(e) => setApprovedRate(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-[4px] bg-white border border-[#CBD5E1] text-[#0F172A] font-mono text-xs focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Decision Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowRejectReasonModal(true)}
                    className="py-2 px-3 rounded-[6px] bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject Facility</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowApproveConfirmModal(true)}
                    className="py-2 px-3 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Facility</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Approve Loan */}
      {showApproveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] max-w-md w-full p-5 border border-[#E2E8F0] shadow-lg space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Approve Facility Authorization</h3>
                <p className="text-[11px] text-[#64748B]">Confirm committee sanction for this credit application.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-[6px] bg-slate-50 border border-[#E2E8F0] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Applicant:</span>
                <span className="font-bold text-[#0F172A]">{application.borrowerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Sanctioned Capital:</span>
                <span className="font-bold text-[#16A34A]">${approvedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Tenure &amp; Pricing:</span>
                <span className="font-bold text-[#0F172A]">{approvedTerm} Months @ {approvedRate}% p.a.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowApproveConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 text-xs font-semibold rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm &amp; Disburse</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {showRejectReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] max-w-md w-full p-5 border border-[#E2E8F0] shadow-lg space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-rose-50 text-[#DC2626] border border-rose-200 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Document Adverse Credit Action</h3>
                <p className="text-[11px] text-[#64748B]">National Bank of Cambodia regulatory audit compliance.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Primary Rejection Cause</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-2.5 h-9 bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="HIGH_DTI">Excessive Debt-to-Income Ratio (&gt; 40%)</option>
                  <option value="INSUFFICIENT_INCOME">Stated Inflows Below Qualification Floor</option>
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
                  placeholder="Document specific committee findings and credit policy limitations..."
                  className="w-full p-2.5 bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowRejectReasonModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-1.5 text-xs font-semibold rounded-[6px] bg-[#DC2626] hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
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

export default DtiRiskWorkbench;
