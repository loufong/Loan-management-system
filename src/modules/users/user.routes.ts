import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { checkRole } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const userRouter = Router();

// Role Matrix endpoint (accessible publicly to inspect role capabilities)
userRouter.get('/roles/matrix', UserController.getRoleMatrix);

// Administrative user management routes require authentication and Admin/Manager role
userRouter.use(authenticate);

// Administrative operations - strictly ADMIN / MANAGER
userRouter.get('/', checkRole(['ADMIN', 'MANAGER']), UserController.list);
userRouter.get('/:id', checkRole(['ADMIN', 'MANAGER']), UserController.getById);
userRouter.post('/', checkRole(['ADMIN', 'MANAGER']), UserController.create);
userRouter.put('/:id', checkRole(['ADMIN', 'MANAGER']), UserController.update);
userRouter.patch('/:id/toggle-status', checkRole(['ADMIN', 'MANAGER']), UserController.toggleStatus);
userRouter.patch('/:id/status', checkRole(['ADMIN', 'MANAGER']), UserController.setStatus);
userRouter.post('/:id/reset-password', checkRole(['ADMIN', 'MANAGER']), UserController.resetPassword);
