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
import { isStaffRole } from '../../security/permissions';

const isUuid = (str: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export interface RecordPaymentDto {
  loanId: string;
  installmentId?: string;
  amount?: number;
  paymentAmount?: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  paymentDate?: Date | string;
  receivedById: string;
  caller?: AuthUser;
  notes?: string;
  ipAddress?: string;
  idempotencyKey?: string;
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
   * Auto-generate unique Payment Reference PAY-YYYYMMDD-XXXXXX (Section 13)
   */
  public static async generatePaymentReference(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.payment.count();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}${rand}`;
  }

  /**
   * Financial Ledger: Record Payment with Multi-Installment Waterfall Allocation
   * Complies with Section 1-17, 23, 26 Rules:
   * - Caller ownership check (USER can only pay their own loan)
   * - Payable loan check (must be ACTIVE or OVERDUE; not COMPLETED)
   * - Amount validation (> 0, cannot exceed remaining payable amount)
   * - Idempotency protection (Idempotency-Key prevents double charging)
   * - Full ACID PostgreSQL transaction
   */
  static async recordPayment(dto: RecordPaymentDto) {
    const paymentAmount = LoanCalculatorService.round2(
      dto.paymentAmount !== undefined ? dto.paymentAmount : (dto.amount || 0)
    );

    // Section 7 & 27: Validate payment amount > 0
    if (paymentAmount <= 0) {
      throw { statusCode: 400, message: 'Payment amount must be greater than 0', code: 'INVALID_AMOUNT' };
    }

    // Section 14: Check idempotency key if provided by client (e.g. mobile retries)
    if (dto.idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          loan: {
            include: {
              borrower: true,
              product: true
            }
          }
        }
      });
      if (existingPayment) {
        return {
          payment: existingPayment,
          paymentId: existingPayment.id,
          reference: existingPayment.referenceNo,
          referenceNo: existingPayment.referenceNo,
          receiptNo: existingPayment.receiptNo,
          amount: Number(existingPayment.amount),
          loanId: existingPayment.loan.loanNumber,
          remainingBalance: Number(existingPayment.loan.outstandingBalance),
          status: 'COMPLETED',
          replayed: true,
          message: 'Payment request processed previously and replayed idempotently.'
        };
      }
    }

    // Find the loan account
    const loan = await prisma.loan.findFirst({
      where: isUuid(dto.loanId)
        ? {
            OR: [
              { id: dto.loanId },
              { applicationId: dto.loanId },
              { loanNumber: dto.loanId }
            ]
          }
        : {
            OR: [
              { loanNumber: dto.loanId },
              { application: { applicationNo: dto.loanId } }
            ]
          },
      include: {
        borrower: true,
        product: true,
        repaymentSchedules: {
          orderBy: { installmentNo: 'asc' }
        }
      }
    });

    if (!loan) {
      throw { statusCode: 404, message: 'Loan account not found', code: 'LOAN_NOT_FOUND' };
    }

    // Section 2: USER can only pay their own loan
    if (dto.caller && dto.caller.role !== UserRole.ADMIN) {
      if (loan.borrower.userId !== dto.caller.id) {
        throw {
          statusCode: 403,
          message: 'Access denied: you can only make payments on your own loans',
          code: 'FORBIDDEN_OWNERSHIP'
        };
      }
    }

    // Section 3: Loan must be payable (ACTIVE or OVERDUE)
    if (loan.status === LoanStatus.COMPLETED) {
      throw {
        statusCode: 400,
        message: 'Loan is already completed.',
        code: 'LOAN_ALREADY_COMPLETED'
      };
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
      throw {
        statusCode: 400,
        message: `Cannot accept payment for loan with status '${loan.status}'. Payments can only be recorded on ACTIVE or OVERDUE loans.`,
        code: 'INVALID_LOAN_STATUS'
      };
    }

    // Section 7: Amount validation (cannot exceed remaining payable amount)
    if (dto.installmentId) {
      const targetInstallment = loan.repaymentSchedules.find(
        (s) => s.id === dto.installmentId || String(s.installmentNo) === String(dto.installmentId)
      );
      if (targetInstallment && paymentAmount > Number(targetInstallment.remainingAmount)) {
        throw {
          statusCode: 400,
          message: 'Payment amount exceeds the remaining payable amount.',
          code: 'EXCEEDS_REMAINING_AMOUNT'
        };
      }
    }

    if (paymentAmount > Number(loan.outstandingBalance)) {
      throw {
        statusCode: 400,
        message: 'Payment amount exceeds the remaining payable amount.',
        code: 'EXCEEDS_REMAINING_AMOUNT'
      };
    }

    // Section 13: Unique payment reference
    const referenceNo = dto.referenceNo?.trim() || (await this.generatePaymentReference());

    if (dto.referenceNo?.trim()) {
      const existingRef = await prisma.payment.findFirst({
        where: { referenceNo: dto.referenceNo.trim() }
      });
      if (existingRef) {
        throw {
          statusCode: 409,
          message: `A payment with reference number '${dto.referenceNo}' already exists (Receipt: ${existingRef.receiptNo}).`,
          code: 'DUPLICATE_REFERENCE_NO'
        };
      }
    }

    const receiptNo = await this.generateReceiptNo();
    const previousOutstanding = Number(loan.outstandingBalance);
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    // Section 15: PostgreSQL ACID Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create primary Payment record
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          loanId: loan.id,
          installmentId: dto.installmentId || null,
          amount: new Prisma.Decimal(paymentAmount),
          paymentMethod: dto.paymentMethod,
          paymentDate,
          referenceNo,
          receivedBy: dto.receivedById,
          status: PaymentStatus.PAID,
          notes: dto.notes || null,
          idempotencyKey: dto.idempotencyKey || null
        }
      });

      // 2. Waterfall allocation to oldest unpaid installments (Section 9 & 10)
      const openSchedules = await tx.repaymentSchedule.findMany({
        where: {
          loanId: loan.id,
          status: { in: [ScheduleStatus.OVERDUE, ScheduleStatus.UNPAID, ScheduleStatus.PARTIAL, ScheduleStatus.UPCOMING] }
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNo: 'asc' }]
      });

      // If specific installment targeted, prioritize it
      if (dto.installmentId) {
        const targetIndex = openSchedules.findIndex(
          (s) => s.id === dto.installmentId || String(s.installmentNo) === String(dto.installmentId)
        );
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
          // Full payment on this installment (Section 8)
          allocationForThis = remainingOnSchedule;
          newRemaining = 0.0;
          newStatus = ScheduleStatus.PAID;
          unallocatedFunds = LoanCalculatorService.round2(unallocatedFunds - remainingOnSchedule);
        } else {
          // Partial payment on this installment (Section 8)
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
          installmentId: updatedSchedule.id,
          installmentNo: updatedSchedule.installmentNo,
          allocatedAmount: allocationForThis,
          status: newStatus,
          remainingAmount: newRemaining
        });
      }

      // 3. Recalculate Parent Loan Record (Section 11 & 16)
      const newTotalPaid = LoanCalculatorService.round2(Number(loan.totalPaid) + paymentAmount);
      const newOutstanding = LoanCalculatorService.round2(
        Math.max(0, Number(loan.totalRepayment) - newTotalPaid)
      );

      // Check if any open installments remain unpaid
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

      // 4. Create in-app Notification for Borrower (Section 19)
      const targetUserId = loan.borrower.userId || dto.caller?.id;
      if (targetUserId) {
        await tx.notification.create({
          data: {
            userId: targetUserId,
            title: 'Payment Received',
            message: `Your payment of $${paymentAmount.toFixed(2)} for loan ${loan.loanNumber} was successfully recorded. Remaining balance: $${newOutstanding.toFixed(2)}.`,
            type: isCompleted ? 'LOAN_COMPLETED' : 'PAYMENT_RECEIVED'
          }
        });
      }

      return {
        payment,
        paymentId: payment.id,
        reference: referenceNo,
        referenceNo,
        receiptNo,
        amount: paymentAmount,
        loanId: loan.loanNumber,
        loanDbId: loan.id,
        previousOutstanding,
        remainingBalance: newOutstanding,
        repaymentProgress,
        status: 'COMPLETED',
        isCompleted,
        settledInstallments: settledInstallmentsSummary,
        loan: updatedLoan
      };
    });

    // Section 21: Audit Log
    const actorId = dto.caller?.id || dto.receivedById;
    await recordAuditLog({
      userId: actorId,
      action: dto.caller?.role === UserRole.ADMIN ? 'COLLECT_PAYMENT' : 'MAKE_PAYMENT',
      entityName: 'Payment',
      entityId: result.payment.id,
      details: {
        receiptNo,
        referenceNo: result.reference,
        amount: paymentAmount,
        loanNumber: loan.loanNumber,
        method: dto.paymentMethod,
        previousOutstanding,
        remainingBalance: result.remainingBalance,
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
          { receiptNo: identifier },
          { referenceNo: identifier }
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

    if (!isStaffRole(viewer.role) && payment.loan.borrower.userId !== viewer.id) {
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
      reference: payment.referenceNo,
      referenceNumber: payment.referenceNo,
      borrowerName: payment.loan.borrower.fullName,
      borrowerId: payment.loan.borrower.borrowerId,
      loanNumber: payment.loan.loanNumber,
      productName: payment.loan.product.productName,
      paidAmount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
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
   * Retrieve single payment details by ID or reference (Section 22)
   */
  static async getPaymentById(id: string, viewer: AuthUser) {
    const payment = await prisma.payment.findFirst({
      where: isUuid(id)
        ? {
            OR: [
              { id },
              { referenceNo: id },
              { receiptNo: id }
            ]
          }
        : {
            OR: [
              { referenceNo: id },
              { receiptNo: id }
            ]
          },
      include: {
        loan: {
          include: {
            borrower: true,
            product: true
          }
        },
        installment: true,
        receivedByUser: {
          select: { id: true, username: true, fullName: true, role: true }
        }
      }
    });

    if (!payment) {
      throw { statusCode: 404, message: 'Payment not found', code: 'PAYMENT_NOT_FOUND' };
    }

    if (!isStaffRole(viewer.role) && payment.loan.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view your own payments',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    return payment;
  }

  /**
   * List payments for a specific loan (Section 22)
   */
  static async listPaymentsByLoan(loanId: string, viewer: AuthUser) {
    const loan = await prisma.loan.findFirst({
      where: isUuid(loanId)
        ? {
            OR: [
              { id: loanId },
              { loanNumber: loanId },
              { applicationId: loanId }
            ]
          }
        : {
            OR: [
              { loanNumber: loanId },
              { application: { applicationNo: loanId } }
            ]
          },
      include: { borrower: true }
    });

    if (!loan) {
      throw { statusCode: 404, message: 'Loan account not found', code: 'LOAN_NOT_FOUND' };
    }

    if (!isStaffRole(viewer.role) && loan.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view payments for your own loans',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    return await prisma.payment.findMany({
      where: { loanId: loan.id },
      orderBy: { paymentDate: 'desc' },
      include: {
        receivedByUser: {
          select: { id: true, username: true, fullName: true }
        }
      }
    });
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

    if (!isStaffRole(viewer.role)) {
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
