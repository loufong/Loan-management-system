import cron, { ScheduledTask } from 'node-cron';
import { OverdueService } from './overdue.service';

let overdueCronTask: ScheduledTask | null = null;

/**
 * Automated Daily Job using node-cron running at 00:01 every day ('1 0 * * *')
 */
export function initOverdueCronJob(): ScheduledTask {
  if (overdueCronTask) {
    return overdueCronTask;
  }

  // Schedule to run at 00:01 every day: minute 1, hour 0
  overdueCronTask = cron.schedule('1 0 * * *', async () => {
    console.log('\n⏰ [Cron Job] Running automated daily overdue detection scan at 00:01...');
    try {
      const result = await OverdueService.triggerOverdueScan();
      console.log(`✅ [Cron Job] Overdue scan completed: ${result.overdueInstallmentsCount} past-due installments processed.`);
    } catch (err) {
      console.error('❌ [Cron Job] Overdue scan encountered error:', err);
    }
  });

  console.log('⏰ Automated daily overdue detection cron job registered: schedule="1 0 * * *" (00:01 daily)');
  return overdueCronTask;
}

export function stopOverdueCronJob(): void {
  if (overdueCronTask) {
    overdueCronTask.stop();
    overdueCronTask = null;
    console.log('🛑 Overdue cron job stopped.');
  }
}
