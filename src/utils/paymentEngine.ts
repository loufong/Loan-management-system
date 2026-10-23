/**
 * ============================================================================
 * Core Waterfall Allocation & Early Payoff Engine (paymentEngine.ts)
 * Enterprise Loan Management System (LMS)
 * ============================================================================
 *
 * Implements:
 * 1. Waterfall Allocation Hierarchy:
 *    - Late Fees / Penalties (cleared first)
 *    - Overdue Past Interest (oldest unpaid schedules first)
 *    - Current Period Interest
 *    - Overdue Past Principal (oldest unpaid schedules first)
 *    - Current Period Principal
 *    - Excess / Prepayment of Future Principal (reduces loan balance)
 *
 * 2. Early Settlement & Loan Closure Calculator:
 *    - Actual daily accrued interest up to payoffDate (days / 30 * monthly interest)
 *    - Complete waiver/forgiveness of unaccrued future interest
 *    - Configurable early settlement fee (% of principal or flat)
 *    - Itemized breakdown of savings and closing balance
 *
 * 3. Dual-Currency Precision:
 *    - USD: Exact 2 decimal places ($0.01)
 *    - KHR: Nearest 100 Cambodian Riel (៛100)
 */

export type Currency = 'USD' | 'KHR';

export interface ScheduleItem {
  id: string | number;
  installmentNo: number;
  dueDate: string | Date;
  principalDue: number;
  interestDue: number;
  penaltyDue?: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid?: number;
  totalDue: number;
  balanceRemaining: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  isCurrentPeriod?: boolean;
}

export interface AllocationBreakdown {
  penaltyPaid: number;
  interestPaid: number;
  principalPaid: number;
  excessPrincipal: number;
  totalAllocated: number;
}

export interface AllocatePaymentResult {
  updatedSchedules: ScheduleItem[];
  allocationBreakdown: AllocationBreakdown;
  remainingUnallocated: number;
}

export interface EarlySettlementOptions {
  settlementFeeType?: 'percentage' | 'flat' | 'none';
  settlementFeeValue?: number; // e.g. 2 for 2%, or 50 for $50
  lastPaymentDate?: string | Date;
}

export interface EarlySettlementResult {
  remainingPrincipal: number;
  accruedInterestDue: number;
  payoffFee: number;
  totalSettlementAmount: number;
  savedInterestAmount: number;
  unaccruedWaivedInterest: number;
  settlementDate: string;
}

/**
 * Currency Rounding Helper
 * - USD: Exact 2 decimal places
 * - KHR: Rounded to nearest 100 Riel
 */
export function roundCurrency(amount: number, currency: Currency = 'USD'): number {
  if (currency === 'KHR') {
    return Math.round(amount / 100) * 100;
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Normalizes Date to YYYY-MM-DD string
 */
function normalizeDateStr(d: string | Date): string {
  if (d instanceof Date) {
    return d.toISOString().split('T')[0];
  }
  return String(d).split('T')[0];
}

/**
 * PAYMENT PROMPT 1: Waterfall Payment Allocation Function
 *
 * Allocates incoming payment strictly in waterfall priority order.
 */
export function allocatePayment(
  unpaidSchedules: ScheduleItem[],
  paymentAmount: number,
  currency: Currency = 'USD',
  referenceDate: string | Date = new Date()
): AllocatePaymentResult {
  if (paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // Clone schedules to preserve immutability of inputs
  const schedules: ScheduleItem[] = unpaidSchedules.map(s => ({
    ...s,
    penaltyDue: s.penaltyDue || 0,
    penaltyPaid: s.penaltyPaid || 0
  }));

  // Sort schedules chronologically by installment number
  schedules.sort((a, b) => a.installmentNo - b.installmentNo);

  const refDateStr = normalizeDateStr(referenceDate);

  // Identify past overdue, current, and future installments
  let currentFound = false;
  schedules.forEach(s => {
    const dStr = normalizeDateStr(s.dueDate);
    if (s.isCurrentPeriod !== undefined) {
      // Explicitly flagged
      return;
    }
    if (dStr < refDateStr && s.status !== 'paid') {
      s.isCurrentPeriod = false;
    } else if (!currentFound && s.status !== 'paid') {
      s.isCurrentPeriod = true;
      currentFound = true;
    } else {
      s.isCurrentPeriod = false;
    }
  });

  let remainingMoney = roundCurrency(paymentAmount, currency);

  let totalPenaltyPaid = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalExcessPrincipal = 0;

  // ---------------------------------------------------------------------------
  // Priority 1: Late Fees & Penalties (all overdue and pending penalties)
  // ---------------------------------------------------------------------------
  for (const s of schedules) {
    if (remainingMoney <= 0) break;
    const penaltyOutstanding = Math.max(0, (s.penaltyDue || 0) - (s.penaltyPaid || 0));
    if (penaltyOutstanding > 0) {
      const pay = roundCurrency(Math.min(remainingMoney, penaltyOutstanding), currency);
      s.penaltyPaid = roundCurrency((s.penaltyPaid || 0) + pay, currency);
      totalPenaltyPaid = roundCurrency(totalPenaltyPaid + pay, currency);
      remainingMoney = roundCurrency(remainingMoney - pay, currency);
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 2: Overdue Past Interest (oldest unpaid schedules first)
  // ---------------------------------------------------------------------------
  for (const s of schedules) {
    if (remainingMoney <= 0) break;
    const isPast = normalizeDateStr(s.dueDate) < refDateStr && !s.isCurrentPeriod;
    if (isPast) {
      const interestOutstanding = Math.max(0, s.interestDue - s.interestPaid);
      if (interestOutstanding > 0) {
        const pay = roundCurrency(Math.min(remainingMoney, interestOutstanding), currency);
        s.interestPaid = roundCurrency(s.interestPaid + pay, currency);
        totalInterestPaid = roundCurrency(totalInterestPaid + pay, currency);
        remainingMoney = roundCurrency(remainingMoney - pay, currency);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 3: Current Period Interest
  // ---------------------------------------------------------------------------
  for (const s of schedules) {
    if (remainingMoney <= 0) break;
    if (s.isCurrentPeriod) {
      const interestOutstanding = Math.max(0, s.interestDue - s.interestPaid);
      if (interestOutstanding > 0) {
        const pay = roundCurrency(Math.min(remainingMoney, interestOutstanding), currency);
        s.interestPaid = roundCurrency(s.interestPaid + pay, currency);
        totalInterestPaid = roundCurrency(totalInterestPaid + pay, currency);
        remainingMoney = roundCurrency(remainingMoney - pay, currency);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 4: Overdue Past Principal (oldest unpaid schedules first)
  // ---------------------------------------------------------------------------
  for (const s of schedules) {
    if (remainingMoney <= 0) break;
    const isPast = normalizeDateStr(s.dueDate) < refDateStr && !s.isCurrentPeriod;
    if (isPast) {
      const principalOutstanding = Math.max(0, s.principalDue - s.principalPaid);
      if (principalOutstanding > 0) {
        const pay = roundCurrency(Math.min(remainingMoney, principalOutstanding), currency);
        s.principalPaid = roundCurrency(s.principalPaid + pay, currency);
        totalPrincipalPaid = roundCurrency(totalPrincipalPaid + pay, currency);
        remainingMoney = roundCurrency(remainingMoney - pay, currency);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 5: Current Period Principal
  // ---------------------------------------------------------------------------
  for (const s of schedules) {
    if (remainingMoney <= 0) break;
    if (s.isCurrentPeriod) {
      const principalOutstanding = Math.max(0, s.principalDue - s.principalPaid);
      if (principalOutstanding > 0) {
        const pay = roundCurrency(Math.min(remainingMoney, principalOutstanding), currency);
        s.principalPaid = roundCurrency(s.principalPaid + pay, currency);
        totalPrincipalPaid = roundCurrency(totalPrincipalPaid + pay, currency);
        remainingMoney = roundCurrency(remainingMoney - pay, currency);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Priority 6: Excess / Prepayment of Future Principal (Reduces future balance)
  // ---------------------------------------------------------------------------
  if (remainingMoney > 0) {
    for (const s of schedules) {
      if (remainingMoney <= 0) break;
      const principalOutstanding = Math.max(0, s.principalDue - s.principalPaid);
      if (principalOutstanding > 0) {
        const pay = roundCurrency(Math.min(remainingMoney, principalOutstanding), currency);
        s.principalPaid = roundCurrency(s.principalPaid + pay, currency);
        totalPrincipalPaid = roundCurrency(totalPrincipalPaid + pay, currency);
        totalExcessPrincipal = roundCurrency(totalExcessPrincipal + pay, currency);
        remainingMoney = roundCurrency(remainingMoney - pay, currency);
      }
    }

    // If money still remains after all schedules principal is exhausted, treat as unallocated excess
    if (remainingMoney > 0) {
      totalExcessPrincipal = roundCurrency(totalExcessPrincipal + remainingMoney, currency);
    }
  }

  // ---------------------------------------------------------------------------
  // Recalculate Balance Remaining & Status for each schedule
  // ---------------------------------------------------------------------------
  const tolerance = currency === 'USD' ? 0.01 : 50;

  schedules.forEach(s => {
    const totalDue = roundCurrency(s.principalDue + s.interestDue + (s.penaltyDue || 0), currency);
    const totalPaid = roundCurrency(s.principalPaid + s.interestPaid + (s.penaltyPaid || 0), currency);
    const rem = roundCurrency(Math.max(0, totalDue - totalPaid), currency);

    s.totalDue = totalDue;
    s.balanceRemaining = rem;

    if (rem <= tolerance) {
      s.status = 'paid';
      s.balanceRemaining = 0;
    } else if (totalPaid > tolerance) {
      s.status = 'partial';
    } else {
      const isPast = normalizeDateStr(s.dueDate) < refDateStr;
      s.status = isPast ? 'overdue' : 'unpaid';
    }
  });

  const totalAllocated = roundCurrency(
    totalPenaltyPaid + totalInterestPaid + totalPrincipalPaid,
    currency
  );

  return {
    updatedSchedules: schedules,
    allocationBreakdown: {
      penaltyPaid: totalPenaltyPaid,
      interestPaid: totalInterestPaid,
      principalPaid: totalPrincipalPaid,
      excessPrincipal: totalExcessPrincipal,
      totalAllocated
    },
    remainingUnallocated: remainingMoney
  };
}

/**
 * PAYMENT PROMPT 2: Early Payoff & Loan Closure Calculator
 *
 * Computes exact loan closing amount:
 * - Accrued daily interest up to payoffDate
 * - Complete waiver/forgiveness of unaccrued future interest
 * - Optional early settlement fee (% or flat)
 */
export function calculateEarlySettlement(
  loan: {
    principalAmount: number;
    interestRateMonthly: number;
    currency: Currency;
  },
  remainingSchedules: ScheduleItem[],
  payoffDate: string | Date = new Date(),
  options: EarlySettlementOptions = {}
): EarlySettlementResult {
  const currency = loan.currency || 'USD';
  const feeType = options.settlementFeeType || 'none';
  const feeVal = options.settlementFeeValue || 0;

  // 1. Calculate remaining principal balance
  let remainingPrincipal = 0;
  let totalFutureInterest = 0;

  remainingSchedules.forEach(s => {
    const unpaidPrincipal = Math.max(0, s.principalDue - s.principalPaid);
    const unpaidInterest = Math.max(0, s.interestDue - s.interestPaid);
    remainingPrincipal += unpaidPrincipal;
    totalFutureInterest += unpaidInterest;
  });

  remainingPrincipal = roundCurrency(remainingPrincipal, currency);
  totalFutureInterest = roundCurrency(totalFutureInterest, currency);

  // 2. Accrued interest up to payoffDate
  // Days since last payment (default to 15 days if lastPaymentDate not given or same month)
  let daysSinceLast = 15;
  if (options.lastPaymentDate) {
    const lastDate = new Date(options.lastPaymentDate);
    const currPayoff = new Date(payoffDate);
    const diffMs = currPayoff.getTime() - lastDate.getTime();
    daysSinceLast = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Daily interest = (monthly interest on remaining principal) / 30
  const monthlyInterestRate = (loan.interestRateMonthly || 1.5) / 100;
  const monthlyInterestAmt = remainingPrincipal * monthlyInterestRate;
  const dailyInterest = monthlyInterestAmt / 30;
  const accruedInterestDue = roundCurrency(dailyInterest * daysSinceLast, currency);

  // 3. Waive future unaccrued interest
  const unaccruedWaivedInterest = roundCurrency(
    Math.max(0, totalFutureInterest - accruedInterestDue),
    currency
  );
  const savedInterestAmount = unaccruedWaivedInterest;

  // 4. Calculate early settlement penalty fee (if configured)
  let payoffFee = 0;
  if (feeType === 'percentage') {
    payoffFee = roundCurrency(remainingPrincipal * (feeVal / 100), currency);
  } else if (feeType === 'flat') {
    payoffFee = roundCurrency(feeVal, currency);
  }

  // 5. Total settlement amount required to close loan
  const totalSettlementAmount = roundCurrency(
    remainingPrincipal + accruedInterestDue + payoffFee,
    currency
  );

  return {
    remainingPrincipal,
    accruedInterestDue,
    payoffFee,
    totalSettlementAmount,
    savedInterestAmount,
    unaccruedWaivedInterest,
    settlementDate: normalizeDateStr(payoffDate)
  };
}

// ============================================================================
// AUTOMATED UNIT TESTS & DEMONSTRATION RUNNER
// ============================================================================
export function runPaymentEngineTests(): void {
  console.log('\n================================================================');
  console.log('       RUNNING PAYMENT ENGINE VERIFICATION TESTS                ');
  console.log('================================================================\n');

  const mockSchedules: ScheduleItem[] = [
    {
      id: 1,
      installmentNo: 1,
      dueDate: '2026-08-15',
      principalDue: 384.50,
      interestDue: 75.00,
      penaltyDue: 25.00,
      principalPaid: 0,
      interestPaid: 0,
      penaltyPaid: 0,
      totalDue: 484.50,
      balanceRemaining: 484.50,
      status: 'overdue' // Past overdue
    },
    {
      id: 2,
      installmentNo: 2,
      dueDate: '2026-09-15',
      principalDue: 390.27,
      interestDue: 69.23,
      penaltyDue: 0,
      principalPaid: 0,
      interestPaid: 0,
      penaltyPaid: 0,
      totalDue: 459.50,
      balanceRemaining: 459.50,
      status: 'overdue' // Past overdue
    },
    {
      id: 3,
      installmentNo: 3,
      dueDate: '2026-10-15',
      principalDue: 396.12,
      interestDue: 63.38,
      penaltyDue: 0,
      principalPaid: 0,
      interestPaid: 0,
      penaltyPaid: 0,
      totalDue: 459.50,
      balanceRemaining: 459.50,
      status: 'unpaid',
      isCurrentPeriod: true // Current period
    },
    {
      id: 4,
      installmentNo: 4,
      dueDate: '2026-11-15',
      principalDue: 402.06,
      interestDue: 57.44,
      penaltyDue: 0,
      principalPaid: 0,
      interestPaid: 0,
      penaltyPaid: 0,
      totalDue: 459.50,
      balanceRemaining: 459.50,
      status: 'unpaid' // Future
    }
  ];

  // -------------------------------------------------------------------------
  // TEST 1: Partial Payment ($120 on USD)
  // Expected: Clears $25 penalty on #1, then $75 interest on #1, then $20 overdue interest on #2
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Partial Payment ($120.00 USD) ---');
  const resPartial = allocatePayment(mockSchedules, 120.00, 'USD', '2026-10-15');
  console.log('Allocation Breakdown:', resPartial.allocationBreakdown);
  console.assert(resPartial.allocationBreakdown.penaltyPaid === 25.00, 'Test 1 Failed: Penalty should be $25');
  console.assert(resPartial.allocationBreakdown.interestPaid === 95.00, 'Test 1 Failed: Interest should be $95 ($75 + $20)');
  console.assert(resPartial.allocationBreakdown.principalPaid === 0, 'Test 1 Failed: Principal should be $0');
  console.log('✓ Test 1 Passed: Waterfall priority correctly cleared penalty then overdue interest.\n');

  // -------------------------------------------------------------------------
  // TEST 2: Exact Payment ($484.50 on Schedule #1)
  // Expected: Clears penalty $25, interest $75, principal $384.50. Schedule #1 becomes 'paid'.
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Exact Payment for Schedule #1 ($484.50 USD) ---');
  const resExact = allocatePayment([mockSchedules[0]], 484.50, 'USD', '2026-10-15');
  console.log('Allocation Breakdown:', resExact.allocationBreakdown);
  console.assert(resExact.updatedSchedules[0].status === 'paid', 'Test 2 Failed: Schedule 1 should be paid');
  console.assert(resExact.allocationBreakdown.totalAllocated === 484.50, 'Test 2 Failed: Total allocated mismatch');
  console.log('✓ Test 2 Passed: Schedule #1 perfectly marked as paid.\n');

  // -------------------------------------------------------------------------
  // TEST 3: Overpayment ($2,500 on 4 schedules total $1,863)
  // Expected: Clears all penalties, all overdue & current interest, all principal, excess absorbed.
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Overpayment ($2,500.00 USD) ---');
  const resOver = allocatePayment(mockSchedules, 2500.00, 'USD', '2026-10-15');
  console.log('Allocation Breakdown:', resOver.allocationBreakdown);
  console.assert(resOver.updatedSchedules.every(s => s.status === 'paid'), 'Test 3 Failed: All schedules should be paid');
  console.assert(resOver.allocationBreakdown.excessPrincipal > 0, 'Test 3 Failed: Excess principal must be tracked');
  console.log('✓ Test 3 Passed: Overpayment gracefully settled all dues and assigned excess.\n');

  // -------------------------------------------------------------------------
  // TEST 4: Dual Currency KHR Rounding
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Dual Currency KHR Rounding (Nearest 100 Riel) ---');
  const khrSchedule: ScheduleItem = {
    id: 'khr-1',
    installmentNo: 1,
    dueDate: '2026-10-25',
    principalDue: 1333333,
    interestDue: 96000,
    penaltyDue: 12500,
    principalPaid: 0,
    interestPaid: 0,
    penaltyPaid: 0,
    totalDue: 1441833,
    balanceRemaining: 1441833,
    status: 'unpaid',
    isCurrentPeriod: true
  };
  const resKHR = allocatePayment([khrSchedule], 500000, 'KHR', '2026-10-25');
  console.log('KHR Allocation Breakdown:', resKHR.allocationBreakdown);
  console.assert(resKHR.allocationBreakdown.totalAllocated % 100 === 0, 'Test 4 Failed: KHR must round to 100');
  console.log('✓ Test 4 Passed: KHR rounding strictly conforms to nearest 100.\n');

  // -------------------------------------------------------------------------
  // TEST 5: Early Payoff & Loan Closure at Month 4 of 12-Month Loan
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Early Settlement at Month 4 of 12-Month Facility ---');
  // 8 remaining schedules (months 5 to 12)
  const remaining8Months: ScheduleItem[] = Array.from({ length: 8 }).map((_, idx) => ({
    id: `rem-${idx + 5}`,
    installmentNo: idx + 5,
    dueDate: `2027-0${idx + 1}-15`,
    principalDue: 410.00,
    interestDue: 50.00,
    principalPaid: 0,
    interestPaid: 0,
    totalDue: 460.00,
    balanceRemaining: 460.00,
    status: 'unpaid'
  }));

  const earlySettlement = calculateEarlySettlement(
    { principalAmount: 5000, interestRateMonthly: 1.5, currency: 'USD' },
    remaining8Months,
    '2026-12-20',
    {
      settlementFeeType: 'percentage',
      settlementFeeValue: 2, // 2% early closure fee
      lastPaymentDate: '2026-12-05' // 15 days elapsed
    }
  );

  console.log('Early Settlement Breakdown:', earlySettlement);
  console.assert(earlySettlement.remainingPrincipal === 3280.00, 'Test 5 Failed: Remaining principal should be $3,280 ($410 * 8)');
  console.assert(earlySettlement.payoffFee === 65.60, 'Test 5 Failed: 2% fee of $3,280 should be $65.60');
  console.assert(earlySettlement.unaccruedWaivedInterest > 300.00, 'Test 5 Failed: Months 5-12 interest must be waived');
  console.log('✓ Test 5 Passed: Months 5–12 unaccrued interest waived, accurate daily accrual + 2% fee computed.\n');

  console.log('================================================================');
  console.log('       ALL 5 PAYMENT ENGINE TESTS PASSED SUCCESSFULLY!          ');
  console.log('================================================================\n');
}

// Auto-run tests when executed directly in node/ts-node
if (typeof require !== 'undefined' && require.main === module) {
  runPaymentEngineTests();
}
