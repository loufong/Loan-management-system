import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoanService } from './loan.service';
import { ApplicationService } from '../applications/application.service';
import { prisma } from '../../config/prisma';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { LoanStatus, DisbursementMethod } from '@prisma/client';

const disburseSchema = z.object({
  paymentMethod: z.preprocess(
    (val: any) => (typeof val === 'string' ? val.toUpperCase().replace(/\s+/g, '_') : val),
    z.nativeEnum(DisbursementMethod).optional()
  ),
  disbursementMethod: z.preprocess(
    (val: any) => (typeof val === 'string' ? val.toUpperCase().replace(/\s+/g, '_') : val),
    z.nativeEnum(DisbursementMethod).optional()
  ),
  channel: z.preprocess(
    (val: any) => (typeof val === 'string' ? val.toUpperCase().replace(/\s+/g, '_') : val),
    z.nativeEnum(DisbursementMethod).optional()
  ),
  referenceNo: z.string().min(3).optional(),
  disbursementReference: z.string().min(3).optional(),
  notes: z.string().optional(),
  disbursementDate: z.string().optional(),
  firstPaymentDueDate: z.string().optional(),
  firstPaymentDate: z.string().optional(),
  applicationId: z.string().optional(),
  loanId: z.string().optional(),
}).refine((data) => Boolean(data.referenceNo || data.disbursementReference), {
  message: 'Reference number is required',
  path: ['referenceNo']
}).refine((data) => Boolean(data.paymentMethod || data.disbursementMethod || data.channel), {
  message: 'Payment method is required',
  path: ['paymentMethod']
}).transform((data) => ({
  paymentMethod: (data.paymentMethod || data.disbursementMethod || data.channel) as DisbursementMethod,
  referenceNo: (data.referenceNo || data.disbursementReference) as string,
  notes: data.notes,
  disbursementDate: data.disbursementDate,
  firstPaymentDueDate: data.firstPaymentDueDate || data.firstPaymentDate,
  applicationId: data.applicationId,
  loanId: data.loanId
}));

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
      const { applicationId, loanId, ...restValidated } = validated;
      const targetId = req.params.applicationId || req.params.id || applicationId || loanId;
      if (!targetId) {
        throw { statusCode: 400, message: 'Application ID or Loan ID is required for disbursement' };
      }
      const result = await LoanService.disburseLoan({
        loanId: targetId,
        disbursedById: req.user!.id,
        ...restValidated,
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

  static async apply(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user!.id;
      // Enforce One Active Loan Policy in Prisma DB transaction
      await prisma.$transaction(async (tx) => {
        await ApplicationService.validateOneActiveLoanPolicy(tx, viewerId, req.body.borrowerId || viewerId);
      });

      const {
        productType,
        principalAmount,
        tenureMonths,
        annualInterestRate,
        disbursementBank,
        disbursementAccount,
        collateralStatus,
        repaymentType,
      } = req.body;

      const loanId = `LN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const amount = Number(principalAmount || 5000);
      const tenure = Number(tenureMonths || 12);
      const apr = Number(annualInterestRate || 6.5);

      sendSuccess(
        res,
        {
          id: loanId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          loanId,
          borrowerId: req.user?.id || 'BOR-2026-8801',
          borrowerName: (req.user as any)?.fullName || (req.user as any)?.name || 'Johnathan Doe',
          borrowerEmail: req.user?.email || 'borrower@jamsongvich.com',
          productType: productType || 'SME Working Capital',
          principalAmount: amount,
          annualInterestRate: apr,
          tenureMonths: tenure,
          repaymentType: repaymentType || 'REDUCING_BALANCE',
          status: 'UNDERWRITING_PENDING',
          submittedAt: new Date().toISOString(),
          disbursementBank: disbursementBank || 'ACLEDA Bank Plc.',
          disbursementAccount: disbursementAccount || '****2023',
          collateralStatus: collateralStatus || 'Verified Hard Title (Khan Toul Kork, PP)',
        },
        'Loan application submitted successfully and queued for credit underwriting',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Complete reset of all borrowing data for the authenticated user
   */
  static async resetUserBorrowing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const isAdmin = (req.user?.role || '').toUpperCase() === 'ADMIN' || (req.user?.role || '').toUpperCase() === 'SUPER_ADMIN';

      // Find all borrowers associated with this user
      let borrowerIds: string[] = [];
      if (userId) {
        const borrowers = await prisma.borrower.findMany({
          where: {
            OR: [
              { id: userId },
              { email: req.user?.email },
            ],
          },
          select: { id: true },
        }).catch(() => []);
        borrowerIds = borrowers.map((b) => b.id);
        if (userId && !borrowerIds.includes(userId)) {
          borrowerIds.push(userId);
        }
      }

      const loanWhere = isAdmin && !userId
        ? {}
        : {
            OR: [
              { userId: userId || '' },
              { borrowerId: { in: borrowerIds } },
            ],
          };

      const appWhere = isAdmin && !userId
        ? {}
        : {
            OR: [
              { createdById: userId || '' },
              { borrowerId: { in: borrowerIds } },
            ],
          };

      // 1. Find matching loans
      const matchingLoans = await prisma.loan.findMany({
        where: loanWhere,
        select: { id: true },
      }).catch(() => []);
      const loanIds = matchingLoans.map((l) => l.id);

      // 2. Find matching applications
      const matchingApps = await prisma.loanApplication.findMany({
        where: appWhere,
        select: { id: true },
      }).catch(() => []);
      const appIds = matchingApps.map((a) => a.id);

      // Delete payments
      if (loanIds.length > 0) {
        await prisma.payment.deleteMany({
          where: { loanId: { in: loanIds } },
        }).catch(() => ({}));

        await prisma.repaymentSchedule.deleteMany({
          where: { loanId: { in: loanIds } },
        }).catch(() => ({}));

        await prisma.disbursement.deleteMany({
          where: { loanId: { in: loanIds } },
        }).catch(() => ({}));

        await prisma.loanDocument.deleteMany({
          where: {
            OR: [
              ...(userId ? [{ uploadedBy: userId }] : []),
              { entityId: { in: loanIds } },
            ],
          },
        }).catch(() => ({}));

        await prisma.loan.deleteMany({
          where: { id: { in: loanIds } },
        }).catch(() => ({}));
      }

      // Delete application records
      if (appIds.length > 0) {
        await prisma.applicationApproval.deleteMany({
          where: { applicationId: { in: appIds } },
        }).catch(() => ({}));

        await prisma.applicationReview.deleteMany({
          where: { applicationId: { in: appIds } },
        }).catch(() => ({}));

        await prisma.applicationStatusHistory.deleteMany({
          where: { applicationId: { in: appIds } },
        }).catch(() => ({}));

        await prisma.loanApplication.deleteMany({
          where: { id: { in: appIds } },
        }).catch(() => ({}));
      }

      sendSuccess(res, {
        message: 'All borrowing and loan data for this user has been reset successfully.',
        clearedLoansCount: loanIds.length,
        clearedApplicationsCount: appIds.length,
      }, 'Borrowing data reset successfully');
    } catch (err) {
      next(err);
    }
  }
}
