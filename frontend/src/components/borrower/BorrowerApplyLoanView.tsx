import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Eye,
  Download,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from 'lucide-react';
import { Currency, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { loanStorageService } from '../../services/loanStorageService';
import { kycService, FrontendKycSummary } from '../../services/kycService';
import { kycVaultStorage } from '../../services/kycVaultStorage';

export interface BorrowerApplyLoanViewProps {
  currentUser: UserProfile;
  currency: Currency;
  onNavigate: (route: string) => void;
  onSubmitSuccess?: (applicationData: any) => void;
}

export interface LoanAttachedDoc {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl?: string;
  uploadedAt: string;
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
  const [salarySlipDoc, setSalarySlipDoc] = useState<LoanAttachedDoc | null>(null);
  const [collateralDoc, setCollateralDoc] = useState<LoanAttachedDoc | null>(null);
  const [uploadedSalarySlip, setUploadedSalarySlip] = useState<string | null>(null);
  const [uploadedCollateralDoc, setUploadedCollateralDoc] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  // Document Preview State
  const [previewTargetDoc, setPreviewTargetDoc] = useState<{
    title: string;
    fileName: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [isPreviewZoomed, setIsPreviewZoomed] = useState<boolean>(false);

  const salarySlipInputRef = useRef<HTMLInputElement>(null);
  const collateralDocInputRef = useRef<HTMLInputElement>(null);

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

  // Restore or pull authentic KYC documents
  useEffect(() => {
    let isMounted = true;
    const clientId = currentUser.id || 'BOR-2026-8801';

    const loadSavedDocs = async () => {
      try {
        const savedDocsStr = localStorage.getItem(`JAM_LOAN_DOCS_${clientId}`);
        if (savedDocsStr) {
          const parsed = JSON.parse(savedDocsStr);
          if (parsed.salarySlip && isMounted) {
            setSalarySlipDoc(parsed.salarySlip);
            setUploadedSalarySlip(parsed.salarySlip.fileName);
          }
          if (parsed.collateralDoc && isMounted) {
            setCollateralDoc(parsed.collateralDoc);
            setUploadedCollateralDoc(parsed.collateralDoc.fileName);
          }
        } else {
          // Check if permanent KYC vault has uploaded employment / residence docs
          const kycEmp =
            (await kycVaultStorage.getFile(clientId, 'LOAN_SALARY_SLIP')) ||
            (await kycVaultStorage.getFile(clientId, 'EMPLOYMENT_INCOME_CONTRACT'));
          if (kycEmp && isMounted) {
            const empDoc: LoanAttachedDoc = {
              fileName: 'verified_employment_income_contract.pdf',
              fileSize: 1.2 * 1024 * 1024,
              mimeType: 'application/pdf',
              dataUrl: kycEmp,
              uploadedAt: new Date().toISOString(),
            };
            setSalarySlipDoc(empDoc);
            setUploadedSalarySlip(empDoc.fileName);
          }

          const kycRes =
            (await kycVaultStorage.getFile(clientId, 'LOAN_COLLATERAL_DOC')) ||
            (await kycVaultStorage.getFile(clientId, 'PROOF_OF_RESIDENCE'));
          if (kycRes && isMounted) {
            const resDoc: LoanAttachedDoc = {
              fileName: 'verified_residence_soft_title.pdf',
              fileSize: 0.9 * 1024 * 1024,
              mimeType: 'application/pdf',
              dataUrl: kycRes,
              uploadedAt: new Date().toISOString(),
            };
            setCollateralDoc(resDoc);
            setUploadedCollateralDoc(resDoc.fileName);
          }
        }
      } catch (err) {
        console.warn('Failed restoring loan application documents:', err);
      }
    };

    loadSavedDocs();
    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

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

  const handleSalarySlipSelect = async (file: File) => {
    setDocError(null);
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setDocError(`Salary slip file size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit.`);
      return;
    }
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      setDocError('Invalid format. Accepted formats are .pdf, .jpg, and .png only.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const clientId = currentUser.id || 'BOR-2026-8801';
      const docData: LoanAttachedDoc = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };

      setSalarySlipDoc(docData);
      setUploadedSalarySlip(file.name);

      await kycVaultStorage.saveFile(clientId, 'LOAN_SALARY_SLIP', dataUrl, {
        fileName: file.name,
        mimeType: docData.mimeType,
        fileSize: file.size,
      });

      const currentSaved = JSON.parse(localStorage.getItem(`JAM_LOAN_DOCS_${clientId}`) || '{}');
      localStorage.setItem(
        `JAM_LOAN_DOCS_${clientId}`,
        JSON.stringify({ ...currentSaved, salarySlip: docData })
      );
    } catch (err: any) {
      setDocError('Failed to read or store salary slip file.');
    }
  };

  const handleCollateralDocSelect = async (file: File) => {
    setDocError(null);
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setDocError(`Collateral document file size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit.`);
      return;
    }
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      setDocError('Invalid format. Accepted formats are .pdf, .jpg, and .png only.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const clientId = currentUser.id || 'BOR-2026-8801';
      const docData: LoanAttachedDoc = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };

      setCollateralDoc(docData);
      setUploadedCollateralDoc(file.name);

      await kycVaultStorage.saveFile(clientId, 'LOAN_COLLATERAL_DOC', dataUrl, {
        fileName: file.name,
        mimeType: docData.mimeType,
        fileSize: file.size,
      });

      const currentSaved = JSON.parse(localStorage.getItem(`JAM_LOAN_DOCS_${clientId}`) || '{}');
      localStorage.setItem(
        `JAM_LOAN_DOCS_${clientId}`,
        JSON.stringify({ ...currentSaved, collateralDoc: docData })
      );
    } catch (err: any) {
      setDocError('Failed to read or store collateral document file.');
    }
  };

  const handleRemoveSalarySlip = () => {
    setSalarySlipDoc(null);
    setUploadedSalarySlip(null);
    if (salarySlipInputRef.current) salarySlipInputRef.current.value = '';
    const clientId = currentUser.id || 'BOR-2026-8801';
    const currentSaved = JSON.parse(localStorage.getItem(`JAM_LOAN_DOCS_${clientId}`) || '{}');
    delete currentSaved.salarySlip;
    localStorage.setItem(`JAM_LOAN_DOCS_${clientId}`, JSON.stringify(currentSaved));
  };

  const handleRemoveCollateralDoc = () => {
    setCollateralDoc(null);
    setUploadedCollateralDoc(null);
    if (collateralDocInputRef.current) collateralDocInputRef.current.value = '';
    const clientId = currentUser.id || 'BOR-2026-8801';
    const currentSaved = JSON.parse(localStorage.getItem(`JAM_LOAN_DOCS_${clientId}`) || '{}');
    delete currentSaved.collateralDoc;
    localStorage.setItem(`JAM_LOAN_DOCS_${clientId}`, JSON.stringify(currentSaved));
  };

  const handleProceedToStep3 = () => {
    if (!salarySlipDoc || !collateralDoc) {
      setDocError(
        'National Bank of Cambodia directives require uploading both Income Proof (Salary Slip / Bank Statement) and Collateral Documentation before proceeding to review.'
      );
      return;
    }
    setDocError(null);
    setCurrentStep(3);
  };

  const handleSaveDraft = () => {
    const clientId = currentUser.id || 'BOR-2026-8801';
    localStorage.setItem(
      `JAM_LOAN_DRAFT_${clientId}`,
      JSON.stringify({
        product: selectedProduct,
        amount: loanAmountUSD,
        tenure: tenureMonths,
        income: monthlyIncomeUSD,
        salarySlip: salarySlipDoc,
        collateralDoc,
      })
    );
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
        salarySlipFileName: salarySlipDoc?.fileName,
        salarySlipFileSize: salarySlipDoc?.fileSize,
        collateralDocFileName: collateralDoc?.fileName,
        collateralDocFileSize: collateralDoc?.fileSize,
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
              {'Apply for Loan'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {'Fast and simple loan application with instant calculation.'}
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
            { step: 1, title: '1. Loan Details', subtitle: 'Amount & tenure' },
            { step: 2, title: '2. Bank & Documents', subtitle: 'Account & verification' },
            { step: 3, title: '3. Review & Submit', subtitle: 'Confirm & apply' },
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
                    KYC Verification Needed
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {kycSummary?.verifiedCount ?? 0} of 3 Verified
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Please verify all 3 documents in your profile before applying for a loan.
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
              <span>Verify Documents</span>
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
                  Select Loan Product
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose the loan type that fits your needs.
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
                  Select receiving bank account and upload documents.
                </p>
              </div>

              {/* Linked Bank Account Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Disbursement Receiving Account
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
                    <span className="text-[10px] text-slate-500 mt-1 block">Primary Account</span>
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
                      <span className="text-xs font-bold text-white">Bakong KHQR ID</span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-emerald-400">
                      jamsongvich@nbc
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">Instant Bakong Wallet</span>
                  </div>
                </div>
              </div>

              {/* Monthly Income Verification Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Monthly Net Income (USD)
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
                  Payment is ~{Math.round((calculations.monthlyEMIUSD / (monthlyIncomeUSD || 1)) * 100)}% of income (Healthy: &lt; 40%).
                </p>
              </div>

              {/* Drag-and-Drop Document Upload Targets */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Income & Collateral Documents
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    REQUIRED
                  </span>
                </div>

                {docError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{docError}</span>
                  </div>
                )}

                {/* Target 1: Monthly Salary Slip / Bank Statement */}
                <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/80 hover:border-emerald-500/50 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Salary Slip or Bank Statement</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">Required</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">PDF, PNG, or JPG (up to 10MB)</p>
                      </div>
                    </div>

                    {salarySlipDoc && (
                      <div className="flex items-center gap-2">
                        {salarySlipDoc.dataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewTargetDoc({
                                title: 'Monthly Salary Slip / Bank Statement',
                                fileName: salarySlipDoc.fileName,
                                mimeType: salarySlipDoc.mimeType,
                                dataUrl: salarySlipDoc.dataUrl!,
                              });
                              setIsPreviewZoomed(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>View</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => salarySlipInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSalarySlip}
                          className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    ref={salarySlipInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSalarySlipSelect(file);
                    }}
                  />

                  {salarySlipDoc ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{salarySlipDoc.fileName}</p>
                          <p className="text-[10px] font-mono text-emerald-400">
                            {(salarySlipDoc.fileSize / (1024 * 1024)).toFixed(2)} MB • {salarySlipDoc.mimeType.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        ATTACHED & ENCRYPTED
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => salarySlipInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleSalarySlipSelect(file);
                      }}
                      className="p-5 border-2 border-dashed rounded-xl border-slate-800 hover:border-emerald-500/40 bg-slate-950/40 hover:bg-slate-950/70 text-center cursor-pointer transition-all space-y-1"
                    >
                      <UploadCloud className="w-6 h-6 text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-200">
                        Click or drop file here
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Max 10MB (.pdf, .jpg, .png)
                      </p>
                    </div>
                  )}
                </div>

                {/* Target 2: Collateral Document */}
                <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/80 hover:border-emerald-500/50 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Collateral Document</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">Required</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">Land title, vehicle card, or business license (up to 10MB)</p>
                      </div>
                    </div>

                    {collateralDoc && (
                      <div className="flex items-center gap-2">
                        {collateralDoc.dataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewTargetDoc({
                                title: 'Collateral Document',
                                fileName: collateralDoc.fileName,
                                mimeType: collateralDoc.mimeType,
                                dataUrl: collateralDoc.dataUrl!,
                              });
                              setIsPreviewZoomed(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>View</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => collateralDocInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCollateralDoc}
                          className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    ref={collateralDocInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCollateralDocSelect(file);
                    }}
                  />

                  {collateralDoc ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{collateralDoc.fileName}</p>
                          <p className="text-[10px] font-mono text-emerald-400">
                            {(collateralDoc.fileSize / (1024 * 1024)).toFixed(2)} MB • {collateralDoc.mimeType.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        ATTACHED & ENCRYPTED
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => collateralDocInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleCollateralDocSelect(file);
                      }}
                      className="p-5 border-2 border-dashed rounded-xl border-slate-800 hover:border-emerald-500/40 bg-slate-950/40 hover:bg-slate-950/70 text-center cursor-pointer transition-all space-y-1"
                    >
                      <UploadCloud className="w-6 h-6 text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-200">
                        Click or drop file here
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Max 10MB (.pdf, .jpg, .png)
                      </p>
                    </div>
                  )}
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
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleProceedToStep3}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <span>Review & Summary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: REVIEW & SUBMIT                                           */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Review & Declaration
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
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Income Proof Attached</span>
                  <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1.5 truncate max-w-[240px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{salarySlipDoc?.fileName || 'Attached'}</span>
                    {salarySlipDoc && (
                      <span className="text-[10px] text-slate-400 font-normal shrink-0">
                        ({(salarySlipDoc.fileSize / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    )}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Collateral Attached</span>
                  <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1.5 truncate max-w-[240px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{collateralDoc?.fileName || 'Attached'}</span>
                    {collateralDoc && (
                      <span className="text-[10px] text-slate-400 font-normal shrink-0">
                        ({(collateralDoc.fileSize / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    )}
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
                    <strong className="text-white block mb-0.5">Applicant Declaration:</strong>
                    I certify that all information and uploaded documents are accurate and authorize credit evaluation.
                  </div>
                </label>
              </div>

              {/* Submission Error Banner */}
              {submissionError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Submission Blocked</strong>
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
                          <span>Submitting Application...</span>
                        </>
                      ) : isBorrowingLocked ? (
                        <>
                          <Lock className="w-4 h-4 text-rose-400" />
                          <span>Borrowing Locked ({kycSummary?.verifiedCount ?? 0}/3 KYC)</span>
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="w-4 h-4" />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>

                    {/* Tooltip on disabled button */}
                    {isBorrowingLocked && (
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-72 p-3 bg-slate-950 text-slate-200 text-[11px] rounded-xl border border-rose-500/40 shadow-2xl z-30 pointer-events-none">
                        <div className="font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          Action Blocked
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          All 3 KYC documents must be verified in your profile before applying.
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
                  Payment Calculator
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                NBC Standard
              </span>
            </div>

            {/* Calculated Monthly EMI Big Display */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Monthly Payment
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                {formatMoney(calculations.monthlyEMIUSD)}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {tenureMonths} monthly payments
              </p>
            </div>

            {/* Breakdown Items List */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Loan Amount</span>
                <span className="text-white font-bold">{formatMoney(loanAmountUSD)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Interest Rate</span>
                <span className="text-emerald-400 font-bold">{interestRate}% p.a.</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Total Interest</span>
                <span className="text-white font-bold">{formatMoney(calculations.totalInterestUSD)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">Processing Fee (1%)</span>
                <span className="text-slate-300 font-bold">{formatMoney(calculations.processingFeeUSD)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="font-sans">First Due Date</span>
                <span className="text-amber-400 font-bold">{calculations.firstDueDate}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-200 font-bold">
                <span className="font-sans">Total to Repay</span>
                <span className="text-white text-sm">{formatMoney(calculations.totalRepayableUSD)}</span>
              </div>
            </div>

            {/* Micro MFI Regulatory Footnote */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-855 flex items-start gap-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                Instant disbursement once approved. No prepayment penalties.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DOCUMENT PREVIEW FOR ATTACHED INCOME & COLLATERAL DOCUMENTS        */}
      {/* ========================================================================= */}
      {previewTargetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl sm:max-w-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setPreviewTargetDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 pr-8">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {previewTargetDoc.title}
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {previewTargetDoc.fileName}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>256-Bit SSL Vault</span>
              </div>
            </div>

            {/* Document Stage */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 sm:p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-mono text-slate-400">
                  Attached Regulatory Document
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreviewZoomed(!isPreviewZoomed)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1 transition cursor-pointer"
                >
                  {isPreviewZoomed ? (
                    <ZoomOut className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{isPreviewZoomed ? 'Reset' : 'Zoom'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center min-h-[300px] bg-slate-950/90 rounded-xl overflow-hidden p-2">
                {previewTargetDoc.mimeType === 'application/pdf' ||
                previewTargetDoc.dataUrl.startsWith('data:application/pdf') ||
                previewTargetDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewTargetDoc.dataUrl}
                    title={previewTargetDoc.title}
                    className="w-full h-[400px] rounded-lg border-0 bg-white"
                  />
                ) : (
                  <img
                    src={previewTargetDoc.dataUrl}
                    alt={previewTargetDoc.title}
                    className={`object-contain rounded-lg shadow-md transition-all duration-300 ${
                      isPreviewZoomed ? 'max-w-3xl max-h-[600px]' : 'max-w-md max-h-[380px]'
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={previewTargetDoc.dataUrl}
                download={previewTargetDoc.fileName}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs transition inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download File</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewTargetDoc(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerApplyLoanView;

