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

  const schedules: ScheduleItem[] = unpaidSchedules.map(s => ({
    ...s,
    penaltyDue: s.penaltyDue || 0,
    penaltyPaid: s.penaltyPaid || 0
  }));

  schedules.sort((a, b) => a.installmentNo - b.installmentNo);

  const refDateStr = normalizeDateStr(referenceDate);

  let currentFound = false;
  schedules.forEach(s => {
    const dStr = normalizeDateStr(s.dueDate);
    if (s.isCurrentPeriod !== undefined) {
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

  // 1. Penalties
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

  // 2. Overdue Past Interest
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

  // 3. Current Period Interest
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

  // 4. Overdue Past Principal
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

  // 5. Current Period Principal
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

  // 6. Excess / Prepayment of Future Principal
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

    if (remainingMoney > 0) {
      totalExcessPrincipal = roundCurrency(totalExcessPrincipal + remainingMoney, currency);
    }
  }

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

  let daysSinceLast = 15;
  if (options.lastPaymentDate) {
    const lastDate = new Date(options.lastPaymentDate);
    const currPayoff = new Date(payoffDate);
    const diffMs = currPayoff.getTime() - lastDate.getTime();
    daysSinceLast = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const monthlyInterestRate = (loan.interestRateMonthly || 1.5) / 100;
  const monthlyInterestAmt = remainingPrincipal * monthlyInterestRate;
  const dailyInterest = monthlyInterestAmt / 30;
  const accruedInterestDue = roundCurrency(dailyInterest * daysSinceLast, currency);

  const unaccruedWaivedInterest = roundCurrency(
    Math.max(0, totalFutureInterest - accruedInterestDue),
    currency
  );
  const savedInterestAmount = unaccruedWaivedInterest;

  let payoffFee = 0;
  if (feeType === 'percentage') {
    payoffFee = roundCurrency(remainingPrincipal * (feeVal / 100), currency);
  } else if (feeType === 'flat') {
    payoffFee = roundCurrency(feeVal, currency);
  }

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

export default {
  allocatePayment,
  calculateEarlySettlement,
  roundCurrency
};
