import { prisma } from '../../config/prisma';
import { AuthUser } from '../../middlewares/auth.middleware';

export class NotificationService {
  /**
   * Get current user's unread notifications
   */
  static async getUnreadNotifications(user: AuthUser, includeAll = false) {
    const where: any = { userId: user.id };
    if (!includeAll) {
      where.isRead = false;
    }

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false }
      })
    ]);

    return {
      items,
      unreadCount
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, user: AuthUser) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' };
    }

    // Security: Only recipient or MANAGER can mark as read
    if (notification.userId !== user.id && user.role !== 'MANAGER') {
      throw { statusCode: 403, message: 'Access denied: not your notification', code: 'FORBIDDEN' };
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  /**
   * Mark all notifications as read for current user
   */
  static async markAllAsRead(user: AuthUser) {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true }
    });

    return {
      markedCount: result.count
    };
  }
}
