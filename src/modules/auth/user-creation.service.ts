import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import { PendingRegistrationRecord, PendingRegistrationService } from './pending-registration.service';
import { recordAuditLog } from '../../utils/audit';

export interface CreatedUserResult {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  lastLogin?: Date | null;
  emailVerifiedAt: Date;
  createdAt: Date;
}

export class UserCreationService {
  // In-memory fallback map for active users when PostgreSQL is offline
  public static memoryUsers: Map<string, CreatedUserResult & { passwordHash: string }> = new Map();

  /**
   * Promotes a verified pending registration into a permanent active user account.
   * Executed strictly inside an atomic transaction.
   */
  public static async promotePendingToUser(params: {
    pendingRegistration: PendingRegistrationRecord;
    otpId?: string;
    ipAddress?: string;
  }): Promise<CreatedUserResult> {
    const { pendingRegistration, otpId, ipAddress } = params;
    const now = new Date();

    // Check that pending registration has not expired (30 minutes)
    if (now > new Date(pendingRegistration.expiresAt)) {
      throw {
        statusCode: 400,
        message: 'The registration session has expired (30-minute limit). Please submit the registration form again.',
        code: 'PENDING_REGISTRATION_EXPIRED',
      };
    }

    const userId = crypto.randomUUID();
    const cleanEmail = pendingRegistration.email.toLowerCase().trim();
    const cleanUsername = pendingRegistration.username.trim();
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;

    let createdUser: CreatedUserResult;

    // Execute atomic transaction
    try {
      createdUser = await prisma.$transaction(async (tx) => {
        const nameParts = pendingRegistration.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || undefined;

        // 1. Create real permanent user with avatar, lastLogin, and default settings
        const user = await tx.user.create({
          data: {
            id: userId,
            username: cleanUsername,
            email: cleanEmail,
            passwordHash: pendingRegistration.passwordHash, // Copied already-hashed!
            fullName: pendingRegistration.fullName.trim(),
            phone: pendingRegistration.phone.trim(),
            role: UserRole.USER, // Public registrations always default to USER
            status: UserStatus.ACTIVE,
            emailVerifiedAt: now,
            avatarUrl: defaultAvatar,
            lastLogin: now,
            userSetting: {
              create: {
                theme: 'light',
                currency: 'USD',
                branch: 'Phnom Penh Main Branch',
                notificationsEnabled: true,
              },
            },
          },
        });

        // 2. Create linked Borrower record for the newly registered normal user in DB
        const borrowerCount = await tx.borrower.count();
        const borrowerId = `BOR-2026-${String(borrowerCount + 1).padStart(4, '0')}`;
        await tx.borrower.create({
          data: {
            borrowerId,
            userId: user.id,
            fullName: user.fullName,
            gender: 'UNSPECIFIED',
            dob: new Date('2000-01-01'),
            phone: user.phone || '012345678',
            email: user.email,
            address: 'Phnom Penh, Cambodia',
            occupation: 'Client Borrower',
            monthlyIncome: 1500,
            idNumber: `ID-${user.id.slice(0, 8).toUpperCase()}`,
            status: UserStatus.ACTIVE,
          },
        });

        // 3. Delete pending registration record (both in DB transaction and in-memory cache)
        await PendingRegistrationService.deletePendingRegistration(pendingRegistration.id, tx);

        // 3. Invalidate OTP if provided
        if (otpId) {
          await tx.otpVerification.updateMany({
            where: { id: otpId },
            data: {
              verifiedAt: now,
              invalidatedAt: now,
            },
          });
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName || pendingRegistration.fullName.trim(),
          phone: user.phone || undefined,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl || defaultAvatar,
          lastLogin: user.lastLogin || now,
          emailVerifiedAt: user.emailVerifiedAt || now,
          createdAt: user.createdAt,
        };
      });
    } catch (err: any) {
      console.error('Failed to promote pending registration into PostgreSQL:', err);
      throw {
        statusCode: 500,
        message: 'Failed to create user account in database. Please try again.',
        code: 'USER_CREATION_FAILED',
      };
    }

    // Record audit log
    try {
      await recordAuditLog({
        userId: createdUser.id,
        action: 'USER_REGISTERED_VERIFIED',
        entityName: 'User',
        entityId: createdUser.id,
        details: {
          email: createdUser.email,
          role: createdUser.role,
          verifiedVia: 'GMAIL_OTP',
        },
        ipAddress,
      });
    } catch {
      // Audit log optional
    }

    return createdUser;
  }
}
