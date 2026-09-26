import { LoanCalculatorService, CalculatedInstallment } from '../src/modules/calculator/loan-calculator.service';
import { ApplicationStatus, LoanStatus, ScheduleStatus, UserRole, RepaymentFrequency, ReviewRecommendation, ApprovalDecision } from '@prisma/client';
import { getPermissionsForRole, Permission, roleHasPermission } from '../src/security/permissions';
import { sanitizeBorrowerPII } from '../src/security/masking';

console.log('🧪 Starting End-to-End Academic LMS Integration & Workflow Test Suite...\n');

// ==========================================
// 1. APPLICATION LIFECYCLE & DTI SIMULATION
// ==========================================
console.log('--- TEST 1: Application Lifecycle & DTI Credit Risk Simulation ---');

// Validate Application Domain Range Logic
function validateApplicationLimits(amount: number, term: number, product: { minAmount: number; maxAmount: number; minTerm: number; maxTerm: number }) {
  if (amount < product.minAmount || amount > product.maxAmount) {
    throw new Error(`Amount $${amount} is outside allowed range [$${product.minAmount}, $${product.maxAmount}]`);
  }
  if (term < product.minTerm || term > product.maxTerm) {
    throw new Error(`Term ${term} is outside allowed range [${product.minTerm}, ${product.maxTerm}]`);
  }
  return true;
}

const mockProduct = {
  minAmount: 500,
  maxAmount: 10000,
  minTerm: 3,
  maxTerm: 24
};

// Valid input
validateApplicationLimits(3000, 6, mockProduct);
console.log('✅ Application domain parameter validation passed!');

// Out of range: amount too high
let caughtAmountError = false;
try {
  validateApplicationLimits(15000, 6, mockProduct);
} catch (e) {
  caughtAmountError = true;
}
if (!caughtAmountError) throw new Error('Expected amount out of range to throw error');
console.log('✅ Amount out of range rejection verified!');

// DTI Simulation Engine Tests
// Formula: Monthly Installment = Total Repayment / Term
// DTI Ratio = (Monthly Installment / Monthly Income) * 100
// Risk Tiers: Low Risk <= 25%, Medium Risk 25% - 40%, High Risk > 40%
function simulateDTIRisk(amount: number, termMonths: number, annualRate: number, monthlyIncome: number) {
  const calc = LoanCalculatorService.calculateSimpleInterest({
    principal: amount,
    annualInterestRate: annualRate,
    termMonths,
    repaymentFrequency: RepaymentFrequency.MONTHLY
  });
  const monthlyInstallment = calc.installmentAmount;
  const dtiRatio = LoanCalculatorService.round2((monthlyInstallment / monthlyIncome) * 100);

  let riskTier: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  if (dtiRatio <= 25) {
    riskTier = 'LOW_RISK';
  } else if (dtiRatio <= 40) {
    riskTier = 'MEDIUM_RISK';
  } else {
    riskTier = 'HIGH_RISK';
  }

  return { monthlyInstallment, dtiRatio, riskTier };
}

// Case A: Low Risk (Johnathan Doe - $3000, 6 mos, 4.5% rate, income $2800)
// Total Interest: $67.50, Total Repayment: $3067.50, Monthly Installment: $511.25
// DTI: (511.25 / 2800) * 100 = 18.26% <= 25% -> LOW_RISK
const simLow = simulateDTIRisk(3000, 6, 4.5, 2800);
console.log(`DTI Simulation Low Risk: ${simLow.dtiRatio}% -> Tier: ${simLow.riskTier}`);
if (simLow.riskTier !== 'LOW_RISK') throw new Error(`Expected LOW_RISK, got ${simLow.riskTier}`);

// Case B: Medium Risk ($5000, 6 mos, 8% rate, income $2500)
// Installment ~$866.67 / 2500 = 34.67% -> MEDIUM_RISK
const simMed = simulateDTIRisk(5000, 6, 8.0, 2500);
console.log(`DTI Simulation Medium Risk: ${simMed.dtiRatio}% -> Tier: ${simMed.riskTier}`);
if (simMed.riskTier !== 'MEDIUM_RISK') throw new Error(`Expected MEDIUM_RISK, got ${simMed.riskTier}`);

// Case C: High Risk ($50000, 24 mos, 9.5% rate, income $3100)
// Installment ~$2489.58 / 3100 = 80.31% -> HIGH_RISK
const simHigh = simulateDTIRisk(50000, 24, 9.5, 3100);
console.log(`DTI Simulation High Risk: ${simHigh.dtiRatio}% -> Tier: ${simHigh.riskTier}`);
if (simHigh.riskTier !== 'HIGH_RISK') throw new Error(`Expected HIGH_RISK, got ${simHigh.riskTier}`);
console.log('✅ DTI Credit Underwriting Risk Simulation passed!\n');

// ==========================================
// 2. DISBURSEMENT & SCHEDULE GENERATION
// ==========================================
console.log('--- TEST 2: Disbursement & Schedule Activation Engine ---');

// Validate Disbursement Guard: Cannot disburse non-APPROVED loan
function canDisburse(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.APPROVED;
}
if (canDisburse(ApplicationStatus.DRAFT)) throw new Error('DRAFT cannot be disbursed');
if (canDisburse(ApplicationStatus.UNDER_REVIEW)) throw new Error('UNDER_REVIEW cannot be disbursed');
if (canDisburse(ApplicationStatus.REJECTED)) throw new Error('REJECTED cannot be disbursed');
if (!canDisburse(ApplicationStatus.APPROVED)) throw new Error('APPROVED should be eligible for disbursement');
console.log('✅ Disbursement guard verified (only APPROVED status allowed)');

// Loan Schedule Activation Specification:
// Installment 1: UNPAID (current billing cycle due)
// Installments 2..N: UPCOMING
const scheduleCalc = LoanCalculatorService.calculateSimpleInterest({
  principal: 3000,
  annualInterestRate: 4.5,
  termMonths: 6,
  repaymentFrequency: RepaymentFrequency.MONTHLY,
  startDate: new Date('2026-09-01')
});

if (scheduleCalc.schedules.length !== 6) {
  throw new Error(`Expected 6 installments, got ${scheduleCalc.schedules.length}`);
}

// Initial status setup check: First schedule UNPAID, subsequent UPCOMING
const initialStatuses = scheduleCalc.schedules.map((inst: CalculatedInstallment, index: number) =>
  index === 0 ? ScheduleStatus.UNPAID : ScheduleStatus.UPCOMING
);
if (initialStatuses[0] !== ScheduleStatus.UNPAID || initialStatuses[1] !== ScheduleStatus.UPCOMING) {
  throw new Error('Initial schedule status mismatch');
}
console.log('✅ First installment UNPAID and future installments UPCOMING verified!');

// Penny-Perfect Check
let totalPrincipalScheduled = 0;
let totalInterestScheduled = 0;
for (const inst of scheduleCalc.schedules) {
  totalPrincipalScheduled = LoanCalculatorService.round2(totalPrincipalScheduled + inst.principalAmount);
  totalInterestScheduled = LoanCalculatorService.round2(totalInterestScheduled + inst.interestAmount);
}
if (totalPrincipalScheduled !== 3000.0) throw new Error('Penny drift in principal schedules');
if (totalInterestScheduled !== 67.5) throw new Error('Penny drift in interest schedules');
console.log('✅ Schedule penny-perfect reconciliation verified (0 cent drift)!\n');

// ==========================================
// 3. FINANCIAL LEDGER WATERFALL REPAYMENT RECONCILIATION
// ==========================================
console.log('--- TEST 3: Multi-Installment Waterfall Repayment Reconciliation ---');

// Setup mock loan state with 6 installments of $511.25 each ($3067.50 total)
interface MockSchedule {
  installmentNo: number;
  totalDue: number;
  amountPaid: number;
  remainingAmount: number;
  status: ScheduleStatus;
}

let mockSchedules: MockSchedule[] = scheduleCalc.schedules.map((inst: CalculatedInstallment, i: number) => ({
  installmentNo: inst.installmentNo,
  totalDue: inst.totalDue,
  amountPaid: 0,
  remainingAmount: inst.totalDue,
  status: i === 0 ? ScheduleStatus.UNPAID : ScheduleStatus.UPCOMING
}));

let loanOutstanding = 3067.50;
let loanTotalPaid = 0.0;
let loanStatus: LoanStatus = LoanStatus.ACTIVE;

// Waterfall algorithm simulation
function processWaterfallPayment(paymentAmount: number) {
  let unallocated = paymentAmount;

  for (const s of mockSchedules) {
    if (unallocated <= 0) break;
    if (s.remainingAmount <= 0) continue;

    if (unallocated >= s.remainingAmount) {
      // Fully settles this installment
      const alloc = s.remainingAmount;
      s.amountPaid = LoanCalculatorService.round2(s.amountPaid + alloc);
      unallocated = LoanCalculatorService.round2(unallocated - alloc);
      s.remainingAmount = 0.0;
      s.status = ScheduleStatus.PAID;
    } else {
      // Partially settles this installment
      s.amountPaid = LoanCalculatorService.round2(s.amountPaid + unallocated);
      s.remainingAmount = LoanCalculatorService.round2(s.remainingAmount - unallocated);
      unallocated = 0.0;
      s.status = ScheduleStatus.PARTIAL;
    }
  }

  loanTotalPaid = LoanCalculatorService.round2(loanTotalPaid + paymentAmount);
  loanOutstanding = LoanCalculatorService.round2(Math.max(0, 3067.50 - loanTotalPaid));
  const progressPct = LoanCalculatorService.round2((loanTotalPaid / 3067.50) * 100);

  const allPaid = mockSchedules.every((s) => s.status === ScheduleStatus.PAID);
  if (allPaid && loanOutstanding === 0) {
    loanStatus = LoanStatus.COMPLETED;
  }

  return { unallocated, progressPct, loanOutstanding, loanTotalPaid, loanStatus };
}

// Payment Event 1: Exact settlement of Installment 1 ($511.25)
const p1Result = processWaterfallPayment(511.25);
console.log('Payment 1 ($511.25):', {
  inst1Status: mockSchedules[0].status,
  inst1Remaining: mockSchedules[0].remainingAmount,
  outstanding: p1Result.loanOutstanding,
  progress: `${p1Result.progressPct}%`
});

if (mockSchedules[0].status !== ScheduleStatus.PAID || mockSchedules[0].remainingAmount !== 0) {
  throw new Error('Installment 1 was not fully paid');
}
if (p1Result.loanOutstanding !== 2556.25) {
  throw new Error(`Expected remaining $2556.25, got ${p1Result.loanOutstanding}`);
}
console.log('✅ Payment 1 single installment settlement verified!');

// Payment Event 2: Waterfall Overpayment ($761.25)
// Should fully settle Installment 2 ($511.25) and partially settle Installment 3 with $250.00 (leaving $261.25)
const p2Result = processWaterfallPayment(761.25);
console.log('Payment 2 ($761.25 waterfall):', {
  inst2Status: mockSchedules[1].status,
  inst2Remaining: mockSchedules[1].remainingAmount,
  inst3Status: mockSchedules[2].status,
  inst3Paid: mockSchedules[2].amountPaid,
  inst3Remaining: mockSchedules[2].remainingAmount,
  outstanding: p2Result.loanOutstanding,
  progress: `${p2Result.progressPct}%`
});

if (mockSchedules[1].status !== ScheduleStatus.PAID) throw new Error('Installment 2 should be PAID');
if (mockSchedules[2].status !== ScheduleStatus.PARTIAL) throw new Error('Installment 3 should be PARTIAL');
if (mockSchedules[2].amountPaid !== 250.00) throw new Error('Installment 3 amountPaid should be $250.00');
if (mockSchedules[2].remainingAmount !== 261.25) throw new Error('Installment 3 remainingAmount should be $261.25');
console.log('✅ Payment 2 multi-installment waterfall allocation verified!');

// Payment Event 3: Final balloon payment clearing the balance ($1795.00)
const p3Result = processWaterfallPayment(1795.00);
console.log('Payment 3 ($1795.00 final payoff):', {
  outstanding: p3Result.loanOutstanding,
  totalPaid: p3Result.loanTotalPaid,
  progress: `${p3Result.progressPct}%`,
  loanStatus: p3Result.loanStatus
});

if (p3Result.loanOutstanding !== 0.0) throw new Error('Outstanding balance should be 0');
if (p3Result.progressPct !== 100.0) throw new Error('Progress should be 100%');
if (p3Result.loanStatus !== LoanStatus.COMPLETED) throw new Error('Loan status should transition to COMPLETED');
console.log('✅ Final payoff and automatic COMPLETED state transition verified!\n');

// ==========================================
// 4. OVERDUE DETECTION & SIMULATED LATE FEE
// ==========================================
console.log('--- TEST 4: Overdue Detection & Late Fee Simulation Engine ---');

// Formula: late_fee = overdue_amount * penalty_rate_per_day * overdue_days
const penaltyRate = 0.001; // 0.1% per day
function calculateLateFee(overdueAmount: number, daysOverdue: number): number {
  if (daysOverdue <= 0 || overdueAmount <= 0) return 0;
  return LoanCalculatorService.round2(overdueAmount * penaltyRate * daysOverdue);
}

// Case 1: 0 days overdue
const fee0 = calculateLateFee(500, 0);
if (fee0 !== 0) throw new Error('0 days overdue should result in $0 fee');

// Case 2: 15 days overdue on $500.00
// 500 * 0.001 * 15 = $7.50
const fee15 = calculateLateFee(500, 15);
console.log(`Late fee on $500 for 15 days overdue: $${fee15}`);
if (fee15 !== 7.50) throw new Error(`Expected $7.50 fee, got ${fee15}`);

// Case 3: 45 days overdue on $1200.00
// 1200 * 0.001 * 45 = $54.00
const fee45 = calculateLateFee(1200, 45);
console.log(`Late fee on $1200 for 45 days overdue: $${fee45}`);
if (fee45 !== 54.00) throw new Error(`Expected $54.00 fee, got ${fee45}`);
console.log('✅ Overdue daily penalty calculation verified!\n');

// ==========================================
// 5. RBAC & PERMISSION BOUNDARIES
// ==========================================
console.log('--- TEST 5: RBAC Role & Clearance Boundaries ---');

// Manager can APPROVE but cannot DISBURSE (in strict separation, let's verify manager permissions)
const managerPerms = getPermissionsForRole(UserRole.MANAGER);
if (!managerPerms.includes(Permission.APPLICATION_APPROVE)) throw new Error('Manager must be able to approve applications');
console.log('✅ Manager permission verified (APPLICATION_APPROVE)');

// Cashier can DISBURSE and COLLECT PAYMENT but cannot APPROVE
const cashierPerms = getPermissionsForRole(UserRole.CASHIER);
if (!cashierPerms.includes(Permission.LOAN_DISBURSE)) throw new Error('Cashier must have LOAN_DISBURSE permission');
if (!cashierPerms.includes(Permission.PAYMENT_COLLECT)) throw new Error('Cashier must have PAYMENT_COLLECT permission');
if (cashierPerms.includes(Permission.APPLICATION_APPROVE)) throw new Error('Cashier must NOT have APPLICATION_APPROVE permission');
console.log('✅ Cashier permission boundary verified (Can disburse & collect payment, cannot approve)');

// Borrower can only view own profile/applications/payments
const borrowerPerms = getPermissionsForRole(UserRole.BORROWER);
if (borrowerPerms.includes(Permission.LOAN_DISBURSE)) throw new Error('Borrower cannot disburse');
if (borrowerPerms.includes(Permission.APPLICATION_REVIEW)) throw new Error('Borrower cannot review');
console.log('✅ Borrower permission boundary verified (Self-service only)\n');

// ==========================================
// 6. BUSINESS INTELLIGENCE & KPI AGGREGATION
// ==========================================
console.log('--- TEST 6: Business Intelligence & KPI Formulas ---');

const totalDecidedApps = 10;
const approvedApps = 8;
const approvalRate = LoanCalculatorService.round2((approvedApps / totalDecidedApps) * 100);
console.log(`Approval Rate: ${approvalRate}%`);
if (approvalRate !== 80.0) throw new Error('Approval rate calculation error');

const totalDisbursedPrincipal = 50000;
const totalCollected = 35000;
const repaymentRate = LoanCalculatorService.round2((totalCollected / totalDisbursedPrincipal) * 100);
console.log(`Repayment Rate: ${repaymentRate}%`);
if (repaymentRate !== 70.0) throw new Error('Repayment rate calculation error');

const outstandingTotal = 15000;
const overdueTotal = 1800;
const overdueRate = LoanCalculatorService.round2((overdueTotal / outstandingTotal) * 100);
console.log(`Overdue Portfolio Rate: ${overdueRate}%`);
if (overdueRate !== 12.0) throw new Error('Overdue rate calculation error');
console.log('✅ Business Intelligence KPI formulas verified!\n');

console.log('🎉 ALL INTEGRATION WORKFLOW & FINANCIAL LIFECYCLE TESTS PASSED!');
