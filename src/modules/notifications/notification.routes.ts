import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

// 1. GET /api/notifications: Returns current user's unread notifications
notificationRouter.get('/', NotificationController.list);

// 2. PATCH /api/notifications/:id/read: Marks notification as read
notificationRouter.patch('/:id/read', NotificationController.markAsRead);
notificationRouter.put('/:id/read', NotificationController.markAsRead);

// 3. Optional convenience: Mark all as read
notificationRouter.patch('/read-all', NotificationController.markAllAsRead);
notificationRouter.post('/read-all', NotificationController.markAllAsRead);
