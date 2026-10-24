/**
 * ============================================================================
 * Financial Loan Calculation Engine (loanEngine.ts)
 * Enterprise & Academic Loan Management System (LMS)
 * ============================================================================
 *
 * Supports:
 *  1. Flat Rate Method:
 *     - Interest is calculated on the initial principal every month.
 *  2. Reducing Balance (Amortization / Equal Monthly Installment - EMI):
 *     - Principal repayment increases and interest decreases each month.
 *  3. Dual Currency Formatting & Rounding:
 *     - USD: Exact standard rounding to 2 decimal places ($0.01).
 *     - KHR: Exact rounding to the nearest 100 Cambodian Riel (៛100).
 *  4. Precision Balancing:
 *     - Final installment automatically absorbs rounding delta, ensuring the
 *       ending balance reaches exactly 0.00 without floating-point artifacts.
 */

export type Currency = 'USD' | 'KHR';
export type InterestType = 'flat' | 'reducing';

export interface LoanCalculationParams {
  principal: number;
  interestRateMonthly: number; // e.g. 1.5 for 1.5% per month
  termMonths: number;
  interestType: InterestType;
  currency: Currency;
  startDate?: string | Date; // Defaults to current date if omitted
}

export interface ScheduleRow {
  // CamelCase keys
  installmentNumber: number;
  dueDate: string; // ISO Date YYYY-MM-DD
  startingBalance: number;
  principalAmount: number;
  interestAmount: number;
  totalMonthlyInstallment: number;
  endingBalance: number;

  // Snake_case keys (Cambodian microfinance / Prompt 3.1 standard)
  installment_no: number;
  due_date: string;
  opening_balance: number;
  principal_due: number;
  interest_due: number;
  total_installment: number;
  closing_balance: number;
}

export interface LoanCalculationResult {
  currency: Currency;
  interestType: InterestType;
  principal: number;
  termMonths: number;
  interestRateMonthly: number;
  monthlyInstallment: number; // Indicative / baseline monthly installment
  totalPrincipal: number;
  totalInterest: number;
  totalRepayment: number;
  schedules: ScheduleRow[];
}

/**
 * Currency Rounding Utility
 * - USD: Rounds to 2 decimal places (cents)
 * - KHR: Rounds to nearest 100 Riel (standard National Bank of Cambodia practice)
 */
export function roundCurrency(amount: number, currency: Currency): number {
  if (currency === 'KHR') {
    // Round to nearest 100 Riel
    return Math.round(amount / 100) * 100;
  }
  // Round to 2 decimal places with epsilon to prevent IEEE-754 precision errors
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Format number as currency string
 */
export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'KHR') {
    return new Intl.NumberFormat('km-KH', {
      style: 'currency',
      currency: 'KHR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Add calendar months to a date with month-end boundary preservation
 * (e.g. Jan 31 + 1 month = Feb 28/29, not March 2/3)
 */
function addMonths(baseDate: Date, monthsToAdd: number): Date {
  const result = new Date(baseDate.getTime());
  const expectedDay = result.getDate();

  result.setMonth(result.getMonth() + monthsToAdd);

  // If date rolled over to next month (e.g. Feb 30 -> March 2), snap to last day of target month
  if (result.getDate() !== expectedDay) {
    result.setDate(0);
  }

  return result;
}

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Core Loan Schedule Generation Engine
 */
export function generateRepaymentSchedule(params: LoanCalculationParams): LoanCalculationResult {
  const {
    principal,
    interestRateMonthly,
    termMonths,
    interestType,
    currency,
    startDate = new Date(),
  } = params;

  if (principal <= 0) {
    throw new Error('Principal amount must be greater than zero.');
  }
  if (termMonths <= 0 || !Number.isInteger(termMonths)) {
    throw new Error('Term months must be a positive integer.');
  }
  if (interestRateMonthly < 0) {
    throw new Error('Interest rate cannot be negative.');
  }

  const initialDate = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
  if (isNaN(initialDate.getTime())) {
    throw new Error('Invalid start date provided.');
  }

  const schedules: ScheduleRow[] = [];
  let currentBalance = roundCurrency(principal, currency);
  const monthlyRateDecimal = interestRateMonthly / 100;

  let indicativeMonthlyInstallment = 0;

  if (interestType === 'flat') {
    // -------------------------------------------------------------------------
    // 1. FLAT RATE METHOD
    // -------------------------------------------------------------------------
    // Fixed monthly interest calculated solely on the original principal
    const monthlyInterest = roundCurrency(principal * monthlyRateDecimal, currency);
    const standardMonthlyPrincipal = roundCurrency(principal / termMonths, currency);
    indicativeMonthlyInstallment = roundCurrency(standardMonthlyPrincipal + monthlyInterest, currency);

    for (let i = 1; i <= termMonths; i++) {
      const dueDate = formatDateISO(addMonths(initialDate, i));
      const startBal = currentBalance;

      let principalAmount: number;
      if (i === termMonths) {
        // Last month: pay off entire remaining balance to eliminate rounding differences
        principalAmount = startBal;
      } else {
        principalAmount = standardMonthlyPrincipal;
      }

      const interestAmount = monthlyInterest;
      const totalInstallment = roundCurrency(principalAmount + interestAmount, currency);
      const endingBalance = roundCurrency(Math.max(0, startBal - principalAmount), currency);

      schedules.push({
        installmentNumber: i,
        dueDate,
        startingBalance: startBal,
        principalAmount,
        interestAmount,
        totalMonthlyInstallment: totalInstallment,
        endingBalance,

        installment_no: i,
        due_date: dueDate,
        opening_balance: startBal,
        principal_due: principalAmount,
        interest_due: interestAmount,
        total_installment: totalInstallment,
        closing_balance: endingBalance,
      });

      currentBalance = endingBalance;
    }
  } else {
    // -------------------------------------------------------------------------
    // 2. REDUCING BALANCE (AMORTIZATION / EMI) METHOD
    // -------------------------------------------------------------------------
    // Standard EMI formula: EMI = P * [r(1+r)^n] / [(1+r)^n - 1]
    let baseEmi: number;
    if (monthlyRateDecimal === 0) {
      baseEmi = principal / termMonths;
    } else {
      const rateFactor = Math.pow(1 + monthlyRateDecimal, termMonths);
      baseEmi = principal * ((monthlyRateDecimal * rateFactor) / (rateFactor - 1));
    }

    indicativeMonthlyInstallment = roundCurrency(baseEmi, currency);

    for (let i = 1; i <= termMonths; i++) {
      const dueDate = formatDateISO(addMonths(initialDate, i));
      const startBal = currentBalance;

      // Interest is calculated on the beginning remaining balance of the period
      const interestAmount = roundCurrency(startBal * monthlyRateDecimal, currency);

      let principalAmount: number;
      let totalInstallment: number;

      if (i === termMonths) {
        // Last installment clears full remaining principal
        principalAmount = startBal;
        totalInstallment = roundCurrency(principalAmount + interestAmount, currency);
      } else {
        principalAmount = roundCurrency(indicativeMonthlyInstallment - interestAmount, currency);
        // Ensure principal doesn't overshoot startBal
        if (principalAmount > startBal) {
          principalAmount = startBal;
        }
        totalInstallment = roundCurrency(principalAmount + interestAmount, currency);
      }

      const endingBalance = roundCurrency(Math.max(0, startBal - principalAmount), currency);

      schedules.push({
        installmentNumber: i,
        dueDate,
        startingBalance: startBal,
        principalAmount,
        interestAmount,
        totalMonthlyInstallment: totalInstallment,
        endingBalance,

        installment_no: i,
        due_date: dueDate,
        opening_balance: startBal,
        principal_due: principalAmount,
        interest_due: interestAmount,
        total_installment: totalInstallment,
        closing_balance: endingBalance,
      });

      currentBalance = endingBalance;
    }
  }

  // Calculate Aggregates
  const totalPrincipal = roundCurrency(
    schedules.reduce((acc, row) => acc + row.principalAmount, 0),
    currency
  );
  const totalInterest = roundCurrency(
    schedules.reduce((acc, row) => acc + row.interestAmount, 0),
    currency
  );
  const totalRepayment = roundCurrency(totalPrincipal + totalInterest, currency);

  return {
    currency,
    interestType,
    principal: roundCurrency(principal, currency),
    termMonths,
    interestRateMonthly,
    monthlyInstallment: indicativeMonthlyInstallment,
    totalPrincipal,
    totalInterest,
    totalRepayment,
    schedules,
  };
}

// ============================================================================
// VERIFICATION TEST CASES
// Run directly with: npx ts-node src/utils/loanEngine.ts
// ============================================================================

export function runLoanEngineTests(): void {
  console.log('===============================================================');
  console.log('🏦 LOAN CALCULATION ENGINE (loanEngine.ts) VERIFICATION SUITE');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // TEST CASE 1: USD Reducing Balance (Amortization)
  // --------------------------------------------------------------------------
  console.log('▶ TEST 1: USD Reducing Balance ($1,200, 1.5% monthly, 12 months)');
  const test1 = generateRepaymentSchedule({
    principal: 1200,
    interestRateMonthly: 1.5,
    termMonths: 12,
    interestType: 'reducing',
    currency: 'USD',
    startDate: '2026-01-01',
  });

  console.log(`  Indicative Monthly EMI: $${test1.monthlyInstallment.toFixed(2)}`);
  console.log(`  Total Principal: $${test1.totalPrincipal.toFixed(2)} | Total Interest: $${test1.totalInterest.toFixed(2)} | Total Paid: $${test1.totalRepayment.toFixed(2)}`);
  
  // Verify schedule dynamics
  console.log(`  Month 1: Principal = $${test1.schedules[0].principalAmount.toFixed(2)}, Interest = $${test1.schedules[0].interestAmount.toFixed(2)}`);
  console.log(`  Month 12: Principal = $${test1.schedules[11].principalAmount.toFixed(2)}, Interest = $${test1.schedules[11].interestAmount.toFixed(2)}`);

  // Assertions
  if (test1.schedules.length !== 12) throw new Error('Test 1 Failed: Expected 12 rows');
  if (test1.schedules[11].endingBalance !== 0) throw new Error(`Test 1 Failed: Final balance should be 0, got ${test1.schedules[11].endingBalance}`);
  if (Math.abs(test1.totalPrincipal - 1200) > 0.01) throw new Error(`Test 1 Failed: Total principal sum mismatch: ${test1.totalPrincipal}`);
  if (test1.schedules[0].principalAmount >= test1.schedules[11].principalAmount) {
    throw new Error('Test 1 Failed: In reducing balance, principal repayment must increase over time');
  }
  if (test1.schedules[0].interestAmount <= test1.schedules[11].interestAmount) {
    throw new Error('Test 1 Failed: In reducing balance, interest amount must decrease over time');
  }
  console.log('  ✓ Test 1 Passed! (Reducing balance amortizes correctly to $0.00)\n');

  // --------------------------------------------------------------------------
  // TEST CASE 2: USD Flat Rate Method
  // --------------------------------------------------------------------------
  console.log('▶ TEST 2: USD Flat Rate ($1,000, 1.2% monthly, 6 months)');
  const test2 = generateRepaymentSchedule({
    principal: 1000,
    interestRateMonthly: 1.2,
    termMonths: 6,
    interestType: 'flat',
    currency: 'USD',
    startDate: '2026-01-01',
  });

  // Flat interest per month = $1,000 * 0.012 = $12.00
  // Total interest = $12.00 * 6 = $72.00
  console.log(`  Fixed Monthly Interest: $${test2.schedules[0].interestAmount.toFixed(2)}`);
  console.log(`  Total Principal: $${test2.totalPrincipal.toFixed(2)} | Total Interest: $${test2.totalInterest.toFixed(2)}`);

  if (test2.schedules[0].interestAmount !== 12.0) throw new Error(`Test 2 Failed: Expected $12.00 interest, got ${test2.schedules[0].interestAmount}`);
  if (test2.totalInterest !== 72.0) throw new Error(`Test 2 Failed: Expected $72.00 total interest, got ${test2.totalInterest}`);
  if (test2.schedules[5].endingBalance !== 0) throw new Error(`Test 2 Failed: Final balance should be 0, got ${test2.schedules[5].endingBalance}`);
  console.log('  ✓ Test 2 Passed! (Flat interest is exactly constant every month)\n');

  // --------------------------------------------------------------------------
  // TEST CASE 3: Cambodian Riel (KHR) Reducing Balance (Nearest 100 Riel)
  // --------------------------------------------------------------------------
  console.log('▶ TEST 3: KHR Reducing Balance (4,000,000 KHR, 1.2% monthly, 6 months)');
  const test3 = generateRepaymentSchedule({
    principal: 4000000,
    interestRateMonthly: 1.2,
    termMonths: 6,
    interestType: 'reducing',
    currency: 'KHR',
    startDate: '2026-01-01',
  });

  console.log(`  Monthly Installment (KHR): ${formatCurrency(test3.monthlyInstallment, 'KHR')}`);
  console.log(`  Total Interest (KHR): ${formatCurrency(test3.totalInterest, 'KHR')}`);
  console.log(`  Total Repayment (KHR): ${formatCurrency(test3.totalRepayment, 'KHR')}`);

  // Ensure every row in KHR is rounded to the nearest 100 Riel
  test3.schedules.forEach((row, idx) => {
    if (row.principalAmount % 100 !== 0 || row.interestAmount % 100 !== 0 || row.totalMonthlyInstallment % 100 !== 0) {
      throw new Error(`Test 3 Failed: Row ${idx + 1} has values not divisible by 100 KHR`);
    }
  });
  if (test3.schedules[5].endingBalance !== 0) throw new Error('Test 3 Failed: Final KHR balance is not 0');
  console.log('  ✓ Test 3 Passed! (All KHR values accurately rounded to nearest 100 Riel)\n');

  // --------------------------------------------------------------------------
  // TEST CASE 4: Cambodian Riel (KHR) Flat Rate
  // --------------------------------------------------------------------------
  console.log('▶ TEST 4: KHR Flat Rate (2,000,000 KHR, 1.5% monthly, 6 months)');
  const test4 = generateRepaymentSchedule({
    principal: 2000000,
    interestRateMonthly: 1.5,
    termMonths: 6,
    interestType: 'flat',
    currency: 'KHR',
    startDate: '2026-01-01',
  });

  // Flat interest = 2,000,000 * 0.015 = 30,000 KHR
  console.log(`  Fixed Monthly Interest: ${formatCurrency(test4.schedules[0].interestAmount, 'KHR')}`);
  console.log(`  Total Interest: ${formatCurrency(test4.totalInterest, 'KHR')}`);

  if (test4.schedules[0].interestAmount !== 30000) throw new Error(`Test 4 Failed: Expected 30,000 KHR, got ${test4.schedules[0].interestAmount}`);
  if (test4.totalInterest !== 180000) throw new Error(`Test 4 Failed: Expected 180,000 KHR total interest, got ${test4.totalInterest}`);
  if (test4.schedules[5].endingBalance !== 0) throw new Error('Test 4 Failed: Final KHR balance is not 0');
  console.log('  ✓ Test 4 Passed! (KHR Flat calculations verified)\n');

  console.log('🎉 ALL 4 LOAN ENGINE TEST CASES PASSED WITH 100% ACCURACY!');
}

/**
 * Direct Schedule Array Generator (Prompt 3.1 Standard Output)
 * Returns array of rows: { installment_no, due_date, opening_balance, principal_due, interest_due, total_installment, closing_balance }
 */
export function calculateLoanSchedule(params: LoanCalculationParams): ScheduleRow[] {
  return generateRepaymentSchedule(params).schedules;
}

// ----------------------------------------------------------------------------
// Prompt 3.1 Exportable Test Cases
// ----------------------------------------------------------------------------

/**
 * Test Case 1: $1,000 6-month reducing balance loan (USD)
 */
export function testUsdReducingSixMonths() {
  const result = generateRepaymentSchedule({
    principal: 1000,
    interestRateMonthly: 1.5, // 1.5% monthly
    termMonths: 6,
    interestType: 'reducing',
    currency: 'USD',
    startDate: '2026-01-01',
  });

  const schedules = result.schedules;
  // Assertions
  if (schedules.length !== 6) throw new Error('Expected 6 installments');
  if (schedules[0].principal_due >= schedules[5].principal_due) {
    throw new Error('Principal component must grow over time in reducing balance');
  }
  if (schedules[0].interest_due <= schedules[5].interest_due) {
    throw new Error('Interest component must decline over time in reducing balance');
  }
  if (schedules[5].closing_balance !== 0) {
    throw new Error(`Closing balance must be 0.00, got ${schedules[5].closing_balance}`);
  }

  return {
    testName: '$1,000 6-Month Reducing Balance Loan (USD)',
    principal: result.principal,
    monthlyInstallment: result.monthlyInstallment,
    totalInterest: result.totalInterest,
    totalRepayment: result.totalRepayment,
    schedules: schedules.map(s => ({
      installment_no: s.installment_no,
      due_date: s.due_date,
      opening_balance: s.opening_balance,
      principal_due: s.principal_due,
      interest_due: s.interest_due,
      total_installment: s.total_installment,
      closing_balance: s.closing_balance
    }))
  };
}

/**
 * Test Case 2: 4,000,000 KHR 12-month flat loan (KHR)
 */
export function testKhrFlatTwelveMonths() {
  const result = generateRepaymentSchedule({
    principal: 4000000,
    interestRateMonthly: 1.2, // 1.2% monthly
    termMonths: 12,
    interestType: 'flat',
    currency: 'KHR',
    startDate: '2026-01-01',
  });

  const schedules = result.schedules;
  // Assertions
  if (schedules.length !== 12) throw new Error('Expected 12 installments');
  // Monthly flat interest = 4,000,000 * 0.012 = 48,000 KHR
  const expectedMonthlyInterest = 48000;
  if (schedules[0].interest_due !== expectedMonthlyInterest) {
    throw new Error(`Expected ${expectedMonthlyInterest} KHR interest, got ${schedules[0].interest_due}`);
  }
  // All rows must be rounded to nearest 100 Riel
  schedules.forEach((s) => {
    if (s.principal_due % 100 !== 0 || s.interest_due % 100 !== 0 || s.total_installment % 100 !== 0) {
      throw new Error(`Row ${s.installment_no} is not rounded to nearest 100 KHR`);
    }
  });
  if (schedules[11].closing_balance !== 0) {
    throw new Error('Final closing balance must be 0 KHR');
  }

  return {
    testName: '4,000,000 KHR 12-Month Flat Loan (KHR)',
    principal: result.principal,
    monthlyInstallment: result.monthlyInstallment,
    totalInterest: result.totalInterest,
    totalRepayment: result.totalRepayment,
    schedules: schedules.map(s => ({
      installment_no: s.installment_no,
      due_date: s.due_date,
      opening_balance: s.opening_balance,
      principal_due: s.principal_due,
      interest_due: s.interest_due,
      total_installment: s.total_installment,
      closing_balance: s.closing_balance
    }))
  };
}

export const prompt31TestCases = {
  testUsdReducingSixMonths,
  testKhrFlatTwelveMonths
};

// Auto-run if executed directly via node / ts-node
if (typeof require !== 'undefined' && require.main === module) {
  runLoanEngineTests();
  console.log('\n▶ Executing Prompt 3.1 Specific Test Cases:');
  const t1 = testUsdReducingSixMonths();
  console.log(`  ✓ ${t1.testName}: EMI = $${t1.monthlyInstallment}, Total Interest = $${t1.totalInterest}`);
  const t2 = testKhrFlatTwelveMonths();
  console.log(`  ✓ ${t2.testName}: Installment = ${t2.monthlyInstallment.toLocaleString()} KHR, Total Interest = ${t2.totalInterest.toLocaleString()} KHR`);
}
