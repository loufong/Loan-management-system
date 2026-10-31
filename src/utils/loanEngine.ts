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

// ============================================================================
// 2. END-TO-END LOAN LIFECYCLE STATE MACHINE (Prompt 2 Implementation)
// ============================================================================
// Strict Status Workflow:
// Draft ➔ Submitted ➔ Under Review ➔ Approved / Rejected ➔ Disbursed ➔ Active ➔ Completed
// ============================================================================

/**
 * Stage 1: Application Lifecycle Statuses
 */
export type ApplicationStageStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'CANCELLED';

/**
 * Stage 2: Loan Facility Lifecycle Statuses
 */
export type LoanFacilityStageStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WRITTEN_OFF';

/**
 * Unified Lifecycle Status
 */
export type UnifiedLoanLifecycleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'COMPLETED';

/**
 * Strict Application Workflow Transitions:
 * Draft ➔ Submitted ➔ Under Review ➔ Approved / Rejected ➔ Disbursed
 */
export const STRICT_APPLICATION_TRANSITIONS: Record<ApplicationStageStatus, ApplicationStageStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['DISBURSED'],
  REJECTED: [],
  DISBURSED: [],
  CANCELLED: []
};

/**
 * Standard Application Transitions (allowing direct Committee action if pre-authorized)
 */
export const STANDARD_APPLICATION_TRANSITIONS: Record<ApplicationStageStatus, ApplicationStageStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['DISBURSED'],
  REJECTED: [],
  DISBURSED: [],
  CANCELLED: []
};

/**
 * Loan Facility Transitions:
 * PENDING ➔ ACTIVE (upon disbursement) ➔ OVERDUE / COMPLETED
 */
export const LOAN_FACILITY_TRANSITIONS: Record<LoanFacilityStageStatus, LoanFacilityStageStatus[]> = {
  PENDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['OVERDUE', 'COMPLETED', 'WRITTEN_OFF'],
  OVERDUE: ['ACTIVE', 'COMPLETED', 'WRITTEN_OFF'],
  COMPLETED: [],
  CANCELLED: [],
  WRITTEN_OFF: []
};

/**
 * Check if an application transition is allowed
 */
export function canTransitionApplication(
  current: ApplicationStageStatus,
  next: ApplicationStageStatus,
  strictWorkflow: boolean = true
): boolean {
  const table = strictWorkflow ? STRICT_APPLICATION_TRANSITIONS : STANDARD_APPLICATION_TRANSITIONS;
  return table[current]?.includes(next) ?? false;
}

/**
 * Validate application transition or throw formatted error
 */
export function validateApplicationTransition(
  current: ApplicationStageStatus,
  next: ApplicationStageStatus,
  strictWorkflow: boolean = true
): void {
  if (!canTransitionApplication(current, next, strictWorkflow)) {
    const error: any = new Error(
      `Invalid application status transition: '${current}' ➔ '${next}'. ` +
      `Strict workflow: Draft ➔ Submitted ➔ Under Review ➔ Approved / Rejected ➔ Disbursed.`
    );
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
}

/**
 * Check if a loan can be disbursed (Guards against premature disbursement)
 * Rule: Only APPROVED applications with PENDING loan facilities can be disbursed.
 */
export function canDisburseLoan(
  applicationStatus: ApplicationStageStatus,
  loanStatus: LoanFacilityStageStatus = 'PENDING'
): boolean {
  return applicationStatus === 'APPROVED' && loanStatus === 'PENDING';
}

/**
 * Validate disbursement eligibility and throw specific error if premature
 */
export function validateDisbursementEligibility(
  applicationStatus: ApplicationStageStatus,
  loanStatus: LoanFacilityStageStatus = 'PENDING'
): void {
  if (applicationStatus !== 'APPROVED') {
    const error: any = new Error(
      `Disbursement rejected: Cannot disburse unapproved loan. Application status is '${applicationStatus}'. ` +
      `Only APPROVED applications can be disbursed following Credit Committee sanction.`
    );
    error.statusCode = 400;
    error.code = 'APPLICATION_NOT_APPROVED';
    throw error;
  }

  if (loanStatus !== 'PENDING') {
    const error: any = new Error(
      `Disbursement rejected: Loan facility is in '${loanStatus}' status. ` +
      `Only PENDING facilities are eligible for initial fund release.`
    );
    error.statusCode = 400;
    error.code = 'INVALID_LOAN_STATUS';
    throw error;
  }
}

/**
 * Parameters for Cashier Disbursement Execution
 */
export interface CashierDisbursementExecutionParams {
  applicationId: string;
  applicationNo: string;
  loanNumber: string;
  borrowerId: string;
  borrowerName?: string;
  principal: number;
  interestRateMonthly: number;
  termMonths: number;
  interestType: InterestType;
  currency: Currency;
  disbursementDate?: string | Date;
  disbursementMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  referenceNo: string;
  disbursedBy: string;
  notes?: string;
  applicationStatus: ApplicationStageStatus;
  currentLoanStatus?: LoanFacilityStageStatus;
}

export interface ActiveScheduleRow extends ScheduleRow {
  installmentStatus: 'UNPAID' | 'UPCOMING';
  status: 'unpaid' | 'upcoming';
  amountPaid: number;
  remainingAmount: number;
}

export interface CashierDisbursementExecutionResult {
  disbursement: {
    referenceNo: string;
    disbursementMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    disbursementDate: string;
    amount: number;
    currency: Currency;
    disbursedBy: string;
    status: 'DISBURSED';
    notes?: string;
  };
  application: {
    id: string;
    applicationNo: string;
    previousStatus: ApplicationStageStatus;
    status: 'DISBURSED';
  };
  loan: {
    loanNumber: string;
    status: 'ACTIVE';
    principalAmount: number;
    interestRateMonthly: number;
    termMonths: number;
    totalInterest: number;
    totalRepayment: number;
    totalPaid: number;
    outstandingBalance: number;
    startDate: string;
    maturityDate: string;
    firstDueDate: string;
    monthlyInstallment: number;
  };
  repaymentSchedules: ActiveScheduleRow[];
}

/**
 * Execute Cashier Disbursement:
 * 1. Validates application is APPROVED (prevents premature disbursement)
 * 2. Auto-generates repayment schedule with penny-perfect amortization
 * 3. Immediately activates loan facility: sets status to ACTIVE, installment 1 to UNPAID, 2..N to UPCOMING
 * 4. Transitions application to DISBURSED
 */
export function executeCashierDisbursement(
  params: CashierDisbursementExecutionParams
): CashierDisbursementExecutionResult {
  // 1. Guard against premature disbursement (cannot disburse unapproved loans)
  validateDisbursementEligibility(
    params.applicationStatus,
    params.currentLoanStatus || 'PENDING'
  );

  // 2. Validate reference and payment method
  if (!params.referenceNo || !params.referenceNo.trim()) {
    const error: any = new Error('Disbursement reference number is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const disbDate = params.disbursementDate
    ? (typeof params.disbursementDate === 'string' ? new Date(params.disbursementDate) : params.disbursementDate)
    : new Date();

  // 3. Auto-generate repayment schedule using calculation engine
  const calculation = generateRepaymentSchedule({
    principal: params.principal,
    interestRateMonthly: params.interestRateMonthly,
    termMonths: params.termMonths,
    interestType: params.interestType,
    currency: params.currency,
    startDate: disbDate,
  });

  // 4. Activate schedule:
  // Installment 1 = UNPAID (due next billing cycle)
  // Installments 2..N = UPCOMING
  const activeSchedules: ActiveScheduleRow[] = calculation.schedules.map((row) => {
    const isFirst = row.installmentNumber === 1;
    return {
      ...row,
      installmentStatus: isFirst ? 'UNPAID' : 'UPCOMING',
      status: isFirst ? 'unpaid' : 'upcoming',
      amountPaid: 0,
      remainingAmount: row.totalMonthlyInstallment,
    };
  });

  const firstDueDate = activeSchedules[0]?.dueDate || formatDateISO(disbDate);
  const maturityDate = activeSchedules[activeSchedules.length - 1]?.dueDate || formatDateISO(disbDate);

  return {
    disbursement: {
      referenceNo: params.referenceNo,
      disbursementMethod: params.disbursementMethod,
      disbursementDate: formatDateISO(disbDate),
      amount: calculation.principal,
      currency: params.currency,
      disbursedBy: params.disbursedBy,
      status: 'DISBURSED',
      notes: params.notes,
    },
    application: {
      id: params.applicationId,
      applicationNo: params.applicationNo,
      previousStatus: params.applicationStatus,
      status: 'DISBURSED',
    },
    loan: {
      loanNumber: params.loanNumber,
      status: 'ACTIVE',
      principalAmount: calculation.principal,
      interestRateMonthly: params.interestRateMonthly,
      termMonths: params.termMonths,
      totalInterest: calculation.totalInterest,
      totalRepayment: calculation.totalRepayment,
      totalPaid: 0,
      outstandingBalance: calculation.totalRepayment,
      startDate: formatDateISO(disbDate),
      maturityDate,
      firstDueDate,
      monthlyInstallment: calculation.monthlyInstallment,
    },
    repaymentSchedules: activeSchedules,
  };
}

/**
 * Determine if an active loan is COMPLETED
 * Rule: outstanding balance <= 0 and all scheduled installments are fully settled
 */
export function evaluateLoanCompletion(
  outstandingBalance: number,
  unpaidInstallmentsCount: number
): LoanFacilityStageStatus {
  if (outstandingBalance <= 0.009 && unpaidInstallmentsCount === 0) {
    return 'COMPLETED';
  }
  return 'ACTIVE';
}

/**
 * Complete End-to-End State Machine Simulation
 * Steps:
 * 1. Draft ➔ 2. Submitted ➔ 3. Under Review ➔ 4. Approved ➔ 5. Disbursed ➔ 6. Active ➔ 7. Completed
 */
export function simulateEndToEndLoanLifecycle(params: {
  principal: number;
  interestRateMonthly: number;
  termMonths: number;
  currency: Currency;
  interestType: InterestType;
}) {
  const auditTrail: Array<{ stage: string; timestamp: string; details: string }> = [];

  // Stage 1: DRAFT
  let appStatus: ApplicationStageStatus = 'DRAFT';
  auditTrail.push({
    stage: 'DRAFT',
    timestamp: new Date().toISOString(),
    details: `Application drafted for ${formatCurrency(params.principal, params.currency)}.`
  });

  // Stage 2: SUBMITTED
  validateApplicationTransition(appStatus, 'SUBMITTED');
  appStatus = 'SUBMITTED';
  auditTrail.push({
    stage: 'SUBMITTED',
    timestamp: new Date().toISOString(),
    details: 'Application submitted for formal underwriting review.'
  });

  // Stage 3: UNDER_REVIEW
  validateApplicationTransition(appStatus, 'UNDER_REVIEW');
  appStatus = 'UNDER_REVIEW';
  auditTrail.push({
    stage: 'UNDER_REVIEW',
    timestamp: new Date().toISOString(),
    details: 'Credit risk assessment and DTI underwriting in progress.'
  });

  // Stage 4: APPROVED
  validateApplicationTransition(appStatus, 'APPROVED');
  appStatus = 'APPROVED';
  auditTrail.push({
    stage: 'APPROVED',
    timestamp: new Date().toISOString(),
    details: 'Credit Committee approved terms. Ready for treasury fund disbursement.'
  });

  // Verify Premature Disbursement Prevention:
  // Cannot disburse if application was DRAFT or SUBMITTED or UNDER_REVIEW
  try {
    validateDisbursementEligibility('UNDER_REVIEW', 'PENDING');
    throw new Error('Premature disbursement check failed: UNDER_REVIEW should not be disbursable');
  } catch (err: any) {
    if (err.code !== 'APPLICATION_NOT_APPROVED') throw err;
  }

  // Stage 5 & 6: DISBURSED & ACTIVE
  const disbResult = executeCashierDisbursement({
    applicationId: 'APP-2026-TEST',
    applicationNo: 'APP-2026-0042',
    loanNumber: 'LN-2026-0042',
    borrowerId: 'BOR-2026-0001',
    principal: params.principal,
    interestRateMonthly: params.interestRateMonthly,
    termMonths: params.termMonths,
    interestType: params.interestType,
    currency: params.currency,
    disbursementDate: '2026-10-01',
    disbursementMethod: 'BANK_TRANSFER',
    referenceNo: 'TRX-DISB-883921',
    disbursedBy: 'Cashier Terminal 1',
    applicationStatus: appStatus,
    currentLoanStatus: 'PENDING'
  });

  appStatus = disbResult.application.status;
  let loanStatus: LoanFacilityStageStatus = disbResult.loan.status;

  auditTrail.push({
    stage: 'DISBURSED',
    timestamp: disbResult.disbursement.disbursementDate,
    details: `Cashier disbursed funds via ${disbResult.disbursement.disbursementMethod} (Ref: ${disbResult.disbursement.referenceNo}).`
  });
  auditTrail.push({
    stage: 'ACTIVE',
    timestamp: disbResult.disbursement.disbursementDate,
    details: `Loan facility activated. Repayment schedule auto-generated (${disbResult.repaymentSchedules.length} installments). Installment 1 set to UNPAID, 2..N to UPCOMING.`
  });

  // Stage 7: COMPLETED (simulate final payoff)
  loanStatus = evaluateLoanCompletion(0, 0);
  auditTrail.push({
    stage: 'COMPLETED',
    timestamp: new Date().toISOString(),
    details: 'All installments settled in full. Ending balance reached $0.00. Loan facility closed.'
  });

  return {
    finalApplicationStatus: appStatus,
    finalLoanStatus: loanStatus,
    disbursementResult: disbResult,
    auditTrail
  };
}

/**
 * End-to-End State Machine Verification Suite
 */

// ============================================================================
// 3. UNDERWRITING & FINANCIAL CALCULATION RULES (Prompt 3 Implementation)
// ============================================================================

/**
 * 3.1 Simple Interest Formula Implementation:
 * - Total Interest = Principal × Rate × Time
 * - Total Repayment = Principal + Total Interest
 * - Installment Amount = Total Repayment / Number of Installments
 */
export interface SimpleInterestParams {
  principal: number;
  annualInterestRate: number; // e.g. 12 for 12% APR (or monthly rate if isMonthlyRate: true)
  termMonths: number;
  currency?: Currency;
  isMonthlyRate?: boolean;
  repaymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY';
  startDate?: string | Date;
}

export interface SimpleInterestResult {
  principal: number;
  annualInterestRate: number;
  monthlyInterestRate: number;
  termMonths: number;
  timeYears: number;
  totalInterest: number;
  totalRepayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  currency: Currency;
  schedules: ScheduleRow[];
}

export function calculateSimpleInterestFormula(
  params: SimpleInterestParams
): SimpleInterestResult {
  const currency: Currency = params.currency || 'USD';
  const principal = roundCurrency(params.principal, currency);

  if (principal <= 0) {
    throw new Error('Principal amount must be greater than zero.');
  }
  if (params.termMonths <= 0 || !Number.isInteger(params.termMonths)) {
    throw new Error('Term months must be a positive integer.');
  }

  // Rate & Time calculation
  let annualRate = params.annualInterestRate;
  let monthlyRate = params.isMonthlyRate ? params.annualInterestRate : params.annualInterestRate / 12;
  if (params.isMonthlyRate) {
    annualRate = params.annualInterestRate * 12;
  }
  if (annualRate < 0) {
    throw new Error('Interest rate cannot be negative.');
  }

  const timeYears = params.termMonths / 12;
  const rateDecimal = annualRate / 100;

  // Formula 1: Total Interest = Principal × Rate × Time
  const totalInterest = roundCurrency(principal * rateDecimal * timeYears, currency);

  // Formula 2: Total Repayment = Principal + Total Interest
  const totalRepayment = roundCurrency(principal + totalInterest, currency);

  // Number of installments based on frequency
  const frequency = params.repaymentFrequency || 'MONTHLY';
  let numberOfInstallments = params.termMonths;
  if (frequency === 'WEEKLY') {
    numberOfInstallments = Math.max(1, Math.round((params.termMonths * 52) / 12));
  } else if (frequency === 'BIWEEKLY') {
    numberOfInstallments = Math.max(1, Math.round((params.termMonths * 26) / 12));
  }

  // Formula 3: Installment Amount = Total Repayment / Number of Installments
  const installmentAmount = roundCurrency(totalRepayment / numberOfInstallments, currency);

  // Generate amortization schedule with rounding balancing
  const startDate = params.startDate
    ? (typeof params.startDate === 'string' ? new Date(params.startDate) : params.startDate)
    : new Date();

  const schedules: ScheduleRow[] = [];
  let remainingBal = principal;
  const basePrincipal = roundCurrency(principal / numberOfInstallments, currency);
  const baseInterest = roundCurrency(totalInterest / numberOfInstallments, currency);

  let accumulatedP = 0;
  let accumulatedI = 0;

  for (let i = 1; i <= numberOfInstallments; i++) {
    const isLast = i === numberOfInstallments;
    let pAmt: number;
    let iAmt: number;

    if (isLast) {
      // Final installment absorbs rounding drift to ensure exact 0.00 ending balance
      pAmt = roundCurrency(principal - accumulatedP, currency);
      iAmt = roundCurrency(totalInterest - accumulatedI, currency);
    } else {
      pAmt = basePrincipal;
      iAmt = baseInterest;
      accumulatedP = roundCurrency(accumulatedP + pAmt, currency);
      accumulatedI = roundCurrency(accumulatedI + iAmt, currency);
    }

    const totalInst = roundCurrency(pAmt + iAmt, currency);
    const startBal = remainingBal;
    const endBal = isLast ? 0 : roundCurrency(Math.max(0, startBal - pAmt), currency);
    remainingBal = endBal;

    const dueDate = formatDateISO(addMonths(startDate, i));

    schedules.push({
      installmentNumber: i,
      dueDate,
      startingBalance: startBal,
      principalAmount: pAmt,
      interestAmount: iAmt,
      totalMonthlyInstallment: totalInst,
      endingBalance: endBal,

      installment_no: i,
      due_date: dueDate,
      opening_balance: startBal,
      principal_due: pAmt,
      interest_due: iAmt,
      total_installment: totalInst,
      closing_balance: endBal,
    });
  }

  return {
    principal,
    annualInterestRate: annualRate,
    monthlyInterestRate: monthlyRate,
    termMonths: params.termMonths,
    timeYears,
    totalInterest,
    totalRepayment,
    numberOfInstallments,
    installmentAmount,
    currency,
    schedules,
  };
}

/**
 * 3.2 Real-Time Application Validation
 * A. Debt Service Ratio (DSR) / Debt-to-Income (DTI)
 * - Formula: DSR = (Monthly Obligations / Net Income) * 100%
 * - Rule: Warn or block if (Monthly Obligations / Net Income) > 50%
 */
export interface DsrValidationParams {
  netIncome: number;
  monthlyObligations?: number;
  installmentAmount?: number;
  existingDebtObligations?: number;
  warningThreshold?: number; // Defaults to 50.0%
  blockThreshold?: number;   // e.g. 50.0%
  blockIfExceeded?: boolean; // If true, throws error or marks isBlocked: true
}

export interface DsrValidationResult {
  dsrPercentage: number;
  netIncome: number;
  totalMonthlyObligations: number;
  isWarning: boolean;
  isBlocked: boolean;
  riskLevel: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  recommendation: 'APPROVE' | 'CAUTION' | 'BLOCK' | 'REQUIRE_GUARANTOR';
  message: string;
}

export function calculateDebtServiceRatio(
  params: DsrValidationParams
): DsrValidationResult {
  const netIncome = Math.max(0, params.netIncome);
  const totalObligations =
    params.monthlyObligations !== undefined
      ? params.monthlyObligations
      : (params.installmentAmount || 0) + (params.existingDebtObligations || 0);

  const threshold = params.warningThreshold || 50.0;
  const blockThreshold = params.blockThreshold || 50.0;

  if (netIncome <= 0) {
    return {
      dsrPercentage: 100.0,
      netIncome: 0,
      totalMonthlyObligations: totalObligations,
      isWarning: true,
      isBlocked: Boolean(params.blockIfExceeded),
      riskLevel: 'HIGH_RISK',
      recommendation: 'BLOCK',
      message: 'Borrower declared $0 net monthly income. Debt Service Ratio (DSR) cannot be evaluated; application blocked.',
    };
  }

  const rawDsr = (totalObligations / netIncome) * 100;
  const dsrPercentage = Math.round((rawDsr + Number.EPSILON) * 100) / 100;

  const isWarning = dsrPercentage > threshold;
  const isBlocked = Boolean(params.blockIfExceeded && dsrPercentage > blockThreshold);

  let riskLevel: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  let recommendation: 'APPROVE' | 'CAUTION' | 'BLOCK' | 'REQUIRE_GUARANTOR';
  let message: string;

  if (dsrPercentage <= 25.0) {
    riskLevel = 'LOW_RISK';
    recommendation = 'APPROVE';
    message = `Favorable DSR (${dsrPercentage}% <= 25.0%). Strong financial capacity; recommend approval.`;
  } else if (dsrPercentage <= 50.0) {
    riskLevel = 'MEDIUM_RISK';
    recommendation = 'CAUTION';
    message = `Moderate DSR (${dsrPercentage}% <= 50.0%). Prudent debt burden within regulatory guidelines.`;
  } else {
    riskLevel = 'HIGH_RISK';
    recommendation = isBlocked ? 'BLOCK' : 'REQUIRE_GUARANTOR';
    message = `Elevated DSR (${dsrPercentage}% > 50.0%). Debt service obligations exceed prudent 50.0% ceiling. ` +
      (isBlocked
        ? 'Application is blocked from approval.'
        : 'Requires guarantor or reduced facility quantum to comply with underwriting limits.');
  }

  return {
    dsrPercentage,
    netIncome,
    totalMonthlyObligations: totalObligations,
    isWarning,
    isBlocked,
    riskLevel,
    recommendation,
    message,
  };
}

export function validateDebtServiceRatio(
  params: DsrValidationParams
): DsrValidationResult {
  const result = calculateDebtServiceRatio(params);
  if (result.isBlocked) {
    const error: any = new Error(
      `Debt Service Ratio validation failed: DSR is ${result.dsrPercentage}%, exceeding the maximum 50.0% limit. (${result.message})`
    );
    error.statusCode = 400;
    error.code = 'DSR_THRESHOLD_EXCEEDED';
    error.dsrResult = result;
    throw error;
  }
  return result;
}

/**
 * B. Loan Product Limits Validation
 * Validate requested amount against Min/Max and Term limits
 */
export interface ProductLimitsParams {
  requestedAmount: number;
  requestedTerm: number;
  product: {
    minAmount: number;
    maxAmount: number;
    minTerm: number;
    maxTerm: number;
    productName?: string;
  };
}

export interface ProductLimitsResult {
  isValid: boolean;
  errors: string[];
  amountError?: string;
  termError?: string;
}

export function validateLoanProductLimits(
  params: ProductLimitsParams
): ProductLimitsResult {
  const { requestedAmount, requestedTerm, product } = params;
  const errors: string[] = [];
  let amountError: string | undefined;
  let termError: string | undefined;

  const minAmt = product.minAmount;
  const maxAmt = product.maxAmount;
  const minTerm = product.minTerm;
  const maxTerm = product.maxTerm;

  if (requestedAmount < minAmt || requestedAmount > maxAmt) {
    amountError = `Requested amount ($ ${requestedAmount.toLocaleString()}) must be between $${minAmt.toLocaleString()} and $${maxAmt.toLocaleString()}.`;
    errors.push(amountError);
  }

  if (requestedTerm < minTerm || requestedTerm > maxTerm) {
    termError = `Requested term (${requestedTerm} months) must be between ${minTerm} and ${maxTerm} months.`;
    errors.push(termError);
  }

  return {
    isValid: errors.length === 0,
    errors,
    amountError,
    termError,
  };
}

export function assertLoanProductLimits(
  params: ProductLimitsParams
): void {
  const validation = validateLoanProductLimits(params);
  if (!validation.isValid) {
    if (validation.amountError) {
      const error: any = new Error(validation.amountError);
      error.statusCode = 400;
      error.code = 'AMOUNT_OUT_OF_RANGE';
      throw error;
    }
    if (validation.termError) {
      const error: any = new Error(validation.termError);
      error.statusCode = 400;
      error.code = 'TERM_OUT_OF_RANGE';
      throw error;
    }
  }
}

/**
 * 3.3 Outstanding Balance Formula:
 * - Outstanding Balance = Total Repayment - Total Paid
 */
export function calculateOutstandingBalance(
  totalRepayment: number,
  totalPaid: number,
  currency: Currency = 'USD'
): number {
  if (totalRepayment < 0) totalRepayment = 0;
  if (totalPaid < 0) totalPaid = 0;

  // Formula: Outstanding Balance = Total Repayment - Total Paid
  const rawBalance = totalRepayment - totalPaid;
  return Math.max(0, roundCurrency(rawBalance, currency));
}

/**
 * Verification test runner for Underwriting & Financial Calculation Rules
 */
export function runUnderwritingRulesTests(): void {
  console.log('===============================================================');
  console.log('📐 UNDERWRITING & FINANCIAL CALCULATION RULES VERIFICATION');
  console.log('===============================================================\n');

  console.log('▶ TEST 1: Simple Interest Formula ($10,000, 12% APR, 12 months)');
  // Total Interest = 10,000 * 0.12 * 1 = $1,200.00
  // Total Repayment = 10,000 + 1,200 = $11,200.00
  // Installment = 11,200 / 12 = $933.33
  const simpleResult = calculateSimpleInterestFormula({
    principal: 10000,
    annualInterestRate: 12,
    termMonths: 12,
    currency: 'USD'
  });

  if (simpleResult.totalInterest !== 1200) throw new Error(`Expected total interest $1,200, got ${simpleResult.totalInterest}`);
  if (simpleResult.totalRepayment !== 11200) throw new Error(`Expected total repayment $11,200, got ${simpleResult.totalRepayment}`);
  if (simpleResult.installmentAmount !== 933.33) throw new Error(`Expected installment $933.33, got ${simpleResult.installmentAmount}`);
  if (simpleResult.schedules[11].endingBalance !== 0) throw new Error('Final schedule ending balance must be 0.00');
  console.log(`  ✓ Total Interest: $${simpleResult.totalInterest.toFixed(2)}`);
  console.log(`  ✓ Total Repayment: $${simpleResult.totalRepayment.toFixed(2)}`);
  console.log(`  ✓ Monthly Installment: $${simpleResult.installmentAmount.toFixed(2)}`);
  console.log('  ✓ Test 1 Passed! (Simple interest formulas match user specification)\n');

  console.log('▶ TEST 2: Debt Service Ratio (DSR) Real-Time Validation');
  // Case A: Healthy DSR (<= 25%)
  const dsrA = calculateDebtServiceRatio({ netIncome: 2000, installmentAmount: 400 });
  if (dsrA.dsrPercentage !== 20.0 || dsrA.isWarning || dsrA.isBlocked) throw new Error('Expected 20% healthy DSR');
  console.log(`  ✓ Case A (Net: $2,000, Inst: $400): DSR = ${dsrA.dsrPercentage}% (Healthy, no warning)`);

  // Case B: Moderate DSR (33.3%)
  const dsrB = calculateDebtServiceRatio({ netIncome: 1500, installmentAmount: 500 });
  if (dsrB.dsrPercentage !== 33.33 || dsrB.isWarning) throw new Error('Expected 33.33% moderate DSR');
  console.log(`  ✓ Case B (Net: $1,500, Inst: $500): DSR = ${dsrB.dsrPercentage}% (Moderate <= 50%)`);

  // Case C: Exceeded DSR (> 50% -> Warning & Block)
  const dsrC = calculateDebtServiceRatio({ netIncome: 1000, installmentAmount: 550, blockIfExceeded: true });
  if (dsrC.dsrPercentage !== 55.0 || !dsrC.isWarning || !dsrC.isBlocked) throw new Error('Expected 55% warning & block');
  console.log(`  ✓ Case C (Net: $1,000, Inst: $550): DSR = ${dsrC.dsrPercentage}% (Warn & Block flag triggered)`);

  let blockTriggered = false;
  try {
    validateDebtServiceRatio({ netIncome: 1000, installmentAmount: 550, blockIfExceeded: true });
  } catch (err: any) {
    blockTriggered = true;
    if (err.code !== 'DSR_THRESHOLD_EXCEEDED') throw err;
  }
  if (!blockTriggered) throw new Error('validateDebtServiceRatio should have thrown DSR_THRESHOLD_EXCEEDED');
  console.log('  ✓ Test 2 Passed! (DSR > 50% correctly warns and blocks)\n');

  console.log('▶ TEST 3: Loan Product Limits Validation (Min/Max and Term Limits)');
  const mockProduct = { minAmount: 1000, maxAmount: 20000, minTerm: 6, maxTerm: 36 };

  // Valid
  const valValid = validateLoanProductLimits({ requestedAmount: 5000, requestedTerm: 12, product: mockProduct });
  if (!valValid.isValid) throw new Error('Expected 5000 / 12 to be valid');

  // Amount below min
  const valLowAmt = validateLoanProductLimits({ requestedAmount: 500, requestedTerm: 12, product: mockProduct });
  if (valLowAmt.isValid || !valLowAmt.amountError) throw new Error('Expected amount < min error');

  // Amount above max
  const valHighAmt = validateLoanProductLimits({ requestedAmount: 25000, requestedTerm: 12, product: mockProduct });
  if (valHighAmt.isValid || !valHighAmt.amountError) throw new Error('Expected amount > max error');

  // Term below min
  const valLowTerm = validateLoanProductLimits({ requestedAmount: 5000, requestedTerm: 3, product: mockProduct });
  if (valLowTerm.isValid || !valLowTerm.termError) throw new Error('Expected term < min error');

  // Term above max
  const valHighTerm = validateLoanProductLimits({ requestedAmount: 5000, requestedTerm: 48, product: mockProduct });
  if (valHighTerm.isValid || !valHighTerm.termError) throw new Error('Expected term > max error');

  console.log('  ✓ Test 3 Passed! (Min/Max amount and term boundaries strictly validated)\n');

  console.log('▶ TEST 4: Outstanding Balance Formula (Total Repayment - Total Paid)');
  // Total Repayment = $11,200. Paid $3,000 -> Outstanding = $8,200.00
  const bal1 = calculateOutstandingBalance(11200, 3000);
  if (bal1 !== 8200) throw new Error(`Expected $8,200, got ${bal1}`);

  // Total Repayment = $11,200. Paid $11,200 -> Outstanding = $0.00
  const bal2 = calculateOutstandingBalance(11200, 11200);
  if (bal2 !== 0) throw new Error(`Expected $0, got ${bal2}`);

  // Overpayment check: Total Repayment = $11,200. Paid $11,500 -> Outstanding cannot be negative
  const bal3 = calculateOutstandingBalance(11200, 11500);
  if (bal3 !== 0) throw new Error(`Expected $0, got ${bal3}`);

  // KHR Currency Rounding check
  const balKHR = calculateOutstandingBalance(4169600, 1500000, 'KHR');
  if (balKHR !== 2669600 || balKHR % 100 !== 0) throw new Error('Expected KHR balance rounded to nearest 100 Riel');

  console.log(`  ✓ Partial Paid: Repayment = $11,200, Paid = $3,000 -> Outstanding = $${bal1.toFixed(2)}`);
  console.log(`  ✓ Fully Settled: Repayment = $11,200, Paid = $11,200 -> Outstanding = $${bal2.toFixed(2)}`);
  console.log(`  ✓ KHR Precision: Repayment = 4,169,600៛, Paid = 1,500,000៛ -> Outstanding = ${balKHR.toLocaleString()}៛`);
  console.log('  ✓ Test 4 Passed! (Outstanding Balance = Total Repayment - Total Paid verified)\n');

  console.log('🎉 ALL UNDERWRITING & FINANCIAL CALCULATION RULES TESTS PASSED CLEANLY!\n');
}

export function runLifecycleStateMachineTests(): void {
  console.log('===============================================================');
  console.log('🔄 LOAN LIFECYCLE STATE MACHINE (Prompt 2) VERIFICATION SUITE');
  console.log('===============================================================\n');

  console.log('▶ TEST 1: Strict Application Transitions (Draft ➔ Submitted ➔ Under Review ➔ Approved ➔ Disbursed)');
  // Allowed
  if (!canTransitionApplication('DRAFT', 'SUBMITTED')) throw new Error('Expected DRAFT -> SUBMITTED to be allowed');
  if (!canTransitionApplication('SUBMITTED', 'UNDER_REVIEW')) throw new Error('Expected SUBMITTED -> UNDER_REVIEW to be allowed');
  if (!canTransitionApplication('UNDER_REVIEW', 'APPROVED')) throw new Error('Expected UNDER_REVIEW -> APPROVED to be allowed');
  if (!canTransitionApplication('UNDER_REVIEW', 'REJECTED')) throw new Error('Expected UNDER_REVIEW -> REJECTED to be allowed');
  if (!canTransitionApplication('APPROVED', 'DISBURSED')) throw new Error('Expected APPROVED -> DISBURSED to be allowed');

  // Disallowed (Strict workflow enforcement)
  if (canTransitionApplication('DRAFT', 'APPROVED')) throw new Error('DRAFT -> APPROVED must be forbidden');
  if (canTransitionApplication('DRAFT', 'DISBURSED')) throw new Error('DRAFT -> DISBURSED must be forbidden');
  if (canTransitionApplication('SUBMITTED', 'DISBURSED')) throw new Error('SUBMITTED -> DISBURSED must be forbidden');
  if (canTransitionApplication('UNDER_REVIEW', 'DISBURSED')) throw new Error('UNDER_REVIEW -> DISBURSED must be forbidden');
  if (canTransitionApplication('REJECTED', 'DISBURSED')) throw new Error('REJECTED -> DISBURSED must be forbidden');
  if (canTransitionApplication('REJECTED', 'APPROVED')) throw new Error('REJECTED -> APPROVED must be forbidden');
  console.log('  ✓ Test 1 Passed! (Strict status transitions enforced with 100% boundary safety)\n');

  console.log('▶ TEST 2: Premature Disbursement Prevention (Cannot disburse unapproved loans)');
  const unapprovedStatuses: ApplicationStageStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED'];
  for (const status of unapprovedStatuses) {
    let caught = false;
    try {
      validateDisbursementEligibility(status, 'PENDING');
    } catch (err: any) {
      caught = true;
      if (err.code !== 'APPLICATION_NOT_APPROVED') throw new Error(`Expected APPLICATION_NOT_APPROVED, got ${err.code}`);
    }
    if (!caught) throw new Error(`Expected status ${status} to be rejected from disbursement`);
  }

  // Already ACTIVE or COMPLETED loans cannot be re-disbursed
  let activeCaught = false;
  try {
    validateDisbursementEligibility('APPROVED', 'ACTIVE');
  } catch (err: any) {
    activeCaught = true;
    if (err.code !== 'INVALID_LOAN_STATUS') throw new Error(`Expected INVALID_LOAN_STATUS, got ${err.code}`);
  }
  if (!activeCaught) throw new Error('Expected ACTIVE loan to be rejected from re-disbursement');

  console.log('  ✓ Test 2 Passed! (All unapproved and invalid facility disbursements rejected)\n');

  console.log('▶ TEST 3: Cashier Disbursement ➔ Auto-Generate Schedule & Immediate Activation');
  const disbResult = executeCashierDisbursement({
    applicationId: 'APP-2026-0042',
    applicationNo: 'APP-2026-0042',
    loanNumber: 'LN-2026-0042',
    borrowerId: 'BOR-2026-0001',
    principal: 5000,
    interestRateMonthly: 1.0,
    termMonths: 12,
    interestType: 'reducing',
    currency: 'USD',
    disbursementDate: '2026-10-01',
    disbursementMethod: 'BANK_TRANSFER',
    referenceNo: 'TRX-BNK-992144',
    disbursedBy: 'Senior Cashier Sokha',
    applicationStatus: 'APPROVED',
    currentLoanStatus: 'PENDING'
  });

  if (disbResult.application.status !== 'DISBURSED') throw new Error('Expected application status to be DISBURSED');
  if (disbResult.loan.status !== 'ACTIVE') throw new Error('Expected loan status to be ACTIVE');
  if (disbResult.repaymentSchedules.length !== 12) throw new Error('Expected 12 repayment installments');
  if (disbResult.repaymentSchedules[0].installmentStatus !== 'UNPAID') throw new Error('Expected installment 1 to be UNPAID');
  if (disbResult.repaymentSchedules[1].installmentStatus !== 'UPCOMING') throw new Error('Expected installment 2 to be UPCOMING');
  if (disbResult.repaymentSchedules[11].endingBalance !== 0) throw new Error('Expected final installment ending balance to be 0');

  console.log(`  Activated Loan: ${disbResult.loan.loanNumber} | Status: ${disbResult.loan.status}`);
  console.log(`  Generated ${disbResult.repaymentSchedules.length} installments | First Due: ${disbResult.loan.firstDueDate} | Maturity: ${disbResult.loan.maturityDate}`);
  console.log('  ✓ Test 3 Passed! (Disbursement automatically activates loan and generates schedule)\n');

  console.log('▶ TEST 4: Full End-to-End Simulation (Draft ➔ ... ➔ Completed)');
  const simulation = simulateEndToEndLoanLifecycle({
    principal: 3000,
    interestRateMonthly: 1.2,
    termMonths: 6,
    currency: 'USD',
    interestType: 'reducing'
  });

  if (simulation.finalApplicationStatus !== 'DISBURSED') throw new Error('Expected final application status DISBURSED');
  if (simulation.finalLoanStatus !== 'COMPLETED') throw new Error('Expected final loan status COMPLETED');
  if (simulation.auditTrail.length !== 7) throw new Error(`Expected 7 audit stages, got ${simulation.auditTrail.length}`);

  simulation.auditTrail.forEach((step, idx) => {
    console.log(`  [${idx + 1}] ${step.stage}: ${step.details}`);
  });

  console.log('  ✓ Test 4 Passed! (Full 7-stage lifecycle completed successfully)\n');
  console.log('🎉 ALL LOAN LIFECYCLE STATE MACHINE TESTS PASSED CLEANLY!\n');
}

if (typeof require !== 'undefined' && require.main === module) {
  runLoanEngineTests();
  console.log('\n▶ Executing Prompt 3.1 Specific Test Cases:');
  const t1 = testUsdReducingSixMonths();
  console.log(`  ✓ ${t1.testName}: EMI = $${t1.monthlyInstallment}, Total Interest = $${t1.totalInterest}`);
  const t2 = testKhrFlatTwelveMonths();
  console.log(`  ✓ ${t2.testName}: Installment = ${t2.monthlyInstallment.toLocaleString()} KHR, Total Interest = ${t2.totalInterest.toLocaleString()} KHR`);
  console.log('\n');
  runLifecycleStateMachineTests();
}
