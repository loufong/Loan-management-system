import { prisma } from '../../config/prisma';
import { ApplicationStatus, LoanStatus, ScheduleStatus } from '@prisma/client';
import { LoanCalculatorService } from '../calculator/loan-calculator.service';
import { generateCsv } from '../../utils/csv';

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  productId?: string;
  product?: string;
  status?: string;
  paymentMethod?: string;
  cashierId?: string;
}

export class ReportService {
  /**
   * 1. High-Performance KPI Dashboard Summary with Mathematical Models
   */
  static async getKpiSummary() {
    const now = new Date();

    const [
      totalApplications,
      approvedApps,
      rejectedApps,
      submittedApps,
      totalLoans,
      activeLoans,
      completedLoans,
      overdueLoans,
      loansAgg,
      paymentsAgg,
      overdueSchedulesAgg,
      dueToDateSchedulesAgg,
      products
    ] = await Promise.all([
      prisma.loanApplication.count(),
      prisma.loanApplication.count({ where: { status: ApplicationStatus.APPROVED } }),
      prisma.loanApplication.count({ where: { status: ApplicationStatus.REJECTED } }),
      prisma.loanApplication.count({
        where: {
          status: {
            in: [
              ApplicationStatus.SUBMITTED,
              ApplicationStatus.UNDER_REVIEW,
              ApplicationStatus.APPROVED,
              ApplicationStatus.REJECTED,
              ApplicationStatus.DISBURSED
            ]
          }
        }
      }),
      prisma.loan.count(),
      prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      prisma.loan.count({ where: { status: LoanStatus.COMPLETED } }),
      prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
      prisma.loan.aggregate({
        _sum: {
          principalAmount: true,
          totalRepayment: true,
          totalPaid: true,
          outstandingBalance: true
        }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.repaymentSchedule.aggregate({
        where: {
          dueDate: { lt: now },
          remainingAmount: { gt: 0 },
          status: { not: ScheduleStatus.PAID }
        },
        _sum: { remainingAmount: true }
      }),
      prisma.repaymentSchedule.aggregate({
        where: { dueDate: { lte: now } },
        _sum: { totalDue: true }
      }),
      prisma.loanProduct.findMany({
        include: {
          _count: { select: { loans: true } },
          loans: {
            select: { principalAmount: true, outstandingBalance: true }
          }
        }
      })
    ]);

    const totalDisbursed = Number(loansAgg._sum.principalAmount || 0);
    const totalExpectedRepayment = Number(loansAgg._sum.totalRepayment || 0);
    const totalCollected = Number(paymentsAgg._sum.amount || 0);
    const totalOutstanding = Number(loansAgg._sum.outstandingBalance || 0);
    const totalOverdueAmount = Number(overdueSchedulesAgg._sum.remainingAmount || 0);
    const totalDueToDate = Number(dueToDateSchedulesAgg._sum.totalDue || 0);

    // Mathematical KPIs
    const approvalRate = submittedApps > 0
      ? LoanCalculatorService.round2((approvedApps / submittedApps) * 100)
      : 0.0;

    const repaymentRate = totalDueToDate > 0
      ? LoanCalculatorService.round2((totalCollected / totalDueToDate) * 100)
      : 0.0;

    const overdueRate = totalOutstanding > 0
      ? LoanCalculatorService.round2((totalOverdueAmount / totalOutstanding) * 100)
      : 0.0;

    // Portfolio distribution by loan product
    const portfolioByProduct = products.map((p) => {
      const productPrincipal = p.loans.reduce((acc, l) => acc + Number(l.principalAmount), 0);
      const productOutstanding = p.loans.reduce((acc, l) => acc + Number(l.outstandingBalance), 0);
      const sharePercentage = totalDisbursed > 0
        ? LoanCalculatorService.round2((productPrincipal / totalDisbursed) * 100)
        : 0;

      return {
        productId: p.id,
        productName: p.productName,
        activeLoansCount: p._count.loans,
        totalPrincipal: productPrincipal,
        totalOutstanding: productOutstanding,
        sharePercentage
      };
    });

    return {
      metricCards: {
        totalApplications,
        approvedApplications: approvedApps,
        rejectedApplications: rejectedApps,
        submittedApplications: submittedApps,
        totalLoans,
        activeLoans,
        completedLoans,
        overdueLoans,
        totalDisbursedAmount: totalDisbursed,
        totalExpectedRepayment,
        totalPaymentsCollected: totalCollected,
        totalOutstandingBalance: totalOutstanding,
        totalOverdueAmount,
        totalTransactionsCount: paymentsAgg._count.id
      },
      mathematicalKpis: {
        approvalRatePercentage: approvalRate,
        repaymentRatePercentage: repaymentRate,
        overdueRatePercentage: overdueRate
      },
      portfolioByProduct
    };
  }

  /**
   * 2. Applications Report
   * Filters: date range (startDate, endDate), product (productId or product), status, search
   */
  static async getApplicationsReport(filters: ReportFilterDto) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    } else if (filters.product) {
      where.product = { productName: { contains: filters.product, mode: 'insensitive' } };
    }

    if (filters.search) {
      where.OR = [
        { applicationNo: { contains: filters.search, mode: 'insensitive' } },
        { borrower: { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { product: { productName: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    const apps = await prisma.loanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: { select: { borrowerId: true, fullName: true, phone: true } },
        product: { select: { productName: true } }
      }
    });

    return apps.map((a) => ({
      applicationNo: a.applicationNo,
      borrowerId: a.borrower.borrowerId,
      borrowerName: a.borrower.fullName,
      phone: a.borrower.phone,
      productName: a.product.productName,
      requestedAmount: Number(a.requestedAmount),
      requestedTerm: a.requestedTerm,
      status: a.status,
      applicationDate: a.createdAt
    }));
  }

  /**
   * 3. Approved Loans Report
   */
  static async getApprovedLoansReport(filters: ReportFilterDto) {
    const where: any = { decision: 'APPROVED' };
    if (filters.startDate || filters.endDate) {
      where.decisionDate = {};
      if (filters.startDate) where.decisionDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.decisionDate.lte = new Date(filters.endDate);
    }

    const approvals = await prisma.applicationApproval.findMany({
      where,
      orderBy: { decisionDate: 'desc' },
      include: {
        application: {
          include: {
            borrower: true,
            product: true,
            loan: true
          }
        },
        approver: { select: { fullName: true } }
      }
    });

    return approvals.map((appr) => ({
      borrowerName: appr.application.borrower.fullName,
      borrowerId: appr.application.borrower.borrowerId,
      applicationNo: appr.application.applicationNo,
      loanNumber: appr.application.loan?.loanNumber || 'Pending Creation',
      productName: appr.application.product.productName,
      approvedAmount: Number(appr.approvedAmount || appr.application.requestedAmount),
      approvedRate: Number(appr.approvedInterestRate || appr.application.product.interestRate),
      approvedTerm: appr.approvedTerm || appr.application.requestedTerm,
      approverName: appr.approver.fullName,
      approvalDate: appr.decisionDate
    }));
  }

  /**
   * 4. Rejected Loans Report
   */
  static async getRejectedLoansReport(filters: ReportFilterDto) {
    const where: any = { decision: 'REJECTED' };
    if (filters.startDate || filters.endDate) {
      where.decisionDate = {};
      if (filters.startDate) where.decisionDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.decisionDate.lte = new Date(filters.endDate);
    }

    const rejections = await prisma.applicationApproval.findMany({
      where,
      orderBy: { decisionDate: 'desc' },
      include: {
        application: {
          include: { borrower: true, product: true }
        },
        approver: { select: { fullName: true } }
      }
    });

    return rejections.map((rej) => ({
      borrowerName: rej.application.borrower.fullName,
      borrowerId: rej.application.borrower.borrowerId,
      applicationNo: rej.application.applicationNo,
      productName: rej.application.product.productName,
      requestedAmount: Number(rej.application.requestedAmount),
      rejectionReason: rej.rejectionReason || 'Underwriting criteria not satisfied',
      rejectedBy: rej.approver.fullName,
      rejectionDate: rej.decisionDate
    }));
  }

  /**
   * 5. Active Loans Report
   * Fields: Active loans, total repayment, total paid, remaining balance, next due date
   */
  static async getActiveLoansReport(filters: ReportFilterDto) {
    const where: any = { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } };
    if (filters.productId) where.productId = filters.productId;

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        product: true,
        repaymentSchedules: {
          where: { status: { in: [ScheduleStatus.UPCOMING, ScheduleStatus.UNPAID, ScheduleStatus.PARTIAL, ScheduleStatus.OVERDUE] } },
          orderBy: { installmentNo: 'asc' },
          take: 1
        }
      }
    });

    return loans.map((l) => {
      const nextSchedule = l.repaymentSchedules[0];
      const totalRepay = Number(l.totalRepayment);
      const totalPaid = Number(l.totalPaid);
      const outstanding = Number(l.outstandingBalance);
      const progress = totalRepay > 0 ? Number(((totalPaid / totalRepay) * 100).toFixed(2)) : 0;

      return {
        loanNumber: l.loanNumber,
        borrowerId: l.borrower.borrowerId,
        borrowerName: l.borrower.fullName,
        phone: l.borrower.phone,
        productName: l.product.productName,
        principalAmount: Number(l.principalAmount),
        totalRepayment: totalRepay,
        totalPaid,
        remainingBalance: outstanding,
        outstandingBalance: outstanding,
        repaymentProgress: `${progress}%`,
        status: l.status,
        nextDueDate: nextSchedule?.dueDate || null,
        nextDueAmount: nextSchedule ? Number(nextSchedule.remainingAmount) : 0
      };
    });
  }

  /**
   * 6. Overdue Loans Report
   * Fields: Overdue loans, borrower contact, days late, overdue amount
   */
  static async getOverdueLoansReport(filters: ReportFilterDto) {
    const overdueSchedules = await prisma.repaymentSchedule.findMany({
      where: {
        status: ScheduleStatus.OVERDUE,
        remainingAmount: { gt: 0 }
      },
      orderBy: { dueDate: 'asc' },
      include: {
        loan: {
          include: { borrower: true, product: true }
        }
      }
    });

    const now = new Date();

    return overdueSchedules.map((s) => {
      const diffDays = Math.max(1, Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
      const overdueAmt = Number(s.remainingAmount);
      const lateFee = LoanCalculatorService.round2(overdueAmt * 0.001 * diffDays);

      return {
        loanNumber: s.loan.loanNumber,
        borrowerId: s.loan.borrower.borrowerId,
        borrowerName: s.loan.borrower.fullName,
        phone: s.loan.borrower.phone,
        email: s.loan.borrower.email,
        borrowerContact: `${s.loan.borrower.phone} (${s.loan.borrower.email})`,
        daysLate: diffDays,
        daysOverdue: diffDays,
        overdueAmount: overdueAmt,
        installmentNo: s.installmentNo,
        dueDate: s.dueDate,
        simulatedLateFee: lateFee,
        totalDueWithPenalty: LoanCalculatorService.round2(overdueAmt + lateFee)
      };
    });
  }

  /**
   * 7. Daily Collections Report
   * Grouped by Date (YYYY-MM-DD), Payment Method, and Cashier
   */
  static async getDailyCollectionsReport(filters: ReportFilterDto) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }
    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }
    if (filters.cashierId) {
      where.receivedBy = filters.cashierId;
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        receivedByUser: { select: { id: true, fullName: true, username: true } }
      }
    });

    const groupMap = new Map<string, {
      date: string;
      paymentMethod: string;
      cashierId: string;
      cashierName: string;
      totalCollected: number;
      transactionCount: number;
    }>();

    for (const p of payments) {
      const pDate = new Date(p.paymentDate);
      const dateKey = pDate.toISOString().split('T')[0];
      const cashierId = p.receivedByUser?.id || p.receivedBy || 'SYSTEM';
      const cashierName = p.receivedByUser?.fullName || p.receivedByUser?.username || 'Cashier Desk';
      const method = p.paymentMethod;

      const groupKey = `${dateKey}_${method}_${cashierId}`;
      const existing = groupMap.get(groupKey) || {
        date: dateKey,
        paymentMethod: method,
        cashierId,
        cashierName,
        totalCollected: 0,
        transactionCount: 0
      };

      existing.totalCollected = LoanCalculatorService.round2(existing.totalCollected + Number(p.amount));
      existing.transactionCount += 1;
      groupMap.set(groupKey, existing);
    }

    return Array.from(groupMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * 8. Disbursements Report
   */
  static async getDisbursementsReport(filters: ReportFilterDto) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.disbursementDate = {};
      if (filters.startDate) where.disbursementDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.disbursementDate.lte = new Date(filters.endDate);
    }

    const disbursements = await prisma.disbursement.findMany({
      where,
      orderBy: { disbursementDate: 'desc' },
      include: {
        loan: {
          include: { borrower: true, product: true }
        },
        disbursedByUser: { select: { fullName: true } }
      }
    });

    return disbursements.map((d) => ({
      disbursementId: d.id,
      loanNumber: d.loan.loanNumber,
      borrowerId: d.loan.borrower.borrowerId,
      borrowerName: d.loan.borrower.fullName,
      productName: d.loan.product.productName,
      amount: Number(d.amount),
      paymentMethod: d.paymentMethod,
      referenceNo: d.referenceNo,
      disbursedBy: d.disbursedByUser.fullName,
      disbursementDate: d.disbursementDate,
      status: d.status
    }));
  }

  /**
   * 9. Flat Collections Report
   */
  static async getCollectionsReport(filters: ReportFilterDto) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: {
          include: { borrower: true, product: true }
        },
        receivedByUser: { select: { fullName: true } }
      }
    });

    return payments.map((p) => ({
      receiptNo: p.receiptNo,
      loanNumber: p.loan.loanNumber,
      borrowerId: p.loan.borrower.borrowerId,
      borrowerName: p.loan.borrower.fullName,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      referenceNo: p.referenceNo,
      receivedBy: p.receivedByUser.fullName,
      paymentDate: p.paymentDate,
      status: p.status
    }));
  }

  /**
   * 10. CSV Exporter Utility
   */
  static async exportReportCsv(reportType: string, filters: ReportFilterDto): Promise<string> {
    let data: any[] = [];

    switch (reportType.toLowerCase()) {
      case 'applications':
        data = await this.getApplicationsReport(filters);
        break;
      case 'approved-loans':
        data = await this.getApprovedLoansReport(filters);
        break;
      case 'rejected-loans':
        data = await this.getRejectedLoansReport(filters);
        break;
      case 'active-loans':
        data = await this.getActiveLoansReport(filters);
        break;
      case 'overdue-loans':
        data = await this.getOverdueLoansReport(filters);
        break;
      case 'daily-collections':
        data = await this.getDailyCollectionsReport(filters);
        break;
      case 'disbursements':
        data = await this.getDisbursementsReport(filters);
        break;
      case 'collections':
      default:
        data = await this.getCollectionsReport(filters);
        break;
    }

    if (data.length === 0) {
      return 'No data available for the selected report filters.';
    }

    const headers = Object.keys(data[0]);
    return generateCsv(headers, data);
  }
}
