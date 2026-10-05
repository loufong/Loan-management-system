import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sliders,
  Search,
  User,
  Building,
  Briefcase,
  Home,
  Sprout,
  Car,
  Zap,
  Info,
  Layers,
  FileCheck,
  Trash2,
  Eye,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  AlertCircle
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
  previewUrl?: string;
}

const STEP_DEFINITIONS = [
  { id: 1, title: 'Borrower & Product', sub: 'Borrower profile & loan product' },
  { id: 2, title: 'Loan Terms & Calculator', sub: 'Amount, tenure & live DTI' },
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

    // Simple flat-interest banking model
    const annualRate = R / 100;
    const totalInterest = Math.round(((P * annualRate * (M / 12)) + Number.EPSILON) * 100) / 100;
    const totalRepayment = Math.round((P + totalInterest + Number.EPSILON) * 100) / 100;
    
    // Monthly baseline installment
    const monthlyInstallment = Math.round(((totalRepayment / M) + Number.EPSILON) * 100) / 100;

    // Adjusted installment based on repayment frequency
    let periodicInstallment = monthlyInstallment;
    let paymentCount = M;
    if (frequency === 'WEEKLY') {
      paymentCount = Math.round(M * 4.333);
      periodicInstallment = Math.round(((totalRepayment / paymentCount) + Number.EPSILON) * 100) / 100;
    } else if (frequency === 'BIWEEKLY') {
      paymentCount = Math.round(M * 2.167);
      periodicInstallment = Math.round(((totalRepayment / paymentCount) + Number.EPSILON) * 100) / 100;
    }

    // Borrower Income and DTI comparison
    const borrowerIncome = selectedBorrower?.monthlyIncomeUSD || 1500;
    const dtiRatio = Math.round(((monthlyInstallment / borrowerIncome) * 100 + Number.EPSILON) * 10) / 10;
    const isDtiWarning = dtiRatio > 40.0;

    // Risk tier evaluation
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
    }, 600);
  };

  // Category Icon Resolver
  const getProductCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'personal':
        return <Home className="w-5 h-5 text-indigo-600" />;
      case 'business':
        return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'agriculture':
        return <Sprout className="w-5 h-5 text-emerald-600" />;
      case 'vehicle':
        return <Car className="w-5 h-5 text-amber-600" />;
      case 'emergency':
        return <Zap className="w-5 h-5 text-rose-600" />;
      default:
        return <Building className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* -------------------------------------------------------------------- */}
      {/* 1. Header Toolbar & Progress Stepper Header                          */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span>Cancel &amp; Return to Applications</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Origination Workflow • Step {currentStep} of 4
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            Active Underwriting
          </span>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {STEP_DEFINITIONS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id < currentStep;

            return (
              <div
                key={step.id}
                onClick={() => isClickable && setCurrentStep(step.id as any)}
                className={`relative flex flex-col space-y-2 select-none ${
                  isClickable ? 'cursor-pointer group' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-50'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate transition-colors ${
                        isCurrent
                          ? 'text-slate-900'
                          : isCompleted
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                      {step.sub}
                    </p>
                  </div>
                </div>

                {/* Progress bar track */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <motion.div
                    className={`h-full ${
                      isCompleted
                        ? 'bg-emerald-600'
                        : isCurrent
                        ? 'bg-blue-600'
                        : 'bg-transparent'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted || isCurrent ? '100%' : '0%' }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. Step View Content Surfaces                                        */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {/* ================================================================ */}
          {/* STEP 1: BORROWER & PRODUCT SELECTION                             */}
          {/* ================================================================ */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Step 1: Borrower &amp; Loan Product Selection
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select the borrower and assign the appropriate loan product.
                </p>
              </div>

              {/* 1A. Searchable Borrower Selector & Instant Preview Card */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Select Borrower</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {filteredBorrowers.length} verified records
                  </span>
                </div>

                {/* Search Bar + Dropdown Trigger */}
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={borrowerSearch}
                      onChange={(e) => {
                        setBorrowerSearch(e.target.value);
                        setIsBorrowerDropdownOpen(true);
                      }}
                      onFocus={() => setIsBorrowerDropdownOpen(true)}
                      placeholder="Search borrower by name, ID (e.g. BOR-2026-0001), phone, or national ID..."
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                    />
                    {borrowerSearch && (
                      <button
                        onClick={() => {
                          setBorrowerSearch('');
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 shadow-xl rounded-xl max-h-64 overflow-y-auto z-30 divide-y divide-slate-100">
                        {filteredBorrowers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
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
                                className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-50/60 font-semibold text-indigo-900'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                    {b.fullName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{b.fullName}</p>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                      {b.borrowerId} • Nat ID: {b.nationalId} • ${b.monthlyIncomeUSD.toLocaleString()}/mo
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-indigo-600" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Instant Borrower Profile Preview Card */}
                {selectedBorrower && (
                  <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                          {selectedBorrower.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {selectedBorrower.fullName}
                            </h3>
                            <Badge variant="verified" size="xs">
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                              KYC Verified
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {selectedBorrower.borrowerId} • Nat ID: {selectedBorrower.nationalId}
                          </p>
                        </div>
                      </div>

                      <div className="text-right sm:self-center">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                          Verified Monthly Income
                        </span>
                        <div className="text-lg font-black font-mono text-indigo-600">
                          <MoneyText amount={selectedBorrower.monthlyIncomeUSD} currency={calcCurrency} />
                        </div>
                      </div>
                    </div>

                    {/* Snapshot Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="text-[11px] text-slate-400 block">Occupation / Sector</span>
                        <span className="font-semibold text-slate-800 truncate block mt-0.5">
                          {selectedBorrower.occupation || 'Private Sector Enterprise'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="text-[11px] text-slate-400 block">Active Loans</span>
                        <span className="font-semibold text-slate-800 font-mono block mt-0.5">
                          {selectedBorrower.activeLoansCount} Active Facility
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="text-[11px] text-slate-400 block">Total Outstanding</span>
                        <span className="font-semibold text-slate-800 font-mono block mt-0.5">
                          <MoneyText amount={selectedBorrower.totalOutstandingUSD} currency={calcCurrency} />
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="text-[11px] text-slate-400 block">Current DTI Baseline</span>
                        <span className="font-semibold text-emerald-600 font-mono block mt-0.5">
                          {selectedBorrower.dtiRatio}% (Safe)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 1B. Visual Radio Cards for Loan Products */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Select Loan Product Facility</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Rates, duration windows, and capital thresholds conform to NBC regulations.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-indigo-600">
                    {products.length} Products Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {products.map((prod) => {
                    const isSelected = prod.id === selectedProductId;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative group ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
                              {getProductCategoryIcon(prod.category)}
                            </div>
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                              {prod.interestRate}% p.a.
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {prod.category}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {prod.id}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {prod.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                            {prod.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100/80 space-y-1 text-[11px] font-mono">
                          <div className="flex justify-between text-slate-500">
                            <span>Principal Limit:</span>
                            <span className="font-bold text-slate-800">
                              <MoneyText amount={prod.minAmount} currency={calcCurrency} /> - <MoneyText amount={prod.maxAmount} currency={calcCurrency} />
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Duration Window:</span>
                            <span className="font-bold text-slate-800">
                              {prod.minTerm} to {prod.maxTerm} Months
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: LOAN TERMS & LIVE CALCULATOR                             */}
          {/* ================================================================ */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Step 2: Loan Terms &amp; Live Underwriting Calculator
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure principal amount, loan tenure, and examine real-time DTI solvency gauges.
                  </p>
                </div>

                {/* Dual Currency Selector */}
                <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200/80 rounded-xl self-start sm:self-center shadow-inner">
                  <button
                    type="button"
                    onClick={() => setCalcCurrency('USD')}
                    className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                      calcCurrency === 'USD'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcCurrency('KHR')}
                    className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                      calcCurrency === 'KHR'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    KHR (៛)
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Sliders (Left) vs Real-Time Underwriting Card (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Form Controls (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Selected Facility Header Chip */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Active Facility:</span>
                      <span className="font-bold text-indigo-600">{selectedProduct?.name}</span>
                    </div>
                    <Badge variant="active" size="xs">
                      {selectedProduct?.interestRate}% p.a. Fixed
                    </Badge>
                  </div>

                  {/* 1. Principal Amount Slider + Number Input */}
                  <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <span>Requested Principal Capital</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min={selectedProduct?.minAmount || 500}
                            max={selectedProduct?.maxAmount || 50000}
                            step={100}
                            value={requestedAmount}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRequestedAmount(val);
                            }}
                            className="w-32 px-3 py-1.5 text-sm font-bold font-mono text-right bg-slate-50 border border-slate-200 rounded-lg text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {calcCurrency}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Range Slider */}
                    <input
                      type="range"
                      min={selectedProduct?.minAmount || 500}
                      max={selectedProduct?.maxAmount || 50000}
                      step={100}
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                    />

                    {/* Slider Scale Indicators & Preset Chips */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Min: <MoneyText amount={selectedProduct?.minAmount || 500} currency={calcCurrency} /></span>
                      <div className="flex gap-1.5">
                        {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                          const min = selectedProduct?.minAmount || 500;
                          const max = selectedProduct?.maxAmount || 50000;
                          const targetVal = Math.round((min + (max - min) * ratio) / 100) * 100;
                          return (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setRequestedAmount(targetVal)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-semibold transition-colors"
                            >
                              {ratio * 100}%
                            </button>
                          );
                        })}
                      </div>
                      <span>Max: <MoneyText amount={selectedProduct?.maxAmount || 50000} currency={calcCurrency} /></span>
                    </div>
                  </div>

                  {/* 2. Tenure Slider + Months Input */}
                  <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>Repayment Tenure (Duration)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={selectedProduct?.minTerm || 3}
                          max={selectedProduct?.maxTerm || 60}
                          step={1}
                          value={requestedTerm}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRequestedTerm(val);
                          }}
                          className="w-20 px-3 py-1.5 text-sm font-bold font-mono text-right bg-slate-50 border border-slate-200 rounded-lg text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <span className="text-xs font-semibold text-slate-600">Months</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={selectedProduct?.minTerm || 3}
                      max={selectedProduct?.maxTerm || 60}
                      step={1}
                      value={requestedTerm}
                      onChange={(e) => setRequestedTerm(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                    />

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Min: {selectedProduct?.minTerm || 3} mo</span>
                      <div className="flex gap-1.5">
                        {[6, 12, 24, 36].filter(
                          (m) => m >= (selectedProduct?.minTerm || 3) && m <= (selectedProduct?.maxTerm || 60)
                        ).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setRequestedTerm(m)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              requestedTerm === m
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 hover:bg-indigo-50 text-slate-700'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                      <span>Max: {selectedProduct?.maxTerm || 60} mo</span>
                    </div>
                  </div>

                  {/* 3. Repayment Frequency Selector */}
                  <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Repayment Schedule Frequency</span>
                    </label>

                    <div className="grid grid-cols-3 gap-2.5">
                      {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as RepaymentFrequency[]).map((freq) => {
                        const isSelected = frequency === freq;
                        return (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => setFrequency(freq)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <span className="text-xs block capitalize font-semibold">
                              {freq.toLowerCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {freq === 'MONTHLY' ? 'Every 30 days' : freq === 'BIWEEKLY' ? 'Every 14 days' : 'Every 7 days'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Stated Purpose */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Stated Purpose of Credit Facility
                    </label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Commercial Inventory & Working Capital Expansion"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Right Column: Real-Time Underwriting & Live DTI Gauge Card (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
                    
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                          Real-Time Engine
                        </span>
                        <h3 className="text-base font-bold text-white">Underwriting Readout</h3>
                      </div>
                      <Badge variant="paid" size="xs">
                        <Sparkles className="w-3 h-3 mr-1 inline" />
                        Live Calc
                      </Badge>
                    </div>

                    {/* Financial Figures Breakdown */}
                    <div className="space-y-3 text-xs">
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
                          className="font-bold text-emerald-400"
                        />
                      </div>
                      <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-white/10">
                        <span className="font-semibold text-slate-200">Total Repayable Capital:</span>
                        <MoneyText
                          amount={calc.totalRepayment}
                          currency={calcCurrency}
                          className="font-bold text-white text-base"
                        />
                      </div>

                      {/* Prominent Periodic Installment Block */}
                      <div className="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-semibold text-indigo-200">
                            {frequency === 'MONTHLY' ? 'Monthly' : frequency === 'BIWEEKLY' ? 'Biweekly' : 'Weekly'} Installment:
                          </span>
                          <MoneyText
                            amount={calc.periodicInstallment}
                            currency={calcCurrency}
                            className="text-2xl font-black text-white"
                          />
                        </div>
                        <p className="text-[10px] text-indigo-300/70 font-mono mt-1">
                          {calc.paymentCount} payments across {calc.termMonths} months duration
                        </p>
                      </div>
                    </div>

                    {/* LIVE DTI GAUGE & AFFORDABILITY ANALYZER */}
                    <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Debt-to-Income (DTI) Ratio</span>
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            calc.isDtiWarning
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                          }`}
                        >
                          {calc.dtiRatio}%
                        </span>
                      </div>

                      {/* Animated DTI Meter Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                          <motion.div
                            className={`h-full rounded-full transition-colors ${
                              calc.dtiRatio > 40
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(calc.dtiRatio, 100)}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>0%</span>
                          <span className="text-amber-300">40% Regulatory Limit</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* DTI Amber Warning Banner or Safe Badge */}
                      {calc.isDtiWarning ? (
                        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Affordability Warning: DTI Exceeds 40.0%</span>
                          </div>
                          <p className="text-[11px] text-amber-200/90 leading-relaxed">
                            Monthly installment is high relative to borrower income ($
                            {selectedBorrower?.monthlyIncomeUSD?.toLocaleString()}). Credit committee review will be required.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-[11px]">
                            Healthy Solvency Profile: DTI of <strong>{calc.dtiRatio}%</strong> is well within standard risk tolerances.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preview Repayment Schedule Modal Button */}
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(true)}
                      className="mt-6 w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 group"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-300 group-hover:text-white" />
                      <span>Preview Repayment Schedule</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Repayment Schedule Modal */}
              {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
                  <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Amortization Schedule Preview
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {selectedProduct?.name} • {calc.termMonths} Installments • {calc.rate}% p.a.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowScheduleModal(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1 my-4 border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3 text-right">Principal</th>
                            <th className="py-2.5 px-3 text-right">Interest</th>
                            <th className="py-2.5 px-3 text-right">Total Installment</th>
                            <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {amortizationSchedule.map((row) => (
                            <tr key={row.installmentNo} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                #{row.installmentNo}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {row.dueDate}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                <MoneyText amount={row.principalUSD} currency={calcCurrency} />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                <MoneyText amount={row.interestUSD} currency={calcCurrency} />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600">
                                <MoneyText amount={row.totalUSD} currency={calcCurrency} />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                <MoneyText amount={row.balanceUSD} currency={calcCurrency} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div className="font-mono text-slate-500">
                        Total Repayment: <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-slate-900" />
                      </div>
                      <button
                        onClick={() => setShowScheduleModal(false)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors"
                      >
                        Done &amp; Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 3: SUPPORTING DOCUMENTS (DRAG-AND-DROP)                     */}
          {/* ================================================================ */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Step 3: Supporting KYC &amp; Collateral Documents
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload supporting documents required for verification and underwriting approval.
                </p>
              </div>

              {/* 3 Dedicated Drag-and-Drop Zones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className={`p-6 rounded-xl border-2 border-dashed text-center space-y-3 cursor-pointer transition-all ${
                    dragOverZone === 'NATIONAL_ID'
                      ? 'border-blue-600 bg-blue-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      National ID / Passport
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Front &amp; Back valid government identity scan
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-blue-600 shadow-xs">
                    <Upload className="w-3 h-3" />
                    <span>Drop PDF or Browse</span>
                  </div>
                </div>

                {/* Zone 2: Proof of Income / Salary Slip */}
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
                  className={`p-6 rounded-xl border-2 border-dashed text-center space-y-3 cursor-pointer transition-all ${
                    dragOverZone === 'INCOME_PROOF'
                      ? 'border-blue-600 bg-blue-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Proof of Income / Payroll
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Last 3 months certified bank statements or slips
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-blue-600 shadow-xs">
                    <Upload className="w-3 h-3" />
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
                  className={`p-6 rounded-xl border-2 border-dashed text-center space-y-3 cursor-pointer transition-all ${
                    dragOverZone === 'COLLATERAL'
                      ? 'border-blue-600 bg-blue-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Collateral / Guarantor Info
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Land deed, vehicle registration or signed guarantor
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-emerald-600 shadow-xs">
                    <Upload className="w-3 h-3" />
                    <span>Drop PDF or Browse</span>
                  </div>
                </div>
              </div>

              {/* Attached Supporting Documents List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Attached Supporting Documents ({uploadedDocs.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Max 15MB • PDF, JPG, PNG
                  </span>
                </div>

                {uploadedDocs.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400">
                    No documents attached yet. Click or drag files into the upload zones above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate">
                                {doc.name}
                              </span>
                              <Badge variant="paid" size="xs">
                                Verified
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                              {doc.categoryLabel} • {doc.size} • Uploaded {doc.uploadedAt}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-4">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
                  <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{previewDoc.name}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">{previewDoc.categoryLabel}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreviewDoc(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="h-64 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center space-y-2">
                      <FileCheck className="w-12 h-12 text-blue-500" />
                      <p className="font-semibold text-slate-700">Digital Document Verified</p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Encrypted document stored securely in system storage.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setPreviewDoc(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700 rounded-xl transition-colors"
                      >
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 4: SUMMARY CONFIRMATION & REVIEW                            */}
          {/* ================================================================ */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Step 4: Application Summary &amp; Routing Confirmation
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Examine all terms, underwriting ratios, and documentation before final submission.
                </p>
              </div>

              {/* 4-Section Review Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* 1. Borrower Summary */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold uppercase tracking-wider text-slate-600 text-[11px] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Borrower Profile</span>
                    </span>
                    <Badge variant="verified" size="xs">KYC Cleared</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedBorrower?.fullName}</h4>
                    <p className="text-slate-500 font-mono text-[11px]">ID: {selectedBorrower?.borrowerId}</p>
                  </div>
                  <div className="space-y-1.5 font-mono text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">National ID:</span>
                      <span className="font-semibold text-slate-900">{selectedBorrower?.nationalId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Income:</span>
                      <MoneyText amount={selectedBorrower?.monthlyIncomeUSD || 0} currency={calcCurrency} className="font-bold text-slate-900" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Phone:</span>
                      <span className="font-semibold text-slate-900">{selectedBorrower?.phone}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Facility & Terms Summary */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold uppercase tracking-wider text-slate-600 text-[11px] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>Facility &amp; Terms</span>
                    </span>
                    <Badge variant="active" size="xs">{selectedProduct?.category}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedProduct?.name}</h4>
                    <p className="text-slate-500 font-mono text-[11px]">{selectedProduct?.id}</p>
                  </div>
                  <div className="space-y-1.5 font-mono text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Annual APR:</span>
                      <span className="font-bold text-blue-600">{calc.rate}% p.a. Fixed</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-semibold text-slate-900">{calc.termMonths} Months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Frequency:</span>
                      <span className="font-semibold text-slate-900 capitalize">{frequency.toLowerCase()}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Financial Calculation Totals */}
                <div className="p-5 rounded-xl bg-blue-50/40 border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                    <span className="font-bold uppercase tracking-wider text-blue-900 text-[11px] flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                      <span>Calculation Summary</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-blue-600">
                      Currency: {calcCurrency}
                    </span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Requested Principal:</span>
                      <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-slate-900" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Interest:</span>
                      <MoneyText amount={calc.totalInterest} currency={calcCurrency} className="font-bold text-emerald-600" />
                    </div>
                    <div className="flex justify-between pt-1 border-t border-blue-100">
                      <span className="text-slate-700 font-semibold">Total Repayment:</span>
                      <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-slate-900" />
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-slate-900 font-bold">Estimated Installment:</span>
                      <MoneyText amount={calc.periodicInstallment} currency={calcCurrency} className="text-base font-black text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* 4. Risk Appraisal & Governance */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold uppercase tracking-wider text-slate-600 text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Risk Assessment</span>
                    </span>
                    <Badge variant={calc.riskTier.toLowerCase()} size="xs">
                      {calc.riskTier}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Calculated DTI Ratio:</span>
                      <span
                        className={`font-mono font-bold ${
                          calc.isDtiWarning ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {calc.dtiRatio}% {calc.isDtiWarning ? '(Elevated)' : '(Healthy)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Attached Documents:</span>
                      <span className="font-semibold text-slate-900">{uploadedDocs.length} Verified Files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Review Queue:</span>
                      <span className="font-semibold text-slate-900">Branch Credit Committee</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purpose Notes */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Stated Loan Purpose:</span>
                <p className="text-slate-600 italic">"{purpose}"</p>
              </div>

              {/* Governance & Compliance Routing Notice */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3.5 text-xs text-slate-700">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Underwriting &amp; Compliance Review Notice
                  </span>
                  <p className="mt-0.5 text-slate-600 leading-relaxed">
                    Upon clicking "Submit Application", the loan application is assigned a unique reference ID,
                    recorded into the audit ledger, and routed to credit underwriting for review.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ------------------------------------------------------------------ */}
        {/* Wizard Footer Navigation Controls                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-100">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep === 4 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmationModal(true)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-600/25 transition-all inline-flex items-center gap-2"
                >
                  <span>Submit Application</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-600/25 transition-all"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. Official Submission Confirmation Modal                            */}
      {/* -------------------------------------------------------------------- */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Application Submission
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The loan application will be submitted for credit underwriting review.
                </p>
              </div>
            </div>

            {/* Quick Summary Pill Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Borrower:</span>
                <span className="font-bold text-slate-900">{selectedBorrower?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loan Facility:</span>
                <span className="font-bold text-slate-900">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Principal Requested:</span>
                <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-indigo-600" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Projected Installment:</span>
                <MoneyText amount={calc.periodicInstallment} currency={calcCurrency} className="font-bold text-slate-900" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Underwriting DTI:</span>
                <span className={`font-mono font-bold ${calc.isDtiWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {calc.dtiRatio}%
                </span>
              </div>
            </div>

            {/* Mandatory Compliance Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmAgreed}
                onChange={(e) => setConfirmAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I certify that all applicant details, supporting KYC credentials, and stated income proofs have been preliminarily validated in accordance with National Bank of Cambodia compliance guidelines.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Back to Review
              </button>
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={!confirmAgreed || isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/25 transition-all inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Routing Application...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Route to Committee</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
