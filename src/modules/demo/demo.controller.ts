import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { OverdueService } from '../overdue/overdue.service';
import { ScheduleStatus, LoanStatus } from '@prisma/client';
import { sendSuccess, sendError } from '../../utils/response';

export class DemoController {
  /**
   * Fast-Forward Overdue Trigger for Point 44 Live Demo:
   * Sets an installment's dueDate to 5 days in the past and triggers the overdue engine.
   * This allows demonstrating Point 29 (Overdue Detection & Alerts) within seconds.
   */
  static async simulateOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loanId } = req.params;

      // Find loan by id or loanNumber
      const loan = await prisma.loan.findFirst({
        where: {
          OR: [
            { id: loanId },
            { loanNumber: loanId }
          ]
        },
        include: {
          repaymentSchedules: {
            orderBy: { installmentNo: 'asc' }
          }
        }
      });

      if (!loan) {
        sendError(res, `Loan '${loanId}' not found`, 404, 'LOAN_NOT_FOUND');
        return;
      }

      // Find earliest schedule that is not PAID
      const schedule = loan.repaymentSchedules.find((s) => s.status !== ScheduleStatus.PAID);
      if (!schedule) {
        sendError(
          res,
          `All installments for loan '${loan.loanNumber}' are already paid`,
          400,
          'ALL_PAID'
        );
        return;
      }

      // Fast-forward due date to 5 days in the past
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const updatedSchedule = await prisma.repaymentSchedule.update({
        where: { id: schedule.id },
        data: {
          dueDate: fiveDaysAgo,
          status: ScheduleStatus.OVERDUE
        }
      });

      // Update loan status to OVERDUE
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.OVERDUE }
      });

      // Run overdue detection engine
      const scanResult = await OverdueService.triggerOverdueScan();

      sendSuccess(
        res,
        {
          message: `Fast-Forward Demo Simulation Successful: Installment #${schedule.installmentNo} dueDate set to 5 days past (${fiveDaysAgo.toISOString().split('T')[0]}) and overdue engine triggered.`,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          installmentNo: schedule.installmentNo,
          newDueDate: fiveDaysAgo.toISOString().split('T')[0],
          scheduleStatus: ScheduleStatus.OVERDUE,
          scanResult
        },
        'Live demo overdue fast-forward executed successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}
