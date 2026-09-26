import { Router } from 'express';
import { LoanController } from './loan.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const loanRouter = Router();

loanRouter.use(authenticate);

// 1. Directory of all disbursements (Staff: CASHIER, MANAGER)
loanRouter.get(
  '/disbursements',
  authorize(UserRole.MANAGER, UserRole.CASHIER),
  LoanController.listDisbursements
);

// 2. Loans Directory & Master Ledgers
loanRouter.get('/', LoanController.list);
loanRouter.get('/:id', LoanController.getById);
loanRouter.get('/:id/schedules', LoanController.getSchedules);

// 3. Core Banking: Loan Disbursement & Activation (CASHIER, MANAGER)
loanRouter.post(
  '/:applicationId/disburse',
  authorize(UserRole.CASHIER, UserRole.MANAGER),
  LoanController.disburse
);
loanRouter.post(
  '/:id/disburse',
  authorize(UserRole.CASHIER, UserRole.MANAGER),
  LoanController.disburse
);
