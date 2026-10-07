import { prisma } from '../../config/prisma';
import {
  LoanStatus,
  DisbursementMethod,
  DisbursementStatus,
  ScheduleStatus,
  ApplicationStatus,
  Prisma,
  UserRole
} from '@prisma/client';
import { recordAuditLog } from '../../utils/audit';
import { LoanCalculatorService } from '../calculator/loan-calculator.service';
import { AuthUser } from '../../middlewares/auth.middleware';

export interface DisburseLoanDto {
  loanId: string;
  disbursedById: string;
  paymentMethod: DisbursementMethod;
  referenceNo: string;
  notes?: string;
  disbursementDate?: Date | string;
  ipAddress?: string;
}

export class LoanService {
  /**
   * List loans scoped to borrower or filtered by status
   */
  static async listLoans(
    viewer: AuthUser,
    statusOrFilters?: LoanStatus | {
      status?: LoanStatus;
      borrower?: string;
      borrowerId?: string;
      loanNumber?: string;
    }
  ) {
    const where: any = {};
    if (typeof statusOrFilters === 'string') {
      where.status = statusOrFilters;
    } else if (statusOrFilters && typeof statusOrFilters === 'object') {
      if (statusOrFilters.status) where.status = statusOrFilters.status;
      if (statusOrFilters.loanNumber) where.loanNumber = { contains: statusOrFilters.loanNumber, mode: 'insensitive' };
      if (statusOrFilters.borrowerId || statusOrFilters.borrower) {
        const b = statusOrFilters.borrowerId || statusOrFilters.borrower;
        where.OR = [
          { borrowerId: b },
          { borrower: { borrowerId: b } },
          { borrower: { fullName: { contains: b, mode: 'insensitive' } } }
        ];
      }
    }

    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER) {
      const borrower = await prisma.borrower.findFirst({
        where: { userId: viewer.id }
      });
      if (!borrower) return [];
      where.borrowerId = borrower.id;
    }

    return prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: {
          select: { id: true, borrowerId: true, fullName: true, phone: true }
        },
        product: {
          select: { id: true, productName: true, repaymentFrequency: true }
        },
        _count: {
          select: { payments: true, repaymentSchedules: true }
        }
      }
    });
  }

  /**
   * Get single loan ledger with schedules and payment history
   */
  static async getLoanById(id: string, viewer: AuthUser) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: true,
        product: true,
        application: {
          select: { id: true, applicationNo: true, purpose: true, status: true }
        },
        disbursements: {
          orderBy: { disbursementDate: 'desc' },
          include: {
            disbursedByUser: {
              select: { id: true, username: true, fullName: true }
            }
          }
        },
        repaymentSchedules: {
          orderBy: { installmentNo: 'asc' },
          include: {
            payments: {
              select: {
                id: true,
                receiptNo: true,
                amount: true,
                paymentDate: true,
                paymentMethod: true
              }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            receivedByUser: {
              select: { id: true, username: true, fullName: true }
            }
          }
        }
      }
    });

    if (!loan) {
      throw { statusCode: 404, message: 'Loan account not found', code: 'LOAN_NOT_FOUND' };
    }

    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER && loan.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view your own loan account',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    // Calculate repayment progress percentage
    const totalRepay = Number(loan.totalRepayment);
    const totalPaid = Number(loan.totalPaid);
    const repaymentProgress = totalRepay > 0 ? Number(((totalPaid / totalRepay) * 100).toFixed(2)) : 0;

    // Next payment due banner
    const nextDueSchedule = loan.repaymentSchedules.find(
      (s) => s.status === ScheduleStatus.UNPAID || s.status === ScheduleStatus.PARTIAL || s.status === ScheduleStatus.OVERDUE
    );
    const nextPaymentDueBanner = nextDueSchedule
      ? {
          installmentNo: nextDueSchedule.installmentNo,
          dueDate: nextDueSchedule.dueDate,
          amountDue: Number(nextDueSchedule.remainingAmount),
          status: nextDueSchedule.status
        }
      : null;

    return {
      ...loan,
      repaymentProgress,
      nextPaymentDueBanner
    };
  }

  /**
   * Get individual loan schedules
   */
  static async getLoanSchedules(loanId: string, viewer: AuthUser) {
    const loan = await prisma.loan.findFirst({
      where: {
        OR: [
          { id: loanId },
          { applicationId: loanId },
          { loanNumber: loanId }
        ]
      },
      include: {
        borrower: { select: { userId: true } },
        repaymentSchedules: {
          orderBy: { installmentNo: 'asc' },
          include: {
            payments: {
              select: {
                id: true,
                receiptNo: true,
                amount: true,
                paymentDate: true
              }
            }
          }
        }
      }
    });

    if (!loan) {
      throw { statusCode: 404, message: 'Loan not found', code: 'LOAN_NOT_FOUND' };
    }

    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER && loan.borrower.userId !== viewer.id) {
      throw { statusCode: 403, message: 'Access denied: you can only view your own loan schedules', code: 'FORBIDDEN_OWNERSHIP' };
    }

    return loan.repaymentSchedules;
  }

  /**
   * Core Banking: Disburse Loan & Activate Repayment Schedule
   * Rule 1: A Loan cannot be disbursed unless Application status = APPROVED.
   * Rule 2: Loan must be in PENDING status.
   * Rule 3: Executed in an ACID transaction.
   * Rule 4: Installment 1 is set to UNPAID; future installments to UPCOMING.
   */
  static async disburseLoan(dto: DisburseLoanDto) {
    const targetLoan = await prisma.loan.findFirst({
      where: {
        OR: [
          { id: dto.loanId },
          { applicationId: dto.loanId },
          { loanNumber: dto.loanId },
          { application: { applicationNo: dto.loanId } }
        ]
      },
      include: {
        product: true,
        application: true,
        borrower: true
      }
    });

    let activeLoan = targetLoan;

    if (!activeLoan) {
      const app = await prisma.loanApplication.findFirst({
        where: {
          OR: [
            { id: dto.loanId },
            { applicationNo: dto.loanId }
          ]
        },
        include: { product: true, borrower: true }
      });
      if (!app) {
        throw { statusCode: 404, message: 'Loan account or approved application not found', code: 'LOAN_NOT_FOUND' };
      }
      if (app.status !== ApplicationStatus.APPROVED) {
        throw {
          statusCode: 400,
          message: 'Disbursement rejected: Requires Credit Committee authorization prior to fund release.',
          code: 'APPLICATION_NOT_APPROVED'
        };
      }

      const currentYear = new Date().getFullYear();
      const loanCount = await prisma.loan.count();
      const loanNumber = `LN-${currentYear}-${String(loanCount + 1).padStart(4, '0')}`;
      const principal = Number(app.requestedAmount);
      const interestRate = Number(app.product.interestRate);
      const calc = LoanCalculatorService.calculateSimpleInterest({
        principal,
        annualInterestRate: interestRate,
        termMonths: app.requestedTerm,
        repaymentFrequency: app.product.repaymentFrequency
      });

      activeLoan = await prisma.loan.create({
        data: {
          loanNumber,
          applicationId: app.id,
          borrowerId: app.borrowerId,
          productId: app.productId,
          principalAmount: new Prisma.Decimal(principal),
          interestRate: new Prisma.Decimal(interestRate),
          termMonths: app.requestedTerm,
          repaymentFrequency: app.product.repaymentFrequency,
          totalInterest: new Prisma.Decimal(calc.totalInterest),
          totalRepayment: new Prisma.Decimal(calc.totalRepayment),
          totalPaid: new Prisma.Decimal(0.00),
          outstandingBalance: new Prisma.Decimal(calc.totalRepayment),
          startDate: new Date(),
          endDate: calc.maturityDate,
          status: LoanStatus.PENDING
        },
        include: { product: true, application: true, borrower: true }
      });
    }

    if (!activeLoan) {
      throw { statusCode: 404, message: 'Loan account not found', code: 'LOAN_NOT_FOUND' };
    }

    // Rule 1: Application must be APPROVED
    if (activeLoan.application.status !== ApplicationStatus.APPROVED) {
      throw {
        statusCode: 400,
        message: 'Disbursement rejected: Requires Credit Committee authorization prior to fund release.',
        code: 'APPLICATION_NOT_APPROVED'
      };
    }

    // Rule 2: Loan must be PENDING
    if (activeLoan.status !== LoanStatus.PENDING) {
      throw {
        statusCode: 400,
        message: `Disbursement rejected: Loan account is currently in '${activeLoan.status}' status. Only PENDING loans can be disbursed.`,
        code: 'INVALID_LOAN_STATUS'
      };
    }

    const disbursementDate = dto.disbursementDate ? new Date(dto.disbursementDate) : new Date();

    // Compute repayment schedule using financial engine
    const calculation = LoanCalculatorService.calculateSimpleInterest({
      principal: Number(activeLoan.principalAmount),
      annualInterestRate: Number(activeLoan.interestRate),
      termMonths: activeLoan.termMonths,
      repaymentFrequency: activeLoan.repaymentFrequency,
      startDate: disbursementDate
    });

    const result = await prisma.$transaction(async (tx) => {
      // a. Create record in Disbursement table
      const disbursement = await tx.disbursement.create({
        data: {
          loanId: activeLoan.id,
          disbursementDate,
          amount: activeLoan.principalAmount,
          paymentMethod: dto.paymentMethod,
          referenceNo: dto.referenceNo,
          disbursedBy: dto.disbursedById,
          status: DisbursementStatus.DISBURSED,
          notes: dto.notes || null
        }
      });

      // b. Activate Loan record
      const updatedLoan = await tx.loan.update({
        where: { id: activeLoan.id },
        data: {
          startDate: disbursementDate,
          endDate: calculation.maturityDate,
          totalInterest: new Prisma.Decimal(calculation.totalInterest),
          totalRepayment: new Prisma.Decimal(calculation.totalRepayment),
          totalPaid: new Prisma.Decimal(0.00),
          outstandingBalance: new Prisma.Decimal(calculation.totalRepayment),
          status: LoanStatus.ACTIVE
        }
      });

      // c. Generate RepaymentSchedule installments:
      // Installment 1 = UNPAID, Installments 2..N = UPCOMING
      const schedules = [];
      for (const item of calculation.schedules) {
        const initialStatus = item.installmentNo === 1 ? ScheduleStatus.UNPAID : ScheduleStatus.UPCOMING;

        const sched = await tx.repaymentSchedule.create({
          data: {
            loanId: activeLoan.id,
            installmentNo: item.installmentNo,
            dueDate: item.dueDate,
            principalAmount: new Prisma.Decimal(item.principalAmount),
            interestAmount: new Prisma.Decimal(item.interestAmount),
            totalDue: new Prisma.Decimal(item.totalDue),
            amountPaid: new Prisma.Decimal(0.00),
            remainingAmount: new Prisma.Decimal(item.totalDue),
            status: initialStatus
          }
        });
        schedules.push(sched);
      }

      // d. Update Application status to DISBURSED
      await tx.loanApplication.update({
        where: { id: activeLoan.applicationId },
        data: { status: ApplicationStatus.DISBURSED }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: activeLoan.applicationId,
          previousStatus: ApplicationStatus.APPROVED,
          newStatus: ApplicationStatus.DISBURSED,
          changedBy: dto.disbursedById,
          note: `Loan disbursed via ${dto.paymentMethod} (Ref: ${dto.referenceNo})`
        }
      });

      // e. Notify borrower
      if (activeLoan.borrower.userId) {
        await tx.notification.create({
          data: {
            userId: activeLoan.borrower.userId,
            title: `Funds Disbursed: ${activeLoan.loanNumber}`,
            message: `Your loan ${activeLoan.loanNumber} for $${Number(activeLoan.principalAmount).toLocaleString()} has been disbursed via ${dto.paymentMethod} (Ref: ${dto.referenceNo}). Installment 1 is due on ${calculation.schedules[0].dueDate.toLocaleDateString()}.`,
            type: 'LOAN_DISBURSED'
          }
        });
      }

      return {
        disbursement,
        loan: updatedLoan,
        totalInstallments: calculation.schedules.length,
        firstDueDate: calculation.schedules[0].dueDate,
        schedules
      };
    });

    await recordAuditLog({
      userId: dto.disbursedById,
      action: 'DISBURSE_LOAN',
      entityName: 'Disbursement',
      entityId: result.disbursement.id,
      details: {
        loanNumber: activeLoan.loanNumber,
        amount: Number(activeLoan.principalAmount),
        paymentMethod: dto.paymentMethod,
        referenceNo: dto.referenceNo
      },
      ipAddress: dto.ipAddress
    });

    return result;
  }

  /**
   * List all disbursements (Staff: CASHIER, MANAGER, ADMIN)
   */
  static async listDisbursements() {
    return prisma.disbursement.findMany({
      orderBy: { disbursementDate: 'desc' },
      include: {
        loan: {
          include: {
            borrower: {
              select: { id: true, borrowerId: true, fullName: true, phone: true }
            },
            product: {
              select: { productName: true }
            }
          }
        },
        disbursedByUser: {
          select: { id: true, username: true, fullName: true, role: true }
        }
      }
    });
  }
}
