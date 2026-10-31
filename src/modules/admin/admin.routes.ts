import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { checkRole } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';
import { UserController } from '../users/user.controller';
import { ApplicationController } from '../applications/application.controller';
import { LoanController } from '../loans/loan.controller';
import { PaymentController } from '../payments/payment.controller';
import { OverdueController } from '../overdue/overdue.controller';
import { ReportController } from '../reports/report.controller';
import { reportRouter } from '../reports/report.routes';
import { sendSuccess } from '../../utils/response';
import { AdminCoreController } from './admin.controller';

export const adminRouter = Router();

// Strictly authenticate and authorize ADMIN and SUPER_ADMIN roles
adminRouter.use(authenticate, checkRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]));

// Root administrative overview endpoint
adminRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, {
    service: 'JAM SONG VICH Super Admin Ledger API',
    status: 'AUTHORIZED',
    role: req.user?.role || UserRole.ADMIN,
  });
});

// 0. Super Admin Core Banking & Portfolio Deliverables
adminRouter.get('/portfolio/summary', AdminCoreController.getPortfolioSummary);
adminRouter.get('/underwriting/queue', AdminCoreController.getUnderwritingQueue);
adminRouter.post('/applications/:id/counter-offer', AdminCoreController.counterOfferApplication);
adminRouter.get('/reconciliation/bakong-feed', AdminCoreController.getBakongReconciliationFeed);
adminRouter.post('/reconciliation/resolve-anomaly', AdminCoreController.resolveReconciliationAnomaly);

// 1. User Management
adminRouter.get('/users', UserController.list);
adminRouter.get('/users/:id', UserController.getById);
adminRouter.put('/users/:id/status', UserController.setStatus);
adminRouter.patch('/users/:id/status', UserController.setStatus);
adminRouter.put('/users/:id/role', UserController.update);

// 2. Application Workflow
adminRouter.get('/applications', ApplicationController.list);
adminRouter.get('/applications/:id', ApplicationController.getById);
adminRouter.post('/applications/:id/review', ApplicationController.review);
adminRouter.post('/applications/:id/approve', ApplicationController.approve);
adminRouter.post('/applications/:id/reject', ApplicationController.reject);

// 3. Loans & Disbursements
adminRouter.get('/loans', AdminCoreController.getLoansLedger);
adminRouter.get('/loans/:id', LoanController.getById);
adminRouter.post('/loans/:id/disburse', LoanController.disburse);
adminRouter.post('/loans/disburse', LoanController.disburse);
adminRouter.post('/loans/:id/restructure', AdminCoreController.restructureLoan);

// 4. Payments Ledger
adminRouter.get('/payments', PaymentController.list);
adminRouter.post('/payments', PaymentController.record);
adminRouter.post('/payments/create', PaymentController.record);
adminRouter.post('/payments/record', PaymentController.record);
adminRouter.get('/payments/khqr/diagnostics', PaymentController.getDiagnostics);
adminRouter.get('/payments/:id/status', PaymentController.getStatus);
adminRouter.post('/payments/:id/verify', PaymentController.verifyPayment);

// 5. Overdue Engine
adminRouter.get('/overdue', OverdueController.listOverdue);
adminRouter.get('/overdue/summary', OverdueController.getSummary);
adminRouter.post('/overdue/run-check', OverdueController.triggerCheck);
adminRouter.post('/overdue/trigger-check', OverdueController.triggerCheck);
adminRouter.post('/overdue/send-reminders', OverdueController.sendReminders);

// 6. Reports & Analytics
adminRouter.use('/reports', reportRouter);

// 7. Audit Logs
adminRouter.get('/audit-logs', ReportController.getAuditLogs);
