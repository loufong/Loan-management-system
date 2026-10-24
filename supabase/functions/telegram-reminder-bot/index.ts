/**
 * ============================================================================
 * Supabase Edge Function: Automated Telegram Repayment Reminder Bot
 * File: supabase/functions/telegram-reminder-bot/index.ts
 *
 * Schedule: Daily at 8:00 AM Cambodia Time (ICT / UTC+7 = 01:00 UTC)
 *
 * Responsibilities:
 * 1. Queries installments due within the next 3 days.
 * 2. Sends bilingual (Khmer & English) notification with generated Bakong KHQR.
 * 3. Alerts Branch Manager channel for loans that transitioned to overdue today.
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Environment Variables
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const MANAGER_CHANNEL_ID = Deno.env.get('TELEGRAM_MANAGER_CHANNEL_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface InstallmentNotification {
  id: string;
  loanId: string;
  installmentNo: number;
  dueDate: string;
  totalDue: number;
  currency: string;
  borrowerNameEn: string;
  borrowerNameKh?: string;
  telegramChatId?: string;
  loanCode: string;
}

/**
 * Sends a Telegram HTML message
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.log(`[Simulated Telegram Bot] To: ${chatId}\n${text}`);
    return true;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return false;
  }
}

/**
 * Sends a Telegram photo (QR Code) with bilingual caption
 */
async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.log(`[Simulated Telegram Photo] To: ${chatId} | Photo: ${photoUrl}\n${caption}`);
    return true;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send Telegram photo:', err);
    return false;
  }
}

serve(async (req) => {
  try {
    console.log('⏰ Running Daily 8:00 AM Repayment Reminder Bot (Cambodia Time)...');

    // 1. Calculate Target Date Range (Next 3 Days)
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const targetStr = threeDaysLater.toISOString().split('T')[0];

    // 2. Query installments due within the next 3 days
    const { data: upcomingSchedules, error: schedError } = await supabase
      .from('repayment_schedules')
      .select(`
        id,
        installment_no,
        due_date,
        total_due,
        status,
        loans (
          id,
          loan_code,
          currency,
          borrowers (
            id,
            name_en,
            name_kh,
            phone
          )
        )
      `)
      .gte('due_date', todayStr)
      .lte('due_date', targetStr)
      .neq('status', 'paid');

    if (schedError) {
      throw schedError;
    }

    let remindersSent = 0;

    // 3. Dispatch Bilingual Telegram Notification for each installment
    for (const item of upcomingSchedules || []) {
      const loan = (item as any).loans;
      const borrower = loan?.borrowers;
      const currency = loan?.currency || 'USD';
      const amountDue = item.total_due;
      const dueDate = item.due_date;
      const loanCode = loan?.loan_code || 'LN-2026';
      const nameEn = borrower?.name_en || 'Valued Client';
      const nameKh = borrower?.name_kh || nameEn;

      // Simulated QR generation endpoint or Bakong link
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=KHQR-${loanCode}-${item.id}`;

      // Bilingual Telegram Message (Khmer & English)
      const caption = `
🇰🇭 <b>សេចក្តីជូនដំណឹងអំពីការបង់ប្រាក់ឥណទាន (Repayment Reminder)</b>

ជំរាបសួរលោក/លោកស្រី <b>${nameKh}</b> (${nameEn})
សូមរំលឹកអំពីការបង់ប្រាក់ប្រចាំខែសម្រាប់កម្ចីលេខ <b>${loanCode}</b>៖

• <b>ចំនួនទឹកប្រាក់ត្រូវបង់ (Amount Due):</b> ${currency === 'USD' ? `$${Number(amountDue).toFixed(2)}` : `${Math.round(amountDue).toLocaleString()} ៛`} ${currency}
• <b>កាលបរិច្ឆេទកំណត់ (Due Date):</b> ${dueDate}
• <b>ដំណាក់កាលបង់ (Installment):</b> #${item.installment_no}

<i>លោកអ្នកអាចស្កេនរូបភាព Bakong KHQR ខាងលើនេះតាមរយៈកម្មវិធី Bakong ឬធនាគារចល័តណាមួយដើម្បីទូទាត់ប្រាក់ភ្លាមៗដោយឥតគិតថ្លៃ។</i>

----------------------------------------
Dear ${nameEn},
This is a gentle reminder that your installment for loan <b>${loanCode}</b> is due on <b>${dueDate}</b>. Please scan the Bakong KHQR code above with your mobile banking app to settle instantly.
`.trim();

      // Send to borrower (or demo channel)
      await sendTelegramPhoto(MANAGER_CHANNEL_ID || 'demo_borrower_chat', qrImageUrl, caption);
      remindersSent++;
    }

    // 4. Query Overdue Loans for Today & Alert Branch Manager
    const { data: overdueLoans } = await supabase
      .from('repayment_schedules')
      .select(`
        id,
        installment_no,
        due_date,
        total_due,
        loans (
          id,
          loan_code,
          borrowers (name_en, name_kh, phone)
        )
      `)
      .lt('due_date', todayStr)
      .neq('status', 'paid');

    if (overdueLoans && overdueLoans.length > 0 && MANAGER_CHANNEL_ID) {
      const overdueListText = overdueLoans
        .map((o: any) => `• <b>${o.loans?.loan_code}</b>: ${o.loans?.borrowers?.name_en} (${o.loans?.borrowers?.phone}) - $${o.total_due}`)
        .join('\n');

      const managerAlert = `
⚠️ <b>BRANCH MANAGER ALERT: Delinquent Loans Notice (PAR Monitoring)</b>
Date: ${todayStr}

The following installments have passed their due dates without confirmed settlement:

${overdueListText}

Please instruct the recovery and credit officers to initiate client follow-up.
`.trim();

      await sendTelegramMessage(MANAGER_CHANNEL_ID, managerAlert);
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        overdueCount: overdueLoans?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Telegram Bot Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
