import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { OtpPurpose } from './otp.service';

// Password Security Validation Rule
const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character');

// 1. Login Schema
const loginSchema = z
  .object({
    usernameOrEmail: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  })
  .transform((data) => ({
    usernameOrEmail: (data.usernameOrEmail || data.username || data.email || '').trim(),
    password: data.password,
    rememberMe: data.rememberMe,
  }))
  .refine((data) => !!data.usernameOrEmail, {
    message: 'Username or email is required',
    path: ['usernameOrEmail'],
  });

// 2. Register Schema
const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required (min 2 characters)').max(100),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50)
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(8, 'Please enter a valid phone number (min 8 digits)').max(20),
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => !data.role || String(data.role).toUpperCase() !== 'ADMIN', {
    message: 'Registering as an administrator is forbidden. Normal users can only register as standard users.',
    path: ['role'],
  });

// 3. Verify OTP Schema
const verifyOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  code: z.string().length(6, 'Verification code must be exactly 6 digits'),
  purpose: z.enum(['register_verification', 'forgot_password', 'email_verification'] as const),
});

// 4. Send/Resend OTP Schema
const resendOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  purpose: z.enum(['register_verification', 'forgot_password', 'email_verification'] as const),
});

// 5. Forgot Password Schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid registered email address'),
});

// 6. Reset Password Schema
const resetPasswordSchema = z
  .object({
    email: z.string().email('Valid email is required'),
    resetToken: z.string().min(10, 'Valid reset token is required'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// 7. Refresh Token Schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// 8. Update Profile Schema
const updateProfileSchema = z
  .object({
    fullName: z.string().min(2).max(100).optional(),
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(5).optional(),
    position: z.string().optional(),
    department: z.string().optional(),
  })
  .transform((data) => ({
    fullName: data.fullName || data.name,
    phone: data.phone,
    position: data.position,
    department: data.department,
  }));

// 9. Change Password Schema
const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    oldPassword: z.string().optional(),
    newPassword: passwordRule,
  })
  .transform((data) => ({
    currentPassword: (data.currentPassword || data.oldPassword || '') as string,
    newPassword: data.newPassword,
  }))
  .refine((data) => !!data.currentPassword, {
    message: 'Current or old password is required',
    path: ['currentPassword'],
  });

export class AuthController {
  /**
   * POST /api/auth/register
   * Create account & send 6-digit OTP to Gmail
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.register({ ...validated, ipAddress });
      sendSuccess(res, result, result.message, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user with password & optional Remember Me
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.login({ ...validated, ipAddress });
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        token: result.token,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        data: result,
      });
      return;
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verifies 6-digit code for account activation or password reset
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyOtpSchema.parse(req.body);
      const result = await AuthService.verifyOtp(validated);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/resend-otp (or /send-otp)
   * Dispatches a fresh 6-digit code with 60-second cooldown
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resendOtpSchema.parse(req.body);
      const result = await AuthService.resendOtp(validated);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Sends password reset OTP to user's Gmail
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(email);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Sets new password using verified OTP reset token
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validated);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   */
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

  /**
   * POST /api/auth/logout
   */
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.logout(refreshToken, req.user?.id || '', ipAddress);
      sendSuccess(res, result, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      sendSuccess(res, profile, 'User profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/auth/profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.updateProfile(req.user!.id, { ...validated, ipAddress });
      sendSuccess(res, result, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/auth/change-password
   */
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

  /**
   * Backward-compatibility for registration of borrowers from CRM
   */
  static async registerBorrower(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await AuthService.registerBorrower({ ...req.body, ipAddress });
      sendSuccess(res, result, 'Borrower registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}
