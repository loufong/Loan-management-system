import { z } from 'zod';
import { RepaymentFrequency } from '@prisma/client';

export const loanCalculatorInputSchema = z
  .object({
    principal: z
      .number({ required_error: 'Principal amount is required' })
      .positive('Principal amount must be greater than 0'),
    annualInterestRate: z
      .number()
      .nonnegative('Annual interest rate cannot be negative')
      .max(100, 'Annual interest rate cannot exceed 100%')
      .optional(),
    rate: z
      .number()
      .nonnegative('Rate cannot be negative')
      .max(100, 'Rate cannot exceed 100%')
      .optional(),
    termMonths: z
      .number()
      .int('Term must be a whole number of months')
      .positive('Term must be at least 1 month')
      .optional(),
    term: z
      .number()
      .int('Term must be a whole number of months')
      .positive('Term must be at least 1 month')
      .optional(),
    repaymentFrequency: z
      .nativeEnum(RepaymentFrequency)
      .optional(),
    frequency: z
      .enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY'])
      .optional(),
    interestMethod: z
      .enum(['SIMPLE_INTEREST', 'REDUCING_BALANCE', 'SIMPLE', 'AMORTIZED'])
      .optional(),
    method: z
      .enum(['SIMPLE', 'AMORTIZED', 'SIMPLE_INTEREST', 'REDUCING_BALANCE'])
      .optional(),
    calculationMethod: z
      .enum(['SIMPLE', 'AMORTIZED', 'SIMPLE_INTEREST', 'REDUCING_BALANCE'])
      .optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid startDate format (ISO or YYYY-MM-DD expected)'
      })
      .optional()
  })
  .refine(
    (data) => data.annualInterestRate !== undefined || data.rate !== undefined,
    {
      message: 'Either annualInterestRate or rate must be provided',
      path: ['annualInterestRate']
    }
  )
  .refine(
    (data) => data.termMonths !== undefined || data.term !== undefined,
    {
      message: 'Either termMonths or term must be provided',
      path: ['termMonths']
    }
  )
  .transform((data) => {
    const rawMethod = data.calculationMethod || data.method || data.interestMethod || 'SIMPLE_INTEREST';
    const interestMethod: 'SIMPLE_INTEREST' | 'REDUCING_BALANCE' =
      rawMethod === 'AMORTIZED' || rawMethod === 'REDUCING_BALANCE'
        ? 'REDUCING_BALANCE'
        : 'SIMPLE_INTEREST';

    const rawFreq = data.frequency || data.repaymentFrequency || 'MONTHLY';
    const repaymentFrequency: RepaymentFrequency =
      rawFreq === 'BIWEEKLY'
        ? RepaymentFrequency.BIWEEKLY
        : rawFreq === 'WEEKLY'
        ? RepaymentFrequency.WEEKLY
        : RepaymentFrequency.MONTHLY;

    return {
      principal: data.principal,
      annualInterestRate: (data.annualInterestRate !== undefined ? data.annualInterestRate : data.rate)!,
      termMonths: (data.termMonths !== undefined ? data.termMonths : data.term)!,
      repaymentFrequency,
      interestMethod,
      startDate: data.startDate
    };
  });

export type LoanCalculatorRequestInput = z.infer<typeof loanCalculatorInputSchema>;
