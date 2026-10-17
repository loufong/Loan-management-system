import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { PaymentMethod } from '@prisma/client';

function normalizeMethod(val: any): PaymentMethod {
  if (typeof val === 'string') {
    const clean = val.toUpperCase().replace(/[\s-]+/g, '_');
    if (clean === 'BANK_TRANSFER' || clean === 'TRANSFER' || clean === 'WIRE') return PaymentMethod.BANK_TRANSFER;
    if (clean === 'CARD' || clean === 'CREDIT_CARD' || clean === 'DEBIT_CARD') return PaymentMethod.CARD;
    if (clean === 'QR' || clean === 'QR_PAYMENT' || clean === 'DYNAMIC_QR_CODE' || clean === 'KHQR') return PaymentMethod.QR_PAYMENT;
    if (clean === 'CASH') return PaymentMethod.CASH;
  }
  return val as PaymentMethod;
}

const recordPaymentSchema = z
  .object({
    loanId: z.string().min(1, 'Loan ID or Loan Number is required'),
    installmentId: z.string().optional(),
    amount: z.number().positive('Payment amount must be greater than 0').optional(),
    paymentAmount: z.number().positive('Payment amount must be greater than 0').optional(),
    paymentMethod: z.preprocess(normalizeMethod, z.nativeEnum(PaymentMethod)),
    referenceNo: z.string().min(3, 'Reference number is required').optional(),
    transactionRef: z.string().min(3).optional(),
    idempotencyKey: z.string().optional(),
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
  paymentMethod: z.preprocess(normalizeMethod, z.nativeEnum(PaymentMethod).optional()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  borrowerId: z.string().optional()
});

export class PaymentController {
  /**
   * POST /api/v1/payments
   * Records payment and performs ACID waterfall reconciliation.
   * Both USER (paying own loan) and ADMIN can record payments.
   */
  static async record(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = recordPaymentSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const idempotencyKey = (
        req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key'] ||
        validated.idempotencyKey ||
        req.body.idempotencyKey
      ) as string | undefined;

      const amount = (validated.paymentAmount !== undefined ? validated.paymentAmount : validated.amount)!;
      const referenceNo = validated.referenceNo || validated.transactionRef;

      const result = await PaymentService.recordPayment({
        ...validated,
        referenceNo,
        amount,
        paymentAmount: amount,
        receivedById: req.user!.id,
        caller: req.user!,
        ipAddress,
        idempotencyKey
      });

      sendSuccess(
        res,
        result,
        (result as any).message || 'Payment recorded and loan schedule reconciled successfully',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments
   * Lists payments (ADMIN sees all, USER sees only their own).
   */
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = queryPaymentSchema.parse(req.query);
      const result = await PaymentService.listPayments(filters as any, req.user!);
      sendSuccess(res, result.items, 'Payments retrieved successfully', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/:id
   * Retrieves single payment details with ownership verification.
   */
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await PaymentService.getPaymentById(req.params.id, req.user!);
      sendSuccess(res, payment, 'Payment details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/loan/:loanId or /api/v1/loans/:id/payments
   * Retrieves payments for a specific loan facility.
   */
  static async listByLoan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanId = req.params.loanId || req.params.id;
      const payments = await PaymentService.listPaymentsByLoan(loanId, req.user!);
      sendSuccess(res, payments, 'Loan payment history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/:id/receipt or /api/v1/payments/receipt/:receiptNo
   * Retrieves formatted official banking receipt.
   */
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
