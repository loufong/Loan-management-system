/**
 * Academic Loan Management System (LMS)
 * Core Domain Type Definitions & DTOs
 */

export interface LoanCalculationInput {
  principal: number;
  annualInterestRate: number; // e.g. 4.5 for 4.5%
  termMonths: number;
}

export interface LoanScheduleInstallment {
  installmentNo: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalDue: number;
  remainingBalance: number;
}

export interface LoanAmortizationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedules: LoanScheduleInstallment[];
}

/**
 * Calculates straight-line or simple reducing balance amortization schedule.
 */
export function calculateSimpleInterestLoanSchedule(
  input: LoanCalculationInput,
  startDate: Date = new Date()
): LoanAmortizationResult {
  const { principal, annualInterestRate, termMonths } = input;
  const totalInterest = Number((principal * (annualInterestRate / 100) * (termMonths / 12)).toFixed(2));
  const totalRepayment = Number((principal + totalInterest).toFixed(2));
  const monthlyPrincipal = Number((principal / termMonths).toFixed(2));
  const monthlyInterest = Number((totalInterest / termMonths).toFixed(2));
  const monthlyPayment = Number((monthlyPrincipal + monthlyInterest).toFixed(2));

  const schedules: LoanScheduleInstallment[] = [];
  let currentBalance = principal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast = i === termMonths;
    const pAmt = isLast ? Number((principal - monthlyPrincipal * (termMonths - 1)).toFixed(2)) : monthlyPrincipal;
    const iAmt = isLast ? Number((totalInterest - monthlyInterest * (termMonths - 1)).toFixed(2)) : monthlyInterest;
    const dueAmt = Number((pAmt + iAmt).toFixed(2));
    currentBalance = Number(Math.max(0, currentBalance - pAmt).toFixed(2));

    schedules.push({
      installmentNo: i,
      dueDate,
      principalAmount: pAmt,
      interestAmount: iAmt,
      totalDue: dueAmt,
      remainingBalance: currentBalance
    });
  }

  return {
    monthlyPayment,
    totalInterest,
    totalRepayment,
    schedules
  };
}
