import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { BakongService } from './bakong.service';
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
    installmentNo: z.coerce.number().int().positive().optional(),
    amount: z.number().positive('Payment amount must be greater than 0').optional(),
    paymentAmount: z.number().positive('Payment amount must be greater than 0').optional(),
    paymentMethod: z.preprocess(normalizeMethod, z.nativeEnum(PaymentMethod).optional()).optional(),
    referenceNo: z.string().min(3, 'Reference number is required').optional(),
    transactionRef: z.string().min(3).optional(),
    idempotencyKey: z.string().optional(),
    paymentDate: z.string().optional(),
    notes: z.string().optional(),
    currency: z.enum(['USD', 'KHR']).optional()
  });

const initiateKhqrSchema = z.object({
  loanId: z.string().min(1, 'Loan ID or Loan Number is required'),
  installmentId: z.string().optional(),
  installmentNo: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive('Payment amount must be greater than 0').optional(),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  notes: z.string().optional()
});

const queryPaymentSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  receiptNo: z.string().trim().optional(),
  status: z.string().trim().optional(),
  paymentMethod: z.preprocess(normalizeMethod, z.nativeEnum(PaymentMethod).optional()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  borrowerId: z.string().optional()
});

export class PaymentController {
  /**
   * POST /api/v1/payments & POST /api/v1/payments/create & POST /api/v1/payments/record
   * Dual-mode entrypoint:
   * 1. If method is QR_PAYMENT / KHQR or no manual teller reference is provided -> initiates Bakong KHQR
   * 2. If teller CASH / BANK_TRANSFER is provided with staff caller -> records immediate transaction
   */
  static async record(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body || {};
      const method = body.paymentMethod ? normalizeMethod(body.paymentMethod) : null;
      const isKhqrInitiation =
        method === PaymentMethod.QR_PAYMENT ||
        body.isKhqr === true ||
        body.initiateKhqr === true ||
        req.path.includes('/khqr');

      if (isKhqrInitiation) {
        return PaymentController.initiateKhqr(req, res, next);
      }

      // Traditional teller / system ledger record
      const validated = recordPaymentSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const idempotencyKey = (
        req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key'] ||
        validated.idempotencyKey ||
        req.body.idempotencyKey
      ) as string | undefined;

      const amount = (validated.paymentAmount !== undefined ? validated.paymentAmount : validated.amount);
      if (!amount || amount <= 0) {
        throw { statusCode: 400, message: 'Payment amount is required and must be greater than 0', code: 'INVALID_AMOUNT' };
      }
      const referenceNo = validated.referenceNo || validated.transactionRef;

      const result = await PaymentService.recordPayment({
        loanId: validated.loanId,
        installmentId: validated.installmentId,
        referenceNo,
        amount,
        paymentAmount: amount,
        paymentMethod: validated.paymentMethod || PaymentMethod.CASH,
        receivedById: req.user!.id,
        caller: req.user!,
        notes: validated.notes,
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
   * POST /api/v1/payments/khqr/initiate & POST /api/v1/payments/create
   * Initiates an authentic EMVCo Bakong KHQR payment request for a loan installment
   */
  static async initiateKhqr(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = initiateKhqrSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;

      const result = await PaymentService.initiateKhqrPayment({
        loanId: validated.loanId,
        installmentId: validated.installmentId,
        installmentNo: validated.installmentNo,
        amount: validated.amount,
        currency: validated.currency,
        notes: validated.notes,
        caller: req.user!,
        ipAddress
      });

      sendSuccess(res, result, 'Bakong KHQR payment request generated successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/payments/:id/verify
   * Triggers real transaction verification against the Bakong Open API
   */
  static async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = req.params.id || req.body?.paymentId || req.body?.referenceNo;
      if (!identifier) {
        throw { statusCode: 400, message: 'Payment identifier is required for verification', code: 'MISSING_PARAM' };
      }
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;

      const result = await PaymentService.verifyKhqrPayment(identifier, req.user!, ipAddress);
      if (result.status === 'FAILED') {
        res.status(400).json({
          success: false,
          error: {
            code: (result as any).failureCode || 'PAYMENT_VERIFICATION_FAILED',
            message: result.message
          },
          data: result
        });
        return;
      }
      sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/:id/status
   * Polls real-time transaction settlement status
   */
  static async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = req.params.id;
      const statusResult = await PaymentService.getPaymentStatus(identifier, req.user!);
      sendSuccess(res, statusResult, 'Payment status retrieved successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/payments/webhook
   * Secure webhook receiver for Bakong clearing callbacks
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-bakong-signature'] || req.headers['x-signature']) as string | undefined;
      const result = await PaymentService.handleBakongWebhook(req.body, signature);
      sendSuccess(res, result, 'Bakong webhook event processed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments/khqr/diagnostics
   * Sanitized system diagnostic endpoint for merchant connectivity health check
   */
  static async getDiagnostics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const diagnostics = BakongService.getDiagnosticSummary();
      sendSuccess(res, diagnostics, 'Bakong KHQR connectivity status');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/payments
   * Lists payments with status filter (ADMIN sees all, USER sees only their own)
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
   * Retrieves single payment details with ownership verification
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
   * Retrieves payments for a specific loan facility
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
   * Retrieves formatted official banking receipt
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
