import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';

export class NotificationController {
  // GET /api/notifications - Returns current user's unread notifications
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeAll = req.query.all === 'true' || req.query.includeAll === 'true';
      const result = await NotificationService.getUnreadNotifications(req.user!, includeAll);
      sendSuccess(res, result.items, 'Unread notifications retrieved successfully', 200, {
        unreadCount: result.unreadCount
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/notifications/:id/read - Marks notification as read
  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await NotificationService.markAsRead(req.params.id, req.user!);
      sendSuccess(res, updated, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/notifications/read-all - Marks all user's notifications as read
  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NotificationService.markAllAsRead(req.user!);
      sendSuccess(res, result, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}
