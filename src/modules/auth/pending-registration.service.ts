import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { UserCreationService } from './user-creation.service';

export interface CreatePendingRegistrationDto {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string; // Plaintext from user, will be hashed immediately
}

export interface PendingRegistrationRecord {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PendingRegistrationService {
  private static readonly PENDING_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  // In-memory fallback store when PostgreSQL is offline
  private static memoryStore: Map<string, PendingRegistrationRecord> = new Map();

  /**
   * Normalizes an email address according to standard banking application rules.
   */
  public static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalizes a username according to application rules.
   */
  public static normalizeUsername(username: string): string {
    return username.trim();
  }

  /**
   * Step 3: Check whether an active user account already exists with this email or username.
   */
  public static async assertNoActiveUser(email: string, username: string): Promise<void> {
    const cleanEmail = this.normalizeEmail(email);
    const cleanUsername = this.normalizeUsername(username);

    // 1. Check in-memory active users (fallback / newly promoted)
    for (const u of UserCreationService.memoryUsers.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        throw { statusCode: 400, message: 'Email is already registered.', code: 'EMAIL_ALREADY_EXISTS' };
      }
      if (u.username.toLowerCase() === cleanUsername.toLowerCase()) {
        throw { statusCode: 400, message: 'Username is already taken. Please choose another.', code: 'USERNAME_TAKEN' };
      }
    }

    // 2. Check static accounts
    const staticEmails = ['manager@apex.local', 'officer@apex.local', 'cashier@apex.local', 'borrower@apex.local'];
    if (staticEmails.includes(cleanEmail)) {
      throw { statusCode: 400, message: 'Email is already registered.', code: 'EMAIL_ALREADY_EXISTS' };
    }

    // 3. Check persistent database
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: cleanEmail, mode: 'insensitive' } },
            { username: { equals: cleanUsername, mode: 'insensitive' } },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email.toLowerCase() === cleanEmail) {
          throw { statusCode: 400, message: 'Email is already registered.', code: 'EMAIL_ALREADY_EXISTS' };
        }
        if (existingUser.username.toLowerCase() === cleanUsername.toLowerCase()) {
          throw { statusCode: 400, message: 'Username is already taken. Please choose another.', code: 'USERNAME_TAKEN' };
        }
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_ALREADY_EXISTS' || err?.code === 'USERNAME_TAKEN') {
        throw err;
      }
      // If DB is offline, in-memory checks already performed above
    }
  }

  /**
   * Steps 4-6: Creates or updates a pending registration.
   * Hashes the password BEFORE saving.
   * Sets expiration to 30 minutes.
   */
  public static async createOrUpdatePending(dto: CreatePendingRegistrationDto): Promise<PendingRegistrationRecord> {
    const cleanEmail = this.normalizeEmail(dto.email);
    const cleanUsername = this.normalizeUsername(dto.username);

    // 1. Assert email & username do not belong to active user
    await this.assertNoActiveUser(cleanEmail, cleanUsername);

    // 2. Hash password immediately
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();
    const expiresAt = new Date(Date.now() + this.PENDING_EXPIRY_MS);

    // Check existing pending record in memory
    let existingPending = this.memoryStore.get(cleanEmail);

    // Try finding in DB
    try {
      const dbPending = await prisma.pendingRegistration.findFirst({
        where: { email: cleanEmail },
      });
      if (dbPending) {
        existingPending = {
          id: dbPending.id,
          fullName: dbPending.fullName,
          username: dbPending.username,
          email: dbPending.email,
          phone: dbPending.phone,
          passwordHash: dbPending.passwordHash,
          expiresAt: dbPending.expiresAt,
          createdAt: dbPending.createdAt,
          updatedAt: dbPending.updatedAt,
        };
      }
    } catch {
      // DB offline fallback
    }

    let record: PendingRegistrationRecord;

    if (existingPending) {
      // Update existing pending record and refresh 30-minute expiry
      record = {
        ...existingPending,
        fullName: dto.fullName.trim(),
        username: cleanUsername,
        phone: dto.phone.trim(),
        passwordHash,
        expiresAt,
        updatedAt: now,
      };

      try {
        await prisma.pendingRegistration.update({
          where: { id: record.id },
          data: {
            fullName: record.fullName,
            username: record.username,
            phone: record.phone,
            passwordHash: record.passwordHash,
            expiresAt: record.expiresAt,
          },
        });
      } catch {
        // Fallback
      }
    } else {
      // Create fresh pending registration
      record = {
        id: crypto.randomUUID(),
        fullName: dto.fullName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        phone: dto.phone.trim(),
        passwordHash,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await prisma.pendingRegistration.create({
          data: {
            id: record.id,
            fullName: record.fullName,
            username: record.username,
            email: record.email,
            phone: record.phone,
            passwordHash: record.passwordHash,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
          },
        });
      } catch {
        // Fallback
      }
    }

    // Save to memory store
    this.memoryStore.set(cleanEmail, record);
    return record;
  }

  /**
   * Finds a valid, non-expired pending registration by email.
   */
  public static async findValidByEmail(email: string): Promise<PendingRegistrationRecord | null> {
    const cleanEmail = this.normalizeEmail(email);

    // Try DB
    try {
      const dbRecord = await prisma.pendingRegistration.findFirst({
        where: {
          email: cleanEmail,
          expiresAt: { gt: new Date() },
        },
      });

      if (dbRecord) {
        return {
          id: dbRecord.id,
          fullName: dbRecord.fullName,
          username: dbRecord.username,
          email: dbRecord.email,
          phone: dbRecord.phone,
          passwordHash: dbRecord.passwordHash,
          expiresAt: dbRecord.expiresAt,
          createdAt: dbRecord.createdAt,
          updatedAt: dbRecord.updatedAt,
        };
      }
    } catch {
      // Fallback
    }

    const memRecord = this.memoryStore.get(cleanEmail);
    if (memRecord && new Date() < new Date(memRecord.expiresAt)) {
      return memRecord;
    }

    return null;
  }

  /**
   * Deletes a pending registration upon successful user creation.
   */
  public static async deletePendingRegistration(id: string, tx?: any): Promise<void> {
    const client = tx || prisma;

    try {
      await client.pendingRegistration.deleteMany({
        where: { id },
      });
    } catch {
      // Fallback
    }

    for (const [email, rec] of this.memoryStore.entries()) {
      if (rec.id === id) {
        this.memoryStore.delete(email);
        break;
      }
    }
  }

  /**
   * Periodic cleanup: deletes all expired pending registrations older than 30 minutes.
   */
  public static async cleanupExpired(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;

    try {
      const res = await prisma.pendingRegistration.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      deletedCount = res.count;
    } catch {
      // Fallback
    }

    for (const [email, rec] of this.memoryStore.entries()) {
      if (new Date() >= new Date(rec.expiresAt)) {
        this.memoryStore.delete(email);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
