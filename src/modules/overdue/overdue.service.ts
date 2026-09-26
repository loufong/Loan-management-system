import { prisma } from '../../config/prisma';
import { LoanStatus, ScheduleStatus, UserRole } from '@prisma/client';
import { LoanCalculatorService } from '../calculator/loan-calculator.service';
import { recordAuditLog } from '../../utils/audit';

export class OverdueService {
  /**
   * Default daily penalty rate: 0.1% per day (36.5% annual penalty rate simulation)
   */
  public static readonly DEFAULT_PENALTY_RATE_PER_DAY = 0.001;

  /**
   * 1. Core Overdue Detection Engine
   * Identifies all past-due installments, marks them as OVERDUE, flags parent loans as OVERDUE,
   * computes simulated late fee penalties, and dispatches automated notifications.
   */
  static async triggerOverdueScan(penaltyRatePerDay = OverdueService.DEFAULT_PENALTY_RATE_PER_DAY) {
    const now = new Date();

    // Query all schedules where dueDate < now, remainingAmount > 0, and status != PAID
    const overdueSchedules = await prisma.repaymentSchedule.findMany({
      where: {
        dueDate: { lt: now },
        remainingAmount: { gt: 0 },
        status: { not: ScheduleStatus.PAID }
      },
      include: {
        loan: {
          include: {
            borrower: true,
            application: { select: { createdBy: true } }
          }
        }
      }
    });

    if (overdueSchedules.length === 0) {
      return {
        message: 'Scan completed: No past-due installments detected.',
        overdueInstallmentsCount: 0,
        affectedLoansCount: 0,
        processedLoans: []
      };
    }

    // Mark past-due installments as OVERDUE
    await prisma.repaymentSchedule.updateMany({
      where: {
        id: { in: overdueSchedules.map((s) => s.id) },
        status: { not: ScheduleStatus.OVERDUE }
      },
      data: { status: ScheduleStatus.OVERDUE }
    });

    // Group overdue schedules by loan
    const loanMap = new Map<string, { loan: any; schedules: typeof overdueSchedules }>();
    for (const schedule of overdueSchedules) {
      const existing = loanMap.get(schedule.loanId) || { loan: schedule.loan, schedules: [] };
      existing.schedules.push(schedule);
      loanMap.set(schedule.loanId, existing);
    }

    const processedLoans: any[] = [];

    // Query collection staff to notify
    const staffToNotify = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.LOAN_OFFICER, UserRole.CASHIER, UserRole.MANAGER] },
        status: 'ACTIVE'
      },
      select: { id: true, role: true }
    });

    for (const [loanId, group] of loanMap.entries()) {
      const loan = group.loan;
      const schedules = group.schedules;

      // Update parent loan status to OVERDUE if not already OVERDUE
      if (loan.status !== LoanStatus.OVERDUE) {
        await prisma.loan.update({
          where: { id: loanId },
          data: { status: LoanStatus.OVERDUE }
        });
      }

      // Calculate days overdue = max(0, currentDate - earliestDueDate)
      let maxOverdueDays = 0;
      let totalOverdueAmount = 0;

      for (const s of schedules) {
        const diffDays = Math.max(
          1,
          Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
        totalOverdueAmount = LoanCalculatorService.round2(totalOverdueAmount + Number(s.remainingAmount));
      }

      // Late fee formula: late_fee = overdue_amount * penalty_rate_per_day * overdue_days
      const simulatedLateFee = LoanCalculatorService.round2(
        totalOverdueAmount * penaltyRatePerDay * maxOverdueDays
      );

      // Create notification for borrower
      if (loan.borrower.userId) {
        await prisma.notification.create({
          data: {
            userId: loan.borrower.userId,
            title: `⚠️ Overdue Notice: Loan ${loan.loanNumber}`,
            message: `Your installment is ${maxOverdueDays} days past due. Overdue balance is $${totalOverdueAmount.toFixed(2)} with estimated late fee of $${simulatedLateFee.toFixed(2)}. Please make a payment immediately.`,
            type: 'OVERDUE_ALERT'
          }
        });
      }

      // Create notification for loan officer
      const loanOfficerId = loan.application?.createdBy;
      if (loanOfficerId && loanOfficerId !== loan.borrower.userId) {
        await prisma.notification.create({
          data: {
            userId: loanOfficerId,
            title: `⚠️ Overdue Account Alert: ${loan.loanNumber}`,
            message: `Borrower ${loan.borrower.fullName} is ${maxOverdueDays} days past due on loan ${loan.loanNumber}. Total overdue: $${totalOverdueAmount.toFixed(2)} (Estimated late fee: $${simulatedLateFee.toFixed(2)}).`,
            type: 'LOAN_OFFICER_OVERDUE_ALERT'
          }
        });
      }

      processedLoans.push({
        loanId,
        loanNumber: loan.loanNumber,
        borrowerName: loan.borrower.fullName,
        borrowerPhone: loan.borrower.phone,
        borrowerEmail: loan.borrower.email,
        overdueInstallments: schedules.length,
        maxOverdueDays,
        totalOverdueAmount,
        simulatedLateFee
      });
    }

    // Broadcast summary notice to collection staff
    for (const staff of staffToNotify) {
      await prisma.notification.create({
        data: {
          userId: staff.id,
          title: `Overdue Portfolio Alert`,
          message: `${loanMap.size} loan account(s) currently flagged as OVERDUE requiring collection follow-up.`,
          type: 'STAFF_OVERDUE_ALERT'
        }
      });
    }

    await recordAuditLog({
      action: 'TRIGGER_OVERDUE_SCAN',
      entityName: 'OverdueService',
      entityId: 'SYSTEM',
      details: {
        overdueInstallmentsCount: overdueSchedules.length,
        affectedLoansCount: loanMap.size,
        totalOverdueBalance: processedLoans.reduce((acc, l) => acc + l.totalOverdueAmount, 0)
      }
    });

    return {
      message: `Overdue scan complete. ${overdueSchedules.length} installment(s) flagged across ${loanMap.size} loan account(s).`,
      overdueInstallmentsCount: overdueSchedules.length,
      affectedLoansCount: loanMap.size,
      processedLoans
    };
  }

  /**
   * 2. Automated Reminder System (3 days before, on due date, and after due date)
   */
  static async sendDueDateReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inThreeDays = new Date(today);
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    // Find upcoming schedules due in next 3 days
    const upcomingSchedules = await prisma.repaymentSchedule.findMany({
      where: {
        dueDate: { gte: today, lte: inThreeDays },
        status: { in: [ScheduleStatus.UPCOMING, ScheduleStatus.UNPAID, ScheduleStatus.PARTIAL] }
      },
      include: {
        loan: {
          include: { borrower: true }
        }
      }
    });

    let remindersSent = 0;
    for (const schedule of upcomingSchedules) {
      if (schedule.loan.borrower.userId) {
        const dueDate = new Date(schedule.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const timingText = daysLeft === 0 ? 'is due TODAY' : `is due in ${daysLeft} day(s)`;

        await prisma.notification.create({
          data: {
            userId: schedule.loan.borrower.userId,
            title: `Payment Reminder: Loan ${schedule.loan.loanNumber}`,
            message: `Installment #${schedule.installmentNo} for $${Number(schedule.remainingAmount).toFixed(2)} ${timingText} on ${dueDate.toLocaleDateString()}.`,
            type: 'REPAYMENT_REMINDER'
          }
        });
        remindersSent++;
      }
    }

    return { remindersSent };
  }

  /**
   * 3. Fetch all currently overdue loans
   */
  static async getOverdueLoans(penaltyRatePerDay = OverdueService.DEFAULT_PENALTY_RATE_PER_DAY) {
    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: LoanStatus.OVERDUE
      },
      include: {
        borrower: true,
        product: true,
        repaymentSchedules: {
          where: {
            status: ScheduleStatus.OVERDUE
          },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    const now = new Date();

    return overdueLoans.map((loan) => {
      let maxOverdueDays = 0;
      let totalOverdueAmount = 0;

      for (const s of loan.repaymentSchedules) {
        const diffDays = Math.max(
          1,
          Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
        totalOverdueAmount = LoanCalculatorService.round2(totalOverdueAmount + Number(s.remainingAmount));
      }

      const simulatedLateFee = LoanCalculatorService.round2(
        totalOverdueAmount * penaltyRatePerDay * maxOverdueDays
      );

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        productName: loan.product?.productName,
        borrowerId: loan.borrower.borrowerId,
        borrowerName: loan.borrower.fullName,
        phone: loan.borrower.phone,
        email: loan.borrower.email,
        overdueInstallmentCount: loan.repaymentSchedules.length,
        overdueInstallmentsCount: loan.repaymentSchedules.length,
        daysOverdue: maxOverdueDays,
        maxOverdueDays,
        totalOverdueBalance: totalOverdueAmount,
        totalOverdueAmount,
        simulatedLateFee,
        totalDueWithPenalty: LoanCalculatorService.round2(totalOverdueAmount + simulatedLateFee),
        earliestDueDate: loan.repaymentSchedules[0]?.dueDate || null
      };
    });
  }

  /**
   * 4. Overdue Portfolio Summary
   * Returns total overdue accounts, total overdue dollar amount, and high-risk count (30+ days overdue)
   */
  static async getOverdueSummary(penaltyRatePerDay = OverdueService.DEFAULT_PENALTY_RATE_PER_DAY) {
    const overdueLoans = await this.getOverdueLoans(penaltyRatePerDay);
    const totalOverdueAccounts = overdueLoans.length;
    const totalOverdueDollarAmount = LoanCalculatorService.round2(
      overdueLoans.reduce((sum, l) => sum + l.totalOverdueBalance, 0)
    );
    const highRiskCount = overdueLoans.filter((l) => l.daysOverdue >= 30).length;
    const totalLateFees = LoanCalculatorService.round2(
      overdueLoans.reduce((sum, l) => sum + l.simulatedLateFee, 0)
    );

    return {
      totalOverdueAccounts,
      totalOverdueDollarAmount,
      highRiskCount,
      totalLateFees,
      totalOverdueLoans: totalOverdueAccounts
    };
  }
}
