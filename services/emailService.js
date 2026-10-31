const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

class EmailService {
  static isResendConfigured() {
    const key = (process.env.RESEND_API_KEY || '').trim();
    return Boolean(key && key.startsWith('re_') && !key.includes('placeholder') && !key.includes('your_'));
  }

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
    <p style="color:#94a3b8;font-size:12px;margin:0 0 20px 0;">Core Banking System • ប្រព័ន្ធគ្រប់គ្រងឥណទាន</p>
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

    if (this.isResendConfigured()) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.EMAIL_FROM || 'JAM SONG VICH <onboarding@resend.dev>';
        const res = await resend.emails.send({
          from,
          to: [toEmail],
          subject,
          html,
          text: `Repayment received for ${details.loanNumber}: ${amountStr}. Remaining: ${balanceStr}. Ref: ${details.transactionRef}`
        });
        return { success: !res.error, messageId: res.data?.id, error: res.error?.message };
      } catch (err) {
        console.warn('Resend send warning:', err.message);
      }
    }

    console.log(`📧 [Simulated Email] Receipt to ${toEmail}: ${amountStr} for ${details.loanNumber}`);
    return { success: true, isSimulated: true };
  }
}

module.exports = { EmailService };
