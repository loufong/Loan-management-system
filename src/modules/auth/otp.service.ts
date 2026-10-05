import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { EmailService } from '../../services/email.service';
import { RateLimitService } from '../../services/rate-limit.service';

export type OtpPurpose = 'register_verification' | 'forgot_password' | 'email_verification';

export interface OtpVerificationRecord {
  id: string;
  pendingRegistrationId?: string | null;
  email: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  invalidatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plaintextForDev?: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  message: string;
  pendingRegistrationId?: string | null;
  resetToken?: string;
  otpId?: string;
  email?: string;
  purpose?: OtpPurpose;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  devOtp?: string;
  pendingRegistrationId?: string | null;
}

export class OtpService {
  private static readonly OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly SALT = process.env.OTP_SALT || 'apex-lms-secure-otp-salt-2026';

  // In-memory fallback store when PostgreSQL is offline
  private static memoryStore: Map<string, OtpVerificationRecord[]> = new Map();

  /**
   * Generates a cryptographically secure 6-digit numeric OTP code.
   */
  public static generateCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes the 6-digit OTP using salted SHA-256.
   */
  public static hashOtp(code: string, email: string): string {
    return crypto
      .createHash('sha256')
      .update(`${code}:${email.toLowerCase().trim()}:${this.SALT}`)
      .digest('hex');
  }

  /**
   * Generates, stores, and sends an OTP for registration or password reset.
   * Invalidates any prior active OTP for the same email and purpose.
   */
  public static async createAndSendOtp(params: {
    email: string;
    purpose: OtpPurpose;
    recipientName?: string;
    pendingRegistrationId?: string | null;
  }): Promise<SendOtpResult> {
    const cleanEmail = params.email.toLowerCase().trim();

    // 1. Rate-limiting check: enforce 60-second cooldown
    const rateCheck = RateLimitService.checkResendCooldown(cleanEmail, params.purpose);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Please wait ${rateCheck.remainingSeconds} seconds before requesting a new verification code.`,
        expiresInSeconds: rateCheck.remainingSeconds,
      };
    }

    // 2. Invalidate previous unverified OTPs for this email and purpose
    await this.invalidatePreviousOtps(cleanEmail, params.purpose);

    // 3. Generate new 6-digit code and salted hash
    const otpCode = this.generateCode();
    const otpHash = this.hashOtp(otpCode, cleanEmail);
    const now = new Date();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS);

    const record: OtpVerificationRecord = {
      id: crypto.randomUUID(),
      pendingRegistrationId: params.pendingRegistrationId || null,
      email: cleanEmail,
      otpHash,
      purpose: params.purpose,
      attempts: 0,
      expiresAt,
      verifiedAt: null,
      invalidatedAt: null,
      createdAt: now,
      updatedAt: now,
      plaintextForDev: otpCode,
    };

    // Store in-memory
    const existingList = this.memoryStore.get(cleanEmail) || [];
    existingList.push(record);
    this.memoryStore.set(cleanEmail, existingList);

    // Store in database table `otp_verifications`
    try {
      await prisma.otpVerification.create({
        data: {
          id: record.id,
          pendingRegistrationId: record.pendingRegistrationId || undefined,
          email: record.email,
          otpHash: record.otpHash,
          purpose: record.purpose,
          attempts: 0,
          expiresAt: record.expiresAt,
          createdAt: record.createdAt,
        },
      });
    } catch {
      // Fallback
    }

    // Record sent timestamp for cooldown
    RateLimitService.recordOtpSent(cleanEmail, params.purpose);

    // 4. Deliver via Real Gmail SMTP
    const emailResult = await EmailService.sendOtpEmail({
      toEmail: cleanEmail,
      recipientName: params.recipientName || 'Valued User',
      otpCode,
      purpose: params.purpose,
    });

    if (!emailResult.success && !emailResult.isSimulated) {
      return {
        success: false,
        message: 'Unable to send the verification email. Please check your Gmail SMTP configuration.',
        expiresInSeconds: 0,
        pendingRegistrationId: params.pendingRegistrationId,
      };
    }

    return {
      success: true,
      message: 'Verification code sent successfully to your Gmail.',
      expiresInSeconds: 300,
      devOtp: emailResult.isSimulated ? otpCode : undefined,
      pendingRegistrationId: params.pendingRegistrationId,
    };
  }

  /**
   * Verifies the submitted 6-digit OTP.
   */
  public static async verifyOtp(params: {
    email: string;
    code: string;
    purpose: OtpPurpose;
  }): Promise<VerifyOtpResult> {
    const cleanEmail = params.email.toLowerCase().trim();
    const cleanCode = params.code.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return { valid: false, message: 'Invalid OTP format. Must be exactly 6 digits.' };
    }

    // Retrieve latest active OTP
    const record = await this.getLatestActiveOtp(cleanEmail, params.purpose);

    if (!record) {
      return {
        valid: false,
        message: 'No active OTP found. Please request a new verification code.',
      };
    }

    // Check invalidated
    if (record.invalidatedAt || record.verifiedAt) {
      return {
        valid: false,
        message: 'This verification code is no longer active. Please request a new code.',
      };
    }

    // Check expiration (5 minutes)
    if (new Date() > new Date(record.expiresAt)) {
      return {
        valid: false,
        message: 'Verification code has expired. Please request a new code.',
      };
    }

    // Check attempt limit (max 5)
    const attemptCheck = RateLimitService.checkAttempts(record.id, record.attempts);
    if (!attemptCheck.allowed) {
      // Invalidate OTP
      record.invalidatedAt = new Date();
      await this.persistInvalidation(record.id);
      return {
        valid: false,
        message: 'Too many incorrect attempts. This verification code has been locked. Please request a new code.',
      };
    }

    // Verify hash
    const inputHash = this.hashOtp(cleanCode, cleanEmail);
    if (inputHash !== record.otpHash) {
      record.attempts += 1;
      RateLimitService.recordFailedAttempt(record.id);

      try {
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
      } catch {
        // Fallback
      }

      const remaining = Math.max(0, 5 - record.attempts);
      return {
        valid: false,
        message: remaining > 0 ? `Invalid OTP. ${remaining} attempt(s) remaining.` : 'Too many incorrect attempts. Code locked.',
      };
    }

    // SUCCESS! Mark verified and invalidate
    const now = new Date();
    record.verifiedAt = now;
    record.invalidatedAt = now;
    RateLimitService.clearAttempts(record.id);

    try {
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: {
          verifiedAt: now,
          invalidatedAt: now,
        },
      });
    } catch {
      // Fallback
    }

    let resetToken: string | undefined;
    if (params.purpose === 'forgot_password') {
      const secret = process.env.JWT_SECRET || 'apex-lms-jwt-secret-2026';
      resetToken = jwt.sign(
        {
          email: cleanEmail,
          purpose: 'password_reset_authorized',
          otpId: record.id,
        },
        secret,
        { expiresIn: '15m' }
      );
    }

    return {
      valid: true,
      message: 'OTP verified successfully.',
      pendingRegistrationId: record.pendingRegistrationId,
      resetToken,
      otpId: record.id,
      email: cleanEmail,
      purpose: params.purpose,
    };
  }

  /**
   * Helper: Invalidates all active unverified OTPs for this email and purpose.
   */
  private static async invalidatePreviousOtps(email: string, purpose: OtpPurpose): Promise<void> {
    const now = new Date();

    try {
      await prisma.otpVerification.updateMany({
        where: {
          email,
          purpose,
          verifiedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: now },
      });
    } catch {
      // Fallback
    }

    const list = this.memoryStore.get(email);
    if (list) {
      for (const rec of list) {
        if (rec.purpose === purpose && !rec.verifiedAt && !rec.invalidatedAt) {
          rec.invalidatedAt = now;
        }
      }
    }
  }

  /**
   * Helper: Retrieves latest active OTP record.
   */
  private static async getLatestActiveOtp(email: string, purpose: OtpPurpose): Promise<OtpVerificationRecord | null> {
    try {
      const dbRecord = await prisma.otpVerification.findFirst({
        where: {
          email,
          purpose,
          invalidatedAt: null,
          verifiedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbRecord) {
        return {
          id: dbRecord.id,
          pendingRegistrationId: dbRecord.pendingRegistrationId,
          email: dbRecord.email,
          otpHash: dbRecord.otpHash,
          purpose: dbRecord.purpose as OtpPurpose,
          attempts: dbRecord.attempts,
          expiresAt: dbRecord.expiresAt,
          verifiedAt: dbRecord.verifiedAt,
          invalidatedAt: dbRecord.invalidatedAt,
          createdAt: dbRecord.createdAt,
          updatedAt: dbRecord.updatedAt,
        };
      }
    } catch {
      // Fallback
    }

    const list = this.memoryStore.get(email) || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (r.purpose === purpose && !r.invalidatedAt && !r.verifiedAt) {
        return r;
      }
    }

    return null;
  }

  private static async persistInvalidation(id: string): Promise<void> {
    try {
      await prisma.otpVerification.update({
        where: { id },
        data: { invalidatedAt: new Date() },
      });
    } catch {
      // Fallback
    }
  }
}
