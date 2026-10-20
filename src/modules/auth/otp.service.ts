import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { EmailService } from '../../services/email.service';

export type OtpPurpose =
  | 'REGISTRATION'
  | 'PASSWORD_RESET'
  | 'EMAIL_VERIFICATION'
  | 'CHANGE_EMAIL'
  | 'register_verification'
  | 'forgot_password'
  | 'LOGIN'
  | 'login_verification';

export interface VerifyOtpResult {
  valid: boolean;
  message: string;
  userId?: string | null;
  resetToken?: string;
  email?: string;
  purpose?: string;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
}

export class OtpService {
  private static readonly OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly RESEND_COOLDOWN_SECONDS = 60; // 60 seconds
  private static readonly MAX_REQUESTS_PER_10_MIN = 3;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly SALT = process.env.OTP_SALT || 'apex-lms-secure-otp-salt-2026';
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'apex-lms-jwt-secret-2026';

  /**
   * Normalizes purpose to standard canonical strings
   */
  public static normalizePurpose(purpose?: string): string {
    if (!purpose) return 'REGISTRATION';
    const upper = purpose.trim().toUpperCase();
    if (upper === 'REGISTER_VERIFICATION' || upper === 'REGISTRATION') return 'REGISTRATION';
    if (upper === 'FORGOT_PASSWORD' || upper === 'PASSWORD_RESET') return 'PASSWORD_RESET';
    if (upper === 'LOGIN' || upper === 'LOGIN_VERIFICATION' || upper === 'LOGIN_2FA') return 'LOGIN';
    if (upper === 'EMAIL_VERIFICATION') return 'EMAIL_VERIFICATION';
    if (upper === 'CHANGE_EMAIL') return 'CHANGE_EMAIL';
    return upper;
  }

  /**
   * Generates a cryptographically secure 6-digit numeric OTP code.
   */
  public static generateCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes the 6-digit OTP using salted SHA-256 for secure database storage.
   */
  public static hashOtp(code: string, email: string): string {
    return crypto
      .createHash('sha256')
      .update(`${code.trim()}:${email.toLowerCase().trim()}:${this.SALT}`)
      .digest('hex');
  }

  /**
   * Creates, persists, and delivers an OTP to the user's Gmail.
   * Enforces 60-second cooldown rate limiting, max 3 requests within 10 minutes,
   * and invalidates prior unverified codes.
   */
  public static async createAndSendOtp(params: {
    email: string;
    purpose: OtpPurpose;
    recipientName?: string;
    firstName?: string;
    userId?: string | null;
    pendingRegistrationId?: string | null;
  }): Promise<SendOtpResult> {
    const cleanEmail = params.email.toLowerCase().trim();
    const canonicalPurpose = this.normalizePurpose(params.purpose);
    const now = new Date();

    // 1. Check Rate Limit: Maximum 3 resend requests within 10 minutes
    try {
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const recentCount = await prisma.otpVerification.count({
        where: {
          email: cleanEmail,
          purpose: {
            in: [canonicalPurpose, params.purpose],
          },
          createdAt: { gte: tenMinutesAgo },
        },
      });

      if (recentCount >= this.MAX_REQUESTS_PER_10_MIN) {
        return {
          success: false,
          message: 'Too many OTP requests. Maximum 3 requests allowed within 10 minutes. Please wait before requesting another code.',
          expiresInSeconds: 600,
        };
      }
    } catch {
      // If DB error, proceed safely
    }

    // 2. Check Resend Rate Limit (60-second cooldown) via PostgreSQL
    try {
      const recentOtp = await prisma.otpVerification.findFirst({
        where: {
          email: cleanEmail,
          purpose: {
            in: [canonicalPurpose, params.purpose],
          },
          invalidatedAt: null,
          verifiedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentOtp) {
        const lastSent = recentOtp.lastSentAt || recentOtp.createdAt;
        const elapsedSeconds = Math.floor((now.getTime() - new Date(lastSent).getTime()) / 1000);
        if (elapsedSeconds < this.RESEND_COOLDOWN_SECONDS) {
          const remainingSeconds = this.RESEND_COOLDOWN_SECONDS - elapsedSeconds;
          return {
            success: false,
            message: `Please wait ${remainingSeconds} seconds before requesting another code.`,
            expiresInSeconds: remainingSeconds,
          };
        }
      }
    } catch {
      // If DB error, proceed safely
    }

    // 3. Invalidate previous active unverified OTPs for this email and purpose in DB
    try {
      await prisma.otpVerification.updateMany({
        where: {
          email: cleanEmail,
          purpose: { in: [canonicalPurpose, params.purpose] },
          verifiedAt: null,
          invalidatedAt: null,
        },
        data: {
          invalidatedAt: now,
        },
      });
    } catch {
      // Ignore cleanup error
    }

    // 4. Generate 6-digit cryptographically random code and hash
    const otpCode = this.generateCode();
    const otpHash = this.hashOtp(otpCode, cleanEmail);
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MS);

    // 5. Persist OTP record in PostgreSQL database
    try {
      await prisma.otpVerification.create({
        data: {
          userId: params.userId || undefined,
          pendingRegistrationId: params.pendingRegistrationId || undefined,
          email: cleanEmail,
          otpHash,
          purpose: canonicalPurpose,
          attempts: 0,
          expiresAt,
          lastSentAt: now,
          createdAt: now,
        },
      });
    } catch (err: any) {
      console.error('Failed to persist OTP in PostgreSQL:', err?.message || err);
    }

    // 6. Deliver via EmailService Abstraction (Resend or SMTP)
    let emailResult;
    if (canonicalPurpose === 'REGISTRATION') {
      emailResult = await EmailService.sendVerificationOTP({
        toEmail: cleanEmail,
        recipientName: params.recipientName,
        otpCode,
      });
    } else if (canonicalPurpose === 'PASSWORD_RESET') {
      emailResult = await EmailService.sendPasswordResetOTP({
        toEmail: cleanEmail,
        recipientName: params.recipientName,
        otpCode,
      });
    } else {
      emailResult = await EmailService.sendOtpEmail({
        toEmail: cleanEmail,
        recipientName: params.recipientName,
        firstName: params.firstName,
        otpCode,
        purpose: canonicalPurpose as any,
      });
    }

    if (!emailResult.success) {
      return {
        success: false,
        message: emailResult.error || 'Unable to send the verification email. Please check your email service configuration.',
        expiresInSeconds: 0,
      };
    }

    return {
      success: true,
      message: 'Verification code sent successfully to your email.',
      expiresInSeconds: 600,
    };
  }

  /**
   * Verifies the submitted 6-digit OTP code against PostgreSQL database.
   */
  public static async verifyOtp(params: {
    email: string;
    code: string;
    purpose: OtpPurpose | string;
  }): Promise<VerifyOtpResult> {
    const cleanEmail = params.email.toLowerCase().trim();
    const cleanCode = (params.code || '').trim();
    const canonicalPurpose = this.normalizePurpose(params.purpose);
    const now = new Date();

    if (!/^\d{6}$/.test(cleanCode)) {
      return { valid: false, message: 'Invalid verification code format. Must be exactly 6 digits.' };
    }

    // 1. Fetch latest active OTP record from PostgreSQL
    const record = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: { in: [canonicalPurpose, params.purpose] },
        verifiedAt: null,
        invalidatedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return {
        valid: false,
        message: 'No active verification code found. Please request a new code.',
      };
    }

    // 2. Check Expiration (5 minutes)
    if (now > new Date(record.expiresAt)) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { invalidatedAt: now },
      });
      return {
        valid: false,
        message: 'This verification code has expired. Please request a new code.',
      };
    }

    // 3. Check Attempt Limit (Maximum 5 attempts)
    if (record.attempts >= this.MAX_ATTEMPTS) {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { invalidatedAt: now },
      });
      return {
        valid: false,
        message: 'Too many attempts. Please request a new code.',
      };
    }

    // 4. Verify Hash
    const inputHash = this.hashOtp(cleanCode, cleanEmail);
    if (inputHash !== record.otpHash) {
      const newAttempts = record.attempts + 1;
      const isLocked = newAttempts >= this.MAX_ATTEMPTS;

      await prisma.otpVerification.update({
        where: { id: record.id },
        data: {
          attempts: newAttempts,
          ...(isLocked ? { invalidatedAt: now } : {}),
        },
      });

      if (isLocked) {
        return {
          valid: false,
          message: 'Too many attempts. Please request a new code.',
        };
      }

      return {
        valid: false,
        message: 'Invalid verification code.',
      };
    }

    // 5. Code is valid: mark as verified and single-use invalidated
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        verifiedAt: now,
        invalidatedAt: now,
      },
    });

    // 6. Generate temporary resetToken if purpose is PASSWORD_RESET
    let resetToken: string | undefined;
    if (canonicalPurpose === 'PASSWORD_RESET') {
      resetToken = jwt.sign(
        {
          email: cleanEmail,
          userId: record.userId,
          purpose: 'PASSWORD_RESET',
        },
        this.JWT_SECRET,
        { expiresIn: '15m' }
      );
    }

    return {
      valid: true,
      message: 'Verification code verified successfully.',
      userId: record.userId,
      resetToken,
      email: cleanEmail,
      purpose: canonicalPurpose,
    };
  }
}
