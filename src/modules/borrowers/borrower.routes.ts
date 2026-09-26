import { Router } from 'express';
import { BorrowerController } from './borrower.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const borrowerRouter = Router();

borrowerRouter.use(authenticate);

// 1. List Borrowers (Staff see filtered directory; Borrowers see only their own record)
borrowerRouter.get('/', BorrowerController.list);

// 2. Get Borrower Details (Full profile with loans & payment history; ownership enforced)
borrowerRouter.get('/:id', BorrowerController.getById);

// 3. Onboard New Borrower (Staff: MANAGER, LOAN_OFFICER)
borrowerRouter.post(
  '/',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER),
  BorrowerController.create
);

// 4. Update Borrower Details (Staff: MANAGER, LOAN_OFFICER or Owner)
borrowerRouter.put('/:id', BorrowerController.update);

// 5. Deactivate / Delete Borrower (Staff: MANAGER)
borrowerRouter.delete(
  '/:id',
  authorize(UserRole.MANAGER),
  BorrowerController.deactivate
);
borrowerRouter.patch(
  '/:id/deactivate',
  authorize(UserRole.MANAGER),
  BorrowerController.deactivate
);
