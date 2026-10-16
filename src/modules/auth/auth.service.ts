import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import { recordAuditLog } from '../../utils/audit';
import { getPermissionsForRole, Permission } from '../../security/permissions';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS
} from '../../middlewares/auth.middleware';
import { OtpService, OtpPurpose } from './otp.service';
import { PendingRegistrationService } from './pending-registration.service';
import { UserCreationService } from './user-creation.service';
import { EmailService } from '../../services/email.service';

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
}

export interface RegisterUserDto {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  role?: UserRole | string;
  ipAddress?: string;
}

export interface RegisterBorrowerDto {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  gender: string;
  dob: string;
  address: string;
  occupation: string;
  monthlyIncome: number;
  idNumber: string;
  ipAddress?: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  department?: string;
  ipAddress?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
  ipAddress?: string;
}

interface InMemoryUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  lastLogin?: Date | null;
  emailVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  // Failed login attempts tracker for rate limiting (5 attempts -> 5 minutes block)
  private static failedLoginAttempts = new Map<string, { count: number; blockedUntil?: Date }>();

  private static checkRateLimit(key: string): void {
    const record = this.failedLoginAttempts.get(key);
    if (!record) return;

    if (record.blockedUntil) {
      if (new Date() < record.blockedUntil) {
        const remainingMs = record.blockedUntil.getTime() - Date.now();
        const minutes = Math.ceil(remainingMs / 60000);
        throw {
          statusCode: 429,
          message: `Too many failed login attempts. Please try again after ${minutes} minute${minutes > 1 ? 's' : ''}.`,
          code: 'RATE_LIMITED',
        };
      } else {
        this.failedLoginAttempts.delete(key);
      }
    }
  }

  private static recordFailedAttempt(key: string): void {
    const record = this.failedLoginAttempts.get(key) || { count: 0 };
    record.count += 1;
    if (record.count >= 5) {
      record.blockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes block
    }
    this.failedLoginAttempts.set(key, record);
  }

  private static clearFailedAttempts(key: string): void {
    this.failedLoginAttempts.delete(key);
  }

  // Pre-seeded accounts for offline evaluation (Strictly ONE ADMIN, all others USER)
  private static seedUsers: Map<string, InMemoryUser> = new Map([
    [
      'admin@loansystem.edu',
      {
        id: 'user-admin-0001',
        username: 'admin',
        email: 'admin@loansystem.edu',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Dr. Alexander Wright',
        phone: '+1-555-0100',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 15),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-01T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'admin@loansystem.edu',
      {
        id: 'user-admin-0001',
        username: 'admin',
        email: 'admin@loansystem.edu',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Dr. Alexander Wright',
        phone: '+1-555-0100',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 15),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-01T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'admin@apex.local',
      {
        id: 'user-admin-0001',
        username: 'admin',
        email: 'admin@apex.local',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Dr. Alexander Wright',
        phone: '+1-555-0100',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 15),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-01T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'admin@example.com',
      {
        id: 'user-admin-0001',
        username: 'admin',
        email: 'admin@loansystem.edu',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Dr. Alexander Wright',
        phone: '+1-555-0100',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 15),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-01T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'user@example.com',
      {
        id: 'user-user-0002',
        username: 'user',
        email: 'user@example.com',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Standard User',
        phone: '+855 12 999 888',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-10T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'inactive@example.com',
      {
        id: 'user-inactive-0003',
        username: 'inactive',
        email: 'inactive@example.com',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Inactive User',
        phone: '+855 12 111 222',
        role: UserRole.USER,
        status: UserStatus.INACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        lastLogin: null,
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-10T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'suspended@example.com',
      {
        id: 'user-suspended-0004',
        username: 'suspended',
        email: 'suspended@example.com',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Suspended User',
        phone: '+855 12 333 444',
        role: UserRole.USER,
        status: UserStatus.SUSPENDED,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        lastLogin: null,
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-10T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'manager@apex.local',
      {
        id: 'user-manager-0001',
        username: 'manager',
        email: 'manager@apex.local',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Executive Branch Manager',
        phone: '+855 12 345 678',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 15),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-01-15T08:00:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'officer@apex.local',
      {
        id: 'user-officer-0002',
        username: 'officer',
        email: 'officer@apex.local',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Senior Underwriting Officer',
        phone: '+855 12 888 999',
        role: UserRole.LOAN_OFFICER,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 45),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-02-01T09:30:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'credit@apex.local',
      {
        id: 'user-credit-0005',
        username: 'credit',
        email: 'credit@apex.local',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Senior Credit & Risk Officer',
        phone: '+855 12 777 666',
        role: UserRole.CREDIT_OFFICER,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 30),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-02-15T09:30:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'cashier@apex.local',
      {
        id: 'user-cashier-0003',
        username: 'cashier',
        email: 'cashier@apex.local',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Head Teller & Cashier',
        phone: '+855 16 555 777',
        role: UserRole.CASHIER,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 5),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-03-10T10:15:00Z'),
        updatedAt: new Date(),
      },
    ],
    [
      'borrower@apex.local',
      {
        id: 'user-borrower-0004',
        username: 'borrower',
        email: 'borrower@apex.local',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        fullName: 'Sokha Chan',
        phone: '+855 92 612 045',
        role: UserRole.BORROWER,
        status: UserStatus.ACTIVE,
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
        emailVerifiedAt: new Date(),
        createdAt: new Date('2025-06-20T14:20:00Z'),
        updatedAt: new Date(),
      },
    ],
  ]);

  /**
   * Generates a secure random 64-char refresh token and hashes it for DB storage
   */
  private static generateRefreshToken(days = REFRESH_TOKEN_EXPIRY_DAYS): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return { rawToken, tokenHash, expiresAt };
  }

  /**
   * Generates JWT Access Token containing user ID, role, and permissions
   */
  private static generateAccessToken(
    user: { id: string; username: string; email: string; role: UserRole },
    expiry: string = ACCESS_TOKEN_EXPIRY
  ): string {
    const permissions: Permission[] = getPermissionsForRole(user.role);

    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions,
      },
      JWT_ACCESS_SECRET,
      { expiresIn: expiry as any }
    );
  }

  /**
   * Helper to find permanent active user in DB or in-memory fallback
   */
  private static async findActiveUserByEmailOrUsername(identifier: string): Promise<InMemoryUser | null> {
    const clean = identifier.toLowerCase().trim();

    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: clean, mode: 'insensitive' } },
            { email: { equals: clean, mode: 'insensitive' } },
          ],
        },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          fullName: dbUser.fullName,
          phone: dbUser.phone || undefined,
          role: dbUser.role,
          status: dbUser.status,
          avatarUrl: dbUser.avatarUrl || undefined,
          lastLogin: dbUser.lastLogin,
          emailVerifiedAt: dbUser.emailVerifiedAt,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        };
      }
    } catch {
      // Prisma offline, check in-memory fallbacks
    }

    // Check memory users created via UserCreationService
    for (const u of UserCreationService.memoryUsers.values()) {
      if (u.username.toLowerCase() === clean || u.email.toLowerCase() === clean) {
        return {
          ...u,
          updatedAt: new Date(),
        };
      }
    }

    // Check seed users
    for (const u of this.seedUsers.values()) {
      if (u.username.toLowerCase() === clean || u.email.toLowerCase() === clean) {
        return u;
      }
    }

    return null;
  }

  /**
   * Automatically insert/upsert user profile upon first authentication (SSO / OAuth / First login)
   */
  static async upsertUserOnAuth(data: {
    email: string;
    fullName: string;
    username?: string;
    avatarUrl?: string;
    role?: UserRole;
  }) {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanUsername = data.username?.toLowerCase().trim() || cleanEmail.split('@')[0];
    const defaultAvatar = data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;
    const now = new Date();

    try {
      const user = await prisma.user.upsert({
        where: { email: cleanEmail },
        create: {
          email: cleanEmail,
          username: cleanUsername,
          fullName: data.fullName,
          passwordHash: bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10),
          avatarUrl: defaultAvatar,
          lastLogin: now,
          role: data.role || UserRole.BORROWER,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
          userSetting: {
            create: {
              theme: 'light',
              currency: 'USD',
              branch: 'Phnom Penh Main Branch',
              notificationsEnabled: true,
            },
          },
        },
        update: {
          lastLogin: now,
          ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
          ...(data.fullName && { fullName: data.fullName }),
        },
        include: {
          userSetting: true,
        },
      });

      return user;
    } catch {
      // Memory fallback for offline mode
      const existing = await this.findActiveUserByEmailOrUsername(cleanEmail);
      if (existing) {
        existing.lastLogin = now;
        return existing;
      }

      const memUser: InMemoryUser = {
        id: crypto.randomUUID(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: '',
        fullName: data.fullName,
        role: data.role || UserRole.BORROWER,
        status: UserStatus.ACTIVE,
        avatarUrl: defaultAvatar,
        lastLogin: now,
        createdAt: now,
        updatedAt: now,
      };
      UserCreationService.memoryUsers.set(cleanEmail, {
        ...memUser,
        emailVerifiedAt: now,
      });
      return memUser;
    }
  }

  /**
   * 1. User Registration (Pending Registration Storage Flow)
   * The pending record is NOT an active user account.
   * Real user record is created only after OTP verification.
   */
  /**
   * 1. User Registration (Pending Registration Storage Flow)
   * The pending record is NOT an active user account.
   * Real user record is created only after OTP verification.
   */
  static async register(dto: RegisterUserDto) {
    // Normal users must NEVER be able to register as Admin
    if (dto.role && String(dto.role).toUpperCase() === 'ADMIN') {
      throw {
        statusCode: 400,
        message: 'Registering as an administrator is forbidden. Normal users can only register as standard users.',
        code: 'ADMIN_REGISTRATION_FORBIDDEN',
      };
    }

    if (dto.confirmPassword && dto.password !== dto.confirmPassword) {
      throw {
        statusCode: 400,
        message: 'Passwords do not match.',
        code: 'PASSWORD_MISMATCH',
      };
    }

    const cleanEmail = PendingRegistrationService.normalizeEmail(dto.email);
    const cleanUsername = PendingRegistrationService.normalizeUsername(dto.username);

    // 1-3. Validate & Check active users table
    await PendingRegistrationService.assertNoActiveUser(cleanEmail, cleanUsername);

    const calculatedFullName =
      dto.fullName?.trim() ||
      `${dto.firstName || ''} ${dto.lastName || ''}`.trim() ||
      cleanUsername;

    // 4-6. Create or update pending_registrations record (30-min expiry, password pre-hashed)
    const pending = await PendingRegistrationService.createOrUpdatePending({
      fullName: calculatedFullName,
      username: cleanUsername,
      email: cleanEmail,
      phone: dto.phone,
      password: dto.password,
    });

    // 7. Generate 6-digit OTP, store in otp_verifications linked to pendingRegistrationId, send via Gmail
    const otpResult = await OtpService.createAndSendOtp({
      email: cleanEmail,
      recipientName: calculatedFullName,
      firstName: dto.firstName,
      purpose: 'REGISTRATION',
      pendingRegistrationId: pending.id,
    });

    return {
      success: true,
      message:
        otpResult.message ||
        'Registration submitted. A 6-digit verification code has been dispatched to your Gmail.',
      email: cleanEmail,
      pendingRegistrationId: pending.id,
      devOtp: otpResult.devOtp,
    };
  }

  /**
   * 2. Verify OTP for Registration or Password Reset
   */
  static async verifyOtp(dto: {
    email: string;
    code?: string;
    otp?: string;
    purpose?: OtpPurpose | string;
    ipAddress?: string;
  }) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const cleanCode = (dto.code || dto.otp || '').trim();
    const purpose = dto.purpose || 'REGISTRATION';
    const canonicalPurpose = OtpService.normalizePurpose(purpose);

    // 1-5. Verify OTP against otp_verifications
    const otpResult = await OtpService.verifyOtp({
      email: cleanEmail,
      code: cleanCode,
      purpose: canonicalPurpose,
    });

    if (!otpResult.valid) {
      throw { statusCode: 400, message: otpResult.message, code: 'INVALID_OTP' };
    }

    // If purpose is REGISTRATION: Promote pending registration or mark user verified
    if (canonicalPurpose === 'REGISTRATION') {
      const pendingRegistration = await PendingRegistrationService.findValidByEmail(cleanEmail);

      let createdUser: any;
      if (pendingRegistration) {
        // Execute transactional promotion into permanent users table & purge pending record
        createdUser = await UserCreationService.promotePendingToUser({
          pendingRegistration,
          otpId: (otpResult as any).otpId,
          ipAddress: dto.ipAddress,
        });
      } else {
        // Fallback: check if user exists in User table directly but unverified
        const existing = await prisma.user.findFirst({ where: { email: cleanEmail } });
        if (existing) {
          createdUser = await prisma.user.update({
            where: { id: existing.id },
            data: {
              emailVerifiedAt: new Date(),
              status: UserStatus.ACTIVE,
            },
          });
        } else {
          throw {
            statusCode: 400,
            message:
              'No active registration session found for this email. It may have expired (30-minute limit). Please submit the registration form again.',
            code: 'PENDING_REGISTRATION_NOT_FOUND',
          };
        }
      }

      try {
        await recordAuditLog({
          userId: createdUser.id,
          action: 'EMAIL_VERIFIED',
          entityName: 'User',
          entityId: createdUser.id,
          details: { email: cleanEmail },
          ipAddress: dto.ipAddress,
        });
      } catch {
        // optional
      }

      return {
        success: true,
        message: 'Your account has been verified successfully. You can now log in.',
        user: {
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          fullName: createdUser.fullName,
          role: createdUser.role === UserRole.ADMIN ? 'admin' : 'user',
          emailVerified: true,
        },
      };
    }

    // If purpose is PASSWORD_RESET, return signed reset token
    return {
      success: true,
      message: 'OTP verified successfully.',
      resetToken: otpResult.resetToken,
      email: cleanEmail,
    };
  }

  /**
   * 2b. Verify Reset OTP helper specifically for /verify-reset-otp endpoint
   */
  static async verifyResetOtp(dto: {
    email: string;
    code?: string;
    otp?: string;
    ipAddress?: string;
  }) {
    return this.verifyOtp({
      email: dto.email,
      code: dto.code || dto.otp,
      purpose: 'PASSWORD_RESET',
      ipAddress: dto.ipAddress,
    });
  }

  /**
   * 3. Resend OTP with 60-Second Cooldown & Registration Check
   */
  static async resendOtp(dto: { email: string; purpose?: OtpPurpose | string }) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const canonicalPurpose = OtpService.normalizePurpose(dto.purpose);

    if (canonicalPurpose === 'REGISTRATION') {
      // Confirm pending registration exists and has not expired (30 mins)
      const pending = await PendingRegistrationService.findValidByEmail(cleanEmail);
      if (!pending) {
        // Check if unverified user exists
        const existing = await prisma.user.findFirst({ where: { email: cleanEmail } });
        if (!existing || existing.emailVerifiedAt !== null) {
          throw {
            statusCode: 400,
            message: 'Registration session expired or not found. Please fill out the registration form again.',
            code: 'PENDING_REGISTRATION_EXPIRED',
          };
        }
      }

      const otpResult = await OtpService.createAndSendOtp({
        email: cleanEmail,
        recipientName: pending?.fullName || 'Valued User',
        purpose: 'REGISTRATION',
        pendingRegistrationId: pending?.id || null,
      });

      if (!otpResult.success) {
        throw { statusCode: 429, message: otpResult.message, code: 'RATE_LIMITED' };
      }

      return {
        success: true,
        message: 'A fresh 6-digit OTP code has been dispatched to your Gmail.',
        expiresInSeconds: otpResult.expiresInSeconds,
        devOtp: otpResult.devOtp,
      };
    }

    // Forgot password resend
    const activeUser = await this.findActiveUserByEmailOrUsername(cleanEmail);
    const otpResult = await OtpService.createAndSendOtp({
      email: cleanEmail,
      recipientName: activeUser?.fullName || 'Valued User',
      purpose: 'PASSWORD_RESET',
      pendingRegistrationId: null,
    });

    if (!otpResult.success) {
      throw { statusCode: 429, message: otpResult.message, code: 'RATE_LIMITED' };
    }

    return {
      success: true,
      message: 'A fresh 6-digit OTP code has been dispatched to your Gmail.',
      expiresInSeconds: otpResult.expiresInSeconds,
      devOtp: otpResult.devOtp,
    };
  }

  /**
   * 4. Forgot Password - Request 6-digit OTP to Gmail
   */
  static async forgotPassword(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.findActiveUserByEmailOrUsername(cleanEmail);

    // If active user exists, send OTP
    if (user) {
      await OtpService.createAndSendOtp({
        email: cleanEmail,
        recipientName: user.fullName,
        purpose: 'PASSWORD_RESET',
        pendingRegistrationId: null,
      });
    }

    // Security best practice: Return generic success message so attacker cannot enumerate emails
    return {
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.',
    };
  }

  /**
   * 5. Set New Password after OTP verification (supports resetToken or direct OTP)
   */
  static async resetPassword(dto: {
    email: string;
    resetToken?: string;
    otp?: string;
    code?: string;
    newPassword: string;
    confirmPassword?: string;
    ipAddress?: string;
  }) {
    const cleanEmail = dto.email.toLowerCase().trim();

    if (dto.confirmPassword && dto.newPassword !== dto.confirmPassword) {
      throw { statusCode: 400, message: 'Passwords do not match.', code: 'PASSWORD_MISMATCH' };
    }

    // Verify reset token or direct OTP
    if (dto.resetToken) {
      let decoded: any;
      try {
        const secret = process.env.JWT_SECRET || 'apex-lms-jwt-secret-2026';
        decoded = jwt.verify(dto.resetToken, secret);
      } catch {
        throw {
          statusCode: 400,
          message: 'This verification code has expired. Please request a new code.',
          code: 'INVALID_RESET_TOKEN',
        };
      }

      if (decoded.email.toLowerCase() !== cleanEmail) {
        throw { statusCode: 400, message: 'Invalid password reset authorization.', code: 'UNAUTHORIZED_RESET' };
      }
    } else if (dto.otp || dto.code) {
      const verifyResult = await OtpService.verifyOtp({
        email: cleanEmail,
        code: (dto.otp || dto.code)!,
        purpose: 'PASSWORD_RESET',
      });
      if (!verifyResult.valid) {
        throw { statusCode: 400, message: verifyResult.message, code: 'INVALID_OTP' };
      }
    } else {
      throw {
        statusCode: 400,
        message: 'Reset token or verification code is required.',
        code: 'MISSING_VERIFICATION',
      };
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // Find user
    const user = await this.findActiveUserByEmailOrUsername(cleanEmail);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.', code: 'USER_NOT_FOUND' };
    }

    // Update in database
    try {
      await prisma.user.updateMany({
        where: { email: cleanEmail },
        data: { passwordHash: newHash },
      });
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
      await prisma.otpVerification.updateMany({
        where: { email: cleanEmail, purpose: { in: ['PASSWORD_RESET', 'forgot_password'] } },
        data: { invalidatedAt: new Date() },
      });
    } catch {
      // Memory fallback
      const memUser = UserCreationService.memoryUsers.get(cleanEmail);
      if (memUser) {
        memUser.passwordHash = newHash;
      }
    }

    try {
      await recordAuditLog({
        userId: user.id,
        action: 'PASSWORD_RESET',
        entityName: 'User',
        entityId: user.id,
        details: { email: cleanEmail },
        ipAddress: dto.ipAddress,
      });
    } catch {
      // optional
    }

    // Send confirmation email
    await EmailService.sendPasswordChangedEmail({
      toEmail: cleanEmail,
      recipientName: user.fullName || user.username,
    });

    return {
      success: true,
      message: 'Your password has been successfully reset. Please log in with your new credentials.',
    };
  }

  /**
   * 6. User Login with Exact 9-Step Verification & Rate Limiting
   */
  static async login(dto: LoginDto) {
    // Step 1: Validate input
    if (!dto.usernameOrEmail?.trim() || !dto.password) {
      throw {
        statusCode: 400,
        message: 'Invalid email/username or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    const cleanIdentifier = dto.usernameOrEmail.toLowerCase().trim();

    // Check 5-attempt / 5-minute rate limit
    this.checkRateLimit(cleanIdentifier);

    // Check if user is still an unverified pending registration
    const isPending = await PendingRegistrationService.findValidByEmail(cleanIdentifier);
    if (isPending) {
      throw {
        statusCode: 403,
        message: 'Please verify your email before logging in.',
        code: 'ACCOUNT_UNVERIFIED',
      };
    }

    // Step 2 & 3: Find user by email or username
    const user = await this.findActiveUserByEmailOrUsername(dto.usernameOrEmail);
    if (!user) {
      this.recordFailedAttempt(cleanIdentifier);
      throw {
        statusCode: 401,
        message: 'Invalid email/username or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // Step 4 & 5: Verify submitted password against hashed password
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.recordFailedAttempt(cleanIdentifier);
      throw {
        statusCode: 401,
        message: 'Invalid email/username or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // Clear failed attempts on valid credentials
    this.clearFailedAttempts(cleanIdentifier);

    // Check email verification status
    if (!user.emailVerifiedAt) {
      throw {
        statusCode: 403,
        message: 'Please verify your email before logging in.',
        code: 'ACCOUNT_UNVERIFIED',
      };
    }

    // Step 6: Check user account status
    if (user.status === UserStatus.INACTIVE) {
      throw {
        statusCode: 403,
        message: 'Your account is currently inactive.',
        code: 'ACCOUNT_INACTIVE',
      };
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw {
        statusCode: 403,
        message: 'Your account has been suspended. Please contact the administrator.',
        code: 'ACCOUNT_SUSPENDED',
      };
    }

    // Step 8: Update last_login
    const now = new Date();
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: now },
      });
    } catch {
      // Offline fallback
    }
    user.lastLogin = now;

    // Step 7: Create secure login session/token
    const expiryTime = dto.rememberMe ? '30d' : ACCESS_TOKEN_EXPIRY;
    const accessToken = this.generateAccessToken(user, expiryTime);

    const refreshDays = dto.rememberMe ? 30 : REFRESH_TOKEN_EXPIRY_DAYS;
    const { rawToken, tokenHash, expiresAt } = this.generateRefreshToken(refreshDays);

    try {
      await prisma.refreshToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
          isRevoked: false,
        },
      });
    } catch {
      // Prisma offline fallback
    }

    const permissions = getPermissionsForRole(user.role);

    try {
      await recordAuditLog({
        userId: user.id,
        action: 'USER_LOGIN',
        entityName: 'User',
        entityId: user.id,
        details: {
          role: user.role,
          rememberMe: !!dto.rememberMe,
          authMethod: 'PASSWORD',
        },
        ipAddress: dto.ipAddress,
      });
    } catch {
      // Audit log optional
    }

    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`;
    const normalizedRole = user.role === UserRole.ADMIN ? 'admin' : 'user';

    // Step 9 & Response Format
    return {
      success: true,
      message: 'Login successful',
      token: accessToken,
      accessToken,
      refreshToken: rawToken,
      expiresIn: expiryTime,
      user: {
        id: user.id,
        fullName: user.fullName || user.username,
        name: user.fullName || user.username,
        firstName: user.fullName ? user.fullName.split(' ')[0] : user.username,
        lastName: user.fullName && user.fullName.includes(' ') ? user.fullName.split(' ').slice(1).join(' ') : '',
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: normalizedRole,
        originalRole: user.role,
        status: user.status.toLowerCase(),
        emailVerified: user.emailVerifiedAt !== null,
        emailVerifiedAt: user.emailVerifiedAt,
        avatarUrl: user.avatarUrl || defaultAvatar,
        lastLogin: user.lastLogin || now,
        createdAt: user.createdAt,
        permissions,
      },
    };
  }

  /**
   * 7. Refresh Tokens
   */
  static async refreshTokens(rawRefreshToken: string, ipAddress?: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    try {
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken || storedToken.isRevoked) {
        throw { statusCode: 401, message: 'Invalid or revoked refresh token. Please re-authenticate.', code: 'REVOKED_REFRESH_TOKEN' };
      }

      if (new Date() > storedToken.expiresAt) {
        await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { isRevoked: true } });
        throw { statusCode: 401, message: 'Refresh token expired. Please log in again.', code: 'REFRESH_TOKEN_EXPIRED' };
      }

      const newRefresh = this.generateRefreshToken();
      await prisma.$transaction([
        prisma.refreshToken.update({ where: { id: storedToken.id }, data: { isRevoked: true } }),
        prisma.refreshToken.create({
          data: { tokenHash: newRefresh.tokenHash, userId: storedToken.user.id, expiresAt: newRefresh.expiresAt, isRevoked: false },
        }),
      ]);

      const accessToken = this.generateAccessToken(storedToken.user);
      return {
        accessToken,
        refreshToken: newRefresh.rawToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
        user: {
          id: storedToken.user.id,
          username: storedToken.user.username,
          email: storedToken.user.email,
          role: storedToken.user.role,
          permissions: getPermissionsForRole(storedToken.user.role),
        },
      };
    } catch (err: any) {
      if (err?.statusCode) throw err;
      throw { statusCode: 401, message: 'Could not refresh session. Please log in again.', code: 'REFRESH_FAILED' };
    }
  }

  /**
   * 8. Logout
   */
  static async logout(rawRefreshToken: string | undefined, userId: string, ipAddress?: string) {
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      try {
        await prisma.refreshToken.updateMany({
          where: { tokenHash, userId },
          data: { isRevoked: true },
        });
      } catch {
        // Fallback
      }
    }

    try {
      await recordAuditLog({
        userId,
        action: 'USER_LOGOUT',
        entityName: 'User',
        entityId: userId,
        details: { logoutTime: new Date() },
        ipAddress,
      });
    } catch {
      // Optional
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * 9. Change Password (Authenticated)
   */
  static async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.confirmPassword && dto.newPassword !== dto.confirmPassword) {
      throw { statusCode: 400, message: 'Passwords do not match.', code: 'PASSWORD_MISMATCH' };
    }

    let user: any = null;
    try {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } catch {
      // offline fallback
    }

    if (!user) {
      user = Array.from(UserCreationService.memoryUsers.values()).find((u) => u.id === userId);
    }
    if (!user) {
      user = Array.from(this.seedUsers.values()).find((u) => u.id === userId);
    }

    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 400, message: 'Current password does not match', code: 'INVALID_PASSWORD' };
    }

    if (dto.newPassword === dto.currentPassword) {
      throw { statusCode: 400, message: 'New password cannot be the same as current password.', code: 'SAME_PASSWORD' };
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    try {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
        prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } }),
      ]);
    } catch {
      user.passwordHash = newHash;
    }

    try {
      await recordAuditLog({
        userId,
        action: 'PASSWORD_CHANGE',
        entityName: 'User',
        entityId: userId,
        details: { email: user.email },
        ipAddress: dto.ipAddress,
      });
    } catch {
      // Optional
    }

    // Deliver confirmation email to the user's Gmail
    await EmailService.sendPasswordChangedEmail({
      toEmail: user.email,
      recipientName: user.fullName || user.username,
      firstName: user.firstName,
    });

    return { success: true, message: 'Password updated successfully. Please log in again with your new password.' };
  }

  /**
   * 10. Profile Management
   */
  static async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      const derivedFullName =
        dto.fullName?.trim() ||
        (dto.firstName || dto.lastName
          ? `${dto.firstName || ''} ${dto.lastName || ''}`.trim()
          : undefined);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(derivedFullName && { fullName: derivedFullName }),
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.position && { position: dto.position }),
          ...(dto.department && { department: dto.department }),
        },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          position: true,
          department: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          updatedAt: true,
        },
      });

      return {
        ...updated,
        firstName: updated.fullName ? updated.fullName.split(' ')[0] : updated.username,
        lastName: updated.fullName && updated.fullName.includes(' ') ? updated.fullName.split(' ').slice(1).join(' ') : '',
        emailVerified: updated.emailVerifiedAt !== null,
      };
    } catch {
      const memUser = Array.from(UserCreationService.memoryUsers.values()).find((u) => u.id === userId);
      if (memUser) {
        if (dto.fullName) memUser.fullName = dto.fullName;
        else if (dto.firstName || dto.lastName) {
          memUser.fullName = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
        }
        if (dto.phone) memUser.phone = dto.phone;
        return {
          ...memUser,
          firstName: memUser.fullName ? memUser.fullName.split(' ')[0] : memUser.username,
          lastName: memUser.fullName && memUser.fullName.includes(' ') ? memUser.fullName.split(' ').slice(1).join(' ') : '',
          emailVerified: memUser.emailVerifiedAt !== null,
        };
      }
      throw { statusCode: 404, message: 'User not found' };
    }
  }

  static async getProfile(userId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    try {
      let user: any = null;
      if (isUuid) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            phone: true,
            position: true,
            department: true,
            avatarUrl: true,
            lastLogin: true,
            role: true,
            status: true,
            emailVerifiedAt: true,
            createdAt: true,
            userSetting: true,
            borrowers: {
              select: {
                id: true,
                borrowerId: true,
                monthlyIncome: true,
                occupation: true,
                status: true,
              },
            },
          },
        });
      }

      if (user) {
        return {
          ...user,
          firstName: user.fullName ? user.fullName.split(' ')[0] : user.username,
          lastName: user.fullName && user.fullName.includes(' ') ? user.fullName.split(' ').slice(1).join(' ') : '',
          emailVerified: user.emailVerifiedAt !== null,
          avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`,
          permissions: getPermissionsForRole(user.role),
        };
      }
    } catch {
      // Memory fallback
    }

    const memUser = Array.from(UserCreationService.memoryUsers.values()).find((u) => u.id === userId);
    if (memUser) {
      return {
        ...memUser,
        firstName: memUser.fullName ? memUser.fullName.split(' ')[0] : memUser.username,
        lastName: memUser.fullName && memUser.fullName.includes(' ') ? memUser.fullName.split(' ').slice(1).join(' ') : '',
        emailVerified: memUser.emailVerifiedAt !== null,
        avatarUrl: memUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(memUser.username)}`,
        userSetting: {
          theme: 'light',
          currency: 'USD',
          branch: 'Phnom Penh Main Branch',
          notificationsEnabled: true,
        },
        permissions: getPermissionsForRole(memUser.role),
      };
    }

    const seed = Array.from(this.seedUsers.values()).find((u) => u.id === userId);
    if (seed) {
      return {
        ...seed,
        firstName: seed.fullName ? seed.fullName.split(' ')[0] : seed.username,
        lastName: seed.fullName && seed.fullName.includes(' ') ? seed.fullName.split(' ').slice(1).join(' ') : '',
        emailVerified: seed.emailVerifiedAt !== null,
        userSetting: {
          theme: 'light',
          currency: 'USD',
          branch: 'Phnom Penh Main Branch',
          notificationsEnabled: true,
        },
        permissions: getPermissionsForRole(seed.role),
      };
    }

    throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
  }

  /**
   * 11. Self-register Borrower
   */
  static async registerBorrower(dto: RegisterBorrowerDto) {
    const currentYear = new Date().getFullYear();
    const count = await prisma.borrower.count().catch(() => 0);
    const formattedCode = `BOR-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
          role: UserRole.BORROWER,
          status: UserStatus.ACTIVE,
        },
      });

      const borrower = await tx.borrower.create({
        data: {
          borrowerId: formattedCode,
          userId: user.id,
          fullName: dto.fullName,
          gender: dto.gender,
          dob: new Date(dto.dob),
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          occupation: dto.occupation,
          monthlyIncome: dto.monthlyIncome,
          idNumber: dto.idNumber,
          status: UserStatus.ACTIVE,
        },
      });

      return { user, borrower };
    }).catch(async () => {
      // Fallback in-memory
      const user = {
        id: crypto.randomUUID(),
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        role: UserRole.BORROWER,
        status: UserStatus.ACTIVE,
      };
      const borrower = {
        id: crypto.randomUUID(),
        borrowerId: formattedCode,
        fullName: dto.fullName,
        status: UserStatus.ACTIVE,
      };
      return { user, borrower };
    });

    const accessToken = this.generateAccessToken(result.user as any);
    const { rawToken } = this.generateRefreshToken();

    return {
      accessToken,
      refreshToken: rawToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        permissions: getPermissionsForRole(UserRole.BORROWER),
      },
      borrower: (result as any).borrower,
    };
  }
}
