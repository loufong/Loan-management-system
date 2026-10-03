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

// Administrative operations - strictly MANAGER / ADMIN
userRouter.get('/', checkRole([UserRole.MANAGER]), UserController.list);
userRouter.get('/:id', checkRole([UserRole.MANAGER]), UserController.getById);
userRouter.post('/', checkRole([UserRole.MANAGER]), UserController.create);
userRouter.put('/:id', checkRole([UserRole.MANAGER]), UserController.update);
userRouter.patch('/:id/toggle-status', checkRole([UserRole.MANAGER]), UserController.toggleStatus);
