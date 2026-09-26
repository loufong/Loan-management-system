import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

const loginSchema = z
  .object({
    usernameOrEmail: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Password is required')
  })
  .transform((data) => ({
    usernameOrEmail: (data.usernameOrEmail || data.username || data.email) as string,
    password: data.password
  }))
  .refine((data) => !!data.usernameOrEmail, {
    message: 'Username or email is required',
    path: ['usernameOrEmail']
  });

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const updateProfileSchema = z
  .object({
    fullName: z.string().min(2).max(100).optional(),
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(5).optional(),
    position: z.string().optional(),
    department: z.string().optional()
  })
  .transform((data) => ({
    fullName: data.fullName || data.name,
    phone: data.phone,
    position: data.position,
    department: data.department
  }));

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    oldPassword: z.string().optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters')
  })
  .transform((data) => ({
    currentPassword: (data.currentPassword || data.oldPassword) as string,
    newPassword: data.newPassword
  }))
  .refine((data) => !!data.currentPassword, {
    message: 'Current or old password is required',
    path: ['currentPassword']
  });

const registerBorrowerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(5),
  gender: z.string(),
  dob: z.string(),
  address: z.string().min(5),
  occupation: z.string(),
  monthlyIncome: z.number().positive(),
  idNumber: z.string().min(3)
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.login({ ...validated, ipAddress });
      sendSuccess(res, result, 'Authentication successful');
    } catch (err) {
      next(err);
    }
  }

  static async refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.refreshTokens(refreshToken, ipAddress);
      sendSuccess(res, result, 'Tokens refreshed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.logout(refreshToken, req.user!.id, ipAddress);
      sendSuccess(res, result, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      sendSuccess(res, profile, 'User profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const updated = await AuthService.updateProfile(req.user!.id, { ...validated, ipAddress });
      sendSuccess(res, updated, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = changePasswordSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.changePassword(req.user!.id, { ...validated, ipAddress });
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  static async registerBorrower(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerBorrowerSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.registerBorrower({ ...validated, ipAddress });
      sendSuccess(res, result, 'Borrower account registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}
