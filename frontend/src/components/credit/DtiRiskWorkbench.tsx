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
  UserCheck
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
}

export const DtiRiskWorkbench: React.FC<DtiRiskWorkbenchProps> = ({
  application,
  currency,
  currentUserRole,
  currentUserName,
  onBack,
  onSubmitAssessment
}) => {
  // Left Column: Collapsible Cards State
  const [employmentOpen, setEmploymentOpen] = useState(true);
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [obligationsOpen, setObligationsOpen] = useState(true);
  const [evidenceViewerOpen, setEvidenceViewerOpen] = useState(true);
  const [activeEvidenceDoc, setActiveEvidenceDoc] = useState<'paySlip' | 'idCard'>('paySlip');

  // Right Column: Decisioning Form State
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

  // Automated Rule Checks Checklist
  const [ruleChecks, setRuleChecks] = useState([
    { id: 'rule-1', label: 'Minimum Stated Income Met (> $500/mo)', passed: true, note: 'Applicant verified at $1,850/mo' },
    { id: 'rule-2', label: 'National ID & Biometric Verification Validated', passed: true, note: 'NBC / Ministry of Interior ID match' },
    { id: 'rule-3', label: 'Age Eligibility (Between 18 and 65)', passed: true, note: 'Applicant age is 28 years' },
    { id: 'rule-4', label: 'Clean Repayment History / Zero Delinquencies', passed: true, note: 'Zero 30+ DPD incidents in CBC record' },
    { id: 'rule-5', label: 'Regulatory DTI Ceilings (< 40% threshold)', passed: application.dtiRatio <= 40, note: `Calculated DTI is ${application.dtiRatio}%` },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmitAssessment(application.id, recommendation, reviewNotes);
  };

  // DTI Gauge calculation
  const dti = application.dtiRatio || 22.4;
  const dtiColor =
    dti < 30 ? 'text-emerald-600' : dti <= 50 ? 'text-amber-600' : 'text-rose-600';
  const dtiBg =
    dti < 30 ? 'bg-emerald-500' : dti <= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const dtiTier = dti < 30 ? 'Low Risk' : dti <= 50 ? 'Moderate Risk' : 'High Risk';

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & ID */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
                {application.applicationNo || application.id}
              </h1>
              <span className="text-sm font-semibold text-slate-500">DTI Risk Workbench</span>
              <Badge variant="review" dot>
                {application.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Applicant: <strong className="text-slate-800">{application.borrowerName}</strong> • Target Product:{' '}
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
              className="text-lg font-bold text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* 2. Two-Column Split-View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 COLS): Applicant Dossier & Evidence */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Borrower Employment & Identity */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl overflow-hidden">
            <button
              onClick={() => setEmploymentOpen(!employmentOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>1. Borrower Employment &amp; Verification</span>
              </div>
              {employmentOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {employmentOpen && (
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Employer</span>
                    <span className="font-semibold text-slate-800">Department of Computer Science &amp; Engineering</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Official Position</span>
                    <span className="font-semibold text-slate-800">Graduate Teaching Assistant &amp; Researcher</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employment Duration</span>
                    <span className="font-mono text-slate-800">2 Years, 4 Months (Tenured)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employment Type</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Full-time Institutional
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Stated Monthly Income & Cashflow */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl overflow-hidden">
            <button
              onClick={() => setIncomeOpen(!incomeOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>2. Stated Monthly Income &amp; Sources</span>
              </div>
              {incomeOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {incomeOpen && (
              <div className="p-4 space-y-3 text-xs">
                <div className="divide-y divide-slate-100">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Base University Stipend / Salary</span>
                    <MoneyText amount={1450.0} currency="USD" className="font-semibold text-slate-900" />
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-600">Secondary STEM Research Grant Honorarium</span>
                    <MoneyText amount={400.0} currency="USD" className="font-semibold text-slate-900" />
                  </div>
                  <div className="py-2 flex justify-between bg-slate-50/80 px-2 rounded-lg font-bold">
                    <span className="text-slate-900">Total Verified Monthly Inflow</span>
                    <MoneyText
                      amount={application.borrowerIncomeUSD || 1850.0}
                      currency="USD"
                      className="text-emerald-700 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Existing Debt Obligations */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl overflow-hidden">
            <button
              onClick={() => setObligationsOpen(!obligationsOpen)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-900 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>3. Existing Debt Obligations (CBC Credit Bureau)</span>
              </div>
              {obligationsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {obligationsOpen && (
              <div className="p-4 space-y-3 text-xs">
                <div className="divide-y divide-slate-100">
                  <div className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800 block">External Commercial Bank Card</span>
                      <span className="text-[11px] text-slate-400">Canadia Bank • Balance $320.00</span>
                    </div>
                    <div className="text-right">
                      <MoneyText amount={35.0} currency="USD" className="font-semibold text-slate-900" />
                      <span className="text-[11px] text-slate-400 block">min payment</span>
                    </div>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800 block">Proposed Apex LMS Installment</span>
                      <span className="text-[11px] text-indigo-600 font-semibold">{application.requestedTermMonths} Month Plan</span>
                    </div>
                    <div className="text-right">
                      <MoneyText amount={380.0} currency="USD" className="font-bold text-indigo-700" />
                      <span className="text-[11px] text-slate-400 block">projected</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Embedded PDF / Image Viewer for Evidence */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-900">
                  4. Embedded KYC Evidence Inspector
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveEvidenceDoc('paySlip')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                    activeEvidenceDoc === 'paySlip'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Pay Slip PDF
                </button>
                <button
                  onClick={() => setActiveEvidenceDoc('idCard')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                    activeEvidenceDoc === 'idCard'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  National ID
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="h-64 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative group flex items-center justify-center">
                <img
                  src={
                    activeEvidenceDoc === 'paySlip'
                      ? 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=700&auto=format&fit=crop&q=80'
                      : 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=700&auto=format&fit=crop&q=80'
                  }
                  alt="KYC Document Preview"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold shadow-xs">
                    Verified Digital Artifact
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
                <span>SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
                <span className="text-emerald-600 font-semibold">Integrity: Sealed</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): Risk Decisioning Engine */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Visual DTI Risk Gauge */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Visual DTI Risk Gauge
              </span>
              <span className={`text-xs font-bold ${dtiColor}`}>
                {dtiTier}
              </span>
            </div>

            {/* Gauge visualization bar */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-mono tabular-nums font-black text-slate-900">
                  {dti}%
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Threshold: 40.0% Max
                </span>
              </div>

              {/* Gradient Risk Meter */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full ${dtiBg} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, (dti / 60) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
                <span>0% (Prime)</span>
                <span>30% (Amber Line)</span>
                <span>50%+ (Subprime/Reject)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Automated Rule Checks Checklist */}
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Automated Underwriting Rules Engine
            </span>

            <div className="space-y-2">
              {ruleChecks.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100 text-xs"
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

          {/* Card 3: Credit Officer Recommendation Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-4"
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
                  label: 'Need More Information',
                  color: 'text-amber-700',
                  desc: 'Request additional collateral or pay slip'
                },
                {
                  id: 'rec-reject',
                  value: 'Recommend Rejection',
                  label: 'Recommend Rejection',
                  color: 'text-rose-700',
                  desc: 'High probability of default or excessive DTI'
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    recommendation === opt.value
                      ? 'border-indigo-600 bg-indigo-50/30 shadow-xs'
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

            {/* Review Notes Textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Underwriter Review Notes &amp; Rationale
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter detailed credit rationale and risk mitigations..."
                className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Submit Assessment Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment to Committee</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
