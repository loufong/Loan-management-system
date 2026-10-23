import React, { useState, useMemo } from 'react';
import {
  User,
  Phone,
  CreditCard,
  DollarSign,
  Calendar,
  Percent,
  Calculator,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  generateRepaymentSchedule,
  formatCurrency,
  Currency,
  InterestType,
  ScheduleRow,
} from '../../lib/loanEngine';
import { useLanguage } from '../../context/LanguageContext';

export interface BorrowerLoanFormData {
  fullName: string;
  phone: string;
  nationalId: string;
  principalAmount: number;
  currency: Currency;
  termMonths: number;
  interestRateMonthly: number;
  interestType: InterestType;
  schedules: ScheduleRow[];
}

export interface BorrowerLoanApplicationFormProps {
  initialCurrency?: Currency;
  onSubmit?: (data: BorrowerLoanFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const BorrowerLoanApplicationForm: React.FC<BorrowerLoanApplicationFormProps> = ({
  initialCurrency = 'USD',
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const { language } = useLanguage();
  const isKhmer = language === 'km';

  // 1. Borrower Identity State
  const [fullName, setFullName] = useState<string>('Johnathan Doe');
  const [phone, setPhone] = useState<string>('+855 12 984 219');
  const [nationalId, setNationalId] = useState<string>('010992384');

  // 2. Loan Parameter State
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [principalInput, setPrincipalInput] = useState<string>(
    initialCurrency === 'KHR' ? '4000000' : '1200'
  );
  const [termMonths, setTermMonths] = useState<number>(12);
  const [monthlyRateInput, setMonthlyRateInput] = useState<string>('1.5');
  const [interestType, setInterestType] = useState<InterestType>('reducing');

  // 3. UI State
  const [showScheduleTable, setShowScheduleTable] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Parse numeric values safely
  const principalAmount = parseFloat(principalInput) || 0;
  const interestRateMonthly = parseFloat(monthlyRateInput) || 0;

  // Handle currency switch with intelligent defaults
  const handleCurrencyChange = (newCurrency: Currency) => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    if (newCurrency === 'KHR') {
      // Default to 4,000,000 KHR (~$1,000 USD)
      setPrincipalInput('4000000');
    } else {
      // Default to $1,200 USD
      setPrincipalInput('1200');
    }
  };

  // 4. Real-time Calculation Engine Integration
  const calculation = useMemo(() => {
    if (principalAmount <= 0 || termMonths <= 0 || interestRateMonthly < 0) {
      return null;
    }
    try {
      return generateRepaymentSchedule({
        principal: principalAmount,
        interestRateMonthly,
        termMonths,
        interestType,
        currency,
        startDate: new Date(),
      });
    } catch {
      return null;
    }
  }, [principalAmount, termMonths, interestRateMonthly, interestType, currency]);

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = isKhmer ? 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នកខ្ចី' : 'Borrower full name is required';
    }
    if (!phone.trim()) {
      errs.phone = isKhmer ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Phone number is required';
    }
    if (!nationalId.trim()) {
      errs.nationalId = isKhmer ? 'សូមបញ្ចូលលេខអត្តសញ្ញាណប័ណ្ណ' : 'National ID number is required';
    }
    if (principalAmount <= 0) {
      errs.principal = isKhmer ? 'ចំនួនទឹកប្រាក់កម្ចីត្រូវតែធំជាង ០' : 'Loan amount must be greater than zero';
    }
    if (termMonths < 1 || termMonths > 120) {
      errs.termMonths = isKhmer ? 'រយៈពេលកម្ចីត្រូវស្ថិតនៅចន្លោះ ១ ដល់ ១២០ ខែ' : 'Term must be between 1 and 120 months';
    }
    if (interestRateMonthly < 0) {
      errs.rate = isKhmer ? 'អត្រាការប្រាក់មិនអាចអវិជ្ជមានបានទេ' : 'Interest rate cannot be negative';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !calculation) return;

    if (onSubmit) {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        principalAmount: calculation.principal,
        currency,
        termMonths,
        interestRateMonthly,
        interestType,
        schedules: calculation.schedules,
      });
    }
    setIsSuccess(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[6px] bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
                {isKhmer ? 'ចុះឈ្មោះអ្នកខ្ចី & ស្នើសុំកម្ចី' : 'Borrower Registration & Loan Application'}
              </h1>
            </div>
            <p className="text-xs text-[#64748B]">
              {isKhmer
                ? 'បំពេញព័ត៌មានអត្តសញ្ញាណអ្នកខ្ចី កំណត់ទំហំកម្ចី និងពិនិត្យតារាងបង់ប្រាក់ក្នុងពេលជាក់ស្តែង'
                : 'Register borrower identity, configure loan terms, and preview repayment amortization in real time.'}
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-[6px] border border-[#E2E8F0] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleCurrencyChange('USD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-all flex items-center gap-1.5 cursor-pointer ${
                currency === 'USD'
                  ? 'bg-white text-[#2563EB] shadow-sm font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <span>USD ($)</span>
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange('KHR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-all flex items-center gap-1.5 cursor-pointer ${
                currency === 'KHR'
                  ? 'bg-white text-[#2563EB] shadow-sm font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <span>KHR (៛)</span>
            </button>
          </div>
        </div>
      </div>

      {isSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[8px] p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-emerald-900">
              {isKhmer ? 'ការស្នើសុំកម្ចីត្រូវបានដាក់ជោគជ័យ!' : 'Loan Application Submitted Successfully!'}
            </h2>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              {isKhmer
                ? `ពាក្យស្នើសុំរបស់ ${fullName} ចំនួន ${formatCurrency(principalAmount, currency)} ត្រូវបានបង្កើត និងបញ្ជូនទៅកាន់ជួរពិនិត្យឥណទាន។`
                : `Application for ${fullName} of ${formatCurrency(principalAmount, currency)} has been submitted and queued for underwriting.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-[6px] transition-colors cursor-pointer"
          >
            {isKhmer ? 'បង្កើតពាក្យស្នើសុំថ្មី' : 'Create Another Application'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============================================================= */}
          {/* LEFT COLUMN: Inputs (7 cols on lg) */}
          {/* ============================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section A: Borrower Identity */}
            <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <User className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  {isKhmer ? '១. ព័ត៌មានអ្នកខ្ចី' : '1. Borrower Identity'}
                </h2>
              </div>

              <div className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    <span>{isKhmer ? 'ឈ្មោះពេញ / Full Name' : 'Full Name (ឈ្មោះ)'}</span>
                    <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isKhmer ? 'ឧទាហរណ៍៖ សុខា ចាន់' : 'e.g. Johnathan Doe'}
                      className={`w-full h-10 pl-9 pr-3 text-xs bg-white border rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors ${
                        errors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="text-[11px] text-rose-500 mt-1">{errors.fullName}</p>}
                </div>

                {/* Phone & National ID in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      <span>{isKhmer ? 'លេខទូរស័ព្ទ / Phone' : 'Phone (លេខទូរស័ព្ទ)'}</span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+855 12 345 678"
                        className={`w-full h-10 pl-9 pr-3 text-xs bg-white border rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors ${
                          errors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
                  </div>

                  {/* National ID */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      <span>{isKhmer ? 'អត្តសញ្ញាណប័ណ្ណ / National ID' : 'National ID (អត្តសញ្ញាណប័ណ្ណ)'}</span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="010992384"
                        className={`w-full h-10 pl-9 pr-3 text-xs bg-white border rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors ${
                          errors.nationalId ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                        }`}
                      />
                    </div>
                    {errors.nationalId && <p className="text-[11px] text-rose-500 mt-1">{errors.nationalId}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Loan Parameters */}
            <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <Calculator className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  {isKhmer ? '២. លក្ខខណ្ឌកម្ចី' : '2. Loan Terms & Parameters'}
                </h2>
              </div>

              <div className="space-y-4">
                {/* Loan Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      <span>{isKhmer ? 'ចំនួនទឹកប្រាក់កម្ចី / Loan Amount' : 'Loan Amount (ចំនួនប្រាក់)'}</span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {currency === 'KHR' ? 'គិតជាប្រាក់រៀល (KHR)' : 'Denominated in US Dollars (USD)'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-[#64748B]">
                      {currency === 'USD' ? '$' : '៛'}
                    </div>
                    <input
                      type="number"
                      step={currency === 'KHR' ? '100' : '10'}
                      min="1"
                      value={principalInput}
                      onChange={(e) => setPrincipalInput(e.target.value)}
                      placeholder={currency === 'USD' ? '1200' : '4000000'}
                      className={`w-full h-10 pl-8 pr-3 text-xs font-semibold bg-white border rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors ${
                        errors.principal ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                      }`}
                    />
                  </div>
                  {errors.principal && <p className="text-[11px] text-rose-500 mt-1">{errors.principal}</p>}
                </div>

                {/* Term in Months */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      <span>{isKhmer ? 'រយៈពេលកម្ចី / Term' : 'Term in Months (រយៈពេល)'}</span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-[#2563EB] font-bold">
                      {termMonths} {isKhmer ? 'ខែ' : 'months'}
                    </span>
                  </div>

                  {/* Preset Pills */}
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {[3, 6, 12, 24, 36].map((months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setTermMonths(months)}
                        className={`py-1.5 text-xs font-semibold rounded-[5px] border transition-colors cursor-pointer ${
                          termMonths === months
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-slate-50'
                        }`}
                      >
                        {months} {isKhmer ? 'ខែ' : 'm'}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={termMonths}
                      onChange={(e) => setTermMonths(parseInt(e.target.value) || 1)}
                      className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                {/* Monthly Rate & Calculation Method in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Monthly Rate */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      <span>{isKhmer ? 'អត្រាការប្រាក់ប្រចាំខែ / Monthly Rate' : 'Monthly Rate (%)'}</span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Percent className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={monthlyRateInput}
                        onChange={(e) => setMonthlyRateInput(e.target.value)}
                        placeholder="1.5"
                        className="w-full h-10 pl-8 pr-3 text-xs font-semibold bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors"
                      />
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-0.5 block">
                      ≈ {(interestRateMonthly * 12).toFixed(1)}% {isKhmer ? 'ក្នុងមួយឆ្នាំ (APR)' : 'p.a.'}
                    </span>
                  </div>

                  {/* Calculation Method Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      <span>{isKhmer ? 'វិធីសាស្ត្រគណនា / Method' : 'Calculation Method'}</span>
                      <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={interestType}
                        onChange={(e) => setInterestType(e.target.value as InterestType)}
                        className="w-full h-10 px-3 text-xs font-semibold bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors appearance-none cursor-pointer pr-8"
                      >
                        <option value="reducing">
                          {isKhmer ? 'ការប្រាក់ថយចុះ (Reducing EMI)' : 'Reducing Balance (EMI)'}
                        </option>
                        <option value="flat">
                          {isKhmer ? 'ការប្រាក់ថេរ (Flat Rate)' : 'Flat Rate Method'}
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-0.5 block">
                      {interestType === 'reducing'
                        ? (isKhmer ? 'ការប្រាក់គិតលើសមតុល្យជាក់ស្តែង' : 'Interest charged on remaining balance')
                        : (isKhmer ? 'ការប្រាក់ថេរលើប្រាក់ដើមដំបូង' : 'Interest fixed on starting principal')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-[6px] transition-colors cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !calculation}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <span>{isKhmer ? 'កំពុងដំណើរការ...' : 'Submitting...'}</span>
                ) : (
                  <>
                    <span>{isKhmer ? 'ដាក់ពាក្យស្នើសុំកម្ចី' : 'Submit Loan Application'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT COLUMN: Real-Time Preview & Amortization (5 cols on lg) */}
          {/* ============================================================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* Real-time Summary Card */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-[8px] p-6 shadow-md border border-slate-700 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
                    {isKhmer ? 'ការគណនាបង់ប្រាក់ជាក់ស្តែង' : 'Real-Time Calculation'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-slate-800 text-sky-400 border border-slate-600">
                  {interestType === 'reducing' ? 'REDUCING EMI' : 'FLAT RATE'}
                </span>
              </div>

              {/* Monthly Installment Highlight */}
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400 font-medium">
                  {isKhmer ? 'ការបង់ប្រចាំខែប៉ាន់ស្មាន' : 'Estimated Monthly Payment'}
                </p>
                <div className="text-3xl font-extrabold tracking-tight text-white font-mono flex items-baseline gap-1.5">
                  <span>
                    {calculation
                      ? formatCurrency(calculation.monthlyInstallment, currency)
                      : '—'}
                  </span>
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    {isKhmer ? '/ ខែ' : '/ month'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {interestType === 'reducing'
                    ? (isKhmer ? 'ប្រាក់បង់ស្មើគ្នារៀងរាល់ខែ (EMI)' : 'Equal monthly installments over term')
                    : (isKhmer ? 'ប្រាក់ដើមថេរ + ការប្រាក់ថេរ' : 'Fixed monthly principal & interest')}
                </p>
              </div>

              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-800/60 p-3 rounded-[6px] border border-slate-700/60">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {isKhmer ? 'ប្រាក់ដើម' : 'Principal'}
                  </p>
                  <p className="text-sm font-bold font-mono text-slate-100 mt-0.5">
                    {calculation ? formatCurrency(calculation.totalPrincipal, currency) : '—'}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-[6px] border border-slate-700/60">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {isKhmer ? 'ការប្រាក់សរុប' : 'Total Interest'}
                  </p>
                  <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                    {calculation ? formatCurrency(calculation.totalInterest, currency) : '—'}
                  </p>
                </div>

                <div className="col-span-2 bg-slate-800/80 p-3.5 rounded-[6px] border border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">
                    {isKhmer ? 'ការទូទាត់សរុប' : 'Total Repayment'}
                  </span>
                  <span className="text-base font-extrabold font-mono text-emerald-400">
                    {calculation ? formatCurrency(calculation.totalRepayment, currency) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Collapsible Repayment Schedule Table */}
            {calculation && (
              <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowScheduleTable((prev) => !prev)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-[#E2E8F0] flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-[#0F172A]">
                      {isKhmer ? 'តារាងកាលវិភាគបង់ប្រាក់' : 'Amortization Repayment Schedule'}
                    </span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.2 bg-white text-[#2563EB] border border-[#E2E8F0] rounded-[4px]">
                      {calculation.schedules.length} {isKhmer ? 'ខែ' : 'months'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#64748B] font-semibold">
                    <span>{showScheduleTable ? (isKhmer ? 'បង្រួញ' : 'Collapse') : (isKhmer ? 'ពន្លាត' : 'Expand')}</span>
                    {showScheduleTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showScheduleTable && (
                  <div className="max-h-[420px] overflow-y-auto overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                        <tr>
                          <th className="py-2.5 px-3 font-mono">#</th>
                          <th className="py-2.5 px-3">{isKhmer ? 'កាលបរិច្ឆេទ' : 'Due Date'}</th>
                          <th className="py-2.5 px-3 text-right">{isKhmer ? 'ប្រាក់ដើម' : 'Principal'}</th>
                          <th className="py-2.5 px-3 text-right">{isKhmer ? 'ការប្រាក់' : 'Interest'}</th>
                          <th className="py-2.5 px-3 text-right">{isKhmer ? 'សរុប' : 'Total Due'}</th>
                          <th className="py-2.5 px-3 text-right">{isKhmer ? 'សមតុល្យ' : 'Balance'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                        {calculation.schedules.map((row) => (
                          <tr key={row.installmentNumber} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 text-[#64748B] font-bold">{row.installmentNumber}</td>
                            <td className="py-2 px-3 text-[#0F172A] whitespace-nowrap">{row.dueDate}</td>
                            <td className="py-2 px-3 text-right text-[#0F172A]">
                              {formatCurrency(row.principalAmount, currency)}
                            </td>
                            <td className="py-2 px-3 text-right text-amber-700">
                              {formatCurrency(row.interestAmount, currency)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#2563EB]">
                              {formatCurrency(row.totalMonthlyInstallment, currency)}
                            </td>
                            <td className="py-2 px-3 text-right text-[#64748B]">
                              {formatCurrency(row.endingBalance, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold font-mono text-[11px] text-[#0F172A] border-t border-[#E2E8F0]">
                        <tr>
                          <td colSpan={2} className="py-2 px-3">
                            {isKhmer ? 'សរុប (TOTAL)' : 'TOTAL'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatCurrency(calculation.totalPrincipal, currency)}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-700">
                            {formatCurrency(calculation.totalInterest, currency)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#2563EB]">
                            {formatCurrency(calculation.totalRepayment, currency)}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-extrabold">
                            {formatCurrency(0, currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default BorrowerLoanApplicationForm;
