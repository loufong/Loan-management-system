import { prisma } from '../../config/prisma';
import { ApplicationStatus, LoanStatus, ScheduleStatus } from '@prisma/client';
import { LoanCalculatorService } from '../calculator/loan-calculator.service';

export class DashboardService {
  /**
   * 1. Dashboard KPI Metrics via SQL / Prisma aggregations & formulas
   */
  static async getKpis() {
    const now = new Date();

    const [
      totalApplications,
      approvedApplications,
      rejectedApplications,
      submittedApplications,
      activeLoansCount,
      overdueLoansCount,
      completedLoansCount,
      loansAgg,
      paymentsAgg,
      overdueSchedulesAgg,
      dueToDateSchedulesAgg
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
      prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
      prisma.loan.count({ where: { status: LoanStatus.COMPLETED } }),
      prisma.loan.aggregate({
        _sum: {
          principalAmount: true,
          totalRepayment: true,
          totalPaid: true,
          outstandingBalance: true
        }
      }),
      prisma.payment.aggregate({
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      }),
      prisma.repaymentSchedule.aggregate({
        where: {
          dueDate: { lt: now },
          remainingAmount: { gt: 0 },
          status: { not: ScheduleStatus.PAID }
        },
        _sum: {
          remainingAmount: true
        }
      }),
      prisma.repaymentSchedule.aggregate({
        where: {
          dueDate: { lte: now }
        },
        _sum: {
          totalDue: true
        }
      })
    ]);

    const totalDisbursedAmount = LoanCalculatorService.round2(
      Number(loansAgg._sum.principalAmount || 0)
    );
    const totalOutstandingBalance = LoanCalculatorService.round2(
      Number(loansAgg._sum.outstandingBalance || 0)
    );
    const totalCollectedAmount = LoanCalculatorService.round2(
      Number(paymentsAgg._sum.amount || loansAgg._sum.totalPaid || 0)
    );
    const totalOverdueAmount = LoanCalculatorService.round2(
      Number(overdueSchedulesAgg._sum.remainingAmount || 0)
    );
    const totalDueToDate = LoanCalculatorService.round2(
      Number(dueToDateSchedulesAgg._sum.totalDue || 0)
    );

    // Formula-based KPIs:
    // 1. approvalRate = (approvedApplications / submittedApplications) * 100
    const denominatorApps = submittedApplications > 0 ? submittedApplications : totalApplications;
    const approvalRate = denominatorApps > 0
      ? LoanCalculatorService.round2((approvedApplications / denominatorApps) * 100)
      : 0;

    // 2. repaymentRate = (totalCollectedAmount / totalDueToDate) * 100
    const denominatorRepayment = totalDueToDate > 0
      ? totalDueToDate
      : totalCollectedAmount + totalOutstandingBalance;
    const repaymentRate = denominatorRepayment > 0
      ? LoanCalculatorService.round2((totalCollectedAmount / denominatorRepayment) * 100)
      : 0;

    // 3. overdueRate = (totalOverdueAmount / totalOutstandingBalance) * 100
    const overdueRate = totalOutstandingBalance > 0
      ? LoanCalculatorService.round2((totalOverdueAmount / totalOutstandingBalance) * 100)
      : 0;

    return {
      // Direct prompt requested metrics:
      totalApplications,
      approvedApplications,
      rejectedApplications,
      activeLoansCount,
      overdueLoansCount,
      completedLoansCount,
      totalDisbursedAmount,
      totalOutstandingBalance,
      totalCollectedAmount,
      totalOverdueAmount,
      approvalRate,
      repaymentRate,
      overdueRate,

      // Nested groupings for backwards compatibility:
      counts: {
        applications: totalApplications,
        approvals: approvedApplications,
        rejections: rejectedApplications,
        active: activeLoansCount,
        overdue: overdueLoansCount,
        completed: completedLoansCount
      },
      financials: {
        totalDisbursed: totalDisbursedAmount,
        outstandingBalance: totalOutstandingBalance,
        totalCollected: totalCollectedAmount,
        totalOverdue: totalOverdueAmount
      },
      ratios: {
        approvalRate,
        repaymentRate,
        overdueRate
      }
    };
  }

  /**
   * 2. Analytics Trend: Last 6 months of disbursed totals vs collected totals
   */
  static async getDisbursementVsCollectionTrend() {
    const now = new Date();
    const monthsData: {
      month: string;
      monthLabel: string;
      startDate: Date;
      endDate: Date;
      disbursed: number;
      collected: number;
      netCashFlow: number;
    }[] = [];

    // Build last 6 calendar month ranges
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const year = d.getFullYear();
      const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${monthNumber}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      monthsData.push({
        month: monthKey,
        monthLabel,
        startDate: startOfMonth,
        endDate: endOfMonth,
        disbursed: 0,
        collected: 0,
        netCashFlow: 0
      });
    }

    const earliestStart = monthsData[0].startDate;

    // Query disbursements and payments within the 6-month window
    const [disbursements, payments] = await Promise.all([
      prisma.disbursement.findMany({
        where: {
          disbursementDate: { gte: earliestStart }
        },
        select: {
          amount: true,
          disbursementDate: true
        }
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: earliestStart }
        },
        select: {
          amount: true,
          paymentDate: true
        }
      })
    ]);

    for (const item of monthsData) {
      const monthDisbursed = disbursements
        .filter((d) => {
          const dt = new Date(d.disbursementDate);
          return dt >= item.startDate && dt <= item.endDate;
        })
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const monthCollected = payments
        .filter((p) => {
          const pt = new Date(p.paymentDate);
          return pt >= item.startDate && pt <= item.endDate;
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      item.disbursed = LoanCalculatorService.round2(monthDisbursed);
      item.collected = LoanCalculatorService.round2(monthCollected);
      item.netCashFlow = LoanCalculatorService.round2(monthCollected - monthDisbursed);
    }

    return monthsData.map(({ month, monthLabel, disbursed, collected, netCashFlow }) => ({
      month,
      monthLabel,
      disbursed,
      collected,
      disbursedAmount: disbursed,
      collectedAmount: collected,
      netCashFlow
    }));
  }

  /**
   * 3. Analytics Trend: Breakdown of active loan value grouped by loan product
   */
  static async getPortfolioByProduct() {
    const products = await prisma.loanProduct.findMany({
      include: {
        loans: {
          where: {
            status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
          },
          select: {
            principalAmount: true,
            outstandingBalance: true,
            totalRepayment: true
          }
        }
      }
    });

    let totalActivePortfolio = 0;
    const productStats = products.map((p) => {
      const activeLoansCount = p.loans.length;
      const totalPrincipal = LoanCalculatorService.round2(
        p.loans.reduce((acc, l) => acc + Number(l.principalAmount), 0)
      );
      const totalOutstanding = LoanCalculatorService.round2(
        p.loans.reduce((acc, l) => acc + Number(l.outstandingBalance), 0)
      );
      totalActivePortfolio += totalOutstanding;

      return {
        productId: p.id,
        productName: p.productName,
        activeLoansCount,
        totalPrincipal,
        totalOutstanding,
        activeLoanValue: totalOutstanding,
        percentage: 0
      };
    });

    // Calculate percentage share of total active portfolio
    for (const stat of productStats) {
      stat.percentage = totalActivePortfolio > 0
        ? LoanCalculatorService.round2((stat.activeLoanValue / totalActivePortfolio) * 100)
        : 0;
    }

    return productStats;
  }
}
