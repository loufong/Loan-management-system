import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { DashboardService } from './dashboard.service';
import { ApplicationStatus, LoanStatus } from '@prisma/client';

export class DashboardController {
  /**
   * 1. Dashboard KPI Metrics Endpoint: GET /api/dashboard/kpis
   */
  static async getKpis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kpis = await DashboardService.getKpis();
      sendSuccess(res, kpis, 'Dashboard KPIs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 2. Analytics Trend: GET /api/dashboard/charts/disbursement-vs-collection
   */
  static async getDisbursementVsCollection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getDisbursementVsCollectionTrend();
      sendSuccess(res, data, 'Disbursement vs collection trend retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 3. Analytics Trend: GET /api/dashboard/charts/portfolio-by-product
   */
  static async getPortfolioByProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getPortfolioByProduct();
      sendSuccess(res, data, 'Portfolio breakdown by product retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 4. Comprehensive Metrics Overview: GET /api/dashboard/metrics
   */
  static async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalBorrowers,
        totalApplications,
        pendingApps,
        approvedApps,
        totalLoans,
        activeLoans,
        overdueLoans,
        completedLoans,
        loansAggregate,
        paymentsAggregate,
        recentLogs
      ] = await Promise.all([
        prisma.borrower.count(),
        prisma.loanApplication.count(),
        prisma.loanApplication.count({
          where: {
            status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] }
          }
        }),
        prisma.loanApplication.count({
          where: { status: ApplicationStatus.APPROVED }
        }),
        prisma.loan.count(),
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
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: { username: true, fullName: true, role: true }
            }
          }
        })
      ]);

      const metrics = {
        overview: {
          totalBorrowers,
          totalApplications,
          pendingApplications: pendingApps,
          approvedApplications: approvedApps
        },
        portfolio: {
          totalLoans,
          activeLoans,
          overdueLoans,
          completedLoans,
          totalPrincipalDisbursed: loansAggregate._sum.principalAmount || 0,
          totalExpectedRepayment: loansAggregate._sum.totalRepayment || 0,
          totalCollected: loansAggregate._sum.totalPaid || 0,
          totalOutstandingBalance: loansAggregate._sum.outstandingBalance || 0,
          totalPaymentTransactions: paymentsAggregate._count.id
        },
        recentAuditActivity: recentLogs
      };

      sendSuccess(res, metrics, 'Institutional portfolio dashboard metrics');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 5. User-Specific Dashboard Summary: GET /api/dashboard/user-summary
   * Bound directly to authenticated req.user.id
   */
  static async getUserSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const data = await DashboardService.getUserDashboardSummary(userId);
      sendSuccess(res, data, 'User dynamic dashboard summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * 6. Update User Dashboard Settings: PUT /api/dashboard/settings
   */
  static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const updated = await DashboardService.updateUserSettings(userId, req.body);
      sendSuccess(res, updated, 'User dashboard settings updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
