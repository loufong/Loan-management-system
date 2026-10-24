/**
 * ============================================================================
 * Telegram Repayment Reminder Bot Service (Node.js)
 * File: src/services/telegramReminderBot.ts
 *
 * Implements Prompt 6.1 (Cambodia Banking Standard):
 * - Scheduled daily at 8:00 AM (Cambodia Time / ICT UTC+7).
 * - Identifies all installments due within the next 3 days.
 * - Dispatches bilingual Khmer/English notifications with generated Bakong KHQR.
 * - Broadcasts delinquent / newly overdue loans to Branch Manager channel.
 * ============================================================================
 */

import { prisma } from '../config/prisma';
import { BakongService } from '../modules/payments/bakong.service';

export interface TelegramBotConfig {
  botToken?: string;
  managerChatId?: string;
}

export class TelegramReminderBotService {
  private static botToken: string = process.env.TELEGRAM_BOT_TOKEN || '';
  private static managerChatId: string = process.env.TELEGRAM_MANAGER_CHANNEL_ID || '';

  /**
   * Send text message via Telegram Bot API
   */
  public static async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken || !chatId) {
      console.log(`[Telegram Bot Simulation] -> ${chatId}:\n${text}\n`);
      return true;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML'
        })
      });
      return response.ok;
    } catch (err) {
      console.error('[Telegram Bot] Send message error:', err);
      return false;
    }
  }

  /**
   * Main Dispatch Routine: Run every day at 8:00 AM Cambodia Time
   */
  public static async executeDailyReminders(): Promise<{
    remindersSent: number;
    overdueAlerted: number;
  }> {
    console.log('⏰ [Telegram Bot] Initiating daily 8:00 AM repayment reminders check (Cambodia Standard)...');

    const now = new Date();
    const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let remindersSent = 0;
    let overdueAlerted = 0;

    try {
      // 1. Query upcoming installments (due within 3 days)
      const upcomingInstallments = await prisma.repaymentSchedule.findMany({
        where: {
          dueDate: {
            gte: now,
            lte: threeDaysOut
          },
          status: {
            not: 'PAID'
          }
        },
        include: {
          loan: {
            include: {
              borrower: true
            }
          }
        }
      });

      console.log(`[Telegram Bot] Found ${upcomingInstallments.length} installment(s) due within 3 days.`);

      for (const inst of upcomingInstallments) {
        const borrower = inst.loan?.borrower;
        const loanCode = inst.loan?.loanCode || `LN-${inst.loanId.slice(0, 8)}`;
        const amountDue = inst.remainingAmount || inst.totalDue;
        const dueDateStr = inst.dueDate.toISOString().split('T')[0];
        const borrowerNameEn = borrower?.nameEn || 'Valued Client';
        const borrowerNameKh = borrower?.nameKh || borrowerNameEn;

        // Generate Bakong KHQR for instant payment
        const khqr = await BakongService.generateKhqr({
          amount: amountDue,
          currency: 'USD',
          billNumber: `BILL-${inst.id.slice(0, 10)}`
        });

        // Bilingual Message Template (Khmer & English)
        const message = `
🇰🇭 <b>សេចក្តីជូនដំណឹងអំពីការបង់ប្រាក់ឥណទាន (Repayment Reminder)</b>

ជំរាបសួរលោក/លោកស្រី <b>${borrowerNameKh}</b> (${borrowerNameEn})
សូមរំលឹកអំពីការបង់ប្រាក់ប្រចាំខែសម្រាប់កម្ចីលេខ <b>${loanCode}</b>៖

• <b>ចំនួនទឹកប្រាក់ត្រូវបង់ (Amount Due):</b> $${amountDue.toFixed(2)} USD
• <b>កាលបរិច្ឆេទកំណត់ (Due Date):</b> ${dueDateStr}
• <b>ដំណាក់កាលបង់ (Installment):</b> #${inst.installmentNumber}

<i>លោកអ្នកអាចស្កេន Bakong KHQR ខាងក្រោមនេះតាមរយៈកម្មវិធី Bakong ឬ Mobile Banking ដើម្បីទូទាត់ប្រាក់ភ្លាមៗ៖</i>
<code>${khqr.qr}</code>

----------------------------------------
Dear ${borrowerNameEn},
Your loan installment for <b>${loanCode}</b> ($${amountDue.toFixed(2)}) is due on <b>${dueDateStr}</b>. Please settle via Bakong KHQR or Cashier counter.
`.trim();

        // Send to borrower
        const targetChat = borrower?.phone || this.managerChatId || 'demo_client_chat';
        await this.sendMessage(targetChat, message);
        remindersSent++;
      }

      // 2. Alert Branch Manager about loans overdue today
      const overdueSchedules = await prisma.repaymentSchedule.findMany({
        where: {
          dueDate: {
            lt: now
          },
          status: {
            not: 'PAID'
          }
        },
        include: {
          loan: {
            include: {
              borrower: true
            }
          }
        }
      });

      if (overdueSchedules.length > 0 && this.managerChatId) {
        const lines = overdueSchedules
          .slice(0, 10)
          .map((s) => `• <b>${s.loan.loanCode}</b>: ${s.loan.borrower?.nameEn} (${s.loan.borrower?.phone}) - $${s.remainingAmount || s.totalDue}`)
          .join('\n');

        const managerAlert = `
⚠️ <b>BRANCH MANAGER ALERT: Portfolio at Risk (PAR) Delinquency</b>
Total Overdue Loans: ${overdueSchedules.length}

${lines}

Please dispatch loan officers for immediate client engagement.
`.trim();

        await this.sendMessage(this.managerChatId, managerAlert);
        overdueAlerted = overdueSchedules.length;
      }
    } catch (err) {
      console.error('[Telegram Bot] Routine execution error:', err);
    }

    return { remindersSent, overdueAlerted };
  }
}

export default TelegramReminderBotService;
