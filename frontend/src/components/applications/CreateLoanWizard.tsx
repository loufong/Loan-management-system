import React, { useState, useMemo } from 'react';
import {
  User,
  Calculator,
  ShieldAlert,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Coins,
  DollarSign,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { generateRepaymentSchedule, ScheduleRow, LoanCalculationResult } from '../../lib/loanEngine';
import { Currency } from '../../types';

export interface CreateLoanWizardProps {
  onComplete?: (loanData: any) => void;
  onCancel?: () => void;
}

export const CreateLoanWizard: React.FC<CreateLoanWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Select Borrower
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('b-101');

  // Step 2: Loan Terms & Calculator
  const [principal, setPrincipal] = useState<number>(5000);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [termMonths, setTermMonths] = useState<number>(12);
  const [interestRateMonthly, setInterestRateMonthly] = useState<number>(1.5);
  const [interestType, setInterestType] = useState<'reducing' | 'flat'>('reducing');
  const [showScheduleDrawer, setShowScheduleDrawer] = useState<boolean>(false);

  // Step 3: Collateral & Guarantor
  const [collateralType, setCollateralType] = useState<string>('Vehicle Title');
  const [collateralValueUSD, setCollateralValueUSD] = useState<number>(7500);
  const [guarantorName, setGuarantorName] = useState<string>('Vanna Chan');
  const [guarantorPhone, setGuarantorPhone] = useState<string>('017 889 911');

  // Step 4: Notes
  const [officerNotes, setOfficerNotes] = useState<string>('Borrower possesses strong cash flow from retail grocery store.');

  // Demo borrowers for selection
  const borrowersList = [
    { id: 'b-101', nameEn: 'Sokha Chan', nameKh: 'ចាន់ សុខា', phone: '012 345 678', nationalId: '010892743', income: 1450 },
    { id: 'b-102', nameEn: 'Chhaya Meng', nameKh: 'ម៉េង ឆាយា', phone: '098 765 432', nationalId: '090123847', income: 950 },
    { id: 'b-103', nameEn: 'Dara Rath', nameKh: 'រ័ត្ន តារា', phone: '077 889 900', nationalId: '020485912', income: 1100 }
  ];

  const selectedBorrower = borrowersList.find(b => b.id === selectedBorrowerId) || borrowersList[0];

  // Live schedule calculation via our loanEngine
  const calculationResult: LoanCalculationResult = useMemo(() => {
    return generateRepaymentSchedule({
      principal: principal,
      termMonths: termMonths,
      interestRateMonthly: interestRateMonthly,
      interestType: interestType,
      currency: currency,
      startDate: new Date()
    });
  }, [principal, termMonths, interestRateMonthly, interestType, currency]);

  const schedule: ScheduleRow[] = calculationResult.schedules;
  const totalRepayment = calculationResult.totalRepayment;
  const totalInterest = calculationResult.totalInterest;
  const monthlyInstallment = calculationResult.monthlyInstallment;

  const handleFinish = () => {
    const loanPayload = {
      borrower: selectedBorrower,
      principal,
      currency,
      termMonths,
      interestRateMonthly,
      interestType,
      collateralType,
      collateralValueUSD,
      guarantorName,
      guarantorPhone,
      monthlyInstallment,
      totalInterest,
      totalRepayment,
      officerNotes
    };
    alert('Loan Application Sanctioned and Registered Successfully!');
    onComplete?.(loanPayload);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-400" />
          Interactive Loan Application Wizard
        </h1>
        <p className="text-xs text-slate-400">
          Step-by-step origination with live amortization schedule engine.
        </p>
      </div>

      {/* STEP INDICATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { step: 1, label: 'Select Borrower', icon: User },
            { step: 2, label: 'Loan Terms', icon: Calculator },
            { step: 3, label: 'Collateral & Guarantor', icon: ShieldAlert },
            { step: 4, label: 'Review & Sign', icon: FileCheck2 }
          ].map(s => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isCurrent
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md'
                    : isCompleted
                    ? 'bg-slate-950 border-slate-700 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {isCompleted ? '✓' : s.step}
                  </span>
                  <span className="hidden sm:inline font-semibold">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT BORROWER */}
      {currentStep === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Step 1: Choose Applicant Borrower
          </h2>
          <div className="space-y-3">
            {borrowersList.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBorrowerId(b.id)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedBorrowerId === b.id
                    ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                    {b.nameEn.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{b.nameEn} ({b.nameKh})</h3>
                    <p className="text-xs text-slate-400">ID: {b.nationalId} • Phone: {b.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Monthly Income</span>
                  <span className="font-bold text-emerald-400 text-sm">${b.income.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <span>Next: Loan Terms</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CALCULATOR UI & LIVE PREVIEW */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs Column */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Step 2: Loan Financial Parameters
              </h2>
              {/* Currency Toggle Buttons */}
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    currency === 'USD' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('KHR')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    currency === 'KHR' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ៛ KHR
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Principal Amount ({currency})
                </label>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-base focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tenure Term (Months)
                </label>
                <input
                  type="number"
                  value={termMonths}
                  onChange={(e) => setTermMonths(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-base focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Monthly Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRateMonthly}
                  onChange={(e) => setInterestRateMonthly(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-base focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Amortization Calculation Method
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="reducing">Reducing Balance (Equal EMI)</option>
                  <option value="flat">Flat Rate Method</option>
                </select>
              </div>
            </div>

            {/* Repayment Schedule Drawer Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleDrawer(prev => !prev)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center justify-between"
              >
                <span className="font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Repayment Schedule Breakdown ({schedule.length} Months)
                </span>
                {showScheduleDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showScheduleDrawer && (
                <div className="mt-3 bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-1 px-2">#</th>
                        <th className="py-1 px-2">Due Date</th>
                        <th className="py-1 px-2 text-right">Principal</th>
                        <th className="py-1 px-2 text-right">Interest</th>
                        <th className="py-1 px-2 text-right">Total Installment</th>
                        <th className="py-1 px-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {schedule.map(r => (
                        <tr key={r.installmentNumber} className="hover:bg-slate-900/50">
                          <td className="py-1 px-2 font-mono text-slate-400">#{r.installmentNumber}</td>
                          <td className="py-1 px-2 text-slate-300">{r.dueDate}</td>
                          <td className="py-1 px-2 text-right font-mono text-emerald-400">{r.principalAmount.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-mono text-amber-400">{r.interestAmount.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-white">{r.totalMonthlyInstallment.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-mono text-slate-400">{r.endingBalance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5"
              >
                <span>Next: Collateral & Guarantor</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* LIVE PREVIEW CARD */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> Live Amortization Preview
            </h3>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Estimated Monthly Installment</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                <CurrencyDisplay amount={monthlyInstallment} currency={currency} />
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Principal:</span>
                <span className="font-mono font-bold text-white">
                  <CurrencyDisplay amount={principal} currency={currency} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Interest Payable:</span>
                <span className="font-mono font-bold text-amber-400">
                  <CurrencyDisplay amount={totalInterest} currency={currency} />
                </span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Repayment Amount:</span>
                <span className="font-mono text-emerald-400">
                  <CurrencyDisplay amount={totalRepayment} currency={currency} />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: COLLATERAL & GUARANTOR */}
      {currentStep === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Step 3: Collateral Pledge & Guarantor Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Collateral Asset Type</label>
              <select
                value={collateralType}
                onChange={(e) => setCollateralType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              >
                <option value="Vehicle Title">Vehicle Registration Title (Car/Motorcycle)</option>
                <option value="Real Estate Land Title">Real Estate Land Title (Hard/Soft Title)</option>
                <option value="Salary Slip / Cash Flow">Salary Slip / Steady Commercial Cash Flow</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Estimated Collateral Market Value ($ USD)</label>
              <input
                type="number"
                value={collateralValueUSD}
                onChange={(e) => setCollateralValueUSD(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Guarantor Full Name</label>
              <input
                type="text"
                value={guarantorName}
                onChange={(e) => setGuarantorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Guarantor Phone Number</label>
              <input
                type="text"
                value={guarantorPhone}
                onChange={(e) => setGuarantorPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5"
            >
              <span>Next: Review & Sign</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & SIGN */}
      {currentStep === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            Step 4: Final Verification & Sanction
          </h2>

          <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Borrower Dossier:</span>
              <span className="font-bold text-white text-sm">{selectedBorrower.nameEn} ({selectedBorrower.nameKh})</span>
              <span className="text-slate-400 block">ID: {selectedBorrower.nationalId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Sanctioned Amount:</span>
              <span className="font-black text-emerald-400 text-base font-mono">
                <CurrencyDisplay amount={principal} currency={currency} />
              </span>
              <span className="text-slate-400 block">{termMonths} Months @ {interestRateMonthly}%/mo ({interestType})</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Officer Recommendation Notes</label>
            <textarea
              rows={2}
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleFinish}
              className="px-6 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/40 hover:scale-[1.01] active:scale-[0.99] transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Disburse Facility</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateLoanWizard;
