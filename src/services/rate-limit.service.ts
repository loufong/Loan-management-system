/**
 * Rate Limiting Service for Authentication & OTP Endpoints
 * Enforces request frequency limits and maximum incorrect verification attempts.
 */

interface RateLimitEntry {
  lastAttemptAt: number;
  attemptsCount: number;
}

export class RateLimitService {
  private static readonly RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
  private static readonly MAX_OTP_ATTEMPTS = 5;

  private static cooldownStore: Map<string, number> = new Map();
  private static attemptsStore: Map<string, RateLimitEntry> = new Map();

  /**
   * Enforces 60-second cooldown between OTP requests for a specific email & purpose.
   */
  public static checkResendCooldown(email: string, purpose: string): { allowed: boolean; remainingSeconds: number } {
    const key = `${email.toLowerCase().trim()}:${purpose}`;
    const lastSent = this.cooldownStore.get(key);

    if (lastSent) {
      const elapsed = Date.now() - lastSent;
      if (elapsed < this.RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((this.RESEND_COOLDOWN_MS - elapsed) / 1000);
        return { allowed: false, remainingSeconds };
      }
    }

    return { allowed: true, remainingSeconds: 0 };
  }

  /**
   * Records a sent OTP timestamp for cooldown enforcement.
   */
  public static recordOtpSent(email: string, purpose: string): void {
    const key = `${email.toLowerCase().trim()}:${purpose}`;
    this.cooldownStore.set(key, Date.now());
  }

  /**
   * Checks whether the maximum attempts for an OTP key have been exceeded.
   */
  public static checkAttempts(key: string, currentAttemptsInDb?: number): { allowed: boolean; remainingAttempts: number } {
    const attempts = currentAttemptsInDb ?? (this.attemptsStore.get(key)?.attemptsCount || 0);
    const remaining = Math.max(0, this.MAX_OTP_ATTEMPTS - attempts);

    return {
      allowed: attempts < this.MAX_OTP_ATTEMPTS,
      remainingAttempts: remaining,
    };
  }

  /**
   * Increments failed attempt count for an OTP key.
   */
  public static recordFailedAttempt(key: string): number {
    const entry = this.attemptsStore.get(key) || { lastAttemptAt: Date.now(), attemptsCount: 0 };
    entry.attemptsCount += 1;
    entry.lastAttemptAt = Date.now();
    this.attemptsStore.set(key, entry);
    return entry.attemptsCount;
  }

  /**
   * Clears attempts upon successful verification.
   */
  public static clearAttempts(key: string): void {
    this.attemptsStore.delete(key);
  }
}
