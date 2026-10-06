import React, { useState, useMemo } from 'react';
import {
  Borrower,
  LoanProduct,
  Currency,
  LoanApplication,
  RepaymentFrequency,
} from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  ShieldCheck,
  X,
  Search,
  User,
  Building,
  Briefcase,
  Home,
  Sprout,
  Car,
  Zap,
  Layers,
  FileCheck,
  Trash2,
  Eye,
  Percent,
  CheckCircle2,
  Clock
} from 'lucide-react';

export interface LoanApplicationWizardProps {
  borrowers: Borrower[];
  products: LoanProduct[];
  currency: Currency;
  onCancel: () => void;
  onSubmitApplication: (app: Partial<LoanApplication>, isDraft?: boolean) => void;
}

interface UploadedDocument {
  id: string;
  name: string;
  size: string;
  type: 'NATIONAL_ID' | 'INCOME_PROOF' | 'COLLATERAL';
  categoryLabel: string;
  uploadedAt: string;
}

const STEP_DEFINITIONS = [
  { id: 1, title: 'Borrower & Product', sub: 'Profile & product selection' },
  { id: 2, title: 'Loan Terms & Calculator', sub: 'Principal, tenure & DTI analysis' },
  { id: 3, title: 'Supporting Documents', sub: 'KYC & collateral verification' },
  { id: 4, title: 'Summary Confirmation', sub: 'Review & submit application' },
];

export const LoanApplicationWizard: React.FC<LoanApplicationWizardProps> = ({
  borrowers,
  products,
  currency: initialCurrency,
  onCancel,
  onSubmitApplication,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [calcCurrency, setCalcCurrency] = useState<Currency>(initialCurrency);

  // --------------------------------------------------------------------------
  // STEP 1: Borrower & Product State
  // --------------------------------------------------------------------------
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(
    borrowers[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ''
  );
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [isBorrowerDropdownOpen, setIsBorrowerDropdownOpen] = useState(false);

  const selectedBorrower = useMemo(() => {
    return borrowers.find((b) => b.id === selectedBorrowerId) || borrowers[0];
  }, [borrowers, selectedBorrowerId]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  const filteredBorrowers = useMemo(() => {
    const q = borrowerSearch.toLowerCase().trim();
    if (!q) return borrowers;
    return borrowers.filter(
      (b) =>
        b.fullName.toLowerCase().includes(q) ||
        b.borrowerId.toLowerCase().includes(q) ||
        b.nationalId.toLowerCase().includes(q) ||
        b.phone.includes(q)
    );
  }, [borrowers, borrowerSearch]);

  // --------------------------------------------------------------------------
  // STEP 2: Loan Terms & Interactive Live Calculator State
  // --------------------------------------------------------------------------
  const [requestedAmount, setRequestedAmount] = useState<number>(
    selectedProduct?.minAmount || 5000
  );
  const [requestedTerm, setRequestedTerm] = useState<number>(
    selectedProduct ? Math.min(Math.max(12, selectedProduct.minTerm), selectedProduct.maxTerm) : 12
  );
  const [frequency, setFrequency] = useState<RepaymentFrequency>('MONTHLY');
  const [purpose, setPurpose] = useState('Working Capital & Business Equipment Expansion');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Adjust amount and term if product changes
  const handleSelectProduct = (prod: LoanProduct) => {
    setSelectedProductId(prod.id);
    setRequestedAmount((prev) => {
      if (prev < prod.minAmount) return prod.minAmount;
      if (prev > prod.maxAmount) return prod.maxAmount;
      return prev;
    });
    setRequestedTerm((prev) => {
      if (prev < prod.minTerm) return prod.minTerm;
      if (prev > prod.maxTerm) return prod.maxTerm;
      return prev;
    });
  };

  // --------------------------------------------------------------------------
  // STEP 3: Supporting Documents State
  // --------------------------------------------------------------------------
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([
    {
      id: 'doc-1',
      name: 'national_id_card_scan.pdf',
      size: '1.4 MB',
      type: 'NATIONAL_ID',
      categoryLabel: 'National ID / Passport',
      uploadedAt: 'Today at 09:20 AM',
    },
    {
      id: 'doc-2',
      name: 'payroll_slip_recent_q3.pdf',
      size: '860 KB',
      type: 'INCOME_PROOF',
      categoryLabel: 'Proof of Income / Salary Slip',
      uploadedAt: 'Today at 09:22 AM',
    },
  ]);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);

  // --------------------------------------------------------------------------
  // STEP 4: Summary Confirmation State
  // --------------------------------------------------------------------------
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmAgreed, setConfirmAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // Financial & Underwriting Calculations
  // --------------------------------------------------------------------------
  const calc = useMemo(() => {
    const P = requestedAmount;
    const R = selectedProduct?.interestRate || 10.0;
    const M = requestedTerm;

    const annualRate = R / 100;
    const totalInterest = Math.round(((P * annualRate * (M / 12)) + Number.EPSILON) * 100) / 100;
    const totalRepayment = Math.round((P + totalInterest + Number.EPSILON) * 100) / 100;
    
    const monthlyInstallment = Math.round(((totalRepayment / M) + Number.EPSILON) * 100) / 100;

    let periodicInstallment = monthlyInstallment;
    let paymentCount = M;
    if (frequency === 'WEEKLY') {
      paymentCount = Math.round(M * 4.333);
      periodicInstallment = Math.round(((totalRepayment / paymentCount) + Number.EPSILON) * 100) / 100;
    } else if (frequency === 'BIWEEKLY') {
      paymentCount = Math.round(M * 2.167);
      periodicInstallment = Math.round(((totalRepayment / paymentCount) + Number.EPSILON) * 100) / 100;
    }

    const borrowerIncome = selectedBorrower?.monthlyIncomeUSD || 1500;
    const dtiRatio = Math.round(((monthlyInstallment / borrowerIncome) * 100 + Number.EPSILON) * 10) / 10;
    const isDtiWarning = dtiRatio > 40.0;

    let riskTier: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' = 'LOW RISK';
    if (dtiRatio > 40 || requestedAmount > 20000) {
      riskTier = 'HIGH RISK';
    } else if (dtiRatio > 30 || requestedAmount > 10000) {
      riskTier = 'MEDIUM RISK';
    }

    return {
      principal: P,
      rate: R,
      termMonths: M,
      totalInterest,
      totalRepayment,
      monthlyInstallment,
      periodicInstallment,
      paymentCount,
      borrowerIncome,
      dtiRatio,
      isDtiWarning,
      riskTier,
    };
  }, [requestedAmount, requestedTerm, selectedProduct, selectedBorrower, frequency]);

  // Full Amortization Schedule Data
  const amortizationSchedule = useMemo(() => {
    const rows = [];
    const monthlyPrincipal = calc.principal / calc.termMonths;
    const monthlyInterest = calc.totalInterest / calc.termMonths;
    let balance = calc.principal;

    const startDate = new Date();
    for (let i = 1; i <= calc.termMonths; i++) {
      balance = Math.max(0, balance - monthlyPrincipal);
      const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 15)
        .toISOString()
        .slice(0, 10);
      rows.push({
        installmentNo: i,
        dueDate,
        principalUSD: monthlyPrincipal,
        interestUSD: monthlyInterest,
        totalUSD: monthlyPrincipal + monthlyInterest,
        balanceUSD: balance,
      });
    }
    return rows;
  }, [calc]);

  // Document Upload Handlers
  const handleAddDocument = (type: 'NATIONAL_ID' | 'INCOME_PROOF' | 'COLLATERAL') => {
    const labelMap = {
      NATIONAL_ID: 'National ID / Passport',
      INCOME_PROOF: 'Proof of Income / Salary Slip',
      COLLATERAL: 'Collateral / Guarantor Documentation',
    };
    const prefixMap = {
      NATIONAL_ID: 'identity_doc',
      INCOME_PROOF: 'income_statement',
      COLLATERAL: 'collateral_title',
    };
    const rSize = (Math.random() * 2 + 0.6).toFixed(1);
    const newDoc: UploadedDocument = {
      id: `doc-${Date.now()}`,
      name: `${prefixMap[type]}_verified_${Date.now().toString().slice(-4)}.pdf`,
      size: `${rSize} MB`,
      type,
      categoryLabel: labelMap[type],
      uploadedAt: 'Just now',
    };
    setUploadedDocs((prev) => [...prev, newDoc]);
  };

  const handleRemoveDocument = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Submit Handler
  const handleFinalSubmit = (isDraft = false) => {
    setIsSubmitting(true);
    const generatedAppNo = `APP-2026-00${Math.floor(10 + Math.random() * 90)}`;
    const app: Partial<LoanApplication> = {
      applicationNo: generatedAppNo,
      borrowerId: selectedBorrower.id,
      borrowerName: selectedBorrower.fullName,
      borrowerAvatar: selectedBorrower.avatarUrl,
      borrowerIncomeUSD: selectedBorrower.monthlyIncomeUSD,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      requestedAmountUSD: requestedAmount,
      requestedTermMonths: requestedTerm,
      frequency,
      purpose,
      dtiRatio: calc.dtiRatio,
      riskTier: calc.riskTier,
      status: isDraft ? 'DRAFT' : 'SUBMITTED',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmationModal(false);
      onSubmitApplication(app, isDraft);
    }, 400);
  };

  // Category Icon Resolver
  const getProductCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'personal':
        return <Home className="w-4 h-4 text-[#0F172A]" />;
      case 'business':
        return <Briefcase className="w-4 h-4 text-[#2563EB]" />;
      case 'agriculture':
        return <Sprout className="w-4 h-4 text-[#16A34A]" />;
      case 'vehicle':
        return <Car className="w-4 h-4 text-[#D97706]" />;
      case 'emergency':
        return <Zap className="w-4 h-4 text-[#DC2626]" />;
      default:
        return <Building className="w-4 h-4 text-[#0F172A]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[8px] border border-[#CBD5E1]">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel & Return to Applications</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#64748B]">
            Origination Workflow • Step {currentStep} of 4
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            Active Underwriting
          </span>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STEP_DEFINITIONS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id < currentStep;

            return (
              <div
                key={step.id}
                onClick={() => isClickable && setCurrentStep(step.id as any)}
                className={`flex flex-col space-y-1.5 select-none ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-[4px] flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                      isCompleted
                        ? 'bg-[#16A34A] text-white'
                        : isCurrent
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-slate-100 text-[#64748B] border border-[#CBD5E1]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isCurrent
                          ? 'text-[#0F172A]'
                          : isCompleted
                          ? 'text-[#16A34A]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate hidden sm:block">
                      {step.sub}
                    </p>
                  </div>
                </div>

                {/* Progress bar track */}
                <div className="w-full h-1 bg-slate-100 rounded-[2px] overflow-hidden">
                  <div
                    className={`h-full ${
                      isCompleted
                        ? 'bg-[#16A34A] w-full'
                        : isCurrent
                        ? 'bg-[#0F172A] w-full'
                        : 'bg-transparent w-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Step View Content Surfaces */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 sm:p-6">
        {/* ================================================================ */}
        {/* STEP 1: BORROWER & PRODUCT SELECTION                             */}
        {/* ================================================================ */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Step 1: Borrower & Loan Product Selection
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Select the verified borrower and assign the appropriate financial product.
              </p>
            </div>

            {/* 1A. Searchable Borrower Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#2563EB]" />
                  <span>Select Borrower</span>
                </label>
                <span className="text-[11px] text-[#64748B] font-mono">
                  {filteredBorrowers.length} records found
                </span>
              </div>

              {/* Search Bar + Dropdown Trigger */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={borrowerSearch}
                    onChange={(e) => {
                      setBorrowerSearch(e.target.value);
                      setIsBorrowerDropdownOpen(true);
                    }}
                    onFocus={() => setIsBorrowerDropdownOpen(true)}
                    placeholder="Search borrower by name, ID (e.g. BOR-2026-0001), phone, or national ID..."
                    className="w-full pl-9 pr-8 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#2563EB]"
                  />
                  {borrowerSearch && (
                    <button
                      onClick={() => setBorrowerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Options */}
                {isBorrowerDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsBorrowerDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#CBD5E1] rounded-[6px] max-h-56 overflow-y-auto z-30 divide-y divide-[#CBD5E1] shadow-md">
                      {filteredBorrowers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[#64748B]">
                          No borrowers found matching "{borrowerSearch}".
                        </div>
                      ) : (
                        filteredBorrowers.map((b) => {
                          const isSelected = b.id === selectedBorrowerId;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSelectedBorrowerId(b.id);
                                setIsBorrowerDropdownOpen(false);
                              }}
                              className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-slate-100 font-semibold text-[#0F172A]'
                                  : 'hover:bg-slate-50 text-[#0F172A]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-[4px] bg-slate-100 text-[#0F172A] border border-[#CBD5E1] font-bold flex items-center justify-center text-xs shrink-0">
                                  {b.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-[#0F172A]">{b.fullName}</p>
                                  <p className="text-[11px] text-[#64748B] font-mono">
                                    {b.borrowerId} • Nat ID: {b.nationalId} • ${b.monthlyIncomeUSD.toLocaleString()}/mo
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#2563EB]" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Selected Borrower Snapshot Card */}
              {selectedBorrower && (
                <div className="p-4 rounded-[8px] bg-slate-50 border border-[#CBD5E1]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#CBD5E1]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[6px] bg-[#0F172A] text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {selectedBorrower.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0F172A]">
                            {selectedBorrower.fullName}
                          </h3>
                          <Badge variant="verified" size="xs">
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                            KYC Verified
                          </Badge>
                        </div>
                        <p className="text-xs text-[#64748B] font-mono mt-0.5">
                          ID: {selectedBorrower.borrowerId} • Nat ID: {selectedBorrower.nationalId}
                        </p>
                      </div>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="text-[11px] uppercase font-semibold text-[#64748B] block">
                        Verified Monthly Income
                      </span>
                      <div className="text-base font-bold font-mono text-[#0F172A]">
                        <MoneyText amount={selectedBorrower.monthlyIncomeUSD} currency={calcCurrency} />
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-xs">
                    <div className="p-2 rounded-[6px] bg-white border border-[#CBD5E1]">
                      <span className="text-[10px] text-[#64748B] block uppercase">Sector</span>
                      <span className="font-semibold text-[#0F172A] truncate block mt-0.5">
                        {selectedBorrower.occupation || 'Private Sector Enterprise'}
                      </span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-white border border-[#CBD5E1]">
                      <span className="text-[10px] text-[#64748B] block uppercase">Active Loans</span>
                      <span className="font-semibold text-[#0F172A] font-mono block mt-0.5">
                        {selectedBorrower.activeLoansCount} Facility
                      </span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-white border border-[#CBD5E1]">
                      <span className="text-[10px] text-[#64748B] block uppercase">Outstanding</span>
                      <span className="font-semibold text-[#0F172A] font-mono block mt-0.5">
                        <MoneyText amount={selectedBorrower.totalOutstandingUSD} currency={calcCurrency} />
                      </span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-white border border-[#CBD5E1]">
                      <span className="text-[10px] text-[#64748B] block uppercase">DTI Baseline</span>
                      <span className="font-semibold text-[#16A34A] font-mono block mt-0.5">
                        {selectedBorrower.dtiRatio}% (Safe)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1B. Visual Radio Cards for Loan Products */}
            <div className="space-y-3 pt-4 border-t border-[#CBD5E1]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <span>Select Loan Product Facility</span>
                  </label>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Rates, duration windows, and capital thresholds conform to NBC regulations.
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#2563EB]">
                  {products.length} Products Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      className={`p-3.5 rounded-[8px] border cursor-pointer transition-colors flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-[#0F172A] bg-slate-50'
                          : 'border-[#CBD5E1] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-[4px] bg-slate-100 border border-[#CBD5E1] flex items-center justify-center">
                            {getProductCategoryIcon(prod.category)}
                          </div>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-[4px] bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                            {prod.interestRate}% p.a.
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded-[4px] bg-slate-100 text-[#64748B] border border-[#CBD5E1]">
                            {prod.category}
                          </span>
                          <span className="text-[11px] text-[#64748B] font-mono">
                            {prod.id}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-[#0F172A] leading-snug">
                          {prod.name}
                        </h4>
                        <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#CBD5E1] space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between text-[#64748B]">
                          <span>Principal Limit:</span>
                          <span className="font-bold text-[#0F172A]">
                            <MoneyText amount={prod.minAmount} currency={calcCurrency} /> - <MoneyText amount={prod.maxAmount} currency={calcCurrency} />
                          </span>
                        </div>
                        <div className="flex justify-between text-[#64748B]">
                          <span>Duration Window:</span>
                          <span className="font-bold text-[#0F172A]">
                            {prod.minTerm} to {prod.maxTerm} Months
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: LOAN TERMS & LIVE CALCULATOR                             */}
        {/* ================================================================ */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#CBD5E1]">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Step 2: Loan Terms & Live Underwriting Calculator
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Configure principal amount, loan tenure, and examine real-time DTI solvency gauges.
                </p>
              </div>

              {/* Dual Currency Selector */}
              <div className="inline-flex items-center p-0.5 bg-slate-100 border border-[#CBD5E1] rounded-[6px]">
                <button
                  type="button"
                  onClick={() => setCalcCurrency('USD')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-[4px] transition-colors ${
                    calcCurrency === 'USD'
                      ? 'bg-white text-[#0F172A] border border-[#CBD5E1]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcCurrency('KHR')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-[4px] transition-colors ${
                    calcCurrency === 'KHR'
                      ? 'bg-white text-[#0F172A] border border-[#CBD5E1]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  KHR (៛)
                </button>
              </div>
            </div>

            {/* Two Column Layout: Sliders (Left) vs Underwriting Panel (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Form Controls (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Active Facility Header */}
                <div className="p-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#64748B]">Active Facility:</span>
                    <span className="font-bold text-[#0F172A]">{selectedProduct?.name}</span>
                  </div>
                  <Badge variant="active" size="xs">
                    {selectedProduct?.interestRate}% p.a. Fixed
                  </Badge>
                </div>

                {/* 1. Principal Amount */}
                <div className="p-4 rounded-[8px] bg-white border border-[#CBD5E1] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-[#2563EB]" />
                      <span>Requested Principal Capital</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={selectedProduct?.minAmount || 500}
                        max={selectedProduct?.maxAmount || 50000}
                        step={100}
                        value={requestedAmount}
                        onChange={(e) => setRequestedAmount(Number(e.target.value))}
                        className="w-28 px-2.5 h-8 text-xs font-bold font-mono text-right bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                      <span className="text-xs font-mono font-bold text-[#64748B]">
                        {calcCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={selectedProduct?.minAmount || 500}
                    max={selectedProduct?.maxAmount || 50000}
                    step={100}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-[4px] appearance-none cursor-pointer accent-[#0F172A]"
                  />

                  {/* Scale Indicators */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                    <span>Min: <MoneyText amount={selectedProduct?.minAmount || 500} currency={calcCurrency} /></span>
                    <div className="flex gap-1">
                      {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                        const min = selectedProduct?.minAmount || 500;
                        const max = selectedProduct?.maxAmount || 50000;
                        const targetVal = Math.round((min + (max - min) * ratio) / 100) * 100;
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setRequestedAmount(targetVal)}
                            className="px-2 py-0.5 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-[10px] font-semibold border border-[#CBD5E1]"
                          >
                            {ratio * 100}%
                          </button>
                        );
                      })}
                    </div>
                    <span>Max: <MoneyText amount={selectedProduct?.maxAmount || 50000} currency={calcCurrency} /></span>
                  </div>
                </div>

                {/* 2. Tenure */}
                <div className="p-4 rounded-[8px] bg-white border border-[#CBD5E1] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#2563EB]" />
                      <span>Repayment Tenure (Duration)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={selectedProduct?.minTerm || 3}
                        max={selectedProduct?.maxTerm || 60}
                        step={1}
                        value={requestedTerm}
                        onChange={(e) => setRequestedTerm(Number(e.target.value))}
                        className="w-20 px-2.5 h-8 text-xs font-bold font-mono text-right bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                      <span className="text-xs font-semibold text-[#64748B]">Months</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={selectedProduct?.minTerm || 3}
                    max={selectedProduct?.maxTerm || 60}
                    step={1}
                    value={requestedTerm}
                    onChange={(e) => setRequestedTerm(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-[4px] appearance-none cursor-pointer accent-[#0F172A]"
                  />

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                    <span>Min: {selectedProduct?.minTerm || 3} mo</span>
                    <div className="flex gap-1">
                      {[6, 12, 24, 36].filter(
                        (m) => m >= (selectedProduct?.minTerm || 3) && m <= (selectedProduct?.maxTerm || 60)
                      ).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRequestedTerm(m)}
                          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold border ${
                            requestedTerm === m
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-slate-100 text-[#0F172A] border-[#CBD5E1] hover:bg-slate-200'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                    <span>Max: {selectedProduct?.maxTerm || 60} mo</span>
                  </div>
                </div>

                {/* 3. Repayment Frequency */}
                <div className="p-4 rounded-[8px] bg-white border border-[#CBD5E1] space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#2563EB]" />
                    <span>Repayment Schedule Frequency</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as RepaymentFrequency[]).map((freq) => {
                      const isSelected = frequency === freq;
                      return (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFrequency(freq)}
                          className={`p-2.5 rounded-[6px] border text-center transition-colors ${
                            isSelected
                              ? 'border-[#0F172A] bg-slate-100 text-[#0F172A]'
                              : 'border-[#CBD5E1] hover:border-slate-400 bg-white text-[#64748B]'
                          }`}
                        >
                          <span className="text-xs block capitalize font-semibold">
                            {freq.toLowerCase()}
                          </span>
                          <span className="text-[10px] text-[#64748B] font-mono mt-0.5 block">
                            {freq === 'MONTHLY' ? 'Every 30 days' : freq === 'BIWEEKLY' ? 'Every 14 days' : 'Every 7 days'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Purpose */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                    Stated Purpose of Credit Facility
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Commercial Inventory & Working Capital Expansion"
                    className="w-full px-3 h-10 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Right Column: Underwriting Panel (5 Cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-[#0F172A] text-white rounded-[8px] p-5 border border-[#0F172A]">
                  <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Real-Time Engine
                      </span>
                      <h3 className="text-sm font-bold text-white">Underwriting Readout</h3>
                    </div>
                    <Badge variant="paid" size="xs">
                      Live
                    </Badge>
                  </div>

                  {/* Financial Figures */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Requested Principal:</span>
                      <MoneyText
                        amount={calc.principal}
                        currency={calcCurrency}
                        className="font-bold text-white text-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Fixed Interest Rate:</span>
                      <span className="font-mono font-bold text-white">
                        {calc.rate}% p.a.
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Loan Duration:</span>
                      <span className="font-mono font-bold text-white">
                        {calc.termMonths} Months
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Total Interest Accrued:</span>
                      <MoneyText
                        amount={calc.totalInterest}
                        currency={calcCurrency}
                        className="font-bold text-[#16A34A]"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-white/20">
                      <span className="font-semibold text-slate-200">Total Repayable Capital:</span>
                      <MoneyText
                        amount={calc.totalRepayment}
                        currency={calcCurrency}
                        className="font-bold text-white text-sm"
                      />
                    </div>

                    {/* Periodic Installment Box */}
                    <div className="mt-3 p-3.5 rounded-[6px] bg-slate-800 border border-slate-700">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold text-slate-300">
                          {frequency === 'MONTHLY' ? 'Monthly' : frequency === 'BIWEEKLY' ? 'Biweekly' : 'Weekly'} Installment:
                        </span>
                        <MoneyText
                          amount={calc.periodicInstallment}
                          currency={calcCurrency}
                          className="text-xl font-bold text-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        {calc.paymentCount} payments across {calc.termMonths} months duration
                      </p>
                    </div>
                  </div>

                  {/* DTI Gauge */}
                  <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Debt-to-Income (DTI) Ratio</span>
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-[4px] text-xs border ${
                          calc.isDtiWarning
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                            : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                        }`}
                      >
                        {calc.dtiRatio}%
                      </span>
                    </div>

                    {/* DTI Meter Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-white/20 rounded-[4px] overflow-hidden">
                        <div
                          className={`h-full ${
                            calc.dtiRatio > 40 ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
                          }`}
                          style={{ width: `${Math.min(calc.dtiRatio, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>0%</span>
                        <span className="text-amber-300">40% Limit</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {calc.isDtiWarning ? (
                      <div className="p-2.5 rounded-[6px] bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs">
                        <div className="flex items-center gap-1 font-bold text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>DTI Exceeds 40.0% Regulatory Limit</span>
                        </div>
                        <p className="text-[11px] text-amber-200 mt-0.5">
                          Requires credit committee approval exception.
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-[6px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                        <span className="text-[11px]">DTI within standard tolerance.</span>
                      </div>
                    )}
                  </div>

                  {/* Preview Schedule Button */}
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-4 w-full py-2 px-3 rounded-[6px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Preview Repayment Schedule</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Repayment Schedule Modal */}
            {showScheduleModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
                <div className="bg-white rounded-[8px] max-w-3xl w-full p-5 border border-[#CBD5E1] shadow-md max-h-[85vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">
                        Amortization Schedule Preview
                      </h3>
                      <p className="text-xs text-[#64748B] font-mono">
                        {selectedProduct?.name} • {calc.termMonths} Installments • {calc.rate}% p.a.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowScheduleModal(false)}
                      className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 my-3 border border-[#CBD5E1] rounded-[6px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] sticky top-0 border-b border-[#CBD5E1]">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3 text-right">Principal</th>
                          <th className="py-2 px-3 text-right">Interest</th>
                          <th className="py-2 px-3 text-right">Total Installment</th>
                          <th className="py-2 px-3 text-right">Remaining Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CBD5E1]">
                        {amortizationSchedule.map((row) => (
                          <tr key={row.installmentNo} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#0F172A]">
                              #{row.installmentNo}
                            </td>
                            <td className="py-2 px-3 font-mono text-[#64748B]">
                              {row.dueDate}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              <MoneyText amount={row.principalUSD} currency={calcCurrency} />
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[#64748B]">
                              <MoneyText amount={row.interestUSD} currency={calcCurrency} />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                              <MoneyText amount={row.totalUSD} currency={calcCurrency} />
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[#64748B]">
                              <MoneyText amount={row.balanceUSD} currency={calcCurrency} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#CBD5E1] text-xs">
                    <div className="font-mono text-[#64748B]">
                      Total Repayment: <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-[#0F172A]" />
                    </div>
                    <button
                      onClick={() => setShowScheduleModal(false)}
                      className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold rounded-[6px] text-xs transition-colors"
                    >
                      Done & Close Preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: SUPPORTING DOCUMENTS (DRAG-AND-DROP)                     */}
        {/* ================================================================ */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Step 3: Supporting KYC & Collateral Documents
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Upload supporting documents required for verification and underwriting approval.
              </p>
            </div>

            {/* 3 Upload Zones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Zone 1: National ID / Passport */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverZone('NATIONAL_ID');
                }}
                onDragLeave={() => setDragOverZone(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverZone(null);
                  handleAddDocument('NATIONAL_ID');
                }}
                onClick={() => handleAddDocument('NATIONAL_ID')}
                className={`p-5 rounded-[8px] border-2 border-dashed text-center space-y-2 cursor-pointer transition-colors ${
                  dragOverZone === 'NATIONAL_ID'
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#CBD5E1] bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-[#CBD5E1] text-[#0F172A] flex items-center justify-center mx-auto">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    National ID / Passport
                  </h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Valid government identity document
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-[#CBD5E1] text-[10px] font-semibold text-[#0F172A]">
                  <Upload className="w-3 h-3 text-[#2563EB]" />
                  <span>Drop PDF or Browse</span>
                </div>
              </div>

              {/* Zone 2: Proof of Income */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverZone('INCOME_PROOF');
                }}
                onDragLeave={() => setDragOverZone(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverZone(null);
                  handleAddDocument('INCOME_PROOF');
                }}
                onClick={() => handleAddDocument('INCOME_PROOF')}
                className={`p-5 rounded-[8px] border-2 border-dashed text-center space-y-2 cursor-pointer transition-colors ${
                  dragOverZone === 'INCOME_PROOF'
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#CBD5E1] bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-[#CBD5E1] text-[#0F172A] flex items-center justify-center mx-auto">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    Proof of Income / Payroll
                  </h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Bank statements or salary slips
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-[#CBD5E1] text-[10px] font-semibold text-[#0F172A]">
                  <Upload className="w-3 h-3 text-[#2563EB]" />
                  <span>Drop PDF or Browse</span>
                </div>
              </div>

              {/* Zone 3: Collateral / Guarantor */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverZone('COLLATERAL');
                }}
                onDragLeave={() => setDragOverZone(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverZone(null);
                  handleAddDocument('COLLATERAL');
                }}
                onClick={() => handleAddDocument('COLLATERAL')}
                className={`p-5 rounded-[8px] border-2 border-dashed text-center space-y-2 cursor-pointer transition-colors ${
                  dragOverZone === 'COLLATERAL'
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#CBD5E1] bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-[#CBD5E1] text-[#0F172A] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    Collateral / Guarantor Info
                  </h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Title deed or signed guarantor doc
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-[#CBD5E1] text-[10px] font-semibold text-[#0F172A]">
                  <Upload className="w-3 h-3 text-[#2563EB]" />
                  <span>Drop PDF or Browse</span>
                </div>
              </div>
            </div>

            {/* Attached Documents List */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                  Attached Supporting Documents ({uploadedDocs.length})
                </span>
                <span className="text-[11px] text-[#64748B] font-mono">
                  Max 15MB • PDF, JPG, PNG
                </span>
              </div>

              {uploadedDocs.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-[#CBD5E1] rounded-[8px] bg-slate-50 text-xs text-[#64748B]">
                  No documents attached yet. Click or drag files into the upload zones above.
                </div>
              ) : (
                <div className="divide-y divide-[#CBD5E1] border border-[#CBD5E1] rounded-[8px] overflow-hidden">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-[4px] bg-slate-100 text-[#0F172A] border border-[#CBD5E1] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#0F172A] truncate">
                              {doc.name}
                            </span>
                            <Badge variant="paid" size="xs">
                              Verified
                            </Badge>
                          </div>
                          <span className="text-[11px] text-[#64748B] font-mono mt-0.5 block">
                            {doc.categoryLabel} • {doc.size} • Uploaded {doc.uploadedAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-[4px] transition-colors"
                          title="Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="p-1 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded-[4px] transition-colors"
                          title="Remove Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Preview Modal */}
            {previewDoc && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
                <div className="bg-white rounded-[8px] max-w-lg w-full p-5 border border-[#CBD5E1] shadow-md space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#CBD5E1]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#2563EB]" />
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">{previewDoc.name}</h4>
                        <span className="text-[11px] text-[#64748B] font-mono">{previewDoc.categoryLabel}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-52 rounded-[6px] bg-slate-50 border border-[#CBD5E1] flex flex-col items-center justify-center text-[#64748B] text-xs p-5 text-center space-y-2">
                    <FileCheck className="w-10 h-10 text-[#2563EB]" />
                    <p className="font-semibold text-[#0F172A]">Digital Document Verified</p>
                    <p className="text-[11px] text-[#64748B] max-w-xs">
                      Encrypted document stored securely in system storage.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-[#0F172A] rounded-[6px] border border-[#CBD5E1] transition-colors"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4: SUMMARY CONFIRMATION & REVIEW                            */}
        {/* ================================================================ */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Step 4: Application Summary & Routing Confirmation
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Examine all terms, underwriting ratios, and documentation before final submission.
              </p>
            </div>

            {/* 4-Section Review Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Borrower Summary */}
              <div className="p-4 rounded-[8px] bg-slate-50 border border-[#CBD5E1] space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
                  <span className="font-semibold uppercase tracking-wider text-[#0F172A] text-[11px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Borrower Profile</span>
                  </span>
                  <Badge variant="verified" size="xs">KYC Cleared</Badge>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">{selectedBorrower?.fullName}</h4>
                  <p className="text-[#64748B] font-mono text-[11px]">ID: {selectedBorrower?.borrowerId}</p>
                </div>
                <div className="space-y-1 font-mono text-[#64748B] text-[11px]">
                  <div className="flex justify-between">
                    <span>National ID:</span>
                    <span className="font-semibold text-[#0F172A]">{selectedBorrower?.nationalId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Income:</span>
                    <MoneyText amount={selectedBorrower?.monthlyIncomeUSD || 0} currency={calcCurrency} className="font-bold text-[#0F172A]" />
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Phone:</span>
                    <span className="font-semibold text-[#0F172A]">{selectedBorrower?.phone}</span>
                  </div>
                </div>
              </div>

              {/* 2. Facility & Terms Summary */}
              <div className="p-4 rounded-[8px] bg-slate-50 border border-[#CBD5E1] space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
                  <span className="font-semibold uppercase tracking-wider text-[#0F172A] text-[11px] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Facility & Terms</span>
                  </span>
                  <Badge variant="active" size="xs">{selectedProduct?.category}</Badge>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">{selectedProduct?.name}</h4>
                  <p className="text-[#64748B] font-mono text-[11px]">{selectedProduct?.id}</p>
                </div>
                <div className="space-y-1 font-mono text-[#64748B] text-[11px]">
                  <div className="flex justify-between">
                    <span>Annual APR:</span>
                    <span className="font-bold text-[#0F172A]">{calc.rate}% p.a. Fixed</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-semibold text-[#0F172A]">{calc.termMonths} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <span className="font-semibold text-[#0F172A] capitalize">{frequency.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              {/* 3. Financial Calculation Totals */}
              <div className="p-4 rounded-[8px] bg-slate-50 border border-[#CBD5E1] space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
                  <span className="font-semibold uppercase tracking-wider text-[#0F172A] text-[11px] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Calculation Summary</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#64748B]">
                    Currency: {calcCurrency}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Requested Principal:</span>
                    <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-[#0F172A]" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Total Interest:</span>
                    <MoneyText amount={calc.totalInterest} currency={calcCurrency} className="font-bold text-[#16A34A]" />
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#CBD5E1]">
                    <span className="text-[#0F172A] font-semibold">Total Repayment:</span>
                    <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-[#0F172A]" />
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-[#0F172A] font-bold">Estimated Installment:</span>
                    <MoneyText amount={calc.periodicInstallment} currency={calcCurrency} className="text-sm font-bold text-[#0F172A]" />
                  </div>
                </div>
              </div>

              {/* 4. Risk Appraisal */}
              <div className="p-4 rounded-[8px] bg-slate-50 border border-[#CBD5E1] space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
                  <span className="font-semibold uppercase tracking-wider text-[#0F172A] text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Risk Assessment</span>
                  </span>
                  <Badge variant={calc.riskTier.toLowerCase()} size="xs">
                    {calc.riskTier}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Calculated DTI Ratio:</span>
                    <span
                      className={`font-mono font-bold ${
                        calc.isDtiWarning ? 'text-[#D97706]' : 'text-[#16A34A]'
                      }`}
                    >
                      {calc.dtiRatio}% {calc.isDtiWarning ? '(Elevated)' : '(Healthy)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Attached Documents:</span>
                    <span className="font-semibold text-[#0F172A]">{uploadedDocs.length} Verified Files</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Review Queue:</span>
                    <span className="font-semibold text-[#0F172A]">Branch Credit Committee</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Purpose Notes */}
            <div className="p-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] text-xs">
              <span className="font-semibold text-[#0F172A] block mb-0.5">Stated Loan Purpose:</span>
              <p className="text-[#64748B] italic">"{purpose}"</p>
            </div>

            {/* Compliance Notice */}
            <div className="p-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] flex items-start gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#0F172A] block">
                  Underwriting & Compliance Routing Notice
                </span>
                <p className="mt-0.5 text-[#64748B] leading-relaxed">
                  Upon submission, the application is assigned a unique reference ID,
                  recorded into the audit ledger, and routed to credit underwriting for formal review.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-5 mt-6 border-t border-[#CBD5E1]">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 4 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmationModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Submit Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Official Submission Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-[8px] max-w-lg w-full p-5 border border-[#CBD5E1] shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-slate-100 border border-[#CBD5E1] text-[#0F172A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Confirm Application Submission
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  The loan application will be submitted for credit underwriting review.
                </p>
              </div>
            </div>

            {/* Quick Summary Box */}
            <div className="p-3 rounded-[6px] bg-slate-50 border border-[#CBD5E1] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Applicant Borrower:</span>
                <span className="font-semibold text-[#0F172A]">{selectedBorrower?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Loan Facility:</span>
                <span className="font-semibold text-[#0F172A]">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Principal Requested:</span>
                <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-[#0F172A]" />
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Projected Installment:</span>
                <MoneyText amount={calc.periodicInstallment} currency={calcCurrency} className="font-bold text-[#0F172A]" />
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Underwriting DTI:</span>
                <span className={`font-mono font-bold ${calc.isDtiWarning ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
                  {calc.dtiRatio}%
                </span>
              </div>
            </div>

            {/* Compliance Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmAgreed}
                onChange={(e) => setConfirmAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded-[4px] border-[#CBD5E1] text-[#0F172A] focus:ring-0"
              />
              <span className="text-[11px] text-[#64748B] leading-relaxed">
                I certify that all applicant details, supporting KYC credentials, and stated income proofs have been preliminarily validated in accordance with National Bank of Cambodia compliance guidelines.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBD5E1]">
              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-100 rounded-[6px] border border-[#CBD5E1] transition-colors"
              >
                Back to Review
              </button>
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={!confirmAgreed || isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed rounded-[6px] transition-colors inline-flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Routing Application...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Route to Committee</span>
                    <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
