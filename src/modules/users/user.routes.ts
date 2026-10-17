import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { checkRole } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const userRouter = Router();

// Role Matrix endpoint (accessible publicly to inspect role capabilities)
userRouter.get('/roles/matrix', UserController.getRoleMatrix);

// Authenticated routes
userRouter.use(authenticate);

// ==========================================
// 1. Current Authenticated User (Phase 9)
// ==========================================
userRouter.get('/me', UserController.getMe);
userRouter.put('/me', UserController.updateMe);
userRouter.get('/me/applications', UserController.getMyApplications);
userRouter.get('/me/loans', UserController.getMyLoans);
userRouter.get('/me/payments', UserController.getMyPayments);
userRouter.get('/me/notifications', UserController.getMyNotifications);

// ==========================================
// 2. Administrative User Management (ADMIN)
// ==========================================
userRouter.get('/', checkRole(UserRole.ADMIN), UserController.list);
userRouter.get('/:id', checkRole(UserRole.ADMIN), UserController.getById);
userRouter.post('/', checkRole(UserRole.ADMIN), UserController.create);
userRouter.put('/:id', checkRole(UserRole.ADMIN), UserController.update);
userRouter.patch('/:id/toggle-status', checkRole(UserRole.ADMIN), UserController.toggleStatus);
userRouter.patch('/:id/status', checkRole(UserRole.ADMIN), UserController.setStatus);
userRouter.put('/:id/status', checkRole(UserRole.ADMIN), UserController.setStatus);
userRouter.post('/:id/reset-password', checkRole(UserRole.ADMIN), UserController.resetPassword);
