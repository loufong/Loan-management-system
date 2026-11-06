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
import { BakongService } from './bakong.service';

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
      productName: payment.loan.product?.productName ?? 'Standard Loan Facility',
      paidAmount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      cashierName: payment.receivedByUser?.fullName ?? 'N/A',
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
    status?: string;
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

    if (filters.status) {
      const s = String(filters.status).toUpperCase();
      if (s === 'SUCCESS' || s === 'PAID') {
        where.status = { in: [PaymentStatus.SUCCESS, PaymentStatus.PAID] };
      } else if (Object.values(PaymentStatus).includes(s as any)) {
        where.status = s as PaymentStatus;
      }
    }

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

  /**
   * Initiate Real Bakong KHQR Payment (Section 7 & 9)
   * Creates a PENDING payment record and generates an authentic EMVCo Bakong KHQR
   */
  static async initiateKhqrPayment(dto: {
    loanId: string;
    installmentId?: string;
    installmentNo?: number;
    amount?: number;
    currency?: 'USD' | 'KHR';
    caller: AuthUser;
    ipAddress?: string;
    notes?: string;
  }) {
    // 1. Locate the loan account
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

    // 2. Ownership verification: USER role can only pay their own loan
    if (!isStaffRole(dto.caller.role) && loan.borrower.userId !== dto.caller.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only initiate payments for your own loans',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    // 3. Loan must be in payable status (ACTIVE or OVERDUE)
    if (loan.status === LoanStatus.COMPLETED) {
      throw {
        statusCode: 400,
        message: 'Loan is already completed. No outstanding repayments due.',
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

    // 4. Target installment resolution
    let targetInstallment = null;
    if (dto.installmentId) {
      targetInstallment = loan.repaymentSchedules.find(
        (s) => s.id === dto.installmentId || String(s.installmentNo) === String(dto.installmentId)
      );
    } else if (dto.installmentNo) {
      targetInstallment = loan.repaymentSchedules.find((s) => s.installmentNo === dto.installmentNo);
    } else {
      // Default to the earliest unpaid installment
      targetInstallment = loan.repaymentSchedules.find((s) => s.status !== ScheduleStatus.PAID);
    }

    if (!targetInstallment) {
      throw {
        statusCode: 404,
        message: 'No payable unpaid installment found on this loan.',
        code: 'INSTALLMENT_NOT_FOUND'
      };
    }

    if (targetInstallment.status === ScheduleStatus.PAID) {
      throw {
        statusCode: 400,
        message: `Installment #${targetInstallment.installmentNo} has already been paid in full.`,
        code: 'INSTALLMENT_ALREADY_PAID'
      };
    }

    // 5. Payment amount calculation & validation
    const remainingInstallment = Number(targetInstallment.remainingAmount);
    const outstandingLoan = Number(loan.outstandingBalance);

    const paymentAmount = LoanCalculatorService.round2(
      dto.amount !== undefined && dto.amount > 0 ? dto.amount : remainingInstallment
    );

    if (paymentAmount <= 0) {
      throw { statusCode: 400, message: 'Payment amount must be greater than $0.00', code: 'INVALID_AMOUNT' };
    }

    if (paymentAmount > remainingInstallment + 0.01) {
      throw {
        statusCode: 400,
        message: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds remaining installment balance ($${remainingInstallment.toFixed(2)})`,
        code: 'EXCEEDS_REMAINING_AMOUNT'
      };
    }

    if (paymentAmount > outstandingLoan + 0.01) {
      throw {
        statusCode: 400,
        message: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds total outstanding loan balance ($${outstandingLoan.toFixed(2)})`,
        code: 'EXCEEDS_REMAINING_AMOUNT'
      };
    }

    // 6. Generate unique reference and receipt numbers
    const referenceNo = await this.generatePaymentReference();
    const receiptNo = await this.generateReceiptNo();
    const currency = dto.currency || 'USD';

    // 7. Call BakongService to generate official EMVCo KHQR payload & MD5 hash
    const generated = await BakongService.generateDynamicKhqr({
      amount: paymentAmount,
      currency,
      billNumber: referenceNo,
      mobileNumber: BakongService.getMerchantPhone(),
      storeLabel: 'Apex LMS Loan Repayment',
      terminalLabel: `Installment #${targetInstallment.installmentNo}`
    });

    // 8. Persist PENDING payment record with KHQR details
    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        referenceNo,
        loanId: loan.id,
        installmentId: targetInstallment.id,
        borrowerId: loan.borrowerId,
        amount: new Prisma.Decimal(paymentAmount),
        currency: generated.currency,
        paymentMethod: PaymentMethod.QR_PAYMENT,
        paymentProvider: 'BAKONG_KHQR',
        khqrTransactionId: null,
        khqrMd5: generated.md5,
        khqrQrString: generated.qr,
        expiresAt: generated.expiresAt,
        status: PaymentStatus.PENDING,
        notes: dto.notes || `Bakong KHQR payment for Installment #${targetInstallment.installmentNo} (Loan ${loan.loanNumber})`,
        receivedBy: isStaffRole(dto.caller.role) ? dto.caller.id : null
      }
    });

    // 9. Audit Log
    await recordAuditLog({
      userId: dto.caller.id,
      action: 'INITIATE_PAYMENT',
      entityName: 'Payment',
      entityId: payment.id,
      details: {
        receiptNo,
        referenceNo,
        amount: paymentAmount,
        currency: generated.currency,
        loanNumber: loan.loanNumber,
        installmentNo: targetInstallment.installmentNo,
        khqrMd5: generated.md5,
        expiresAt: generated.expiresAt
      },
      ipAddress: dto.ipAddress
    });

    // 10. Return clean, safe payload for frontend QR display
    return {
      paymentId: payment.id,
      reference: payment.referenceNo,
      referenceNo: payment.referenceNo,
      receiptNo: payment.receiptNo,
      loanNumber: loan.loanNumber,
      loanId: loan.id,
      borrowerName: loan.borrower.fullName,
      borrowerId: loan.borrower.borrowerId,
      installmentNo: targetInstallment.installmentNo,
      installmentId: targetInstallment.id,
      amount: paymentAmount,
      currency: generated.currency,
      status: PaymentStatus.PENDING,
      qr: generated.qr,
      qrDataUrl: generated.qrDataUrl,
      md5: generated.md5,
      merchantName: generated.merchantName,
      bankName: generated.bankName,
      accountInfo: generated.accountInfo,
      expiresAt: generated.expiresAt.toISOString(),
      createdAt: payment.createdAt.toISOString()
    };
  }

  /**
   * Real Bakong Transaction Verification (Section 12, 13, 14, 15)
   * Queries Bakong Open API, verifies transaction details, and performs ACID ledger update
   */
  static async verifyKhqrPayment(identifier: string, viewer: AuthUser, ipAddress?: string) {
    // 1. Locate payment record
    const payment = await prisma.payment.findFirst({
      where: isUuid(identifier)
        ? {
            OR: [
              { id: identifier },
              { referenceNo: identifier },
              { receiptNo: identifier },
              { khqrMd5: identifier }
            ]
          }
        : {
            OR: [
              { referenceNo: identifier },
              { receiptNo: identifier },
              { khqrMd5: identifier }
            ]
          },
      include: {
        loan: {
          include: {
            borrower: true,
            product: true,
            repaymentSchedules: { orderBy: { installmentNo: 'asc' } }
          }
        },
        installment: true,
        receivedByUser: true
      }
    });

    if (!payment) {
      throw { statusCode: 404, message: 'Payment record not found', code: 'PAYMENT_NOT_FOUND' };
    }

    // 2. Ownership verification
    if (!isStaffRole(viewer.role) && payment.loan.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only verify your own payments',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    // 3. Idempotent check: If already SUCCESS or PAID
    if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.PAID) {
      const receipt = await this.getReceipt(payment.id, viewer);
      return {
        status: PaymentStatus.SUCCESS,
        isSuccess: true,
        isAlreadyVerified: true,
        paymentId: payment.id,
        referenceNo: payment.referenceNo,
        receiptNo: payment.receiptNo,
        amount: Number(payment.amount),
        currency: payment.currency,
        paidAt: payment.paidAt || payment.paymentDate,
        verifiedAt: payment.verifiedAt || payment.createdAt,
        transactionId: payment.khqrTransactionId || payment.referenceNo,
        message: 'Payment has already been confirmed and reconciled successfully.',
        receipt
      };
    }

    // 4. Expiration check
    if (payment.status === PaymentStatus.EXPIRED) {
      return {
        status: PaymentStatus.EXPIRED,
        isSuccess: false,
        paymentId: payment.id,
        referenceNo: payment.referenceNo,
        message: 'This payment request has expired. Please initiate a new payment.'
      };
    }

    const now = new Date();
    if (payment.expiresAt && payment.expiresAt < now && payment.status === PaymentStatus.PENDING) {
      // Mark as EXPIRED in DB
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.EXPIRED }
      });
      return {
        status: PaymentStatus.EXPIRED,
        isSuccess: false,
        paymentId: payment.id,
        referenceNo: payment.referenceNo,
        message: 'Payment request expired before completion.'
      };
    }

    // 5. Query official Bakong Open API by MD5 hash
    if (!payment.khqrMd5) {
      throw {
        statusCode: 400,
        message: 'Payment record does not have a valid Bakong KHQR MD5 hash for verification.',
        code: 'INVALID_PAYMENT_METADATA'
      };
    }

    const bakongCheck = await BakongService.checkTransactionByMd5(payment.khqrMd5);

    // 5a. If Bakong API is unconfigured in this environment:
    if (bakongCheck.isUnconfigured) {
      return {
        status: PaymentStatus.PENDING,
        isSuccess: false,
        isPending: true,
        isUnconfigured: true,
        paymentId: payment.id,
        referenceNo: payment.referenceNo,
        message: bakongCheck.message
      };
    }

    // 5b. If transaction is still pending customer scan / confirmation:
    if (bakongCheck.isPending || !bakongCheck.isSuccess || !bakongCheck.transaction) {
      return {
        status: PaymentStatus.PENDING,
        isSuccess: false,
        isPending: true,
        paymentId: payment.id,
        referenceNo: payment.referenceNo,
        message: bakongCheck.message || 'Payment is still pending. Waiting for Bakong clearance.'
      };
    }

    // 6. Anti-Fraud & Integrity Validation (Verify amount, currency, recipient account)
    const tx = bakongCheck.transaction;
    const paymentAmount = Number(payment.amount);
    const integrity = BakongService.validateSettlementIntegrity(tx, {
      amount: paymentAmount,
      currency: payment.currency
    });

    if (!integrity.isValid) {
      // Mark payment as FAILED with explicit failure reason
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: integrity.reason,
          khqrTransactionId: tx.hash
        }
      });

      await recordAuditLog({
        userId: viewer.id,
        action: 'PAYMENT_FAILED',
        entityName: 'Payment',
        entityId: payment.id,
        details: {
          referenceNo: payment.referenceNo,
          expectedAmount: paymentAmount,
          receivedAmount: tx.amount,
          reason: integrity.reason,
          transactionHash: tx.hash
        },
        ipAddress
      });

      return {
        status: PaymentStatus.FAILED,
        isSuccess: false,
        failureCode: (integrity.reason || '').includes('Amount') ? 'AMOUNT_MISMATCH' : 'CURRENCY_MISMATCH',
        paymentId: payment.id,
        referenceNo: payment.referenceNo,
        message: `Payment verification failed: ${integrity.reason || 'Integrity check failed'}`
      };
    }

    // 7. Full PostgreSQL ACID Settlement Transaction:
    //    Payment SUCCESS + Installment PAID + Loan Outstanding Updated + Audit Log + Notification
    const settlementTime = new Date();
    const result = await prisma.$transaction(async (prismaTx) => {
      // a. Update Payment to SUCCESS
      const updatedPayment = await prismaTx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: settlementTime,
          verifiedAt: settlementTime,
          paymentDate: settlementTime,
          khqrTransactionId: tx.hash,
          failureReason: null
        }
      });

      // b. Waterfall / Installment settlement
      const targetSchedule = payment.installmentId
        ? await prismaTx.repaymentSchedule.findUnique({ where: { id: payment.installmentId } })
        : null;

      if (targetSchedule) {
        const remainingOnSchedule = Number(targetSchedule.remainingAmount);
        const currentPaidOnSchedule = Number(targetSchedule.amountPaid);
        const newPaidOnSchedule = LoanCalculatorService.round2(currentPaidOnSchedule + paymentAmount);
        const newRemainingOnSchedule = LoanCalculatorService.round2(
          Math.max(0, remainingOnSchedule - paymentAmount)
        );
        const newStatus = newRemainingOnSchedule <= 0.009 ? ScheduleStatus.PAID : ScheduleStatus.PARTIAL;

        await prismaTx.repaymentSchedule.update({
          where: { id: targetSchedule.id },
          data: {
            amountPaid: new Prisma.Decimal(newPaidOnSchedule),
            remainingAmount: new Prisma.Decimal(newRemainingOnSchedule),
            status: newStatus
          }
        });
      }

      // c. Recalculate Parent Loan Ledger
      const currentLoan = await prismaTx.loan.findUnique({
        where: { id: payment.loanId },
        include: { repaymentSchedules: true }
      });

      if (!currentLoan) throw new Error('Parent loan record missing');

      const newTotalPaid = LoanCalculatorService.round2(Number(currentLoan.totalPaid) + paymentAmount);
      const newOutstanding = LoanCalculatorService.round2(
        Math.max(0, Number(currentLoan.totalRepayment) - newTotalPaid)
      );

      const remainingUnpaidCount = await prismaTx.repaymentSchedule.count({
        where: {
          loanId: currentLoan.id,
          status: { not: ScheduleStatus.PAID }
        }
      });

      const isLoanCompleted = newOutstanding <= 0.009 && remainingUnpaidCount === 0;
      const nextLoanStatus = isLoanCompleted ? LoanStatus.COMPLETED : LoanStatus.ACTIVE;

      await prismaTx.loan.update({
        where: { id: currentLoan.id },
        data: {
          totalPaid: new Prisma.Decimal(newTotalPaid),
          outstandingBalance: new Prisma.Decimal(newOutstanding),
          status: nextLoanStatus
        }
      });

      // d. In-app notification for borrower
      const borrowerUserId = payment.loan.borrower.userId;
      if (borrowerUserId) {
        await prismaTx.notification.create({
          data: {
            userId: borrowerUserId,
            title: 'Payment Successful',
            message: `Your Bakong KHQR payment of $${paymentAmount.toFixed(2)} for loan ${payment.loan.loanNumber} has been successfully verified and confirmed.`,
            type: isLoanCompleted ? 'LOAN_COMPLETED' : 'PAYMENT_RECEIVED'
          }
        });
      }

      return { updatedPayment, newOutstanding, isLoanCompleted };
    });

    // 8. Audit Log
    await recordAuditLog({
      userId: viewer.id,
      action: 'PAYMENT_VERIFIED',
      entityName: 'Payment',
      entityId: payment.id,
      details: {
        receiptNo: payment.receiptNo,
        referenceNo: payment.referenceNo,
        amount: paymentAmount,
        currency: payment.currency,
        loanNumber: payment.loan.loanNumber,
        installmentId: payment.installmentId,
        transactionHash: tx.hash,
        fromAccountId: tx.fromAccountId,
        toAccountId: tx.toAccountId,
        remainingBalance: result.newOutstanding,
        isCompleted: result.isLoanCompleted
      },
      ipAddress
    });

    const receipt = await this.getReceipt(payment.id, viewer);

    return {
      status: PaymentStatus.SUCCESS,
      isSuccess: true,
      paymentId: payment.id,
      referenceNo: payment.referenceNo,
      receiptNo: payment.receiptNo,
      amount: paymentAmount,
      currency: payment.currency,
      transactionId: tx.hash,
      paidAt: settlementTime,
      verifiedAt: settlementTime,
      remainingLoanBalance: result.newOutstanding,
      isLoanCompleted: result.isLoanCompleted,
      message: 'Your payment was successful and verified via Bakong.',
      receipt
    };
  }

  /**
   * Check real-time payment status (Section 11)
   */
  static async getPaymentStatus(identifier: string, viewer: AuthUser) {
    const payment = await prisma.payment.findFirst({
      where: isUuid(identifier)
        ? {
            OR: [
              { id: identifier },
              { referenceNo: identifier },
              { receiptNo: identifier },
              { khqrMd5: identifier }
            ]
          }
        : {
            OR: [
              { referenceNo: identifier },
              { receiptNo: identifier },
              { khqrMd5: identifier }
            ]
          },
      include: {
        loan: {
          include: { borrower: true }
        }
      }
    });

    if (!payment) {
      throw { statusCode: 404, message: 'Payment record not found', code: 'PAYMENT_NOT_FOUND' };
    }

    if (!isStaffRole(viewer.role) && payment.loan.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view your own payment status',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    // If PENDING, check if it just succeeded on the network
    if (payment.status === PaymentStatus.PENDING) {
      if (payment.expiresAt && payment.expiresAt < new Date()) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.EXPIRED }
        });
        return {
          status: PaymentStatus.EXPIRED,
          paymentId: payment.id,
          referenceNo: payment.referenceNo,
          message: 'Payment request has expired'
        };
      }

      // Proactively check Bakong if token is available
      if (BakongService.getApiToken() && payment.khqrMd5) {
        const verifyResult = await this.verifyKhqrPayment(payment.id, viewer);
        return verifyResult;
      }
    }

    const isSuccess = payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.PAID;
    const receipt = isSuccess ? await this.getReceipt(payment.id, viewer) : null;

    return {
      status: payment.status,
      isSuccess,
      isPending: payment.status === PaymentStatus.PENDING,
      paymentId: payment.id,
      referenceNo: payment.referenceNo,
      receiptNo: payment.receiptNo,
      amount: Number(payment.amount),
      currency: payment.currency,
      transactionId: payment.khqrTransactionId,
      expiresAt: payment.expiresAt,
      secondsRemaining: payment.expiresAt
        ? Math.max(0, Math.round((new Date(payment.expiresAt).getTime() - Date.now()) / 1000))
        : 900,
      paidAt: payment.paidAt,
      verifiedAt: payment.verifiedAt,
      failureReason: payment.failureReason,
      receipt
    };
  }

  /**
   * Bakong Webhook Event Receiver (Section 21)
   */
  static async handleBakongWebhook(body: any, signatureHeader?: string) {
    if (!BakongService.verifyWebhookSignature(body, signatureHeader)) {
      throw { statusCode: 401, message: 'Invalid webhook signature', code: 'UNAUTHORIZED_WEBHOOK' };
    }

    const md5 = body.md5 || body.data?.md5;
    const billNumber = body.billNumber || body.data?.billNumber || body.referenceNo;
    const txHash = body.hash || body.data?.hash || body.transactionId;

    if (!md5 && !billNumber && !txHash) {
      throw { statusCode: 400, message: 'Missing transaction identifier in webhook payload', code: 'INVALID_PAYLOAD' };
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          md5 ? { khqrMd5: md5 } : undefined,
          billNumber ? { referenceNo: billNumber } : undefined,
          txHash ? { khqrTransactionId: txHash } : undefined
        ].filter(Boolean) as any
      },
      include: {
        loan: {
          include: { borrower: true }
        }
      }
    });

    if (!payment) {
      return { success: false, message: 'No matching payment found for webhook transaction.' };
    }

    const systemUser: AuthUser = {
      id: payment.loan.borrower.userId || 'system-webhook-agent',
      username: 'bakong_webhook',
      email: 'webhook@bakong.nbc.org.kh',
      fullName: 'Bakong System Agent',
      role: UserRole.ADMIN,
      permissions: []
    };

    const result = await this.verifyKhqrPayment(payment.id, systemUser, 'bakong-webhook');
    return { success: true, result };
  }

  /**
   * Super Admin: Dynamic Payment Summary Metrics
   * Calculates dynamic KPI aggregates directly from the database
   */
  static async getAdminPaymentSummary(viewer: AuthUser) {
    if (!isStaffRole(viewer.role)) {
      throw { statusCode: 403, message: 'Access denied: Super Admin or staff authorization required', code: 'FORBIDDEN' };
    }

    const [
      paidAggregate,
      pendingAggregate,
      failedAggregate,
      overdueSchedules,
      activeLoans
    ] = await Promise.all([
      // 1. Total Payments Received & Amount Collected
      prisma.payment.aggregate({
        where: { status: { in: [PaymentStatus.PAID, PaymentStatus.SUCCESS] } },
        _count: { id: true },
        _sum: { amount: true }
      }),
      // 2. Pending Payments
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PENDING },
        _count: { id: true },
        _sum: { amount: true }
      }),
      // 3. Failed Payments
      prisma.payment.aggregate({
        where: { status: PaymentStatus.FAILED },
        _count: { id: true },
        _sum: { amount: true }
      }),
      // 4. Overdue Installments
      prisma.repaymentSchedule.aggregate({
        where: {
          OR: [
            { status: ScheduleStatus.OVERDUE },
            {
              status: { in: [ScheduleStatus.UPCOMING, ScheduleStatus.UNPAID, ScheduleStatus.PARTIAL] },
              dueDate: { lt: new Date() }
            }
          ]
        },
        _count: { id: true },
        _sum: { remainingAmount: true }
      }),
      // 5. Total Outstanding Balance across active / overdue loans
      prisma.loan.aggregate({
        where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
        _sum: { outstandingBalance: true }
      })
    ]);

    const totalPaidAmount = Number(paidAggregate._sum.amount || 0);
    const totalPendingAmount = Number(pendingAggregate._sum.amount || 0);
    const totalFailedAmount = Number(failedAggregate._sum.amount || 0);
    const totalOverdueAmount = Number(overdueSchedules._sum.remainingAmount || 0);
    const totalOutstandingBalance = Number(activeLoans._sum.outstandingBalance || 0);

    return {
      totalPaymentsReceived: paidAggregate._count.id || 0,
      totalAmountCollected: totalPaidAmount,
      totalAmountCollectedUSD: totalPaidAmount,
      totalAmountCollectedKHR: Math.round(totalPaidAmount * 4100),
      pendingPaymentsCount: pendingAggregate._count.id || 0,
      pendingPaymentsAmount: totalPendingAmount,
      failedPaymentsCount: failedAggregate._count.id || 0,
      failedPaymentsAmount: totalFailedAmount,
      overduePaymentsCount: overdueSchedules._count.id || 0,
      overduePaymentsAmount: totalOverdueAmount,
      totalOutstandingBalance,
      totalOutstandingBalanceUSD: totalOutstandingBalance,
      totalOutstandingBalanceKHR: Math.round(totalOutstandingBalance * 4100),
      currency: 'USD',
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Super Admin: Paginated & Filtered Payment History Management Table
   * Returns enriched rows with all 13 required columns
   */
  static async listAdminPayments(filters: {
    query?: string;
    search?: string;
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    loanId?: string;
    page?: number;
    limit?: number;
  }, viewer: AuthUser) {
    if (!isStaffRole(viewer.role)) {
      throw { statusCode: 403, message: 'Access denied: Super Admin authorization required', code: 'FORBIDDEN' };
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    // 1. Text search across borrower name, email, phone, referenceNo, receiptNo, loanNumber
    const search = (filters.query || filters.search || '').trim();
    if (search) {
      where.OR = [
        { receiptNo: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        {
          loan: {
            OR: [
              { loanNumber: { contains: search, mode: 'insensitive' } },
              {
                borrower: {
                  OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { borrowerId: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            ]
          }
        }
      ];
    }

    // 2. Status filter
    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      const s = filters.status.toUpperCase();
      if (s === 'PAID') {
        where.status = { in: [PaymentStatus.PAID, PaymentStatus.SUCCESS] };
      } else if (s === 'PENDING') {
        where.status = PaymentStatus.PENDING;
      } else if (s === 'FAILED') {
        where.status = PaymentStatus.FAILED;
      } else if (s === 'PARTIAL') {
        where.status = PaymentStatus.PARTIAL;
      } else if (s === 'REFUNDED') {
        where.status = PaymentStatus.REFUNDED;
      } else if (s === 'OVERDUE') {
        // Find payments associated with overdue installments
        where.installment = { status: ScheduleStatus.OVERDUE };
      }
    }

    // 3. Payment Method filter
    if (filters.paymentMethod && filters.paymentMethod.toUpperCase() !== 'ALL') {
      const m = filters.paymentMethod.toUpperCase().replace(/[\s-]+/g, '_');
      if (m === 'CASH') where.paymentMethod = PaymentMethod.CASH;
      else if (m === 'BANK_TRANSFER' || m === 'TRANSFER') where.paymentMethod = PaymentMethod.BANK_TRANSFER;
      else if (m === 'CARD' || m === 'CREDIT_CARD') where.paymentMethod = PaymentMethod.CARD;
      else if (m === 'QR_PAYMENT' || m === 'KHQR' || m === 'QR') where.paymentMethod = PaymentMethod.QR_PAYMENT;
    }

    // 4. Date range filter
    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    // 5. Specific Loan filter
    if (filters.loanId) {
      if (isUuid(filters.loanId)) {
        where.loanId = filters.loanId;
      } else {
        where.loan = { loanNumber: filters.loanId };
      }
    }

    // 6. Specific User filter
    if (filters.userId) {
      where.loan = {
        ...((where.loan as any) || {}),
        borrower: {
          OR: [
            { id: isUuid(filters.userId) ? filters.userId : undefined },
            { borrowerId: filters.userId },
            { userId: isUuid(filters.userId) ? filters.userId : undefined }
          ].filter(Boolean) as any
        }
      };
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
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
      })
    ]);

    const items = payments.map((p) => {
      const borrower = p.loan.borrower;
      const loan = p.loan;
      const inst = p.installment;
      const amount = Number(p.amount);
      const loanAmount = Number(loan.principalAmount);
      const totalRepayment = Number(loan.totalRepayment);
      const remainingBalance = Number(loan.outstandingBalance);

      // Determine computed status (support PAID, PENDING, FAILED, OVERDUE, PARTIAL, REFUNDED)
      let displayStatus = p.status as string;
      if (p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.PAID) {
        displayStatus = 'PAID';
      } else if (p.status === PaymentStatus.PENDING) {
        displayStatus = 'PENDING';
      } else if (p.status === PaymentStatus.PARTIAL) {
        displayStatus = 'PARTIAL';
      } else if (p.status === PaymentStatus.FAILED) {
        displayStatus = 'FAILED';
      } else if (p.status === PaymentStatus.REFUNDED) {
        displayStatus = 'REFUNDED';
      }

      // Check if installment was overdue when payment was attempted or current
      const isOverdue = inst?.status === ScheduleStatus.OVERDUE || (inst && new Date(inst.dueDate) < new Date() && Number(inst.remainingAmount) > 0);
      if (displayStatus === 'PENDING' && isOverdue) {
        displayStatus = 'OVERDUE';
      }

      return {
        paymentId: p.receiptNo || p.id,
        id: p.id,
        receiptNo: p.receiptNo,
        userId: borrower?.borrowerId || borrower?.userId || borrower?.id || 'N/A',
        userInternalId: borrower?.id,
        userFullName: borrower?.fullName || 'Client Borrower',
        userEmail: borrower?.email || `${(borrower?.fullName || 'user').toLowerCase().replace(/\s+/g, '.')}@jamsongvich.com`,
        userPhone: borrower?.phone || 'N/A',
        loanId: loan.loanNumber || loan.id,
        loanInternalId: loan.id,
        productName: loan.product?.productName || 'Standard Facility',
        loanAmount,
        interestAmount: Number(loan.interestRate),
        totalRepaymentAmount: totalRepayment,
        paymentAmount: amount,
        currency: p.currency || 'USD',
        paymentMethod: p.paymentMethod,
        transactionReference: p.referenceNo,
        paymentDate: p.paymentDate.toISOString(),
        dueDate: inst?.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : new Date(loan.startDate).toISOString().slice(0, 10),
        installmentNo: inst?.installmentNo || 1,
        installmentDueDate: inst?.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : undefined,
        remainingBalance,
        paymentStatus: displayStatus,
        status: displayStatus,
        failureReason: p.failureReason,
        notes: p.notes,
        paidAt: p.paidAt ? p.paidAt.toISOString() : undefined,
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : undefined,
        confirmedBy: p.receivedByUser?.fullName || (p.status === 'PAID' ? 'System Automated Clearing' : undefined)
      };
    });

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

  /**
   * Super Admin: Confirm Pending Payment
   * Strict ACID PostgreSQL transaction with balance and installment reconciliation
   */
  static async confirmPayment(paymentId: string, caller: AuthUser, notes?: string, ipAddress?: string) {
    if (!isStaffRole(caller.role)) {
      throw { statusCode: 403, message: 'Access denied: Super Admin authorization required', code: 'FORBIDDEN' };
    }

    const existingPayment = await prisma.payment.findFirst({
      where: isUuid(paymentId)
        ? { OR: [{ id: paymentId }, { receiptNo: paymentId }, { referenceNo: paymentId }] }
        : { OR: [{ receiptNo: paymentId }, { referenceNo: paymentId }] },
      include: {
        loan: {
          include: {
            borrower: true,
            repaymentSchedules: { orderBy: { installmentNo: 'asc' } }
          }
        },
        installment: true
      }
    });

    if (!existingPayment) {
      throw { statusCode: 404, message: 'Payment record not found', code: 'PAYMENT_NOT_FOUND' };
    }

    if (existingPayment.status === PaymentStatus.PAID || existingPayment.status === PaymentStatus.SUCCESS) {
      throw { statusCode: 400, message: 'Payment is already confirmed and settled', code: 'ALREADY_PAID' };
    }

    const paymentAmount = Number(existingPayment.amount);
    const loan = existingPayment.loan;

    // Database ACID transaction
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: now,
          verifiedAt: now,
          receivedBy: caller.id,
          notes: notes ? `${existingPayment.notes || ''}\n[Confirmed by Admin]: ${notes}`.trim() : existingPayment.notes
        }
      });

      // 2. Reconcile Installment if linked, or allocate via waterfall
      let targetInstallment = existingPayment.installment;
      if (!targetInstallment) {
        targetInstallment = loan.repaymentSchedules.find(
          (s) => s.status !== ScheduleStatus.PAID && Number(s.remainingAmount) > 0
        ) || null;
      }

      let updatedInstallment = null;
      if (targetInstallment) {
        const curPaid = Number(targetInstallment.amountPaid);
        const newPaid = LoanCalculatorService.round2(curPaid + paymentAmount);
        const totalDue = Number(targetInstallment.totalDue);
        const newRemaining = Math.max(0, LoanCalculatorService.round2(totalDue - newPaid));
        const newStatus = newRemaining <= 0 ? ScheduleStatus.PAID : ScheduleStatus.PARTIAL;

        updatedInstallment = await tx.repaymentSchedule.update({
          where: { id: targetInstallment.id },
          data: {
            amountPaid: newPaid,
            remainingAmount: newRemaining,
            status: newStatus,
            settledAt: newRemaining <= 0 ? now : undefined
          }
        });
      }

      // 3. Update Loan facility balances
      const currentOutstanding = Number(loan.outstandingBalance);
      const currentTotalPaid = Number(loan.totalPaid);
      const newTotalPaid = LoanCalculatorService.round2(currentTotalPaid + paymentAmount);
      const newOutstanding = Math.max(0, LoanCalculatorService.round2(currentOutstanding - paymentAmount));
      const isLoanFullyRepaid = newOutstanding <= 0;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstanding,
          status: isLoanFullyRepaid ? LoanStatus.COMPLETED : loan.status
        }
      });

      if (isLoanFullyRepaid && (loan.borrower?.userId || loan.userId)) {
        const notifyUserId = loan.borrower?.userId || loan.userId;
        if (notifyUserId) {
          await tx.notification.create({
            data: {
              userId: notifyUserId,
              title: `Loan Fully Completed: ${loan.loanNumber}`,
              message: `Congratulations! Your loan ${loan.loanNumber} has been fully repaid. You are now eligible to apply for a new loan.`,
              type: 'LOAN_COMPLETED'
            }
          });
        }
      }

      // 4. Audit Log
      await recordAuditLog({
        userId: caller.id,
        action: 'CONFIRM_PAYMENT',
        entityName: 'Payment',
        entityId: existingPayment.id,
        details: {
          adminUsername: caller.username,
          adminEmail: caller.email,
          paymentId: existingPayment.id,
          receiptNo: existingPayment.receiptNo,
          referenceNo: existingPayment.referenceNo,
          amountPaid: paymentAmount,
          loanNumber: loan.loanNumber,
          previousOutstanding: currentOutstanding,
          newOutstanding,
          isLoanFullyRepaid,
          notes
        },
        ipAddress
      });

      return {
        payment: updatedPayment,
        installment: updatedInstallment,
        loan: updatedLoan,
        remainingBalance: newOutstanding,
        isCompleted: isLoanFullyRepaid
      };
    });

    return {
      success: true,
      message: `Payment ${existingPayment.receiptNo} successfully verified and confirmed. Loan balance updated.`,
      paymentId: result.payment.id,
      receiptNo: result.payment.receiptNo,
      status: 'PAID',
      confirmedAt: new Date().toISOString(),
      confirmedBy: caller.fullName,
      remainingLoanBalance: result.remainingBalance,
      isCompleted: result.isCompleted
    };
  }

  /**
   * Super Admin: Reject Invalid / Fraudulent Payment
   * Records failure reason and maintains immutable audit log
   */
  static async rejectPayment(paymentId: string, caller: AuthUser, reason: string, ipAddress?: string) {
    if (!isStaffRole(caller.role)) {
      throw { statusCode: 403, message: 'Access denied: Super Admin authorization required', code: 'FORBIDDEN' };
    }

    if (!reason || reason.trim().length < 3) {
      throw { statusCode: 400, message: 'A rejection reason of at least 3 characters is mandatory', code: 'REASON_REQUIRED' };
    }

    const payment = await prisma.payment.findFirst({
      where: isUuid(paymentId)
        ? { OR: [{ id: paymentId }, { receiptNo: paymentId }, { referenceNo: paymentId }] }
        : { OR: [{ receiptNo: paymentId }, { referenceNo: paymentId }] },
      include: {
        loan: { include: { borrower: true } }
      }
    });

    if (!payment) {
      throw { statusCode: 404, message: 'Payment record not found', code: 'PAYMENT_NOT_FOUND' };
    }

    if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.SUCCESS) {
      throw { statusCode: 400, message: 'Cannot reject an already confirmed and settled payment', code: 'ALREADY_PAID' };
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: reason.trim(),
        verifiedAt: new Date()
      }
    });

    await recordAuditLog({
      userId: caller.id,
      action: 'REJECT_PAYMENT',
      entityName: 'Payment',
      entityId: payment.id,
      details: {
        adminUsername: caller.username,
        adminEmail: caller.email,
        paymentId: payment.id,
        receiptNo: payment.receiptNo,
        referenceNo: payment.referenceNo,
        amount: Number(payment.amount),
        loanNumber: payment.loan.loanNumber,
        borrowerName: payment.loan.borrower.fullName,
        reason: reason.trim()
      },
      ipAddress
    });

    return {
      success: true,
      message: `Payment submission ${payment.receiptNo} rejected.`,
      paymentId: updated.id,
      receiptNo: updated.receiptNo,
      status: 'FAILED',
      failureReason: reason.trim()
    };
  }

  /**
   * Super Admin: Complete Payment History Per User (Dossier)
   * Detailed breakdown across all loans, installments, payments, and balances
   */
  static async getUserPaymentHistory(targetUserId: string, viewer: AuthUser) {
    if (!isStaffRole(viewer.role) && viewer.id !== targetUserId) {
      throw { statusCode: 403, message: 'Access denied: You can only view your own payment dossier', code: 'FORBIDDEN' };
    }

    // Find borrower by id, clientCode, borrowerId, or userId
    const borrower = await prisma.borrower.findFirst({
      where: {
        OR: [
          isUuid(targetUserId) ? { id: targetUserId } : undefined,
          isUuid(targetUserId) ? { userId: targetUserId } : undefined,
          { borrowerId: targetUserId },
          { user: { username: targetUserId } },
          { user: { email: targetUserId } }
        ].filter(Boolean) as any
      },
      include: {
        user: { select: { id: true, username: true, email: true, fullName: true, role: true } },
        loans: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { productName: true } },
            repaymentSchedules: { orderBy: { installmentNo: 'asc' } },
            payments: {
              orderBy: { paymentDate: 'desc' },
              include: {
                installment: true,
                receivedByUser: { select: { fullName: true } }
              }
            }
          }
        }
      }
    });

    if (!borrower) {
      throw { statusCode: 404, message: 'User or borrower account not found', code: 'USER_NOT_FOUND' };
    }

    const allLoans = borrower.loans;
    const allPayments: any[] = [];
    const allInstallments: any[] = [];

    let totalBorrowed = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;
    let lateRecordsCount = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    allLoans.forEach((loan) => {
      totalBorrowed += Number(loan.principalAmount);
      totalRepaid += Number(loan.totalPaid);
      totalOutstanding += Number(loan.outstandingBalance);

      loan.repaymentSchedules.forEach((s) => {
        const isLate = s.status === ScheduleStatus.OVERDUE || (new Date(s.dueDate) < new Date() && s.status !== ScheduleStatus.PAID);
        if (isLate) lateRecordsCount++;

        allInstallments.push({
          id: s.id,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          installmentNo: s.installmentNo,
          dueDate: s.dueDate.toISOString().slice(0, 10),
          principalAmount: Number(s.principalAmount),
          interestAmount: Number(s.interestAmount),
          totalDue: Number(s.totalDue),
          amountPaid: Number(s.amountPaid),
          remainingAmount: Number(s.remainingAmount),
          status: s.status,
          settledAt: s.settledAt ? s.settledAt.toISOString() : undefined
        });
      });

      loan.payments.forEach((p) => {
        if (p.status === PaymentStatus.PAID || p.status === PaymentStatus.SUCCESS) successfulCount++;
        else if (p.status === PaymentStatus.PENDING) pendingCount++;
        else if (p.status === PaymentStatus.FAILED) failedCount++;

        allPayments.push({
          id: p.id,
          paymentId: p.receiptNo || p.id,
          receiptNo: p.receiptNo,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          installmentNo: p.installment?.installmentNo || 1,
          amount: Number(p.amount),
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          referenceNo: p.referenceNo,
          paymentDate: p.paymentDate.toISOString(),
          dueDate: p.installment?.dueDate ? new Date(p.installment.dueDate).toISOString().slice(0, 10) : undefined,
          status: p.status,
          failureReason: p.failureReason,
          notes: p.notes,
          receivedBy: p.receivedByUser?.fullName || 'System'
        });
      });
    });

    // Sort all payments by paymentDate desc
    allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    return {
      user: {
        userId: borrower.borrowerId || borrower.id,
        id: borrower.id,
        fullName: borrower.fullName,
        email: borrower.email || borrower.user?.email || 'N/A',
        phone: borrower.phone || 'N/A',
        address: borrower.address || 'Phnom Penh, Cambodia',
        accountStatus: borrower.user ? 'ACTIVE' : 'REGISTERED_BORROWER'
      },
      summary: {
        totalLoansBorrowed: allLoans.length,
        totalAmountBorrowedUSD: totalBorrowed,
        totalAmountRepaidUSD: totalRepaid,
        remainingRepaymentAmountUSD: totalOutstanding,
        successfulPaymentsCount: successfulCount,
        pendingPaymentsCount: pendingCount,
        failedPaymentsCount: failedCount,
        latePaymentRecordsCount: lateRecordsCount,
        currency: 'USD'
      },
      loans: allLoans.map((l) => ({
        id: l.id,
        loanNumber: l.loanNumber,
        productName: l.product?.productName || 'Standard Facility',
        principalAmount: Number(l.principalAmount),
        interestRate: Number(l.interestRate),
        termMonths: l.termMonths,
        totalRepayment: Number(l.totalRepayment),
        totalPaid: Number(l.totalPaid),
        outstandingBalance: Number(l.outstandingBalance),
        status: l.status,
        startDate: l.startDate.toISOString().slice(0, 10),
        endDate: l.endDate.toISOString().slice(0, 10)
      })),
      installments: allInstallments,
      payments: allPayments
    };
  }

  /**
   * Super Admin: Payment Audit Log Trail
   */
  static async getPaymentAuditTrail(paymentId: string, viewer: AuthUser) {
    if (!isStaffRole(viewer.role)) {
      throw { statusCode: 403, message: 'Access denied: Super Admin authorization required', code: 'FORBIDDEN' };
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        entityName: 'Payment',
        entityId: paymentId
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } }
      }
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      adminName: log.user?.fullName || log.user?.username || 'System Administrator',
      adminRole: log.user?.role || 'ADMIN',
      details: log.details,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp.toISOString()
    }));
  }
}
