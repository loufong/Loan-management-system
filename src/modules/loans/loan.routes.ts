import { Router } from 'express';
import { LoanController } from './loan.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { verifyKycBorrowEligibility } from '../../middlewares/kyc-guard.middleware';
import { UserRole } from '@prisma/client';

import { PaymentController } from '../payments/payment.controller';

export const loanRouter = Router();

loanRouter.use(authenticate);

// 0. Borrower Loan Origination Submission (Protected by Regulatory KYC Guard)
loanRouter.post(
  '/apply',
  authorize(UserRole.ADMIN, UserRole.USER),
  verifyKycBorrowEligibility,
  LoanController.apply
);

// Reset borrowing data for the user
loanRouter.post(
  '/reset-user-borrowing',
  authorize(UserRole.ADMIN, UserRole.USER),
  LoanController.resetUserBorrowing
);
loanRouter.post(
  '/reset',
  authorize(UserRole.ADMIN, UserRole.USER),
  LoanController.resetUserBorrowing
);

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
