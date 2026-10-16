import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface SendOtpEmailParams {
  toEmail: string;
  recipientName?: string;
  firstName?: string;
  otpCode: string;
  purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'CHANGE_EMAIL' | 'register_verification' | 'forgot_password';
}

export interface SendPasswordChangedEmailParams {
  toEmail: string;
  recipientName?: string;
  firstName?: string;
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
   * Priority:
   * 1. SMTP_* environment variables (e.g. SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD)
   * 2. MAIL_* environment variables (e.g. MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD)
   * 3. EMAIL_* environment variables
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const host =
        process.env.SMTP_HOST ||
        process.env.MAIL_HOST ||
        process.env.EMAIL_HOST ||
        'smtp.gmail.com';

      const port = parseInt(
        process.env.SMTP_PORT ||
        process.env.MAIL_PORT ||
        process.env.EMAIL_PORT ||
        '465',
        10
      );

      const secure =
        process.env.SMTP_SECURE === 'true' ||
        process.env.MAIL_ENCRYPTION === 'ssl' ||
        port === 465;

      const user =
        process.env.SMTP_USER ||
        process.env.MAIL_USERNAME ||
        process.env.EMAIL_USER ||
        '';

      const pass =
        process.env.SMTP_PASSWORD ||
        process.env.MAIL_PASSWORD ||
        process.env.EMAIL_PASSWORD ||
        '';

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Prevents certificate chain rejection on local / corporate networks
        },
      });
    }

    return this.transporter;
  }

  /**
   * Checks whether Gmail SMTP credentials are configured with real values.
   */
  public static isConfigured(): boolean {
    const user =
      process.env.SMTP_USER ||
      process.env.MAIL_USERNAME ||
      process.env.EMAIL_USER ||
      '';

    const pass =
      process.env.SMTP_PASSWORD ||
      process.env.MAIL_PASSWORD ||
      process.env.EMAIL_PASSWORD ||
      '';

    const isPlaceholder =
      !user ||
      !pass ||
      user === 'yourgmail@gmail.com' ||
      user === 'your-email@gmail.com' ||
      pass === 'your_gmail_app_password' ||
      pass === 'your-gmail-app-password';

    return !isPlaceholder;
  }

  /**
   * Sends an OTP verification email using real Gmail SMTP (or development notice if credentials unconfigured).
   */
  public static async sendOtpEmail(params: SendOtpEmailParams): Promise<EmailSendResult> {
    const { toEmail, recipientName, firstName, otpCode, purpose } = params;

    const fromAddress =
      process.env.MAIL_FROM ||
      process.env.MAIL_FROM_ADDRESS ||
      process.env.SMTP_USER ||
      process.env.MAIL_USERNAME ||
      'noreply@apex.local';

    const fromName = process.env.MAIL_FROM_NAME || 'Loan Management System';

    const displayName = firstName || (recipientName ? recipientName.split(' ')[0] : 'User');
    const isReset = purpose === 'PASSWORD_RESET' || purpose === 'forgot_password';

    const subject = isReset
      ? 'Password Reset Verification Code'
      : 'Verify Your Loan Management System Account';

    const purposeTitle = isReset ? 'Password Reset Verification' : 'Verify Your Email Address';
    const purposeIntro = isReset
      ? 'You requested a password reset for your Loan Management System account.'
      : 'Thank you for registering with Loan Management System. Please verify your email to activate your account.';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
              <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.5px;">APEX LMS</span>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 12px 0 0 0; letter-spacing: -0.2px;">${purposeTitle}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #0f172a;">
                Hello <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #334155;">
                ${purposeIntro}
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px;">
                      Your verification code is:
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12px; color: #2563eb; font-weight: 600; margin-top: 8px;">
                      This code expires in 5 minutes.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b;">
                If you did not request this code, you can safely ignore this email.
              </p>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />

              <p style="margin: 0; font-size: 13px; line-height: 18px; color: #475569;">
                <strong>Loan Management System</strong><br>
                <span style="font-size: 12px; color: #94a3b8;">Automated Notification Service</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This is a secure automated message. Please do not reply directly to this email.
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
Hello ${displayName},

Your verification code is: ${otpCode}

This code expires in 5 minutes.

If you did not request this code, you can safely ignore this email.

Loan Management System
    `.trim();

    // If SMTP credentials not provided in .env
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`
⚠️  [Gmail SMTP Not Configured in .env]
    To receive real OTP emails in your Gmail inbox:
    1. Set SMTP_USER and SMTP_PASSWORD in your .env file
    2. Use a Google App Password (not your normal Gmail account password)
    3. Host: smtp.gmail.com, Port: 465 (SSL) or 587 (TLS)
    
    [DEV OTP SIMULATION]
    Recipient: ${toEmail} (${displayName})
    Purpose  : ${purpose}
    OTP Code : >>> ${otpCode} <<< (Expires in 5 mins)
        `);
      }

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
        subject,
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

  /**
   * Sends confirmation email after password change.
   */
  public static async sendPasswordChangedEmail(params: SendPasswordChangedEmailParams): Promise<EmailSendResult> {
    const { toEmail, recipientName, firstName } = params;

    const fromAddress =
      process.env.MAIL_FROM ||
      process.env.MAIL_FROM_ADDRESS ||
      process.env.SMTP_USER ||
      process.env.MAIL_USERNAME ||
      'noreply@apex.local';

    const fromName = process.env.MAIL_FROM_NAME || 'Loan Management System';
    const displayName = firstName || (recipientName ? recipientName.split(' ')[0] : 'User');
    const subject = 'Your Password Has Been Changed Successfully';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #0f172a; padding: 20px 32px;">
              <span style="background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;">APEX LMS</span>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 12px 0 0 0;">Password Changed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #334155;">
                Your password has been changed successfully. You can now use your new password to sign in.
              </p>
              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 20px; color: #dc2626; font-weight: 600;">
                If you did not perform this action, please contact your system administrator immediately to secure your account.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
              <p style="margin: 0; font-size: 13px; color: #475569;">
                <strong>Loan Management System</strong>
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
Hello ${displayName},

Your password has been changed successfully.

If you did not perform this action, please contact your system administrator immediately.

Loan Management System
    `.trim();

    if (!this.isConfigured()) {
      return { success: true, isSimulated: true };
    }

    try {
      const transporter = this.getTransporter();
      const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`❌ [Gmail SMTP Error] Failed to send password changed email to ${toEmail}:`, err?.message || err);
      return { success: false, error: err?.message };
    }
  }
}
