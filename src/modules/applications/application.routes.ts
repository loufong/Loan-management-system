import { Router } from 'express';
import { ApplicationController } from './application.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const applicationRouter = Router();

applicationRouter.use(authenticate);

// 1. Directory & Query
applicationRouter.get('/', ApplicationController.list);
applicationRouter.get('/:id', ApplicationController.getById);

// 2. Draft Lifecycle
applicationRouter.post(
  '/draft',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.BORROWER),
  ApplicationController.saveDraft
);

applicationRouter.put(
  '/:id/draft',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.BORROWER),
  ApplicationController.updateDraft
);

// 3. Pre-submission Preview
applicationRouter.get('/:id/preview', ApplicationController.getPreview);

// 4. Submission (BORROWER, LOAN_OFFICER, MANAGER)
applicationRouter.post(
  '/',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.BORROWER),
  ApplicationController.submit
);

applicationRouter.post(
  '/:id/submit',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.BORROWER),
  ApplicationController.submit
);

// 5. Credit Simulation Assessment
applicationRouter.get(
  '/:id/simulate-assessment',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER),
  ApplicationController.simulateAssessment
);

// 6. Underwriting Review (LOAN_OFFICER, MANAGER)
applicationRouter.post(
  '/:id/review',
  authorize(UserRole.LOAN_OFFICER, UserRole.MANAGER),
  ApplicationController.review
);

// 7. Committee Decision (MANAGER)
applicationRouter.post(
  '/:id/approve',
  authorize(UserRole.MANAGER),
  ApplicationController.approve
);

applicationRouter.post(
  '/:id/reject',
  authorize(UserRole.MANAGER),
  ApplicationController.reject
);

// 8. Cancel Application (BORROWER, LOAN_OFFICER, MANAGER)
applicationRouter.post(
  '/:id/cancel',
  authorize(UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.BORROWER),
  ApplicationController.cancel
);
