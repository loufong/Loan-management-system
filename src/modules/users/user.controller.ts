import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { createUserSchema, updateUserSchema, queryUserSchema } from './user.validation';
import { AuthService } from '../auth/auth.service';
import { prisma } from '../../config/prisma';

export class UserController {
  /**
   * List users
   */
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = queryUserSchema.parse(req.query);
      const result = await UserService.listUsers(validated);
      sendSuccess(res, result.items, 'Users retrieved successfully', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single user by ID
   */
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id, req.user);
      sendSuccess(res, user, 'User details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new user with role
   */
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createUserSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const user = await UserService.createUser(validated, req.user!.id, ipAddress, req.user);
      sendSuccess(res, user, 'User created successfully with assigned role', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update user details and role
   */
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateUserSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const user = await UserService.updateUser(req.params.id, validated, req.user!.id, ipAddress, req.user);
      sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggle status (activate / deactivate)
   */
  static async toggleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const user = await UserService.toggleStatus(req.params.id, req.user!.id, ipAddress);
      sendSuccess(res, user, `User status updated to ${user.status}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Set specific status (ACTIVE, INACTIVE, SUSPENDED)
   */
  static async setStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const user = await UserService.setStatus(req.params.id, status, req.user!.id, ipAddress);
      sendSuccess(res, user, `User status changed to ${user.status}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin Reset Password
   */
  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newPassword } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await UserService.resetPassword(req.params.id, newPassword, req.user!.id, ipAddress);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Role Permissions Matrix for Admin and User
   */
  static async getRoleMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const matrix = UserService.getRolePermissionsMatrix();
      sendSuccess(res, matrix, 'Role permissions matrix retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phase 9: GET /api/v1/users/me
   */
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      sendSuccess(res, profile, 'Current user profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phase 9: PUT /api/v1/users/me
   */
  static async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.updateProfile(req.user!.id, { ...req.body, ipAddress });
      sendSuccess(res, result, 'User profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phase 9: GET /api/v1/users/me/applications
   */
  static async getMyApplications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const borrower = await prisma.borrower.findFirst({
        where: { userId: req.user!.id }
      });
      if (!borrower) {
        sendSuccess(res, [], 'No applications found', 200, { page: 1, limit: 20, total: 0, totalPages: 0 });
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        prisma.loanApplication.count({ where: { borrowerId: borrower.id } }),
        prisma.loanApplication.findMany({
          where: { borrowerId: borrower.id },
          include: { product: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        })
      ]);

      sendSuccess(res, items, 'User loan applications retrieved successfully', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phase 9: GET /api/v1/users/me/loans
   */
  static async getMyLoans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const borrower = await prisma.borrower.findFirst({
        where: { userId: req.user!.id }
      });
      if (!borrower) {
        sendSuccess(res, [], 'No loans found', 200, { page: 1, limit: 20, total: 0, totalPages: 0 });
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        prisma.loan.count({ where: { borrowerId: borrower.id } }),
        prisma.loan.findMany({
          where: { borrowerId: borrower.id },
          include: {
            application: { include: { product: true } },
            repaymentSchedules: { orderBy: { installmentNo: 'asc' } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        })
      ]);

      sendSuccess(res, items, 'User active loans retrieved successfully', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phase 9: GET /api/v1/users/me/payments
   */
  static async getMyPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const borrower = await prisma.borrower.findFirst({
        where: { userId: req.user!.id }
      });
      if (!borrower) {
        sendSuccess(res, [], 'No payments found', 200, { page: 1, limit: 20, total: 0, totalPages: 0 });
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        prisma.payment.count({ where: { loan: { borrowerId: borrower.id } } }),
        prisma.payment.findMany({
          where: { loan: { borrowerId: borrower.id } },
          include: { loan: { select: { loanNumber: true } } },
          orderBy: { paymentDate: 'desc' },
          skip,
          take: limit
        })
      ]);

      sendSuccess(res, items, 'User payment history retrieved successfully', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phase 9: GET /api/v1/users/me/notifications
   */
  static async getMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, items, unreadCount] = await Promise.all([
        prisma.notification.count({ where: { userId: req.user!.id } }),
        prisma.notification.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({ where: { userId: req.user!.id, isRead: false } })
      ]);

      sendSuccess(res, { items, unreadCount }, 'User notifications retrieved successfully', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      next(err);
    }
  }
}
