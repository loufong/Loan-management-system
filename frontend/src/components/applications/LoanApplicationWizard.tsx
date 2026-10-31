import React, { useState, useMemo } from 'react';
import {
  Borrower,
  LoanProduct,
  Currency,
  LoanApplication,
  RepaymentFrequency,
  UserProfile,
  UserRole,
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';
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
  Clock,
} from 'lucide-react';

export interface LoanApplicationWizardProps {
  borrowers: Borrower[];
  products: LoanProduct[];
  currency: Currency;
  currentUser?: UserProfile;
  currentUserRole?: UserRole;
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

const STEPS = [
  { id: 1, title: 'Product' },
  { id: 2, title: 'Terms & Calculator' },
  { id: 3, title: 'Documents' },
  { id: 4, title: 'Review' },
];

export const LoanApplicationWizard: React.FC<LoanApplicationWizardProps> = ({
  borrowers,
  products,
  currency: initialCurrency,
  currentUser,
  currentUserRole,
  onCancel,
  onSubmitApplication,
}) => {
  const { language, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [calcCurrency, setCalcCurrency] = useState<Currency>(initialCurrency);

  const wizardSteps = [
    { id: 1, title: t('step_product', 'Product') },
    { id: 2, title: t('step_terms', 'Terms & Calculator') },
    { id: 3, title: t('step_documents', 'Documents') },
    { id: 4, title: t('step_review', 'Review') },
  ];

  // --------------------------------------------------------------------------
  // STEP 1: Borrower & Product State
  // --------------------------------------------------------------------------
  const matchingUserBorrower = currentUser
    ? borrowers.find(
        (b) =>
          b.id === currentUser.borrowerId ||
          b.borrowerId === currentUser.borrowerId ||
          b.fullName.toLowerCase().includes((currentUser.name || '').toLowerCase()) ||
          b.fullName.toLowerCase().includes((currentUser.fullName || '').toLowerCase())
      )
    : null;

  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(
    matchingUserBorrower?.id || borrowers[0]?.id || ''
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
  // STEP 2: Loan Terms State
  // --------------------------------------------------------------------------
  const [requestedAmount, setRequestedAmount] = useState<number>(
    selectedProduct?.minAmount || 5000
  );
  const [requestedTerm, setRequestedTerm] = useState<number>(
    selectedProduct ? Math.min(Math.max(12, selectedProduct.minTerm), selectedProduct.maxTerm) : 12
  );
  const [frequency, setFrequency] = useState<RepaymentFrequency>('MONTHLY');
  const [purpose, setPurpose] = useState('Business Expansion & Equipment');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
  // STEP 3: Documents State
  // --------------------------------------------------------------------------
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([
    {
      id: 'doc-1',
      name: 'national_id_scan.pdf',
      size: '1.4 MB',
      type: 'NATIONAL_ID',
      categoryLabel: 'National ID',
      uploadedAt: 'Today',
    },
    {
      id: 'doc-2',
      name: 'income_statement.pdf',
      size: '860 KB',
      type: 'INCOME_PROOF',
      categoryLabel: 'Proof of Income',
      uploadedAt: 'Today',
    },
  ]);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);

  // --------------------------------------------------------------------------
  // STEP 4: Review State
  // --------------------------------------------------------------------------
  const [confirmAgreed, setConfirmAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // Financial Calculations
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

  // Amortization Schedule
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

  // Document Handlers
  const handleAddDocument = (type: 'NATIONAL_ID' | 'INCOME_PROOF' | 'COLLATERAL') => {
    const labelMap = {
      NATIONAL_ID: 'National ID',
      INCOME_PROOF: 'Proof of Income',
      COLLATERAL: 'Collateral Info',
    };
    const prefixMap = {
      NATIONAL_ID: 'id_document',
      INCOME_PROOF: 'salary_slip',
      COLLATERAL: 'property_deed',
    };
    const rSize = (Math.random() * 1.5 + 0.5).toFixed(1);
    const newDoc: UploadedDocument = {
      id: `doc-${Date.now()}`,
      name: `${prefixMap[type]}_${Date.now().toString().slice(-4)}.pdf`,
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
      borrowerId: selectedBorrower?.id || selectedBorrowerId,
      borrowerName: selectedBorrower?.fullName || currentUser?.name || 'Applicant',
      borrowerAvatar: selectedBorrower?.avatarUrl,
      borrowerIncomeUSD: selectedBorrower?.monthlyIncomeUSD,
      productId: selectedProduct?.id || selectedProductId,
      productName: getProductName(selectedProduct),
      requestedAmountUSD: requestedAmount,
      requestedTermMonths: requestedTerm,
      frequency,
      purpose: purpose.trim() || 'General Purpose',
      dtiRatio: calc.dtiRatio,
      riskTier: calc.riskTier,
      status: isDraft ? 'DRAFT' : 'SUBMITTED',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitApplication(app, isDraft);
    }, 400);
  };

  const getProductName = (prod?: any): string => {
    if (!prod) return 'Loan Facility';
    return prod.name || prod.productName || 'Loan Facility';
  };

  const getProductCategory = (prod?: any): string => {
    if (prod?.category) return prod.category;
    const title = (prod?.name || prod?.productName || '').toLowerCase();
    if (title.includes('agri') || title.includes('farm')) return 'Agriculture';
    if (title.includes('business') || title.includes('sme')) return 'Business';
    if (title.includes('vehicle') || title.includes('car') || title.includes('moto')) return 'Vehicle';
    if (title.includes('emergency') || title.includes('urgent')) return 'Emergency';
    return 'Personal';
  };

  const getCategoryTheme = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'agriculture':
        return {
          icon: <Sprout className="w-4 h-4 text-emerald-600" />,
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          iconBg: 'bg-emerald-50 border border-emerald-200/60',
          label: language === 'km' ? 'កសិកម្ម' : 'Agriculture',
        };
      case 'business':
        return {
          icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          iconBg: 'bg-indigo-50 border border-indigo-200/60',
          label: language === 'km' ? 'អាជីវកម្ម SME' : 'SME Business',
        };
      case 'vehicle':
        return {
          icon: <Car className="w-4 h-4 text-amber-600" />,
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          iconBg: 'bg-amber-50 border border-amber-200/60',
          label: language === 'km' ? 'យានយន្ត' : 'Vehicle',
        };
      case 'emergency':
        return {
          icon: <Zap className="w-4 h-4 text-rose-600" />,
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
          iconBg: 'bg-rose-50 border border-rose-200/60',
          label: language === 'km' ? 'បន្ទាន់' : 'Emergency',
        };
      case 'personal':
      default:
        return {
          icon: <Home className="w-4 h-4 text-blue-600" />,
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          iconBg: 'bg-blue-50 border border-blue-200/60',
          label: language === 'km' ? 'បុគ្គល & ការសិក្សា' : 'Personal & Education',
        };
    }
  };

  const isBorrowerMode = ['BORROWER', 'CLIENT', 'USER'].includes((currentUserRole || '').toUpperCase());

  return (
    <div className="max-w-5xl mx-auto font-sans">
      {/* Unified Master Wizard Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        
        {/* Top Active Progress Track */}
        <div className="w-full h-1 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* 1. Header Toolbar */}
        <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                  {t('wizard_apply_title', 'Apply for Credit Facility')}
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                  {language === 'km' ? `ជំហាន ${currentStep} / ៤` : `Step ${currentStep} of 4`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'km'
                  ? 'បំពេញពាក្យស្នើសុំរបស់អ្នកតាម ៤ ជំហានងាយៗ និងរហ័ស'
                  : 'Fast-track financing application: Facility, Terms, Documents & Verification'}
              </p>
            </div>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Currency:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setCalcCurrency('USD')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  calcCurrency === 'USD'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCalcCurrency('KHR')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  calcCurrency === 'KHR'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                KHR (៛)
              </button>
            </div>
          </div>
        </div>

        {/* 2. Integrated Stepper Track */}
        <div className="bg-slate-50/70 border-b border-slate-100 px-5 py-3 sm:px-7">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {wizardSteps.map((s) => {
              const isCompleted = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              const isClickable = s.id < currentStep;

              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setCurrentStep(s.id as any)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${
                    isCurrent
                      ? 'bg-white border border-slate-200 shadow-2xs text-slate-900 ring-1 ring-slate-900/5'
                      : isCompleted
                      ? 'bg-emerald-50/70 border border-emerald-200/70 text-emerald-800 hover:bg-emerald-100/70 cursor-pointer'
                      : 'text-slate-400 border border-transparent cursor-default'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Step 0${s.id}
                    </span>
                    <span className={`text-xs font-semibold truncate block ${
                      isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-emerald-800' : 'text-slate-500'
                    }`}>
                      {s.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Main Step Surface */}
        <div className="p-6 sm:p-7">
        {/* ================================================================ */}
        {/* STEP 1: PRODUCT SELECTION                                       */}
        {/* ================================================================ */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* Applicant Profile Card */}
            {isBorrowerMode ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 via-slate-50/80 to-blue-50/30 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                    {(selectedBorrower?.fullName || currentUser?.name || 'ME').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {selectedBorrower?.fullName || currentUser?.name || 'Applicant'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100/80 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified Borrower
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      Borrower ID: {selectedBorrower?.borrowerId || currentUser?.borrowerId || 'BOR-2026-0001'}
                    </span>
                  </div>
                </div>
                <div className="sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Verified Monthly Income
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                    <MoneyText amount={selectedBorrower?.monthlyIncomeUSD || 2800} currency={calcCurrency} />
                    <span className="text-slate-400 font-normal text-xs"> / month</span>
                  </span>
                </div>
              </div>
            ) : (
              /* Admin/Staff Searchable Borrower Selector */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900">Select Borrower</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={borrowerSearch}
                    onChange={(e) => {
                      setBorrowerSearch(e.target.value);
                      setIsBorrowerDropdownOpen(true);
                    }}
                    onFocus={() => setIsBorrowerDropdownOpen(true)}
                    placeholder="Search borrower by name or ID..."
                    className="w-full pl-9 pr-8 h-9 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  {borrowerSearch && (
                    <button
                      onClick={() => setBorrowerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isBorrowerDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsBorrowerDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md max-h-48 overflow-y-auto z-30 divide-y divide-slate-100 shadow-lg">
                        {filteredBorrowers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">No borrowers found.</div>
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
                                  isSelected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">{b.fullName}</span>
                                  <span className="text-[11px] text-slate-500 ml-2 font-mono">{b.borrowerId}</span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-600">
                                  ${b.monthlyIncomeUSD.toLocaleString()}/mo
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Loan Products Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-900 block">
                    Choose Credit Facility
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a tailored lending product matching your capital requirements
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  {products.length} Facilities Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  const prodName = getProductName(prod);
                  const prodCategory = getProductCategory(prod);
                  const theme = getCategoryTheme(prodCategory);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      className={`group relative p-4 sm:p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50/40 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs hover:bg-slate-50/30'
                      }`}
                    >
                      <div>
                        {/* Top Badges Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.iconBg}`}>
                              {theme.icon}
                            </div>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${theme.badgeBg}`}>
                              {theme.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-900 text-white">
                              {prod.interestRate}% APR
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className={`text-xs sm:text-sm font-bold transition-colors ${
                          isSelected ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-600'
                        }`}>
                          {prodName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      {/* Facility Limits */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Credit Limit:</span>
                          <span className="font-semibold text-slate-900">
                            <MoneyText amount={Number(prod.minAmount)} currency={calcCurrency} /> – <MoneyText amount={Number(prod.maxAmount)} currency={calcCurrency} />
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Tenure:</span>
                          <span className="font-semibold text-slate-900">
                            {prod.minTerm} to {prod.maxTerm} months
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: TERMS & LIVE CALCULATOR                                 */}
        {/* ================================================================ */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Inputs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Product Badge Header */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{getProductName(selectedProduct)}</span>
                <span className="font-mono font-bold text-blue-600">{selectedProduct?.interestRate}% APR Fixed</span>
              </div>

              {/* 1. Loan Amount */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-900">Loan Amount</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-500">{calcCurrency}</span>
                    <input
                      type="number"
                      min={selectedProduct?.minAmount || 500}
                      max={selectedProduct?.maxAmount || 50000}
                      step={100}
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(Number(e.target.value))}
                      className="w-28 px-2.5 h-8 text-xs font-bold font-mono text-right border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={selectedProduct?.minAmount || 500}
                  max={selectedProduct?.maxAmount || 50000}
                  step={100}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Min: <MoneyText amount={selectedProduct?.minAmount || 500} currency={calcCurrency} /></span>
                  <div className="flex gap-1">
                    {[1000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          setRequestedAmount((prev) =>
                            Math.min(prev + amt, selectedProduct?.maxAmount || 50000)
                          )
                        }
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold"
                      >
                        +${amt / 1000}k
                      </button>
                    ))}
                  </div>
                  <span>Max: <MoneyText amount={selectedProduct?.maxAmount || 50000} currency={calcCurrency} /></span>
                </div>
              </div>

              {/* 2. Repayment Tenure */}
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-900">Tenure (Months)</label>
                  <span className="text-xs font-bold font-mono text-slate-900">{requestedTerm} Months</span>
                </div>

                <div className="flex gap-2">
                  {[6, 12, 24, 36, 48].filter(
                    (m) => m >= (selectedProduct?.minTerm || 3) && m <= (selectedProduct?.maxTerm || 60)
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRequestedTerm(m)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                        requestedTerm === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m} mo
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={selectedProduct?.minTerm || 3}
                  max={selectedProduct?.maxTerm || 60}
                  step={1}
                  value={requestedTerm}
                  onChange={(e) => setRequestedTerm(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                />
              </div>

              {/* 3. Frequency & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-900 block">Frequency</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['MONTHLY', 'BIWEEKLY', 'WEEKLY'] as RepaymentFrequency[]).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFrequency(freq)}
                        className={`py-1 text-xs font-semibold rounded capitalize transition-colors ${
                          frequency === freq
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {freq === 'MONTHLY' ? 'Monthly' : freq === 'BIWEEKLY' ? 'Biweekly' : 'Weekly'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-900 block">Loan Purpose</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Business expansion, Equipment"
                    className="w-full px-2.5 h-8 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Summary Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Estimated Payment
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <MoneyText
                      amount={calc.periodicInstallment}
                      currency={calcCurrency}
                      className="text-2xl font-bold text-white"
                    />
                    <span className="text-xs text-slate-400">/{frequency === 'MONTHLY' ? 'mo' : frequency === 'BIWEEKLY' ? '2wks' : 'wk'}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    {calc.paymentCount} payments • {calc.termMonths} months duration
                  </span>
                </div>

                {/* Quick Figures */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Principal:</span>
                    <MoneyText amount={calc.principal} currency={calcCurrency} className="font-semibold text-white" />
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Interest ({calc.rate}% APR):</span>
                    <MoneyText amount={calc.totalInterest} currency={calcCurrency} className="font-semibold text-emerald-400" />
                  </div>
                  <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-800 font-semibold">
                    <span className="text-white">Total Repayment:</span>
                    <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="text-white font-bold" />
                  </div>
                </div>

                {/* DTI Ratio Pill */}
                <div className="pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 text-[11px]">DTI Ratio</span>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        calc.isDtiWarning
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {calc.dtiRatio}% {calc.isDtiWarning ? '(High)' : '(Healthy)'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${calc.isDtiWarning ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(calc.dtiRatio, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Preview Schedule Button */}
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full py-2 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View Amortization Schedule</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: DOCUMENTS                                                */}
        {/* ================================================================ */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload Documents</h2>
              <p className="text-xs text-slate-500 mt-0.5">Attach identity and income proofs</p>
            </div>

            {/* 3 Upload Dropzones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: 'NATIONAL_ID' as const, label: 'National ID / Passport', req: 'Required', icon: User },
                { type: 'INCOME_PROOF' as const, label: 'Proof of Income', req: 'Required', icon: FileCheck },
                { type: 'COLLATERAL' as const, label: 'Collateral Info', req: 'Optional', icon: ShieldCheck },
              ].map(({ type, label, req, icon: Icon }) => (
                <div
                  key={type}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverZone(type);
                  }}
                  onDragLeave={() => setDragOverZone(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverZone(null);
                    handleAddDocument(type);
                  }}
                  onClick={() => handleAddDocument(type)}
                  className={`p-4 rounded-lg border-2 border-dashed text-center space-y-2 cursor-pointer transition-colors ${
                    dragOverZone === type
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center mx-auto">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{label}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold">{req}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">
                    <Upload className="w-3 h-3 text-blue-600" />
                    <span>Upload File</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Uploaded List */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-900 block">
                Attached Files ({uploadedDocs.length})
              </span>

              {uploadedDocs.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-200 rounded-md bg-slate-50 text-xs text-slate-400">
                  No files uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate">{doc.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({doc.size})</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {doc.categoryLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4: REVIEW & CONFIRM                                         */}
        {/* ================================================================ */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Review Application</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verify your details before submission</p>
            </div>

            {/* 2-Column Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Loan Facility */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 text-xs">{getProductName(selectedProduct)}</span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {calc.rate}% APR
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Requested Amount:</span>
                    <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-slate-900" />
                  </div>
                  <div className="flex justify-between">
                    <span>Tenure:</span>
                    <span className="font-semibold text-slate-900">{calc.termMonths} Months ({frequency.toLowerCase()})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Interest:</span>
                    <MoneyText amount={calc.totalInterest} currency={calcCurrency} className="font-semibold text-emerald-600" />
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold text-slate-900">
                    <span>Monthly Payment:</span>
                    <MoneyText amount={calc.periodicInstallment} currency={calcCurrency} className="font-bold text-slate-900" />
                  </div>
                  <div className="flex justify-between text-slate-900">
                    <span>Total Repayment:</span>
                    <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-slate-900" />
                  </div>
                </div>
              </div>

              {/* Card 2: Applicant & Risk */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 text-xs">Applicant Profile</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    calc.isDtiWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    DTI {calc.dtiRatio}%
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-semibold text-slate-900">{selectedBorrower?.fullName || currentUser?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-mono text-slate-900">{selectedBorrower?.borrowerId || currentUser?.borrowerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Income:</span>
                    <MoneyText amount={selectedBorrower?.monthlyIncomeUSD || 0} currency={calcCurrency} className="font-semibold text-slate-900" />
                  </div>
                  <div className="flex justify-between">
                    <span>Purpose:</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[160px]">{purpose || 'General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Documents:</span>
                    <span className="font-semibold text-slate-900">{uploadedDocs.length} files attached</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Concise Confirmation Checkbox */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmAgreed}
                onChange={(e) => setConfirmAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-slate-700">
                {language === 'km'
                  ? 'ខ្ញុំសូមបញ្ជាក់ថាលក្ខខណ្ឌកម្ចី និងឯកសារដែលបានផ្តល់ជូនទាំងអស់គឺពិតជាត្រឹមត្រូវ។'
                  : 'I confirm that all loan terms and documents provided are accurate.'}
              </span>
            </label>
          </div>
        )}

        {/* 4. Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-100">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('btn_back', 'Back')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                {t('btn_cancel', 'Cancel')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentStep === 4 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                >
                  {t('wizard_save_draft_btn', 'Save Draft')}
                </button>
                <button
                  type="button"
                  disabled={!confirmAgreed || isSubmitting}
                  onClick={() => handleFinalSubmit(false)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'km' ? 'កំពុងដាក់ស្នើ...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('wizard_submit_btn', 'Submit Application')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all inline-flex items-center gap-2 shadow-sm"
              >
                <span>{t('btn_continue', 'Continue')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Amortization Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-2xl w-full p-5 border border-slate-200 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Amortization Schedule</h3>
                <span className="text-xs text-slate-500 font-mono">
                  {getProductName(selectedProduct)} • {calc.termMonths} mos • {calc.rate}% APR
                </span>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-3 border border-slate-200 rounded">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Principal</th>
                    <th className="py-2 px-3 text-right">Interest</th>
                    <th className="py-2 px-3 text-right">Payment</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {amortizationSchedule.map((row) => (
                    <tr key={row.installmentNo} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">#{row.installmentNo}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{row.dueDate}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        <MoneyText amount={row.principalUSD} currency={calcCurrency} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        <MoneyText amount={row.interestUSD} currency={calcCurrency} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        <MoneyText amount={row.totalUSD} currency={calcCurrency} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        <MoneyText amount={row.balanceUSD} currency={calcCurrency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
              <div className="text-slate-600">
                Total Repayment: <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-slate-900" />
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900 truncate">{previewDoc.name}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-40 rounded bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-500 text-xs space-y-1.5">
              <FileCheck className="w-8 h-8 text-blue-600" />
              <span className="font-semibold text-slate-900">Document Verified</span>
              <span className="text-[11px] text-slate-400">{previewDoc.categoryLabel} • {previewDoc.size}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LoanApplicationWizard;
