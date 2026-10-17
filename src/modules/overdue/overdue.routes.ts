import { Router } from 'express';
import { OverdueController } from './overdue.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const overdueRouter = Router();

overdueRouter.use(authenticate);

// 1. Get list of overdue loans with late fees & contact details (ADMIN)
overdueRouter.get(
  '/loans',
  authorize(UserRole.ADMIN),
  OverdueController.listOverdue
);

// 2. Overdue portfolio summary statistics
overdueRouter.get(
  '/summary',
  authorize(UserRole.ADMIN),
  OverdueController.getSummary
);

// 2. Manual trigger endpoint for testing (ADMIN)
overdueRouter.post(
  '/trigger-check',
  authorize(UserRole.ADMIN),
  OverdueController.triggerCheck
);

overdueRouter.post(
  '/run-check',
  authorize(UserRole.ADMIN),
  OverdueController.triggerCheck
);

// 3. Trigger reminder notification dispatch (ADMIN)
overdueRouter.post(
  '/send-reminders',
  authorize(UserRole.ADMIN),
  OverdueController.sendReminders
);
