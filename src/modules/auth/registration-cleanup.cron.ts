import cron, { ScheduledTask } from 'node-cron';
import { PendingRegistrationService } from './pending-registration.service';
import { prisma } from '../../config/prisma';

let cleanupTask: ScheduledTask | null = null;

/**
 * Initializes the hourly scheduled cleanup job to purge expired pending registrations and old OTP records.
 * Schedule: '0 * * * *' (at minute 0 of every hour)
 */
export function initRegistrationCleanupCron(): void {
  cleanupTask = cron.schedule('0 * * * *', async () => {
    try {
      console.log('🧹 [Cleanup Cron] Starting hourly purge of expired pending registrations & OTPs...');

      // 1. Purge expired pending registrations (older than 30 mins)
      const purgedPending = await PendingRegistrationService.cleanupExpired();

      // 2. Purge expired OTP verifications older than 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let purgedOtps = 0;
      try {
        const otpRes = await prisma.otpVerification.deleteMany({
          where: { expiresAt: { lt: oneDayAgo } },
        });
        purgedOtps = otpRes.count;
      } catch {
        // Fallback
      }

      console.log(`🧹 [Cleanup Cron] Purged ${purgedPending} expired pending registrations and ${purgedOtps} expired OTP records.`);
    } catch (err: any) {
      console.error('❌ [Cleanup Cron Error] Failed to purge expired records:', err?.message || err);
    }
  });

  console.log('⏰ Automated hourly registration cleanup cron registered: schedule="0 * * * *"');
}

export function stopRegistrationCleanupCron(): void {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
  }
}
