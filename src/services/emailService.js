const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  /**
   * Runtime environment validator
   * Validates active email provider credentials and configuration
   */
  static validateConfig() {
    const provider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USERNAME || '').trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.MAIL_PASSWORD || '').trim();

    const isPlaceholderKey = !resendKey || resendKey.includes('your_') || resendKey.includes('placeholder') || !resendKey.startsWith('re_');
    const isPlaceholderSmtp = !smtpUser || !smtpPass || smtpPass.includes('your_') || smtpPass.includes('placeholder');

    if (provider === 'resend') {
      if (isPlaceholderKey) {
        throw new Error(
          '[Email Service] EMAIL_PROVIDER is configured as "resend" but RESEND_API_KEY is missing or invalid in .env. Please set a valid Resend API key.'
        );
      }
      return 'resend';
    }

    if (provider === 'smtp') {
      if (isPlaceholderSmtp) {
        throw new Error(
          '[Email Service] EMAIL_PROVIDER is configured as "smtp" but SMTP credentials (SMTP_USER / SMTP_PASS) are missing or invalid in .env.'
        );
      }
      return 'smtp';
    }

    // Auto-detection fallback when EMAIL_PROVIDER is not explicitly specified
    if (!isPlaceholderKey) {
      return 'resend';
    }

    if (!isPlaceholderSmtp) {
      return 'smtp';
    }

    throw new Error(
      '[Email Service] No active email provider configured. Please set EMAIL_PROVIDER to "resend" (with RESEND_API_KEY) or "smtp" (with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) in .env.'
    );
  }

  /**
   * Creates Nodemailer transporter for SMTP
   */
  static getTransporter() {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
    const secure = process.env.SMTP_SECURE !== undefined 
      ? (String(process.env.SMTP_SECURE).toLowerCase() === 'true')
      : port === 465;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.MAIL_PASSWORD;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Core dispatch function: sendEmail({ to, subject, html, text })
   */
  static async sendEmail({ to, subject, html, text }) {
    const provider = this.validateConfig();
    const from = process.env.EMAIL_FROM || 'JAM SONG VICH Banking <notifications@jamsongvich.com>';
    const recipient = Array.isArray(to) ? to.join(', ') : to;

    try {
      if (provider === 'resend') {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const res = await resend.emails.send({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text: text || '',
        });

        if (res.error) {
          throw new Error(res.error.message || 'Resend API dispatch failed');
        }

        console.log(`[Email Service] Successfully sent email to ${recipient} via resend`);
        return {
          success: true,
          provider: 'resend',
          messageId: res.data?.id,
        };
      }

      if (provider === 'smtp') {
        const transporter = this.getTransporter();
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          html,
          text: text || '',
        });

        console.log(`[Email Service] Successfully sent email to ${recipient} via smtp`);
        return {
          success: true,
          provider: 'smtp',
          messageId: info.messageId,
        };
      }
    } catch (error) {
      console.error(`[Email Service] Failed to send email to ${recipient} via ${provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Official payment receipt dispatcher
   */
  static async sendRepaymentReceipt(toEmail, details) {
    const amountStr = details.currency === 'KHR'
      ? `${new Intl.NumberFormat('km-KH').format(details.amountPaid)} KHR`
      : `$${Number(details.amountPaid).toFixed(2)}`;
    const balanceStr = details.currency === 'KHR'
      ? `${new Intl.NumberFormat('km-KH').format(details.remainingBalance)} KHR`
      : `$${Number(details.remainingBalance).toFixed(2)}`;
    const dateFormatted = details.paidAt ? new Date(details.paidAt).toUTCString() : new Date().toUTCString();

    const subject = `[JAM SONG VICH] Official Payment Receipt: ${details.loanNumber} (Installment #${details.installmentNo})`;

    const html = `
<!DOCTYPE html>
<html>
<body style="background:#0b1120;color:#f8fafc;font-family:sans-serif;padding:30px;">
  <div style="max-width:540px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:24px;">
    <h2 style="color:#10b981;margin:0 0 6px 0;">JAM SONG VICH</h2>
    <p style="color:#94a3b8;font-size:12px;margin:0 0 20px 0;">Core Banking System • Loan Management System</p>
    <div style="background:#020617;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:4px 0;font-size:13px;color:#94a3b8;">Borrower: <strong style="color:#fff;">${details.borrowerName}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#94a3b8;">Loan Account: <strong style="color:#fff;">${details.loanNumber}</strong></p>
      <p style="margin:4px 0;font-size:13px;color:#94a3b8;">Installment: <strong style="color:#fff;">#${details.installmentNo}</strong></p>
      <p style="margin:4px 0;font-size:16px;color:#10b981;font-weight:bold;">Amount Paid: ${amountStr}</p>
      <p style="margin:4px 0;font-size:13px;color:#f59e0b;">Remaining Balance: ${balanceStr}</p>
      <p style="margin:4px 0;font-size:12px;color:#38bdf8;font-family:monospace;">Ref: ${details.transactionRef}</p>
      <p style="margin:4px 0;font-size:12px;color:#64748b;">Cleared: ${dateFormatted} via ACLEDA Bank Plc. (Bakong KHQR)</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Repayment received for ${details.loanNumber}: ${amountStr}. Remaining: ${balanceStr}. Ref: ${details.transactionRef}`;

    return await this.sendEmail({ to: toEmail, subject, html, text });
  }
}

module.exports = {
  EmailService,
  sendEmail: EmailService.sendEmail.bind(EmailService),
  sendRepaymentReceipt: EmailService.sendRepaymentReceipt.bind(EmailService),
};

