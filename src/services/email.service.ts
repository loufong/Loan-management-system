import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface SendOtpEmailParams {
  toEmail: string;
  recipientName: string;
  otpCode: string;
  purpose: 'register_verification' | 'forgot_password' | 'email_verification';
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initializes or returns the cached Nodemailer SMTP transporter.
   * Configured specifically for Gmail SMTP with TLS on port 587.
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const host = process.env.MAIL_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.MAIL_PORT || '587', 10);
      const user = process.env.MAIL_USERNAME || '';
      const pass = process.env.MAIL_PASSWORD || '';

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587 (STARTTLS)
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Prevents self-signed cert blocks on local networks
        },
      });
    }

    return this.transporter;
  }

  /**
   * Checks whether Gmail SMTP credentials are configured in .env.
   */
  public static isConfigured(): boolean {
    const user = process.env.MAIL_USERNAME;
    const pass = process.env.MAIL_PASSWORD;
    return !!(user && pass && user !== 'yourgmail@gmail.com' && pass !== 'your_gmail_app_password');
  }

  /**
   * Sends an OTP verification email using real Gmail SMTP.
   * Includes professional HTML email template compliant with Gmail rendering standards.
   */
  public static async sendOtpEmail(params: SendOtpEmailParams): Promise<EmailSendResult> {
    const { toEmail, recipientName, otpCode, purpose } = params;

    const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'noreply@apex.local';
    const fromName = process.env.MAIL_FROM_NAME || 'Loan Management System';

    let purposeTitle = 'Account Registration Verification';
    let purposeDescription = 'Please use the 6-digit one-time verification code below to verify your account.';

    if (purpose === 'forgot_password') {
      purposeTitle = 'Password Reset Request';
      purposeDescription = 'You requested a password reset for your Loan Management System account. Use the 6-digit code below to set your new password.';
    } else if (purpose === 'email_verification') {
      purposeTitle = 'Email Address Verification';
      purposeDescription = 'Please verify your primary email address for your core banking profile.';
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OTP Code - Loan Management System</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          
          <!-- Top Header Banner (Solid Navy Flat Header) -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px;">APEX LMS</span>
                  </td>
                  <td align="right">
                    <span style="color: #94a3b8; font-size: 12px; font-weight: 500;">Core Banking Security</span>
                  </td>
                </tr>
              </table>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 16px 0 0 0; letter-spacing: -0.3px;">${purposeTitle}</h1>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">
                Hello <strong>${recipientName || 'Valued User'}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #475569;">
                ${purposeDescription}
              </p>

              <!-- OTP Callout Box (Solid High-Contrast Flat Design) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
                      Your Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace, 'JetBrains Mono'; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0f172a; padding: 4px 0 4px 10px;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 8px;">
                      ⏱ This OTP will expire in 5 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b;">
                <strong>Security Notice:</strong> Can only be used once. Never share this code with anyone, including bank staff. If you did not request this verification, please disregard this email or report to bank administration immediately.
              </p>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />

              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #475569;">
                Regards,<br>
                <strong style="color: #0f172a;">Loan Management System (Apex LMS)</strong><br>
                <span style="font-size: 12px; color: #94a3b8;">Phnom Penh Main Branch • NBC Licensed Core Banking</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; line-height: 16px; color: #94a3b8;">
                This is an automated system email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const textContent = `
Hello ${recipientName || 'Valued User'},

Your verification code is: ${otpCode}

This OTP will expire in 5 minutes.
Can only be used once.

If you did not request this code, please ignore this email.

Regards,
Loan Management System (Apex LMS)
    `.trim();

    // Check if Gmail SMTP credentials are configured
    if (!this.isConfigured()) {
      console.warn(`
⚠️  [Gmail SMTP Not Configured]
    To receive real OTP emails in your Gmail inbox:
    1. Set MAIL_USERNAME and MAIL_PASSWORD in your .env file
    2. Use a Google App Password (not your normal Gmail password)
    3. Host: smtp.gmail.com, Port: 587, TLS: enabled
    
    [DEV OTP SIMULATION]
    Recipient: ${toEmail} (${recipientName})
    Purpose  : ${purpose}
    OTP Code : >>> ${otpCode} <<< (Expires in 5 mins)
      `);

      return {
        success: true,
        isSimulated: true,
        messageId: `simulated-${Date.now()}`
      };
    }

    try {
      const transporter = this.getTransporter();
      const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: toEmail,
        subject: `Your OTP Code - Loan Management System [${otpCode}]`,
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 [Real Gmail Sent] OTP email successfully delivered to ${toEmail}. MessageId: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error(`❌ [Gmail SMTP Error] Failed to send email to ${toEmail}:`, err?.message || err);

      return {
        success: false,
        error: err?.message || 'SMTP delivery failed',
      };
    }
  }
}
