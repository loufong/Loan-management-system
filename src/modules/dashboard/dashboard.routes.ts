import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

// 1. Executive KPIs with SQL Aggregations & Formulas
dashboardRouter.get(
  '/kpis',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER),
  DashboardController.getKpis
);

// 2. Analytics Trend: 6-Month Disbursement vs Collection
dashboardRouter.get(
  '/charts/disbursement-vs-collection',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER),
  DashboardController.getDisbursementVsCollection
);

// 3. Analytics Trend: Portfolio Value Breakdown by Product
dashboardRouter.get(
  '/charts/portfolio-by-product',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER),
  DashboardController.getPortfolioByProduct
);

// 4. Comprehensive Portfolio Metrics Overview
dashboardRouter.get(
  '/metrics',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER),
  DashboardController.getMetrics
);

// 5. User-Specific Dynamic Dashboard (GET /api/dashboard & GET /api/v1/dashboard)
dashboardRouter.get('/', DashboardController.getUserSummary);
dashboardRouter.get('/user-summary', DashboardController.getUserSummary);
dashboardRouter.get('/summary', DashboardController.getUserSummary);

// 6. User Dashboard Settings & Preferences
dashboardRouter.put('/settings', DashboardController.updateSettings);
