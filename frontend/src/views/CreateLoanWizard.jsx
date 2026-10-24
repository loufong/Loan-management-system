import React, { useState, useMemo } from 'react';
import {
  Check,
  ChevronRight,
  User,
  Calculator,
  Shield,
  Coins,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { generateRepaymentSchedule } from '../utils/loanEngine';
import { MOCK_BORROWERS } from '../data/mockData';

export const CreateLoanWizard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Borrower Selection
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>(
    MOCK_BORROWERS[0]?.id || 'bor-1'
  );
  const [borrowerSearch, setBorrowerSearch] = useState<string>('');

  // Step 2: Loan Terms & Engine
  const [principal, setPrincipal] = useState<number>(5000);
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [termMonths, setTermMonths] = useState<number>(12);
  const [interestRateMonthly, setInterestRateMonthly] = useState<number>(1.5);
  const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState<boolean>(false);

  // Step 3: Collateral & Verification
  const [collateralType, setCollateralType] = useState<string>('Hard Title (LMAP)');
  const [forcedSaleValue, setForcedSaleValue] = useState<number>(15000);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(['deed_lmap_scan_01.pdf']);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Live Loan Calculation via loanEngine.ts
  const calculationResult = useMemo(() => {
    try {
      return generateRepaymentSchedule({
        principal: Number(principal) || 1000,
        interestRateMonthly: Number(interestRateMonthly) || 1.5,
        termMonths: Number(termMonths) || 12,
        interestType: method,
        currency,
        startDate: new Date()
      });
    } catch {
      return null;
    }
  }, [principal, interestRateMonthly, termMonths, method, currency]);

  const selectedBorrower = useMemo(() => {
    return MOCK_BORROWERS.find((b) => b.id === selectedBorrowerId) || MOCK_BORROWERS[0];
  }, [selectedBorrowerId]);

  const handleSubmitLoan = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-slate-100 space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            New Loan Facility Wizard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Step {currentStep} of 3: {currentStep === 1 ? 'Borrower Selection' : currentStep === 2 ? 'Loan Terms & Amortization' : 'Collateral & Submission'}
          </p>
        </div>

        {/* Stepper Badges */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep === step
                  ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                  : currentStep > step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {currentStep > step ? <Check className="w-4 h-4" /> : step}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: BORROWER SELECTION */}
      {currentStep === 1 && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Select Registered Borrower</span>
          </div>

          <input
            type="text"
            value={borrowerSearch}
            onChange={(e) => setBorrowerSearch(e.target.value)}
            placeholder="Search borrower by name or phone..."
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
            {MOCK_BORROWERS.filter((b) =>
              (b.nameEn || b.name || '').toLowerCase().includes(borrowerSearch.toLowerCase())
            ).map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBorrowerId(b.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  selectedBorrowerId === b.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="font-bold text-xs">{b.nameEn || b.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{b.phone || '012 345 678'}</div>
                </div>
                {selectedBorrowerId === b.id && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2"
            >
              <span>Continue to Loan Terms</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: LOAN TERMS & LIVE ENGINE CALCULATOR */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs Panel */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Loan Parameters
                </span>

                {/* Currency Toggle */}
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency('USD');
                      if (principal > 100000) setPrincipal(5000);
                    }}
                    className={`px-3 py-1 rounded-lg transition ${
                      currency === 'USD'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    $ USD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency('KHR');
                      if (principal < 100000) setPrincipal(20000000);
                    }}
                    className={`px-3 py-1 rounded-lg transition ${
                      currency === 'KHR'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ៛ KHR
                  </button>
                </div>
              </div>

              {/* Principal Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Principal Amount ({currency})
                </label>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Term & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Term (Months)
                  </label>
                  <input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Interest Rate (%/mo)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRateMonthly}
                    onChange={(e) => setInterestRateMonthly(Number(e.target.value))}
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>
              </div>

              {/* Calculation Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Calculation Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('reducing')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition text-center ${
                      method === 'reducing'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Reducing (EMI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('flat')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition text-center ${
                      method === 'flat'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Flat Rate
                  </button>
                </div>
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Repayment Preview
                </span>
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400">Estimated Monthly Payment</span>
                    <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                      {currency === 'USD'
                        ? `$${calculationResult?.monthlyInstallment.toFixed(2)}`
                        : `${calculationResult?.monthlyInstallment.toLocaleString()} ៛`}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400">Total Interest</span>
                      <div className="text-sm font-bold text-white font-mono mt-0.5">
                        {currency === 'USD'
                          ? `$${calculationResult?.totalInterest.toFixed(2)}`
                          : `${calculationResult?.totalInterest.toLocaleString()} ៛`}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400">Total Payable</span>
                      <div className="text-sm font-bold text-white font-mono mt-0.5">
                        {currency === 'USD'
                          ? `$${calculationResult?.totalRepayment.toFixed(2)}`
                          : `${calculationResult?.totalRepayment.toLocaleString()} ៛`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                >
                  Proceed to Collateral
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Schedule Drawer */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
            <div
              onClick={() => setIsScheduleDrawerOpen(!isScheduleDrawerOpen)}
              className="flex items-center justify-between p-4 cursor-pointer bg-slate-900/90 border-b border-slate-800"
            >
              <span className="text-xs font-bold text-white">
                View Full Amortization Schedule ({calculationResult?.schedules.length} Installments)
              </span>
              {isScheduleDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            {isScheduleDrawerOpen && (
              <div className="overflow-x-auto max-h-60 p-2">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-4">#</th>
                      <th className="py-2 px-4">Due Date</th>
                      <th className="py-2 px-4">Principal</th>
                      <th className="py-2 px-4">Interest</th>
                      <th className="py-2 px-4">Installment</th>
                      <th className="py-2 px-4">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {calculationResult?.schedules.map((row) => (
                      <tr key={row.installment_no}>
                        <td className="py-2 px-4 font-bold text-white">#{row.installment_no}</td>
                        <td className="py-2 px-4 text-slate-300">{row.due_date}</td>
                        <td className="py-2 px-4 text-white">${row.principal_due}</td>
                        <td className="py-2 px-4 text-slate-400">${row.interest_due}</td>
                        <td className="py-2 px-4 font-bold text-emerald-400">${row.total_installment}</td>
                        <td className="py-2 px-4 text-slate-500">${row.closing_balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: COLLATERAL & FINAL SUBMISSION */}
      {currentStep === 3 && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Collateral Guarantee & Document Submission</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Collateral Asset Type
              </label>
              <select
                value={collateralType}
                onChange={(e) => setCollateralType(e.target.value)}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white"
              >
                <option value="Hard Title (LMAP)">Hard Title (LMAP Land Registry)</option>
                <option value="Soft Title (Commune Chief)">Soft Title (Commune Chief Certified)</option>
                <option value="Vehicle Card (Original)">Vehicle Card (Original Registration)</option>
                <option value="Salary Guarantee">Corporate Salary Guarantee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Forced-Sale Asset Valuation ($ USD)
              </label>
              <input
                type="number"
                value={forcedSaleValue}
                onChange={(e) => setForcedSaleValue(Number(e.target.value))}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs font-mono font-bold text-white"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
            <UploadCloud className="w-8 h-8 mx-auto text-emerald-400" />
            <div className="text-xs text-slate-300 font-bold">
              Drop scanned collateral files or click to browse
            </div>
            <p className="text-[11px] text-slate-500">PDF, JPG, PNG up to 15MB</p>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmitLoan}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
            >
              {isSubmitted ? 'Facility Submitted (Status: PENDING)...' : 'Submit Loan for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateLoanWizard;
