import { LoanCalculatorService } from '../src/modules/calculator/loan-calculator.service';
import { loanCalculatorInputSchema } from '../src/modules/calculator/calculator.validation';
import { RepaymentFrequency } from '@prisma/client';

console.log('🧪 Starting Financial Calculation Engine & Loan Calculator Test Suite...\n');

// -------------------------------------------------------------
// 1. SIMPLE INTEREST ENGINE TESTS
// -------------------------------------------------------------
console.log('--- TEST 1: Simple Interest Calculation (Monthly) ---');
const monthlySimple = LoanCalculatorService.calculateSimpleInterest({
  principal: 10000,
  annualInterestRate: 12.0, // 12% p.a.
  termMonths: 12,
  repaymentFrequency: RepaymentFrequency.MONTHLY,
  startDate: new Date('2026-01-01')
});

console.log(`Principal: $${monthlySimple.principal} | Total Interest: $${monthlySimple.totalInterest} | Repayment: $${monthlySimple.totalRepayment}`);
console.log(`Installments: ${monthlySimple.installmentCount} | Monthly Due: $${monthlySimple.installmentAmount}`);

if (monthlySimple.totalInterest !== 1200.0) {
  throw new Error(`Expected total interest $1,200.00, got ${monthlySimple.totalInterest}`);
}
if (monthlySimple.totalRepayment !== 11200.0) {
  throw new Error(`Expected total repayment $11,200.00, got ${monthlySimple.totalRepayment}`);
}
if (monthlySimple.installmentCount !== 12) {
  throw new Error(`Expected 12 monthly installments, got ${monthlySimple.installmentCount}`);
}
if (monthlySimple.installmentAmount !== 933.33) {
  throw new Error(`Expected installment amount $933.33, got ${monthlySimple.installmentAmount}`);
}
console.log('✅ Monthly Simple Interest calculation verified!\n');


console.log('--- TEST 2: Biweekly & Weekly Simple Interest Frequencies ---');
const biweeklySimple = LoanCalculatorService.calculateSimpleInterest({
  principal: 10000,
  annualInterestRate: 12.0,
  termMonths: 12,
  repaymentFrequency: RepaymentFrequency.BIWEEKLY,
  startDate: new Date('2026-01-01')
});

console.log(`Biweekly Count (N): ${biweeklySimple.installmentCount} | Installment: $${biweeklySimple.installmentAmount}`);
if (biweeklySimple.installmentCount !== 26) {
  throw new Error(`Expected 26 biweekly installments for 12 months, got ${biweeklySimple.installmentCount}`);
}
if (biweeklySimple.installmentAmount !== 430.77) {
  throw new Error(`Expected biweekly installment $430.77, got ${biweeklySimple.installmentAmount}`);
}

const weeklySimple = LoanCalculatorService.calculateSimpleInterest({
  principal: 10000,
  annualInterestRate: 12.0,
  termMonths: 12,
  repaymentFrequency: RepaymentFrequency.WEEKLY,
  startDate: new Date('2026-01-01')
});

console.log(`Weekly Count (N): ${weeklySimple.installmentCount} | Installment: $${weeklySimple.installmentAmount}`);
if (weeklySimple.installmentCount !== 52) {
  throw new Error(`Expected 52 weekly installments for 12 months, got ${weeklySimple.installmentCount}`);
}
if (weeklySimple.installmentAmount !== 215.38) {
  throw new Error(`Expected weekly installment $215.38, got ${weeklySimple.installmentAmount}`);
}
console.log('✅ Multi-frequency installment counts and amounts verified!\n');


// -------------------------------------------------------------
// 2. REDUCING BALANCE / AMORTIZATION (EMI) ENGINE
// -------------------------------------------------------------
console.log('--- TEST 3: Reducing Balance (Amortization EMI) ---');
const emiLoan = LoanCalculatorService.calculateReducingBalance({
  principal: 10000,
  annualInterestRate: 12.0,
  termMonths: 12,
  repaymentFrequency: RepaymentFrequency.MONTHLY,
  startDate: new Date('2026-01-01')
});

console.log(`EMI Installment Amount: $${emiLoan.installmentAmount}`);
console.log(`Total Interest (Reducing Balance): $${emiLoan.totalInterest} | Total Repayment: $${emiLoan.totalRepayment}`);

// Standard 10k at 12% for 12 months EMI is 888.49
if (emiLoan.installmentAmount !== 888.49) {
  throw new Error(`Expected EMI $888.49, got ${emiLoan.installmentAmount}`);
}

// In reducing balance, first installment interest > last installment interest
const firstInstallment = emiLoan.schedules[0];
const lastInstallment = emiLoan.schedules[emiLoan.schedules.length - 1];
console.log(`Installment 1 - Principal: $${firstInstallment.principalAmount}, Interest: $${firstInstallment.interestAmount}`);
console.log(`Installment 12 - Principal: $${lastInstallment.principalAmount}, Interest: $${lastInstallment.interestAmount}`);

if (firstInstallment.interestAmount <= lastInstallment.interestAmount) {
  throw new Error('In reducing balance amortization, early interest must exceed late interest');
}
if (lastInstallment.remainingBalance !== 0.0) {
  throw new Error(`Final balance must be $0.00, got ${lastInstallment.remainingBalance}`);
}
console.log('✅ Reducing Balance Amortization (EMI) engine verified!\n');


// -------------------------------------------------------------
// 3. FINANCIAL EDGE CASES & ROUNDING RECONCILIATION
// -------------------------------------------------------------
console.log('--- TEST 4: Edge Cases: Zero Interest Rate (0.0% APR) ---');
const zeroRateSimple = LoanCalculatorService.calculateLoan({
  principal: 6000,
  annualInterestRate: 0.0,
  termMonths: 6,
  interestMethod: 'SIMPLE_INTEREST'
});
if (zeroRateSimple.totalInterest !== 0.0) throw new Error('Simple interest with 0% rate must be 0');
if (zeroRateSimple.totalRepayment !== 6000.0) throw new Error('Repayment with 0% rate must equal principal');
if (zeroRateSimple.installmentAmount !== 1000.0) throw new Error('Installment with 0% rate must be 1000.00');

const zeroRateReducing = LoanCalculatorService.calculateLoan({
  principal: 6000,
  annualInterestRate: 0.0,
  termMonths: 6,
  interestMethod: 'REDUCING_BALANCE'
});
if (zeroRateReducing.totalInterest !== 0.0) throw new Error('Reducing balance with 0% rate must be 0');
if (zeroRateReducing.installmentAmount !== 1000.0) throw new Error('Reducing balance EMI with 0% must equal principal / N');
console.log('✅ Zero interest rate (0.0% APR) edge case passed for both calculation methods!\n');


console.log('--- TEST 5: Edge Cases: Ultra-Short Term (1 Month) and Long Term (84 Months) ---');
const shortTerm = LoanCalculatorService.calculateLoan({
  principal: 1500,
  annualInterestRate: 8.0,
  termMonths: 1
});
if (shortTerm.installmentCount !== 1) throw new Error('1-month term must produce exactly 1 installment');
if (shortTerm.schedules[0].remainingBalance !== 0.0) throw new Error('1-month term must clear remaining balance');

const longTerm = LoanCalculatorService.calculateLoan({
  principal: 50000,
  annualInterestRate: 9.5,
  termMonths: 84
});
if (longTerm.installmentCount !== 84) throw new Error('84-month term must produce 84 installments');
if (longTerm.schedules[83].remainingBalance !== 0.0) throw new Error('84-month term must clear balance at installment 84');
console.log('✅ 1-month and 84-month term edge cases passed!\n');


console.log('--- TEST 6: Penny-Perfect Rounding Reconciliation (Zero Cent Drift) ---');
// $1,000 across 3 months at 10% annual interest
// 1000 / 3 = 333.333333... without reconciliation, 3 * 333.33 = 999.99 (losing 1 cent)
const oddLoan = LoanCalculatorService.calculateSimpleInterest({
  principal: 1000.0,
  annualInterestRate: 10.0,
  termMonths: 3
});

let sumP = 0;
let sumI = 0;
for (const s of oddLoan.schedules) {
  sumP = LoanCalculatorService.round2(sumP + s.principalAmount);
  sumI = LoanCalculatorService.round2(sumI + s.interestAmount);
}

console.log(`Target Principal: $${oddLoan.principal} | Sum of Schedules: $${sumP}`);
console.log(`Target Interest : $${oddLoan.totalInterest} | Sum of Schedules: $${sumI}`);

if (sumP !== oddLoan.principal) {
  throw new Error(`Principal rounding drift! Expected ${oddLoan.principal}, got sum ${sumP}`);
}
if (sumI !== oddLoan.totalInterest) {
  throw new Error(`Interest rounding drift! Expected ${oddLoan.totalInterest}, got sum ${sumI}`);
}
console.log('✅ Penny-perfect rounding reconciliation verified: 0 cent drift across installments!\n');


// -------------------------------------------------------------
// 4. STANDALONE CALCULATOR SCHEMA VALIDATION
// -------------------------------------------------------------
console.log('--- TEST 7: Standalone Calculator DTO Validation ---');
const payloadWithAliases = {
  principal: 5000,
  rate: 6.5,
  term: 24,
  repaymentFrequency: 'MONTHLY',
  interestMethod: 'REDUCING_BALANCE'
};

const parsed = loanCalculatorInputSchema.safeParse(payloadWithAliases);
if (!parsed.success) {
  console.error(parsed.error.errors);
  throw new Error('Calculator payload with aliases failed validation');
}
console.log('✅ Standalone Calculator DTO parsing with aliases passed!');

console.log('\n🎉 ALL FINANCIAL CALCULATION ENGINE & LOAN CALCULATOR TESTS PASSED!\n');
