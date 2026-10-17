import { Router } from 'express';
import { LoanController } from './loan.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

import { PaymentController } from '../payments/payment.controller';

export const loanRouter = Router();

loanRouter.use(authenticate);

// 1. Directory of all disbursements (ADMIN)
loanRouter.get(
  '/disbursements',
  authorize(UserRole.ADMIN),
  LoanController.listDisbursements
);

// 2. Loans Directory & Master Ledgers
loanRouter.get('/', LoanController.list);
loanRouter.get('/:id', LoanController.getById);
loanRouter.get('/:id/schedules', LoanController.getSchedules);
loanRouter.get('/:id/payments', PaymentController.listByLoan);

// 3. Core Banking: Loan Disbursement & Activation (ADMIN)
loanRouter.post(
  '/disburse',
  authorize(UserRole.ADMIN),
  LoanController.disburse
);
loanRouter.post(
  '/:applicationId/disburse',
  authorize(UserRole.ADMIN),
  LoanController.disburse
);
loanRouter.post(
  '/:id/disburse',
  authorize(UserRole.ADMIN),
  LoanController.disburse
);
