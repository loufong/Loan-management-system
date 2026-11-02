import React, { useState, useMemo, useEffect } from 'react';
import {
  FilePlus2,
  CheckCircle2,
  DollarSign,
  Calendar,
  Percent,
  Landmark,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  FileText,
  BadgeCheck,
  Building,
  Sparkles,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { loanStorageService } from '../../services/loanStorageService';
import { kycService, FrontendKycSummary } from '../../services/kycService';

export interface BorrowerApplyLoanViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onNavigate: (route: string) => void;
  onSubmitSuccess?: (applicationData: any) => void;
}

export const BorrowerApplyLoanView: React.FC<BorrowerApplyLoanViewProps> = ({
  currentUser,
  currency: appCurrency,
  onNavigate,
  onSubmitSuccess,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km' || (language as string) === 'KH';

  // 3-Step Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Currency toggle inside form (default to app currency)
  const [activeCurrency, setActiveCurrency] = useState<Currency>(appCurrency || 'USD');
  const NBC_RATE = 4080; // 1 USD = 4,080 KHR (NBC Official Reference Rate)

  // Step 1: Loan Configuration State
  const [selectedProduct, setSelectedProduct] = useState<'PERSONAL' | 'SME' | 'AGRI'>('PERSONAL');
  const [loanAmountUSD, setLoanAmountUSD] = useState<number>(6000);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [repaymentType, setRepaymentType] = useState<'REDUCING' | 'FLAT'>('REDUCING');

  // Step 2: Financial & Disbursement State
  const [disbursementMethod, setDisbursementMethod] = useState<string>('acleda_2023');
  const [monthlyIncomeUSD, setMonthlyIncomeUSD] = useState<number>(2800);
  const [collateralType, setCollateralType] = useState<string>('soft_title');
  const [uploadedSalarySlip, setUploadedSalarySlip] = useState<string | null>('payslip_september_2026.pdf');
  const [uploadedCollateralDoc, setUploadedCollateralDoc] = useState<string | null>('residential_soft_title_card.pdf');

  // Step 3: Review & Terms State
  const [declarationAgreed, setDeclarationAgreed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedAppId, setSubmittedAppId] = useState<string>('');
  const [draftSavedToast, setDraftSavedToast] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Regulatory KYC Guard State
  const [kycSummary, setKycSummary] = useState<FrontendKycSummary | null>(null);
  const [kycLoading, setKycLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchKyc = async () => {
      try {
        setKycLoading(true);
        const data = await kycService.getKycStatus(currentUser.id || 'BOR-2026-8801');
        if (isMounted) setKycSummary(data);
      } catch (err) {
        console.error('Failed to query KYC status for borrower:', err);
      } finally {
        if (isMounted) setKycLoading(false);
      }
    };
    fetchKyc();

    const handleKycUpdate = () => {
      fetchKyc();
    };
    window.addEventListener('kyc_status_updated', handleKycUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('kyc_status_updated', handleKycUpdate);
    };
  }, [currentUser.id]);

  const isBorrowingLocked = !kycLoading && kycSummary !== null && !kycSummary.isEligibleToBorrow;

  // Product configurations
  const products = {
    PERSONAL: {
      name: 'Personal Micro-Loan',
      subtitle: 'General personal expenses, tuition & lifestyle',
      rate: 6.5,
      minAmount: 500,
      maxAmount: 10000,
      badge: 'NBC Standard',
    },
    SME: {
      name: 'SME Working Capital',
      subtitle: 'Business expansion, inventory restocking & operations',
      rate: 9.0,
      minAmount: 2000,
      maxAmount: 20000,
      badge: 'High Ceiling',
    },
    AGRI: {
      name: 'Agri-Credit Facility',
      subtitle: 'Seasonal farming inputs, machinery & eco-agronomy',
      rate: 5.5,
      minAmount: 1000,
      maxAmount: 15000,
      badge: 'Subsidized Rate',
    },
  };

  const activeProductConfig = products[selectedProduct];
  const interestRate = activeProductConfig.rate;

  // Real-time EMI Simulator Calculations
  const calculations = useMemo(() => {
    const P = loanAmountUSD;
    const n = tenureMonths;
    const annualRate = interestRate / 100;
    const monthlyRate = annualRate / 12;

    let monthlyEMI = 0;
    let totalInterest = 0;

    if (repaymentType === 'REDUCING') {
      // Standard Amortization formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
      if (monthlyRate === 0) {
        monthlyEMI = P / n;
        totalInterest = 0;
      } else {
        const factor = Math.pow(1 + monthlyRate, n);
        monthlyEMI = (P * monthlyRate * factor) / (factor - 1);
        totalInterest = monthlyEMI * n - P;
      }
    } else {
      // Flat Rate: monthly interest = (P * annualRate) / 12
      const monthlyPrincipal = P / n;
      const monthlyInterest = (P * annualRate) / 12;
      monthlyEMI = monthlyPrincipal + monthlyInterest;
      totalInterest = monthlyInterest * n;
    }

    const processingFee = P * 0.01; // 1.0% regulatory processing fee
    const totalRepayable = P + totalInterest;

    return {
      monthlyEMIUSD: Math.round(monthlyEMI * 100) / 100,
      totalInterestUSD: Math.round(totalInterest * 100) / 100,
      processingFeeUSD: Math.round(processingFee * 100) / 100,
      totalRepayableUSD: Math.round(totalRepayable * 100) / 100,
      firstDueDate: '2026-11-30',
    };
  }, [loanAmountUSD, tenureMonths, interestRate, repaymentType]);

  // Format money helper
  const formatMoney = (amountUSD: number) => {
    if (activeCurrency === 'KHR') {
      const khrVal = amountUSD * NBC_RATE;
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0,
      }).format(khrVal);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amountUSD);
  };

  const handleSaveDraft = () => {
    setDraftSavedToast(true);
    setTimeout(() => setDraftSavedToast(false), 3000);
  };

  const handleSubmitApplication = async () => {
    if (!declarationAgreed) return;

    if (isBorrowingLocked) {
      setSubmissionError(
        `Regulatory Borrowing Lock Active: ${kycSummary?.verifiedCount ?? 0} of 3 KYC documents verified. In accordance with National Bank of Cambodia lending directives, all 3 mandatory KYC documents must be verified before origination.`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const generatedId = `LN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const loanPayload = {
        id: generatedId,
        borrowerId: currentUser.id || 'BOR-2026-8801',
        borrowerName: currentUser.fullName || currentUser.name || 'Johnathan Doe',
        borrowerEmail: currentUser.email || 'borrower@jamsongvich.com',
        borrowerPhone: currentUser.phone || '+855 12 345 678',
        productType: activeProductConfig.name,
        principalAmount: Number(loanAmountUSD),
        annualInterestRate: activeProductConfig.rate,
        tenureMonths: Number(tenureMonths),
        repaymentType: repaymentType || 'REDUCING_BALANCE',
        monthlyEmi: calculations.monthlyEMIUSD,
        status: 'UNDERWRITING_PENDING',
        submittedAt: new Date().toISOString(),
        disbursementBank: 'ACLEDA Bank Plc.',
        disbursementAccount: '****2023',
        collateralStatus: collateralType === 'HARD_TITLE' ? 'Verified Hard Title Lien' : 'Equipment Lien',
      };

      const record = await loanStorageService.submitLoanApplication(loanPayload);
      setSubmittedAppId(record.loanId || generatedId);
      setIsSubmitting(false);
      setIsSubmitted(true);

      if (onSubmitSuccess) {
        onSubmitSuccess(record);
      }
    } catch (err: any) {
      console.error('Failed to submit loan application:', err);
      setIsSubmitting(false);
      setSubmissionError(
        err?.message || 'Regulatory lock or server rejection occurred while transmitting credit application.'
      );
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 sm:p-10 text-center shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-5">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            ● APPLICATION TRANSMITTED TO CREDIT COMMITTEE
          </span>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            Application Submitted — Under Review by Core Banking Credit Committee
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Your application reference <span className="font-mono text-emerald-400 font-bold">{submittedAppId}</span> has been logged with the underwriting risk desk. Instant updates will be dispatched via SMS & Telegram.
          </p>

          {/* Quick Summary Pill Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto my-6 text-left">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Facility</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">{activeProductConfig.name}</p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Requested</span>
              <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{formatMoney(loanAmountUSD)}</p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tenure</span>
              <p className="text-xs font-bold text-white mt-0.5">{tenureMonths} Months</p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Monthly Est.</span>
              <p className="text-xs font-bold text-white font-mono mt-0.5">{formatMoney(calculations.monthlyEMIUSD)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('borrower_dashboard')}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              Return to My Loans
            </button>
            <button
              type="button"
              onClick={() => onNavigate('repayments')}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              View Repayment Schedule
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notification for Draft Save */}
      {draftSavedToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Application draft saved to local secure cache.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & STEP TRACKER                                          */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span className="text-slate-500 font-medium">Core Banking</span>
              <span>/</span>
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                {'Apply for Loan'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {'New Credit Facility Application'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {'Fast-track institutional financing intake compliant with National Bank of Cambodia lending directives.'}
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2 self-start lg:self-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">Currency:</span>
            <button
              type="button"
              onClick={() => setActiveCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCurrency === 'USD'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setActiveCurrency('KHR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCurrency === 'KHR'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KHR (៛)
            </button>
          </div>
        </div>

        {/* Step Indicator Tracker */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-5 border-t border-slate-800/80">
          {[
            { step: 1, title: '1. Facility & Terms', subtitle: 'Product, principal & tenure' },
            { step: 2, title: '2. Financial & KYC Details', subtitle: 'Bank account & soft title' },
            { step: 3, title: '3. Review & Disburse', subtitle: 'NBC terms & submit' },
          ].map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step < currentStep) setCurrentStep(s.step as any);
                }}
                disabled={s.step > currentStep}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-950 border-emerald-500/40 text-emerald-400 shadow-sm'
                    : isCompleted
                    ? 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer'
                    : 'bg-slate-950/20 border-slate-850 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-emerald-400' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {s.title}
                  </span>
                  {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block truncate">{s.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REGULATORY KYC BORROWING LOCK ALERT BANNER                                */}
      {/* ========================================================================= */}
      {isBorrowingLocked && (
        <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/60 border border-rose-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Regulatory Borrowing Lock Active (NBC Article 42 Compliance)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {kycSummary?.verifiedCount ?? 0} of 3 Verified
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  National Bank of Cambodia lending directives mandate that borrowers must have all three statutory regulatory KYC documents verified prior to originating credit facilities or drawing funds.
                </p>

                {/* Individual Document Status Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {kycSummary?.documents.map((doc) => (
                    <span
                      key={doc.documentType}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        doc.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : doc.status === 'PENDING_REVIEW'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {doc.status === 'VERIFIED' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                      )}
                      <span className="font-medium text-slate-300">{doc.title}:</span>
                      <span className="font-mono font-bold uppercase">{doc.status.replace('_', ' ')}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 shrink-0 cursor-pointer self-start md:self-center"
            >
              <span>Complete KYC Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form Workflows (8 Cols) + Real-Time EMI Simulator (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Form Step Contents */}
        <div className="lg:col-span-8 space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: LOAN CONFIGURATION                                        */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <FilePlus2 className="w-4 h-4 text-emerald-400" />
                  Select Credit Product & Loan Structure
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose a product tier that matches your financing requirements and repayment capacity.
                </p>
              </div>

              {/* Product Selector: Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(products) as Array<'PERSONAL' | 'SME' | 'AGRI'>).map((pKey) => {
                  const p = products[pKey];
                  const isSelected = selectedProduct === pKey;
                  return (
                    <div
                      key={pKey}
                      onClick={() => {
                        setSelectedProduct(pKey);
                        if (loanAmountUSD > p.maxAmount) setLoanAmountUSD(p.maxAmount);
                        if (loanAmountUSD < p.minAmount) setLoanAmountUSD(p.minAmount);
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {p.badge}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {p.rate}% APR
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-white">{p.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {p.subtitle}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Limit</span>
                        <span className="font-semibold text-slate-200">
                          {formatMoney(p.minAmount)} - {formatMoney(p.maxAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Amount Input with Range Slider */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Requested Principal Amount
                  </label>
                  <span className="text-xs font-mono text-slate-400">
                    NBC Cap: <strong className="text-white">{formatMoney(activeProductConfig.maxAmount)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold font-mono text-sm">
                      {activeCurrency === 'USD' ? '$' : '៛'}
                    </div>
                    <input
                      type="number"
                      min={activeProductConfig.minAmount}
                      max={activeProductConfig.maxAmount}
                      step={100}
                      value={activeCurrency === 'USD' ? loanAmountUSD : Math.round(loanAmountUSD * NBC_RATE)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (activeCurrency === 'USD') {
                          setLoanAmountUSD(Math.min(activeProductConfig.maxAmount, Math.max(0, val)));
                        } else {
                          setLoanAmountUSD(Math.min(activeProductConfig.maxAmount, Math.max(0, Math.round(val / NBC_RATE))));
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="text-right px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl min-w-[140px]">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Counter-Value</span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {activeCurrency === 'USD'
                        ? new Intl.NumberFormat('km-KH', { style: 'currency', currency: 'KHR', maximumFractionDigits: 0 }).format(loanAmountUSD * NBC_RATE)
                        : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(loanAmountUSD)}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={activeProductConfig.minAmount}
                  max={activeProductConfig.maxAmount}
                  step={100}
                  value={loanAmountUSD}
                  onChange={(e) => setLoanAmountUSD(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-slate-800"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Min: {formatMoney(activeProductConfig.minAmount)}</span>
                  <span>Max: {formatMoney(activeProductConfig.maxAmount)}</span>
                </div>
              </div>

              {/* Tenure Selector: Pill Buttons */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Loan Tenure
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 6, 12, 24, 36].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setTenureMonths(months)}
                      className={`py-2 rounded-xl text-xs font-semibold font-mono transition-all border cursor-pointer ${
                        tenureMonths === months
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {months} Months
                    </button>
                  ))}
                </div>
              </div>

              {/* Repayment Type: Toggle */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Repayment Interest Calculation Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRepaymentType('REDUCING')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      repaymentType === 'REDUCING'
                        ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Reducing Balance</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        NBC Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Interest charged strictly on remaining unpaid principal balance. Low total cost.
                    </p>
                  </div>

                  <div
                    onClick={() => setRepaymentType('FLAT')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      repaymentType === 'FLAT'
                        ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Flat Rate Interest</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        Fixed Equal Charge
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Uniform monthly interest calculated against the original principal amount.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: FINANCIAL, DISBURSEMENT & COLLATERAL                       */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  Disbursement Destination & KYC Documentation
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Designate where approved funds should be credited and provide verification documents.
                </p>
              </div>

              {/* Linked Bank Account Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Disbursement Receiving Account (Direct Clearing)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDisbursementMethod('acleda_2023')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      disbursementMethod === 'acleda_2023'
                        ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                        AC
                      </div>
                      <span className="text-xs font-bold text-white">ACLEDA Bank Plc.</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-emerald-400">
                      Account: •••• 2023 (USD/KHR)
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">Primary Verified Disbursement Channel</span>
                  </div>

                  <div
                    onClick={() => setDisbursementMethod('bakong_nbc')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      disbursementMethod === 'bakong_nbc'
                        ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded bg-red-600 text-white font-black text-[9px] flex items-center justify-center">
                        KH
                      </div>
                      <span className="text-xs font-bold text-white">Bakong KHQR Account ID</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-emerald-400">
                      jamsongvich@nbc
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">Instant Settlement to Connected Wallet</span>
                  </div>
                </div>
              </div>

              {/* Monthly Income Verification Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Verified Monthly Net Income (USD)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</div>
                  <input
                    type="number"
                    value={monthlyIncomeUSD}
                    onChange={(e) => setMonthlyIncomeUSD(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  DTI Ratio Indicator: Projected installment ({formatMoney(calculations.monthlyEMIUSD)}) is approx. {Math.round((calculations.monthlyEMIUSD / monthlyIncomeUSD) * 100)}% of declared income (Healthy: &lt; 40%).
                </p>
              </div>

              {/* Drag-and-Drop Document Upload Targets */}
              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Income Proof & Collateral Documentation
                </label>

                {/* Target 1: Salary Slip */}
                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 hover:bg-slate-950 hover:border-emerald-500/50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Monthly Salary Slip / Bank Statement</h4>
                        <p className="text-[11px] text-slate-400">PDF, PNG, JPG (Latest 3 months approved format)</p>
                      </div>
                    </div>

                    {uploadedSalarySlip ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-mono font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{uploadedSalarySlip}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUploadedSalarySlip('payslip_september_2026.pdf')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        Browse File
                      </button>
                    )}
                  </div>
                </div>

                {/* Target 2: Collateral Document / Soft Title */}
                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 hover:bg-slate-950 hover:border-emerald-500/50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Collateral Document / Land Soft Card / Business License</h4>
                        <p className="text-[11px] text-slate-400">Proof of residency, vehicle registration or land deed</p>
                      </div>
                    </div>

                    {uploadedCollateralDoc ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-mono font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{uploadedCollateralDoc}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUploadedCollateralDoc('residential_soft_title_card.pdf')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        Browse File
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Step 1
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <span>Review & Summary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: REVIEW, DISBURSEMENT DECLARATION & SUBMISSION              */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Application Disclosure & Compliance Declaration
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm facility parameters prior to regulatory submission to the credit committee.
                </p>
              </div>

              {/* Comprehensive Breakdown Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-850">
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Borrower Full Name</span>
                  <span className="text-white font-bold">{currentUser?.fullName || currentUser?.name || 'Johnathan Doe'}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Selected Credit Facility</span>
                  <span className="text-emerald-400 font-bold">{activeProductConfig.name}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Principal Sum</span>
                  <span className="text-white font-mono font-bold">{formatMoney(loanAmountUSD)}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Agreed Term & Rate</span>
                  <span className="text-white font-mono font-semibold">{tenureMonths} Months @ {interestRate}% p.a.</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Calculation Rule</span>
                  <span className="text-slate-200 font-semibold">
                    {repaymentType === 'REDUCING' ? 'Reducing Balance (NBC Direct)' : 'Flat Rate Interest'}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Disbursement Target</span>
                  <span className="text-white font-mono font-bold">
                    {disbursementMethod === 'acleda_2023' ? 'ACLEDA Bank Plc. (•••• 2023)' : 'Bakong ID (jamsongvich@nbc)'}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs bg-slate-900/60">
                  <span className="text-white font-bold">Estimated Monthly Installment</span>
                  <span className="text-emerald-400 font-mono font-black text-sm">
                    {formatMoney(calculations.monthlyEMIUSD)}
                  </span>
                </div>
              </div>

              {/* NBC Regulatory Disclosure Checkbox */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={declarationAgreed}
                    onChange={(e) => setDeclarationAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-white block mb-0.5">National Bank of Cambodia (NBC) Regulatory Declaration:</strong>
                    I attest that all declarations, employment proofs, and collateral titles provided are authentic. I authorize JAM SONG VICH Microfinance Institution to query my Credit Bureau Cambodia (CBC) dossier and perform regulatory credit evaluations.
                  </div>
                </label>
              </div>

              {/* Submission Error Banner */}
              {submissionError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Application Submission Blocked</strong>
                    <span>{submissionError}</span>
                  </div>
                </div>
              )}

              {/* Step 3 Actions */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Draft
                  </button>

                  <div className="relative group">
                    <button
                      type="button"
                      disabled={!declarationAgreed || isSubmitting || isBorrowingLocked}
                      onClick={handleSubmitApplication}
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                        declarationAgreed && !isSubmitting && !isBorrowingLocked
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Transmitting Application...</span>
                        </>
                      ) : isBorrowingLocked ? (
                        <>
                          <Lock className="w-4 h-4 text-rose-400" />
                          <span>Borrowing Locked ({kycSummary?.verifiedCount ?? 0}/3 KYC)</span>
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="w-4 h-4" />
                          <span>Submit Credit Application</span>
                        </>
                      )}
                    </button>

                    {/* Tooltip on disabled button */}
                    {isBorrowingLocked && (
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-72 p-3 bg-slate-950 text-slate-200 text-[11px] rounded-xl border border-rose-500/40 shadow-2xl z-30 pointer-events-none">
                        <div className="font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          Borrowing Action Blocked
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          All 3 mandatory regulatory documents (National ID, Proof of Residence, Employment Contract) must be verified prior to credit application submission.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* Right 4 Columns: DYNAMIC CALCULATION PREVIEW CARD (Sticky)                */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live EMI Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                NBC Formula
              </span>
            </div>

            {/* Calculated Monthly EMI Big Display */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estimated Monthly Installment
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {formatMoney(calculations.monthlyEMIUSD)}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {tenureMonths} equal monthly installments
              </p>
            </div>

            {/* Breakdown Items List */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Facility Principal</span>
                <span className="text-white font-bold">{formatMoney(loanAmountUSD)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Annual Interest Rate</span>
                <span className="text-emerald-400 font-bold">{interestRate}% p.a.</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Total Interest Payable</span>
                <span className="text-white font-bold">{formatMoney(calculations.totalInterestUSD)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Loan Processing Fee (1.0%)</span>
                <span className="text-slate-300 font-bold">{formatMoney(calculations.processingFeeUSD)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">First Due Date</span>
                <span className="text-amber-400 font-bold">{calculations.firstDueDate}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-200 font-bold">
                <span className="font-sans">Total Repayable</span>
                <span className="text-white text-sm">{formatMoney(calculations.totalRepayableUSD)}</span>
              </div>
            </div>

            {/* Micro MFI Regulatory Footnote */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 flex items-start gap-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                Approved applications will disburse immediately to your selected bank channel after underwriting approval. Zero prepayment penalties apply.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowerApplyLoanView;

