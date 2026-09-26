import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const reportRouter = Router();

reportRouter.use(authenticate);

// Staff access only
reportRouter.use(
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER)
);

// 1. KPI Summary
reportRouter.get('/summary', ReportController.getSummary);

// 2. Specialized Reports (with ?export=csv support)
reportRouter.get('/applications', ReportController.getApplications);
reportRouter.get('/approved-loans', ReportController.getApprovedLoans);
reportRouter.get('/rejected-loans', ReportController.getRejectedLoans);
reportRouter.get('/active-loans', ReportController.getActiveLoans);
reportRouter.get('/overdue-loans', ReportController.getOverdueLoans);
reportRouter.get('/disbursements', ReportController.getDisbursements);
reportRouter.get('/daily-collections', ReportController.getDailyCollections);
reportRouter.get('/collections', ReportController.getCollections);

// 3. Generic CSV Export Route
reportRouter.get('/export', ReportController.exportCsv);
