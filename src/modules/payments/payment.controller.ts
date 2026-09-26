import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { PaymentMethod } from '@prisma/client';

const recordPaymentSchema = z
  .object({
    loanId: z.string().min(1, 'Loan ID or Loan Number is required'),
    installmentId: z.string().optional(),
    amount: z.number().positive('Payment amount must be greater than 0').optional(),
    paymentAmount: z.number().positive('Payment amount must be greater than 0').optional(),
    paymentMethod: z.preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase().replace(/\s+/g, '_') : val),
      z.nativeEnum(PaymentMethod)
    ),
    referenceNo: z.string().min(3, 'Reference number is required'),
    paymentDate: z.string().optional(),
    notes: z.string().optional()
  })
  .refine((data) => data.paymentAmount !== undefined || data.amount !== undefined, {
    message: 'Payment amount is required (paymentAmount or amount)',
    path: ['paymentAmount']
  });

const queryPaymentSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  receiptNo: z.string().trim().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  borrowerId: z.string().optional()
});

export class PaymentController {
  static async record(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = recordPaymentSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const amount = (validated.paymentAmount !== undefined ? validated.paymentAmount : validated.amount)!;
      const result = await PaymentService.recordPayment({
        ...validated,
        amount,
        paymentAmount: amount,
        receivedById: req.user!.id,
        ipAddress
      });
      sendSuccess(res, result, 'Payment recorded and loan schedule reconciled successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = queryPaymentSchema.parse(req.query);
      const result = await PaymentService.listPayments(filters, req.user!);
      sendSuccess(res, result.items, 'Payments retrieved successfully', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = req.params.id || req.params.receiptNo;
      const receipt = await PaymentService.getReceipt(identifier, req.user!);
      sendSuccess(res, receipt, 'Official payment receipt retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
