import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { LoanStatus, ScheduleStatus, PaymentStatus } from '@prisma/client';
import { BakongService } from '../../services/bakongService';
import { sendSuccess, sendError } from '../../utils/response';

export class BorrowerPortalController {
  /**
   * GET /api/borrower/loans/active
   * Retrieves active credit facility for the authenticated borrower or demo facility
   */
  static async getActiveLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      let activeLoan: any = null;

      if (user?.id) {
        // Find borrower linked to this user
        const borrower = await prisma.borrower.findFirst({
          where: {
            OR: [
              { userId: user.id },
              { email: user.email }
            ]
          }
        });

        if (borrower) {
          activeLoan = await prisma.loan.findFirst({
            where: {
              borrowerId: borrower.id,
              status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            },
            include: {
              product: true,
              repaymentSchedules: {
                orderBy: { installmentNo: 'asc' }
              }
            }
          });
        }
      }

      // If no active loan in DB for this user, check for demo facility if requested
      if (!activeLoan) {
        if (req.query.demo === 'true' || req.query.fallback === 'true') {
          // Standard enterprise Cambodian loan facility LN-2026-6042
          sendSuccess(res, {
            id: 'LN-2026-6042',
            loanNumber: 'LN-2026-6042',
            productName: 'Personal Loan',
            principalAmount: 6000.0,
            annualRate: 6.5,
            tenureMonths: 12,
            totalPayable: 6390.0,
            totalPaid: 2540.0,
            outstandingBalance: 3850.0,
            status: 'ACTIVE',
            repaymentFrequency: 'MONTHLY',
            verifiedFacility: true,
            receivingBank: 'ACLEDA Bank Plc.',
            nextDueInstallment: {
              installmentNo: 5,
              totalInstallments: 12,
              dueDate: '2026-09-15',
              amountDue: 122.50,
              principalDue: 104.12,
              interestDue: 18.38,
              status: 'DUE_SOON'
            }
          });
        }

        sendSuccess(res, {
          hasActiveLoan: false,
          loan: null,
          message: 'No active credit facility found for borrower.'
        });
      }

      const schedules = activeLoan.repaymentSchedules || [];
      const nextSched = schedules.find((s: any) => s.status !== ScheduleStatus.PAID) || schedules[0];

      sendSuccess(res, {
        hasActiveLoan: true,
        id: activeLoan.id,
        loanNumber: activeLoan.loanNumber,
        productName: activeLoan.product?.productName || 'Personal Loan',
        principalAmount: Number(activeLoan.principalAmount),
        annualRate: Number(activeLoan.interestRate),
        tenureMonths: activeLoan.termMonths,
        totalPayable: Number(activeLoan.totalRepayment),
        totalPaid: Number(activeLoan.totalPaid),
        outstandingBalance: Number(activeLoan.outstandingBalance),
        status: activeLoan.status,
        repaymentFrequency: activeLoan.repaymentFrequency,
        nextDueInstallment: nextSched ? {
          installmentNo: nextSched.installmentNo,
          totalInstallments: schedules.length,
          dueDate: nextSched.dueDate.toISOString().split('T')[0],
          amountDue: Number(nextSched.remainingAmount || nextSched.totalDue),
          principalDue: Number(nextSched.principalAmount),
          interestDue: Number(nextSched.interestAmount),
          status: nextSched.status
        } : null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/borrower/schedule
   * Retrieves full amortization schedule for the borrower
   */
  static async getRepaymentSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      let schedules: any[] = [];

      if (user?.id) {
        const borrower = await prisma.borrower.findFirst({
          where: {
            OR: [
              { userId: user.id },
              { email: user.email }
            ]
          }
        });

        if (borrower) {
          const loan = await prisma.loan.findFirst({
            where: { borrowerId: borrower.id },
            include: {
              repaymentSchedules: {
                orderBy: { installmentNo: 'asc' },
                include: {
                  payments: {
                    where: { status: PaymentStatus.PAID },
                    take: 1
                  }
                }
              }
            }
          });

          if (loan && loan.repaymentSchedules.length > 0) {
            let runningPrincipal = Number(loan.principalAmount);

            schedules = loan.repaymentSchedules.map((s: any) => {
              const principal = Number(s.principalAmount);
              const endingBal = Math.max(0, runningPrincipal - principal);
              const schedObj = {
                cycle: s.installmentNo,
                dueDate: s.dueDate.toISOString().split('T')[0],
                beginningPrincipal: runningPrincipal,
                scheduledEMI: Number(s.totalDue),
                principal: principal,
                interest: Number(s.interestAmount),
                lateFees: 0.0,
                endingBalance: endingBal,
                status: s.status,
                bakongMd5: s.bakongMd5,
                settledAt: s.settledAt,
                txRef: s.payments[0]?.referenceNo || (s.status === 'PAID' ? `BK-${88200 + s.installmentNo}` : undefined)
              };
              runningPrincipal = endingBal;
              return schedObj;
            });
          }
        }
      }

      // If user has zero active schedules in database, check if demo fallback is requested
      if (schedules.length === 0 && (req.query.demo === 'true' || req.query.fallback === 'true')) {
        const demoSchedule = [
          { cycle: 1, dueDate: '2026-05-15', beginningPrincipal: 6000.0, scheduledEMI: 532.50, principal: 500.0, interest: 32.50, lateFees: 0.0, endingBalance: 5500.0, status: 'PAID', txRef: 'BK-88201', paidAt: '2026-05-14 14:22:10' },
          { cycle: 2, dueDate: '2026-06-15', beginningPrincipal: 5500.0, scheduledEMI: 529.79, principal: 500.0, interest: 29.79, lateFees: 0.0, endingBalance: 5000.0, status: 'PAID', txRef: 'BK-88212', paidAt: '2026-06-15 09:11:45' },
          { cycle: 3, dueDate: '2026-07-15', beginningPrincipal: 5000.0, scheduledEMI: 527.08, principal: 500.0, interest: 27.08, lateFees: 0.0, endingBalance: 4500.0, status: 'PAID', txRef: 'BK-88225', paidAt: '2026-07-13 16:40:02' },
          { cycle: 4, dueDate: '2026-08-15', beginningPrincipal: 4500.0, scheduledEMI: 524.38, principal: 500.0, interest: 24.38, lateFees: 0.0, endingBalance: 4000.0, status: 'PAID', txRef: 'BK-88238', paidAt: '2026-08-15 11:05:30' },
          { cycle: 5, dueDate: '2026-09-15', beginningPrincipal: 4000.0, scheduledEMI: 122.50, principal: 104.12, interest: 18.38, lateFees: 0.0, endingBalance: 3895.88, status: 'DUE_SOON' },
          { cycle: 6, dueDate: '2026-10-15', beginningPrincipal: 3895.88, scheduledEMI: 521.67, principal: 500.0, interest: 21.67, lateFees: 0.0, endingBalance: 3395.88, status: 'SCHEDULED' },
          { cycle: 7, dueDate: '2026-11-15', beginningPrincipal: 3395.88, scheduledEMI: 518.96, principal: 500.0, interest: 18.96, lateFees: 0.0, endingBalance: 2895.88, status: 'SCHEDULED' },
          { cycle: 8, dueDate: '2026-12-15', beginningPrincipal: 2895.88, scheduledEMI: 516.25, principal: 500.0, interest: 16.25, lateFees: 0.0, endingBalance: 2395.88, status: 'SCHEDULED' },
          { cycle: 9, dueDate: '2027-01-15', beginningPrincipal: 2395.88, scheduledEMI: 513.54, principal: 500.0, interest: 13.54, lateFees: 0.0, endingBalance: 1895.88, status: 'SCHEDULED' },
          { cycle: 10, dueDate: '2027-02-15', beginningPrincipal: 1895.88, scheduledEMI: 510.83, principal: 500.0, interest: 10.83, lateFees: 0.0, endingBalance: 1395.88, status: 'SCHEDULED' },
          { cycle: 11, dueDate: '2027-03-15', beginningPrincipal: 1395.88, scheduledEMI: 508.13, principal: 500.0, interest: 8.13, lateFees: 0.0, endingBalance: 895.88, status: 'SCHEDULED' },
          { cycle: 12, dueDate: '2027-04-15', beginningPrincipal: 895.88, scheduledEMI: 505.42, principal: 500.0, interest: 5.42, lateFees: 0.0, endingBalance: 0.0, status: 'SCHEDULED' },
        ];
        sendSuccess(res, demoSchedule);
      }

      sendSuccess(res, schedules);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/loans/:id/installments/:no/khqr
   * Generates dynamic Bakong KHQR EMVCo string for a specific loan installment
   */
  static async generateInstallmentKhqr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanId = req.params.id || 'LN-2026-6042';
      const installmentNo = parseInt(req.params.no || '5', 10);
      const { currency = 'USD', amount } = req.body;

      const result = await BakongService.generateDynamicKhqr({
        loanId,
        installmentNo,
        currency,
        amountOverride: amount ? Number(amount) : undefined
      });

      sendSuccess(res, result, 'Bakong KHQR generated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/loans/:id/installments/:no/status
   * Real-time polling endpoint to check if an installment has been settled
   */
  static async getInstallmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanId = req.params.id;
      const installmentNo = parseInt(req.params.no, 10);
      const md5Hint = typeof req.query.md5 === 'string' ? req.query.md5 : undefined;

      const result = await BakongService.checkInstallmentSettlement(loanId, installmentNo, md5Hint);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/loans/:id/installments/:no/simulate-settlement
   * Developer / Demo fast-forward route to simulate mobile banking scan
   */
  static async simulateSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanId = req.params.id || 'LN-2026-6042';
      const installmentNo = parseInt(req.params.no || '5', 10);
      const { amount, currency = 'USD' } = req.body;

      const billNumber = `${loanId}-INS${String(installmentNo).padStart(2, '0')}`;
      const settleResult = await BakongService.processSettlement({
        billNumber,
        amount: amount ? Number(amount) : 122.50,
        currency,
        transactionHash: `SIM-KHQR-${Date.now()}`
      });

      sendSuccess(res, settleResult, 'Installment settlement simulated and ledger updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/webhooks/bakong
   * Webhook callback listener invoked by NBC Bakong network upon mobile clearance
   */
  static async handleBakongWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body || {};
      const signature = req.headers['x-bakong-signature'] as string | undefined;

      // Extract transaction data from official Bakong webhook format
      const data = body.data || body;
      const billNumber = data.billNumber || data.description || data.externalTransactionId;

      if (!billNumber) {
        res.status(400).json({
          responseCode: 1,
          responseMessage: 'Missing billNumber/description in webhook payload'
        });
        return;
      }

      const settleResult = await BakongService.processSettlement({
        billNumber,
        md5: data.md5,
        amount: Number(data.amount || 0),
        transactionHash: data.hash || data.transactionId,
        sourceAccount: data.fromAccountId || data.sourceAccount,
        currency: data.currency || 'USD'
      });

      res.status(200).json({
        responseCode: 0,
        responseMessage: 'Success',
        data: settleResult
      });
    } catch (err: any) {
      res.status(500).json({
        responseCode: 1,
        responseMessage: err?.message || 'Webhook processing failed'
      });
    }
  }

  /**
   * GET /api/general-ledger
   * Lists double-entry accounting records
   */
  static async listGeneralLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entries = await prisma.generalLedger.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      sendSuccess(res, entries);
    } catch (err) {
      next(err);
    }
  }
}
