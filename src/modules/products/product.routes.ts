import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const productRouter = Router();

// Public / Authenticated catalog endpoints
productRouter.get('/', ProductController.list);
productRouter.get('/:id', ProductController.getById);
productRouter.post('/calculate', ProductController.calculateAmortization);

// Staff management endpoints (MANAGER)
productRouter.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  ProductController.create
);

productRouter.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  ProductController.update
);

productRouter.patch(
  '/:id/toggle-status',
  authenticate,
  authorize(UserRole.ADMIN),
  ProductController.toggleStatus
);

productRouter.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN),
  ProductController.toggleStatus
);
