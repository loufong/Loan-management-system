import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoanService } from './loan.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { LoanStatus, DisbursementMethod } from '@prisma/client';

const disburseSchema = z.object({
  paymentMethod: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase().replace(/\s+/g, '_') : val),
    z.nativeEnum(DisbursementMethod)
  ),
  referenceNo: z.string().min(3, 'Reference number is required'),
  notes: z.string().optional(),
  disbursementDate: z.string().optional()
});

export class LoanController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as LoanStatus | undefined,
        borrower: (req.query.borrower || req.query.borrowerId) as string | undefined,
        loanNumber: (req.query.loanNumber || req.query.loan_number) as string | undefined
      };
      const loans = await LoanService.listLoans(req.user!, filters);
      sendSuccess(res, loans, 'Loans retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const loan = await LoanService.getLoanById(req.params.id, req.user!);
      sendSuccess(res, loan, 'Loan details retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getSchedules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const schedules = await LoanService.getLoanSchedules(req.params.id, req.user!);
      sendSuccess(res, schedules, 'Loan repayment schedules retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async disburse(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = disburseSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const targetId = req.params.applicationId || req.params.id;
      const result = await LoanService.disburseLoan({
        loanId: targetId,
        disbursedById: req.user!.id,
        ...validated,
        ipAddress
      });
      sendSuccess(res, result, 'Loan successfully disbursed and repayment schedule activated', 201);
    } catch (err) {
      next(err);
    }
  }

  static async listDisbursements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const disbursements = await LoanService.listDisbursements();
      sendSuccess(res, disbursements, 'Disbursements retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
