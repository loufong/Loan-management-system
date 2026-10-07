import { prisma } from '../../config/prisma';
import {
  PaymentMethod,
  PaymentStatus,
  ScheduleStatus,
  LoanStatus,
  Prisma,
  UserRole
} from '@prisma/client';
import { recordAuditLog } from '../../utils/audit';
import { AuthUser } from '../../middlewares/auth.middleware';
import { LoanCalculatorService } from '../calculator/loan-calculator.service';

export interface RecordPaymentDto {
  loanId: string;
  installmentId?: string;
  amount?: number;
  paymentAmount?: number;
  paymentMethod: PaymentMethod;
  referenceNo: string;
  paymentDate?: Date | string;
  receivedById: string;
  notes?: string;
  ipAddress?: string;
}

export class PaymentService {
  /**
   * Auto-generate sequential Receipt Number REC-YYYY-XXXX
   */
  public static async generateReceiptNo(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await prisma.payment.count();
    return `REC-${currentYear}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Financial Ledger: Record Payment with Multi-Installment Waterfall Allocation
   */
  static async recordPayment(dto: RecordPaymentDto) {
    const paymentAmount = LoanCalculatorService.round2(
      dto.paymentAmount !== undefined ? dto.paymentAmount : (dto.amount || 0)
    );
    if (paymentAmount <= 0) {
      throw { statusCode: 400, message: 'Payment amount must be greater than 0', code: 'INVALID_AMOUNT' };
    }

    // Check duplicate reference number
    const existingRef = await prisma.payment.findFirst({
      where: { referenceNo: dto.referenceNo }
    });
    if (existingRef) {
      throw {
        statusCode: 409,
        message: `A payment with reference number '${dto.referenceNo}' already exists (Receipt: ${existingRef.receiptNo}).`,
        code: 'DUPLICATE_REFERENCE_NO'
      };
    }

    const loan = await prisma.loan.findFirst({
      where: {
        OR: [
          { id: dto.loanId },
          { loanNumber: dto.loanId },
          { applicationId: dto.loanId },
          { application: { applicationNo: dto.loanId } }
        ]
      },
      include: {
        borrower: true,
        repaymentSchedules: {
          orderBy: { installmentNo: 'asc' }
        }
      }
    });

    if (!loan) {
      throw { statusCode: 404, message: 'Loan account not found', code: 'LOAN_NOT_FOUND' };
    }

    // Validation: Loan must be ACTIVE or OVERDUE
    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
      throw {
        statusCode: 400,
        message: `Cannot accept payment for loan with status '${loan.status}'. Payments can only be recorded on ACTIVE or OVERDUE loans.`,
        code: 'INVALID_LOAN_STATUS'
      };
    }

    const receiptNo = await this.generateReceiptNo();
    const previousOutstanding = Number(loan.outstandingBalance);
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create primary Payment receipt record
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          loanId: loan.id,
          installmentId: dto.installmentId || null,
          amount: new Prisma.Decimal(paymentAmount),
          paymentMethod: dto.paymentMethod,
          paymentDate,
          referenceNo: dto.referenceNo,
          receivedBy: dto.receivedById,
          status: PaymentStatus.PAID,
          notes: dto.notes || null
        }
      });

      // 2. Multi-Installment Waterfall Allocation
      // Fetch open installments sorted by installmentNo
      const openSchedules = await tx.repaymentSchedule.findMany({
        where: {
          loanId: loan.id,
          status: { in: [ScheduleStatus.OVERDUE, ScheduleStatus.UNPAID, ScheduleStatus.PARTIAL, ScheduleStatus.UPCOMING] }
        },
        orderBy: { installmentNo: 'asc' }
      });

      // If specific installment requested, place it first
      if (dto.installmentId) {
        const targetIndex = openSchedules.findIndex((s) => s.id === dto.installmentId);
        if (targetIndex > 0) {
          const [target] = openSchedules.splice(targetIndex, 1);
          openSchedules.unshift(target);
        }
      }

      let unallocatedFunds = paymentAmount;
      const settledInstallmentsSummary: any[] = [];

      for (const schedule of openSchedules) {
        if (unallocatedFunds <= 0) break;

        const remainingOnSchedule = Number(schedule.remainingAmount);
        const currentPaidOnSchedule = Number(schedule.amountPaid);

        let allocationForThis: number;
        let newRemaining: number;
        let newStatus: ScheduleStatus;

        if (unallocatedFunds >= remainingOnSchedule) {
          // Fully settles this installment
          allocationForThis = remainingOnSchedule;
          newRemaining = 0.0;
          newStatus = ScheduleStatus.PAID;
          unallocatedFunds = LoanCalculatorService.round2(unallocatedFunds - remainingOnSchedule);
        } else {
          // Partially settles this installment
          allocationForThis = unallocatedFunds;
          newRemaining = LoanCalculatorService.round2(remainingOnSchedule - unallocatedFunds);
          newStatus = ScheduleStatus.PARTIAL;
          unallocatedFunds = 0.0;
        }

        const newPaidTotal = LoanCalculatorService.round2(currentPaidOnSchedule + allocationForThis);

        const updatedSchedule = await tx.repaymentSchedule.update({
          where: { id: schedule.id },
          data: {
            amountPaid: new Prisma.Decimal(newPaidTotal),
            remainingAmount: new Prisma.Decimal(newRemaining),
            status: newStatus
          }
        });

        settledInstallmentsSummary.push({
          installmentNo: updatedSchedule.installmentNo,
          allocatedAmount: allocationForThis,
          status: newStatus,
          remainingAmount: newRemaining
        });
      }

      // 3. Update Parent Loan Record
      const newTotalPaid = LoanCalculatorService.round2(Number(loan.totalPaid) + paymentAmount);
      const newOutstanding = LoanCalculatorService.round2(
        Math.max(0, Number(loan.totalRepayment) - newTotalPaid)
      );

      // Check if all installments for this loan are now PAID
      const remainingUnpaidCount = await tx.repaymentSchedule.count({
        where: {
          loanId: loan.id,
          status: { not: ScheduleStatus.PAID }
        }
      });

      const isCompleted = newOutstanding <= 0 && remainingUnpaidCount === 0;
      const nextLoanStatus = isCompleted ? LoanStatus.COMPLETED : LoanStatus.ACTIVE;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          totalPaid: new Prisma.Decimal(newTotalPaid),
          outstandingBalance: new Prisma.Decimal(newOutstanding),
          status: nextLoanStatus
        }
      });

      const repaymentProgress = LoanCalculatorService.round2(
        (newTotalPaid / Number(loan.totalRepayment)) * 100
      );

      // 4. Send Notification to Borrower
      if (loan.borrower.userId) {
        await tx.notification.create({
          data: {
            userId: loan.borrower.userId,
            title: `Payment Receipt: ${receiptNo}`,
            message: `Payment of $${paymentAmount.toFixed(2)} received. Outstanding loan balance is $${newOutstanding.toFixed(2)} (${repaymentProgress}% completed).`,
            type: isCompleted ? 'LOAN_COMPLETED' : 'PAYMENT_RECEIVED'
          }
        });
      }

      return {
        payment,
        loan: updatedLoan,
        receiptNo,
        previousOutstanding,
        remainingBalance: newOutstanding,
        repaymentProgress,
        isCompleted,
        settledInstallments: settledInstallmentsSummary
      };
    });

    await recordAuditLog({
      userId: dto.receivedById,
      action: 'COLLECT_PAYMENT',
      entityName: 'Payment',
      entityId: result.payment.id,
      details: {
        receiptNo,
        amount: paymentAmount,
        loanNumber: loan.loanNumber,
        method: dto.paymentMethod,
        isCompleted: result.isCompleted
      },
      ipAddress: dto.ipAddress
    });

    return result;
  }

  /**
   * Retrieve official payment receipt details
   */
  static async getReceipt(identifier: string, viewer: AuthUser) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: identifier.includes('-') && identifier.length === 36 ? identifier : undefined },
          { receiptNo: identifier }
        ]
      },
      include: {
        loan: {
          include: {
            borrower: true,
            product: { select: { productName: true } }
          }
        },
        installment: true,
        receivedByUser: {
          select: { id: true, username: true, fullName: true, role: true }
        }
      }
    });

    if (!payment) {
      throw { statusCode: 404, message: 'Payment receipt not found', code: 'RECEIPT_NOT_FOUND' };
    }

    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER && payment.loan.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view receipts for your own loans',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    const totalRepayment = Number(payment.loan.totalRepayment);
    const totalPaid = Number(payment.loan.totalPaid);
    const progressPercentage = totalRepayment > 0
      ? Number(((totalPaid / totalRepayment) * 100).toFixed(2))
      : 0;

    return {
      receiptNumber: payment.receiptNo,
      paymentId: payment.id,
      borrowerName: payment.loan.borrower.fullName,
      borrowerId: payment.loan.borrower.borrowerId,
      loanNumber: payment.loan.loanNumber,
      productName: payment.loan.product.productName,
      paidAmount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNo,
      cashierName: payment.receivedByUser.fullName,
      notes: payment.notes,
      loanStatus: payment.loan.status,
      totalLoanAmount: totalRepayment,
      totalPaidToDate: totalPaid,
      remainingLoanBalance: Number(payment.loan.outstandingBalance),
      repaymentProgressPercentage: progressPercentage
    };
  }

  /**
   * List payments with filtering and pagination
   */
  static async listPayments(filters: {
    receiptNo?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: PaymentMethod;
    borrowerId?: string;
    page?: number;
    limit?: number;
  }, viewer: AuthUser) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.receiptNo) {
      where.receiptNo = { contains: filters.receiptNo, mode: 'insensitive' };
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER) {
      const borrower = await prisma.borrower.findFirst({
        where: { userId: viewer.id }
      });
      if (!borrower) return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
      where.loan = { borrowerId: borrower.id };
    } else if (filters.borrowerId) {
      where.loan = { borrowerId: filters.borrowerId };
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              status: true,
              borrower: {
                select: { id: true, borrowerId: true, fullName: true, phone: true }
              },
              product: {
                select: { productName: true }
              }
            }
          },
          receivedByUser: {
            select: { id: true, username: true, fullName: true }
          }
        }
      })
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
