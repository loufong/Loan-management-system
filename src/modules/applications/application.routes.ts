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

// 2. Draft Lifecycle (USER, ADMIN)
applicationRouter.post(
  '/draft',
  authorize(UserRole.ADMIN, UserRole.USER),
  ApplicationController.saveDraft
);

applicationRouter.put(
  '/:id/draft',
  authorize(UserRole.ADMIN, UserRole.USER),
  ApplicationController.updateDraft
);

// 3. Pre-submission Preview
applicationRouter.get('/:id/preview', ApplicationController.getPreview);

// 4. Submission (USER, ADMIN)
applicationRouter.post(
  ['/', '/create'],
  authorize(UserRole.ADMIN, UserRole.USER),
  ApplicationController.submit
);

applicationRouter.post(
  '/:id/submit',
  authorize(UserRole.ADMIN, UserRole.USER),
  ApplicationController.submit
);

// 5. Credit Simulation Assessment (ADMIN)
applicationRouter.get(
  '/:id/simulate-assessment',
  authorize(UserRole.ADMIN),
  ApplicationController.simulateAssessment
);

// 6. Underwriting Review (ADMIN)
applicationRouter.post(
  '/:id/review',
  authorize(UserRole.ADMIN),
  ApplicationController.review
);

// 7. Committee Decision (ADMIN)
applicationRouter.post(
  '/:id/approve',
  authorize(UserRole.ADMIN),
  ApplicationController.approve
);

applicationRouter.post(
  '/:id/reject',
  authorize(UserRole.ADMIN),
  ApplicationController.reject
);

// 8. Cancel Application (USER, ADMIN)
applicationRouter.post(
  '/:id/cancel',
  authorize(UserRole.ADMIN, UserRole.USER),
  ApplicationController.cancel
);
