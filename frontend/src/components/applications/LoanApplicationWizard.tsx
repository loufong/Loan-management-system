import React, { useState, useMemo } from 'react';
import { Borrower, LoanProduct, Currency, LoanApplication, RepaymentFrequency } from '../../types';
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
  Sliders
} from 'lucide-react';

export interface LoanApplicationWizardProps {
  borrowers: Borrower[];
  products: LoanProduct[];
  currency: Currency;
  onCancel: () => void;
  onSubmitApplication: (app: Partial<LoanApplication>, isDraft?: boolean) => void;
}

export const LoanApplicationWizard: React.FC<LoanApplicationWizardProps> = ({
  borrowers,
  products,
  currency: initialCurrency,
  onCancel,
  onSubmitApplication
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [calcCurrency, setCalcCurrency] = useState<Currency>(initialCurrency);

  // Step 1: Borrower & Product
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(borrowers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [borrowerSearch, setBorrowerSearch] = useState('');

  const selectedBorrower = borrowers.find((b) => b.id === selectedBorrowerId) || borrowers[0];
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Step 2: Terms & Calculator
  const [requestedAmount, setRequestedAmount] = useState<number>(selectedProduct?.minAmount || 5000);
  const [requestedTerm, setRequestedTerm] = useState<number>(12);
  const [frequency, setFrequency] = useState<RepaymentFrequency>('MONTHLY');
  const [purpose, setPurpose] = useState('Working Capital & Equipment Upgrade');
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  // Step 3: KYC Documents
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; size: string; type: string }>>([
    { name: 'national_id_scan.pdf', size: '1.2 MB', type: 'NATIONAL_ID' },
    { name: 'salary_slip_recent.pdf', size: '840 KB', type: 'SALARY_SLIP' },
  ]);

  // Step 4: Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial calculations
  const calc = useMemo(() => {
    const P = requestedAmount;
    const R = selectedProduct?.interestRate || 10.0;
    const M = requestedTerm;
    const totalInterest = Math.round(((P * (R / 100) * (M / 12)) + Number.EPSILON) * 100) / 100;
    const totalRepayment = Math.round((P + totalInterest + Number.EPSILON) * 100) / 100;
    const monthlyInstallment = Math.round(((totalRepayment / M) + Number.EPSILON) * 100) / 100;

    const borrowerIncome = selectedBorrower?.monthlyIncomeUSD || 1500;
    const dtiRatio = Math.round(((monthlyInstallment / borrowerIncome) * 100 + Number.EPSILON) * 10) / 10;
    const isDtiWarning = dtiRatio > 40.0;

    return {
      principal: P,
      rate: R,
      termMonths: M,
      totalInterest,
      totalRepayment,
      monthlyInstallment,
      dtiRatio,
      isDtiWarning,
    };
  }, [requestedAmount, requestedTerm, selectedProduct, selectedBorrower]);

  // Amortization preview schedule
  const previewSchedule = useMemo(() => {
    const rows = [];
    const monthlyPrincipal = calc.principal / calc.termMonths;
    const monthlyInterest = calc.totalInterest / calc.termMonths;
    let balance = calc.principal;

    const startDate = new Date();
    for (let i = 1; i <= Math.min(calc.termMonths, 12); i++) {
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
        balanceUSD: balance
      });
    }
    return rows;
  }, [calc]);

  const handleFileUpload = (type: string) => {
    const rSize = (Math.random() * 1.5 + 0.5).toFixed(1);
    setUploadedDocs((prev) => [
      ...prev,
      { name: `${type.toLowerCase()}_document_${Date.now().toString().slice(-4)}.pdf`, size: `${rSize} MB`, type }
    ]);
  };

  const handleRemoveDoc = (index: number) => {
    setUploadedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = (isDraft = false) => {
    setIsSubmitting(true);
    const app: Partial<LoanApplication> = {
      applicationNo: `APP-2026-00${Math.floor(10 + Math.random() * 90)}`,
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
      riskTier: calc.dtiRatio <= 30 ? 'LOW RISK' : calc.dtiRatio <= 45 ? 'MEDIUM RISK' : 'HIGH RISK',
      status: isDraft ? 'DRAFT' : 'SUBMITTED',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onSubmitApplication(app, isDraft);
  };

  const steps = [
    { step: 1, title: '1. Select Borrower & Product' },
    { step: 2, title: '2. Loan Terms & Schedule Preview' },
    { step: 3, title: '3. KYC Documents' },
    { step: 4, title: '4. Confirmation' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Header with Title & Stepper Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel &amp; Return to Applications</span>
        </button>

        <span className="text-xs font-mono text-slate-400">Step {currentStep} of 4</span>
      </div>

      {/* Clean 4-Step Stepper Header */}
      <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-4">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div key={s.step} className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline truncate ${
                      isCurrent
                        ? 'text-slate-900'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                <div
                  className={`w-full h-1 rounded-full transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600'
                      : isCurrent
                      ? 'bg-indigo-600'
                      : 'bg-slate-100'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Step Form Surface Cards */}
      <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-6">
        {/* STEP 1: SELECT BORROWER & PRODUCT */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Borrower &amp; Product</h2>
              <p className="text-xs text-slate-500">
                Choose the target institutional borrower account and loan offering.
              </p>
            </div>

            {/* Borrower selector */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                1. Select Target Borrower
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {borrowers.map((b) => {
                  const isSelected = b.id === selectedBorrowerId;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBorrowerId(b.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {b.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{b.fullName}</p>
                          <p className="text-xs text-slate-400 font-mono">{b.borrowerId} • <MoneyText amount={b.monthlyIncomeUSD} currency="USD" />/mo</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product selector */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                2. Select Loan Product
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {products.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        setRequestedAmount(prod.minAmount);
                        setRequestedTerm(prod.minTerm);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge variant="active" size="xs">{prod.category}</Badge>
                          <span className="font-mono tabular-nums text-xs font-bold text-indigo-600">
                            {prod.interestRate}% p.a.
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{prod.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{prod.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 font-mono text-xs text-slate-500">
                        Limit: <MoneyText amount={prod.minAmount} /> – <MoneyText amount={prod.maxAmount} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LOAN TERMS & SCHEDULE PREVIEW (Interactive Calculator) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Loan Terms &amp; Calculator</h2>
                <p className="text-xs text-slate-500">
                  Configure requested capital, repayment duration, and preview schedule.
                </p>
              </div>

              {/* Dual Currency Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setCalcCurrency('USD')}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                    calcCurrency === 'USD'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcCurrency('KHR')}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                    calcCurrency === 'KHR'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  KHR (៛)
                </button>
              </div>
            </div>

            {/* Interactive Sliders & Floating 3D Preview Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Sliders */}
              <div className="space-y-6">
                {/* Amount Slider with 3D Tactile styling */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Requested Principal Amount
                    </label>
                    <MoneyText
                      amount={requestedAmount}
                      currency={calcCurrency}
                      className="text-lg font-black text-indigo-600"
                    />
                  </div>
                  <input
                    type="range"
                    min={selectedProduct?.minAmount || 500}
                    max={selectedProduct?.maxAmount || 30000}
                    step={100}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Min: <MoneyText amount={selectedProduct?.minAmount || 500} currency={calcCurrency} /></span>
                    <span>Max: <MoneyText amount={selectedProduct?.maxAmount || 30000} currency={calcCurrency} /></span>
                  </div>
                </div>

                {/* Term Slider with 3D Tactile styling */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Repayment Term (Months)
                    </label>
                    <span className="font-mono tabular-nums text-lg font-black text-indigo-600">
                      {requestedTerm} Months
                    </span>
                  </div>
                  <input
                    type="range"
                    min={selectedProduct?.minTerm || 3}
                    max={selectedProduct?.maxTerm || 48}
                    step={1}
                    value={requestedTerm}
                    onChange={(e) => setRequestedTerm(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Min: {selectedProduct?.minTerm || 3} mo</span>
                    <span>Max: {selectedProduct?.maxTerm || 48} mo</span>
                  </div>
                </div>

                {/* Loan Purpose */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Stated Loan Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Working Capital & Equipment Upgrade (កម្ចីទុនបង្វិលអាជីវកម្ម)"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Right Column: Floating 3D Financial Readout Preview Card */}
              <div className="card-3d-floating p-6 space-y-4 shadow-xl border-indigo-100">
                <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Underwriting Readout
                  </span>
                  <span className="badge-3d-emerald text-[11px]">3D Model</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal Requested:</span>
                    <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-slate-900" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Interest Rate (Annual APR):</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">{calc.rate}% p.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Interest Accrued:</span>
                    <MoneyText amount={calc.totalInterest} currency={calcCurrency} className="font-bold text-slate-900" />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Total Repayment Amount:</span>
                    <MoneyText amount={calc.totalRepayment} currency={calcCurrency} className="font-bold text-slate-900" />
                  </div>
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex justify-between items-baseline">
                    <span className="font-bold text-indigo-950 text-xs">Estimated Monthly Installment:</span>
                    <MoneyText amount={calc.monthlyInstallment} currency={calcCurrency} className="text-xl font-black text-indigo-600" />
                  </div>
                </div>

                {/* DTI Warning Banner */}
                {calc.isDtiWarning ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 shadow-[0_2px_8px_rgba(244,63,94,0.12)] flex items-start gap-2 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">DTI Risk Alert: {calc.dtiRatio}%</span>
                      <span>
                        Projected installment exceeds 40% of monthly income ($
                        {selectedBorrower?.monthlyIncomeUSD}). Committee clearance required.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-[0_2px_8px_rgba(16,185,129,0.12)] flex items-center gap-2 text-emerald-800 text-xs">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      DTI Ratio estimated at{' '}
                      <strong className="font-mono">{calc.dtiRatio}%</strong> (Healthy risk profile &lt; 40%).
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                  className="w-full py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 rounded-lg transition-colors"
                >
                  {showSchedulePreview ? 'Hide Amortization Schedule Preview' : 'Show Amortization Schedule Preview'}
                </button>
              </div>
            </div>

            {/* Collapsible Schedule Preview */}
            {showSchedulePreview && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  Amortization Schedule Preview (First 12 Months)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3 text-right">Principal</th>
                        <th className="py-2.5 px-3 text-right">Interest</th>
                        <th className="py-2.5 px-3 text-right">Total Installment</th>
                        <th className="py-2.5 px-3 text-right">Remaining Principal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSchedule.map((row) => (
                        <tr key={row.installmentNo} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-mono font-semibold text-slate-800">#{row.installmentNo}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{row.dueDate}</td>
                          <td className="py-2 px-3 text-right"><MoneyText amount={row.principalUSD} currency={calcCurrency} /></td>
                          <td className="py-2 px-3 text-right"><MoneyText amount={row.interestUSD} currency={calcCurrency} /></td>
                          <td className="py-2 px-3 text-right font-semibold text-indigo-600"><MoneyText amount={row.totalUSD} currency={calcCurrency} /></td>
                          <td className="py-2 px-3 text-right text-slate-500"><MoneyText amount={row.balanceUSD} currency={calcCurrency} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: KYC DOCUMENTS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload KYC Documents</h2>
              <p className="text-xs text-slate-500">
                Provide certified photocopies or digital PDF statements to substantiate credit assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: 'NATIONAL_ID', title: 'National Identity Card', desc: 'Front & back valid identity scan' },
                { type: 'SALARY_SLIP', title: 'Payroll Salary Slip', desc: 'Last 3 months certified statement' },
                { type: 'EMPLOYMENT_LETTER', title: 'Employment Certificate', desc: 'Letter of active appointment' },
              ].map((item) => (
                <div
                  key={item.type}
                  onClick={() => handleFileUpload(item.type)}
                  className="p-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl text-center space-y-2 cursor-pointer transition-colors group bg-slate-50/40"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 block">+ Click to Attach</span>
                </div>
              ))}
            </div>

            {/* Attached Documents List */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Attached Supporting Documents ({uploadedDocs.length})
              </span>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 block truncate">{doc.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{doc.type} • {doc.size}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDoc(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION & SUBMIT */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Application Confirmation</h2>
              <p className="text-xs text-slate-500">
                Review all application parameters before routing to Credit Risk Underwriting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                <span className="font-semibold uppercase tracking-wider text-slate-500 text-[11px] block">
                  Borrower Summary
                </span>
                <p className="text-sm font-bold text-slate-900">{selectedBorrower?.fullName}</p>
                <p className="text-slate-500 font-mono">ID: {selectedBorrower?.borrowerId}</p>
                <p className="text-slate-500">Monthly Income: <MoneyText amount={selectedBorrower?.monthlyIncomeUSD || 0} currency="USD" /></p>
                <p className="text-slate-500">Phone: <span className="font-mono">{selectedBorrower?.phone}</span></p>
              </div>

              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                <span className="font-semibold uppercase tracking-wider text-slate-500 text-[11px] block">
                  Loan Terms Summary
                </span>
                <p className="text-sm font-bold text-slate-900">{selectedProduct?.name}</p>
                <p className="text-slate-500">Principal: <MoneyText amount={calc.principal} currency={calcCurrency} className="font-bold text-slate-900" /></p>
                <p className="text-slate-500">Term: <strong className="font-mono">{calc.termMonths} Months</strong> @ {calc.rate}% p.a.</p>
                <p className="text-slate-500">Monthly Installment: <MoneyText amount={calc.monthlyInstallment} currency={calcCurrency} className="font-bold text-indigo-600" /></p>
                <p className="text-slate-500">Estimated DTI: <strong className="font-mono">{calc.dtiRatio}%</strong></p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3 text-xs text-slate-700">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-900 block">
                  Governance &amp; Credit Assessment Routing
                </span>
                <p className="mt-0.5">
                  Upon submission, this application will enter the Credit Review Queue with a strict 4-hour SLA.
                  All calculations conform to institutional lending guidelines.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 4 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors"
                >
                  Submit for Underwriting
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
