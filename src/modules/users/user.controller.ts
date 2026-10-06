import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { createUserSchema, updateUserSchema, queryUserSchema } from './user.validation';

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
      const user = await UserService.getUserById(req.params.id);
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
      const user = await UserService.createUser(validated, req.user!.id, ipAddress);
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
      const user = await UserService.updateUser(req.params.id, validated, req.user!.id, ipAddress);
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
   * Get Role Permissions Matrix for Admin/Manager, Cashier, and Borrower
   */
  static async getRoleMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const matrix = UserService.getRolePermissionsMatrix();
      sendSuccess(res, matrix, 'Role permissions matrix retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
