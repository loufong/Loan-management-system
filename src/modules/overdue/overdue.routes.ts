import { Router } from 'express';
import { OverdueController } from './overdue.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const overdueRouter = Router();

overdueRouter.use(authenticate);

// 1. Get list of overdue loans with late fees & contact details (Staff: MANAGER, LOAN_OFFICER, CASHIER)
overdueRouter.get(
  '/loans',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER),
  OverdueController.listOverdue
);

// 2. Overdue portfolio summary statistics
overdueRouter.get(
  '/summary',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CASHIER),
  OverdueController.getSummary
);

// 2. Manual trigger endpoint for testing and demo purposes
overdueRouter.post(
  '/trigger-check',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER),
  OverdueController.triggerCheck
);

overdueRouter.post(
  '/run-check',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER),
  OverdueController.triggerCheck
);

// 3. Trigger reminder notification dispatch
overdueRouter.post(
  '/send-reminders',
  authorize(UserRole.MANAGER),
  OverdueController.sendReminders
);
