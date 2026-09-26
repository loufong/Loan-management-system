import { Request, Response, NextFunction } from 'express';
import { loanCalculatorInputSchema } from './calculator.validation';
import { LoanCalculatorService } from './loan-calculator.service';
import { sendSuccess } from '../../utils/response';

export class CalculatorController {
  static async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loanCalculatorInputSchema.parse(req.body);

      const result = LoanCalculatorService.calculateLoan({
        principal: validated.principal,
        annualInterestRate: validated.annualInterestRate,
        termMonths: validated.termMonths,
        repaymentFrequency: validated.repaymentFrequency,
        interestMethod: validated.interestMethod,
        startDate: validated.startDate
      });

      const method = result.interestMethod === 'REDUCING_BALANCE' ? 'AMORTIZED' : 'SIMPLE';
      sendSuccess(res, { ...result, method, calculationMethod: method }, 'Loan quote and amortization preview generated successfully');
    } catch (err) {
      next(err);
    }
  }
}
