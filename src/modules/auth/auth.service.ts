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

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
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
  phone?: string;
  position?: string;
  department?: string;
  ipAddress?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  ipAddress?: string;
}

export class AuthService {
  /**
   * Generates a secure random 64-char refresh token and hashes it for DB storage
   */
  private static generateRefreshToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return { rawToken, tokenHash, expiresAt };
  }

  /**
   * Generates JWT Access Token containing user ID, role, and permissions
   */
  private static generateAccessToken(user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  }): string {
    const permissions: Permission[] = getPermissionsForRole(user.role);

    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions
      },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Authenticate user with username or email & password
   */
  static async login(dto: LoginDto) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.usernameOrEmail },
          { email: dto.usernameOrEmail }
        ]
      }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw { statusCode: 403, message: 'Account is inactive. Please contact system administrator.', code: 'ACCOUNT_INACTIVE' };
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' };
    }

    // 1. Generate access token
    const accessToken = this.generateAccessToken(user);

    // 2. Generate refresh token & persist in database
    const { rawToken, tokenHash, expiresAt } = this.generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        isRevoked: false
      }
    });

    const permissions = getPermissionsForRole(user.role);

    // 3. Security Audit Logging
    await recordAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityName: 'User',
      entityId: user.id,
      details: {
        role: user.role,
        loginTime: new Date(),
        authMethod: 'PASSWORD'
      },
      ipAddress: dto.ipAddress
    });

    return {
      token: accessToken,
      accessToken,
      refreshToken: rawToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        position: user.position,
        department: user.department,
        permissions
      }
    };
  }

  /**
   * Refresh Token rotation: exchanges a valid refresh token for a fresh access + refresh token
   */
  static async refreshTokens(rawRefreshToken: string, ipAddress?: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!storedToken || storedToken.isRevoked) {
      throw {
        statusCode: 401,
        message: 'Invalid or revoked refresh token. Please re-authenticate.',
        code: 'REVOKED_REFRESH_TOKEN'
      };
    }

    if (new Date() > storedToken.expiresAt) {
      // Token expired, revoke it
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      });
      throw { statusCode: 401, message: 'Refresh token expired. Please log in again.', code: 'REFRESH_TOKEN_EXPIRED' };
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw { statusCode: 403, message: 'User account is inactive', code: 'ACCOUNT_INACTIVE' };
    }

    // Token rotation: revoke old token and create a new one
    const newRefresh = this.generateRefreshToken();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newRefresh.tokenHash,
          userId: storedToken.user.id,
          expiresAt: newRefresh.expiresAt,
          isRevoked: false
        }
      })
    ]);

    const accessToken = this.generateAccessToken(storedToken.user);
    const permissions = getPermissionsForRole(storedToken.user.role);

    await recordAuditLog({
      userId: storedToken.user.id,
      action: 'REFRESH_TOKEN',
      entityName: 'RefreshToken',
      entityId: storedToken.id,
      details: { refreshedAt: new Date() },
      ipAddress
    });

    return {
      accessToken,
      refreshToken: newRefresh.rawToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      user: {
        id: storedToken.user.id,
        username: storedToken.user.username,
        email: storedToken.user.email,
        role: storedToken.user.role,
        permissions
      }
    };
  }

  /**
   * Revoke active refresh token on user logout
   */
  static async logout(rawRefreshToken: string | undefined, userId: string, ipAddress?: string) {
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { isRevoked: true }
      });
    }

    await recordAuditLog({
      userId,
      action: 'USER_LOGOUT',
      entityName: 'User',
      entityId: userId,
      details: { logoutTime: new Date() },
      ipAddress
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Change user password and invalidate all active refresh tokens
   */
  static async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 400, message: 'Current password does not match', code: 'INVALID_PASSWORD' };
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // Atomically update password and revoke all active refresh tokens for this user
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      }),
      prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true }
      })
    ]);

    await recordAuditLog({
      userId,
      action: 'CHANGE_PASSWORD',
      entityName: 'User',
      entityId: userId,
      details: { securityEvent: 'Password changed, all active sessions revoked' },
      ipAddress: dto.ipAddress
    });

    return { message: 'Password updated successfully. Please log in again with your new password.' };
  }

  /**
   * Update Profile Details
   */
  static async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.position && { position: dto.position }),
        ...(dto.department && { department: dto.department })
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
        updatedAt: true
      }
    });

    await recordAuditLog({
      userId,
      action: 'UPDATE_PROFILE',
      entityName: 'User',
      entityId: userId,
      details: { updatedFields: Object.keys(dto).filter((k) => k !== 'ipAddress') },
      ipAddress: dto.ipAddress
    });

    return updated;
  }

  /**
   * View current user profile with linked borrower info
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        createdAt: true,
        borrowers: {
          select: {
            id: true,
            borrowerId: true,
            monthlyIncome: true,
            occupation: true,
            status: true
          }
        }
      }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    const permissions = getPermissionsForRole(user.role);

    return {
      ...user,
      permissions
    };
  }

  /**
   * Self-register new borrower
   */
  static async registerBorrower(dto: RegisterBorrowerDto) {
    const currentYear = new Date().getFullYear();
    const count = await prisma.borrower.count();
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
          status: UserStatus.ACTIVE
        }
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
          status: UserStatus.ACTIVE
        }
      });

      return { user, borrower };
    });

    const accessToken = this.generateAccessToken(result.user);
    const { rawToken, tokenHash, expiresAt } = this.generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: result.user.id,
        expiresAt,
        isRevoked: false
      }
    });

    await recordAuditLog({
      userId: result.user.id,
      action: 'REGISTER_BORROWER',
      entityName: 'Borrower',
      entityId: result.borrower.id,
      details: { borrowerId: result.borrower.borrowerId },
      ipAddress: dto.ipAddress
    });

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
        permissions: getPermissionsForRole(UserRole.BORROWER)
      },
      borrower: result.borrower
    };
  }
}
