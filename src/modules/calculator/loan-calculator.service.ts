import { RepaymentFrequency, ScheduleStatus } from '@prisma/client';

export type InterestMethod = 'SIMPLE_INTEREST' | 'REDUCING_BALANCE';

export interface LoanCalculationInput {
  principal: number;
  annualInterestRate: number; // e.g. 8.5 for 8.5%
  termMonths: number;
  repaymentFrequency?: RepaymentFrequency; // Defaults to MONTHLY
  interestMethod?: InterestMethod; // Defaults to SIMPLE_INTEREST
  startDate?: Date | string; // Defaults to now
}

export interface CalculatedInstallment {
  installmentNo: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalDue: number;
  remainingBalance: number;
  status: ScheduleStatus;
}

export interface LoanCalculationSummary {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  repaymentFrequency: RepaymentFrequency;
  interestMethod: InterestMethod;
  installmentCount: number;
  installmentAmount: number;
  totalInterest: number;
  totalRepayment: number;
  startDate: Date;
  maturityDate: Date;
  schedules: CalculatedInstallment[];
}

export class LoanCalculatorService {
  /**
   * Helper to round monetary amounts to exactly 2 decimal places
   */
  public static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Determine the number of payment periods per year and calculate total installments N
   */
  public static getInstallmentCount(termMonths: number, frequency: RepaymentFrequency): number {
    switch (frequency) {
      case RepaymentFrequency.WEEKLY:
        return Math.max(1, Math.round((termMonths * 52) / 12));
      case RepaymentFrequency.BIWEEKLY:
        return Math.max(1, Math.round((termMonths * 26) / 12));
      case RepaymentFrequency.MONTHLY:
      default:
        return Math.max(1, termMonths);
    }
  }

  /**
   * Calculate subsequent installment due date based on repayment frequency
   */
  public static calculateDueDate(
    startDate: Date,
    installmentIndex: number,
    frequency: RepaymentFrequency
  ): Date {
    const dueDate = new Date(startDate.getTime());

    switch (frequency) {
      case RepaymentFrequency.WEEKLY:
        dueDate.setDate(dueDate.getDate() + installmentIndex * 7);
        break;
      case RepaymentFrequency.BIWEEKLY:
        dueDate.setDate(dueDate.getDate() + installmentIndex * 14);
        break;
      case RepaymentFrequency.MONTHLY:
      default:
        dueDate.setMonth(dueDate.getMonth() + installmentIndex);
        break;
    }

    return dueDate;
  }

  /**
   * 1. Simple Interest Calculation & Schedule Generator
   * Formula: Total Interest = Principal * (Annual Rate / 100) * (Term in Months / 12)
   */
  public static calculateSimpleInterest(input: LoanCalculationInput): LoanCalculationSummary {
    const principal = this.round2(input.principal);
    const annualRate = input.annualInterestRate;
    const termMonths = input.termMonths;
    const frequency = input.repaymentFrequency || RepaymentFrequency.MONTHLY;
    const startDate = input.startDate ? new Date(input.startDate) : new Date();

    const N = this.getInstallmentCount(termMonths, frequency);

    // Simple Interest Formula
    const totalInterest = this.round2(principal * (annualRate / 100) * (termMonths / 12));
    const totalRepayment = this.round2(principal + totalInterest);
    const installmentAmount = this.round2(totalRepayment / N);

    const basePrincipal = this.round2(principal / N);
    const baseInterest = this.round2(totalInterest / N);

    const schedules: CalculatedInstallment[] = [];
    let accumulatedPrincipal = 0;
    let accumulatedInterest = 0;
    let currentBalance = principal;

    for (let i = 1; i <= N; i++) {
      const isLast = i === N;
      const dueDate = this.calculateDueDate(startDate, i, frequency);

      let pAmt: number;
      let iAmt: number;

      if (isLast) {
        // Penny-perfect reconciliation on final installment to eliminate rounding drift
        pAmt = this.round2(principal - accumulatedPrincipal);
        iAmt = this.round2(totalInterest - accumulatedInterest);
      } else {
        pAmt = basePrincipal;
        iAmt = baseInterest;
        accumulatedPrincipal = this.round2(accumulatedPrincipal + pAmt);
        accumulatedInterest = this.round2(accumulatedInterest + iAmt);
      }

      const totalDue = this.round2(pAmt + iAmt);
      currentBalance = isLast ? 0.0 : this.round2(Math.max(0, currentBalance - pAmt));

      schedules.push({
        installmentNo: i,
        dueDate,
        principalAmount: pAmt,
        interestAmount: iAmt,
        totalDue,
        remainingBalance: currentBalance,
        status: ScheduleStatus.UPCOMING
      });
    }

    const maturityDate = schedules.length > 0 ? schedules[schedules.length - 1].dueDate : startDate;

    return {
      principal,
      annualInterestRate: annualRate,
      termMonths,
      repaymentFrequency: frequency,
      interestMethod: 'SIMPLE_INTEREST',
      installmentCount: N,
      installmentAmount,
      totalInterest,
      totalRepayment,
      startDate,
      maturityDate,
      schedules
    };
  }

  /**
   * 2. Reducing Balance / Amortization Calculation (Equated Monthly Installment - EMI)
   * Formula: EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
   */
  public static calculateReducingBalance(input: LoanCalculationInput): LoanCalculationSummary {
    const principal = this.round2(input.principal);
    const annualRate = input.annualInterestRate;
    const termMonths = input.termMonths;
    const frequency = input.repaymentFrequency || RepaymentFrequency.MONTHLY;
    const startDate = input.startDate ? new Date(input.startDate) : new Date();

    const N = this.getInstallmentCount(termMonths, frequency);

    // Number of periods per year
    let periodsPerYear = 12;
    if (frequency === RepaymentFrequency.BIWEEKLY) periodsPerYear = 26;
    if (frequency === RepaymentFrequency.WEEKLY) periodsPerYear = 52;

    const periodicRate = (annualRate / 100) / periodsPerYear;

    let emi: number;
    if (periodicRate === 0 || annualRate === 0) {
      emi = this.round2(principal / N);
    } else {
      const factor = Math.pow(1 + periodicRate, N);
      emi = this.round2((principal * periodicRate * factor) / (factor - 1));
    }

    const schedules: CalculatedInstallment[] = [];
    let currentBalance = principal;
    let sumInterest = 0;
    let sumPrincipal = 0;

    for (let i = 1; i <= N; i++) {
      const isLast = i === N;
      const dueDate = this.calculateDueDate(startDate, i, frequency);

      let iAmt = this.round2(currentBalance * periodicRate);
      let pAmt: number;

      if (isLast) {
        // Last installment clears all remaining principal
        pAmt = currentBalance;
        currentBalance = 0.0;
      } else {
        pAmt = this.round2(emi - iAmt);
        if (pAmt > currentBalance) {
          pAmt = currentBalance;
        }
        currentBalance = this.round2(Math.max(0, currentBalance - pAmt));
      }

      const totalDue = this.round2(pAmt + iAmt);
      sumInterest = this.round2(sumInterest + iAmt);
      sumPrincipal = this.round2(sumPrincipal + pAmt);

      schedules.push({
        installmentNo: i,
        dueDate,
        principalAmount: pAmt,
        interestAmount: iAmt,
        totalDue,
        remainingBalance: currentBalance,
        status: ScheduleStatus.UPCOMING
      });
    }

    const totalInterest = sumInterest;
    const totalRepayment = this.round2(principal + totalInterest);
    const maturityDate = schedules.length > 0 ? schedules[schedules.length - 1].dueDate : startDate;

    return {
      principal,
      annualInterestRate: annualRate,
      termMonths,
      repaymentFrequency: frequency,
      interestMethod: 'REDUCING_BALANCE',
      installmentCount: N,
      installmentAmount: emi,
      totalInterest,
      totalRepayment,
      startDate,
      maturityDate,
      schedules
    };
  }

  /**
   * 3. Unified Dispatcher / Schedule Generator Function
   */
  public static calculateLoan(input: LoanCalculationInput): LoanCalculationSummary {
    const method = input.interestMethod || 'SIMPLE_INTEREST';
    if (method === 'REDUCING_BALANCE') {
      return this.calculateReducingBalance(input);
    }
    return this.calculateSimpleInterest(input);
  }
}
