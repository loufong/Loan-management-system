import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

export interface SendVerificationOtpParams {
  toEmail: string;
  recipientName?: string;
  otpCode: string;
}

export interface SendPasswordResetOtpParams {
  toEmail: string;
  recipientName?: string;
  otpCode: string;
}

export interface SendOtpEmailParams {
  toEmail: string;
  recipientName?: string;
  firstName?: string;
  otpCode: string;
  purpose:
    | 'REGISTRATION'
    | 'PASSWORD_RESET'
    | 'EMAIL_VERIFICATION'
    | 'CHANGE_EMAIL'
    | 'register_verification'
    | 'forgot_password'
    | 'LOGIN'
    | 'login_verification';
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
  provider?: 'resend' | 'smtp';
}

export class EmailService {
  private static transporter: Transporter | null = null;
  private static resendClient: Resend | null = null;

  /**
   * Identifies the active email provider.
   * Priority:
   * 1. EMAIL_PROVIDER='resend' OR presence of valid RESEND_API_KEY -> 'resend'
   * 2. EMAIL_PROVIDER='smtp' OR configured SMTP credentials -> 'smtp'
   * 3. 'unconfigured'
   */
  /**
   * Checks whether RESEND_API_KEY is configured with a real (non-placeholder) key.
   */
  public static isResendConfigured(): boolean {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (!resendKey || resendKey.length < 24 || !resendKey.startsWith('re_')) {
      return false;
    }

    const isPlaceholder =
      resendKey.includes('placeholder') ||
      resendKey.includes('your_') ||
      resendKey.includes('api_key_here') ||
      resendKey === 're_123456789_abcdefg' ||
      resendKey === 're_your_resend_api_key_here';

    return !isPlaceholder;
  }

  /**
   * Identifies the active email provider.
   * Priority:
   * 1. EMAIL_PROVIDER='resend' OR presence of valid RESEND_API_KEY -> 'resend'
   * 2. EMAIL_PROVIDER='smtp' OR configured SMTP credentials -> 'smtp'
   * 3. 'unconfigured'
   */
  public static getActiveProvider(): 'resend' | 'smtp' | 'unconfigured' {
    const providerConfig = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    const hasResend = this.isResendConfigured();
    const hasSmtp = this.isSmtpConfigured();

    if (providerConfig === 'resend') {
      if (hasResend) return 'resend';
      if (hasSmtp) return 'smtp';
      return 'unconfigured';
    }

    if (providerConfig === 'smtp') {
      if (hasSmtp) return 'smtp';
      if (hasResend) return 'resend';
      return 'unconfigured';
    }

    if (hasResend) return 'resend';
    if (hasSmtp) return 'smtp';

    return 'unconfigured';
  }

  /**
   * Checks whether the system has ANY valid email provider configured.
   */
  public static isConfigured(): boolean {
    return this.getActiveProvider() !== 'unconfigured';
  }

  /**
   * Checks whether SMTP (Gmail or custom SMTP) is configured.
   */
  public static isSmtpConfigured(): boolean {
    const user =
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.MAIL_USERNAME ||
      '';

    const pass =
      process.env.EMAIL_PASSWORD ||
      process.env.SMTP_PASSWORD ||
      process.env.MAIL_PASSWORD ||
      '';

    const isPlaceholder =
      !user ||
      !pass ||
      user === 'yourgmail@gmail.com' ||
      user === 'your-email@gmail.com' ||
      user === 'your-real-gmail@gmail.com' ||
      user === 'YOUR_REAL_GMAIL@gmail.com' ||
      user === 'MY_REAL_GMAIL_ADDRESS' ||
      pass === 'your_gmail_app_password' ||
      pass === 'your-gmail-app-password' ||
      pass === 'your-16-character-google-app-password' ||
      pass === 'YOUR_GOOGLE_APP_PASSWORD' ||
      pass === 'MY_GOOGLE_APP_PASSWORD' ||
      pass.includes('placeholder');

    return !isPlaceholder;
  }

  /**
   * Initializes or returns the cached Resend client.
   */
  private static getResendClient(): Resend | null {
    if (!this.resendClient) {
      const apiKey = (process.env.RESEND_API_KEY || '').trim();
      if (this.isResendConfigured()) {
        this.resendClient = new Resend(apiKey);
      }
    }
    return this.resendClient;
  }

  /**
   * Initializes or returns the cached Nodemailer SMTP transporter.
   */
  private static getSmtpTransporter(): Transporter {
    if (!this.transporter) {
      const host =
        process.env.EMAIL_HOST ||
        process.env.SMTP_HOST ||
        process.env.MAIL_HOST ||
        'smtp.gmail.com';

      const port = parseInt(
        process.env.EMAIL_PORT ||
        process.env.SMTP_PORT ||
        process.env.MAIL_PORT ||
        '587',
        10
      );

      const secure =
        process.env.EMAIL_SECURE !== undefined
          ? process.env.EMAIL_SECURE === 'true'
          : (process.env.SMTP_SECURE === 'true' ||
              process.env.MAIL_ENCRYPTION === 'ssl' ||
              port === 465);

      const user =
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        process.env.MAIL_USERNAME ||
        '';

      const pass = (
        process.env.EMAIL_PASSWORD ||
        process.env.SMTP_PASSWORD ||
        process.env.MAIL_PASSWORD ||
        ''
      ).replace(/\s+/g, '');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Resolves the "From" sender address according to RFC 5322.
   */
  public static getFromAddress(provider: 'resend' | 'smtp' = 'smtp'): string {
    const rawFrom =
      process.env.EMAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.MAIL_FROM_ADDRESS ||
      '';

    const fromName =
      process.env.EMAIL_FROM_NAME ||
      process.env.MAIL_FROM_NAME ||
      'Apex Loan Management System';

    if (rawFrom.includes('<') && rawFrom.includes('>')) {
      return rawFrom;
    }

    if (rawFrom) {
      return `"${fromName}" <${rawFrom}>`;
    }

    if (provider === 'resend') {
      return `"${fromName}" <onboarding@resend.dev>`;
    }

    const smtpUser =
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.MAIL_USERNAME ||
      'no-reply@apex.local';

    return `"${fromName}" <${smtpUser}>`;
  }

  /**
   * High-Level Abstraction: Send Account Registration Verification OTP
   */
  public static async sendVerificationOTP(params: SendVerificationOtpParams): Promise<EmailSendResult> {
    const { toEmail, recipientName, otpCode } = params;
    const displayName = recipientName ? recipientName.split(' ')[0] : 'Valued User';

    const subject = 'Verify Your Apex Loan Management System Account';

    const textContent = `
Hello ${displayName},

Thank you for registering with Apex Loan Management System.

Your verification code is:

${otpCode}

This code will expire in 10 minutes.

If you did not create this account, please ignore this email.

Regards,
Apex Loan Management System
    `.trim();

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
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
              <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.5px;">Apex LMS</span>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 12px 0 0 0; letter-spacing: -0.2px;">Verify Your Apex LMS Account</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #0f172a;">
                Hello <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #334155;">
                Thank you for registering with Apex Loan Management System.
              </p>

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
                      This code will expire in 10 minutes.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b;">
                If you did not create this account, please ignore this email.
              </p>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />

              <p style="margin: 0; font-size: 13px; line-height: 18px; color: #475569;">
                Regards,<br>
                <strong>Apex Loan Management System</strong>
              </p>
            </td>
          </tr>
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

    return this.dispatchEmail({
      toEmail,
      subject,
      textContent,
      htmlContent,
    });
  }

  /**
   * High-Level Abstraction: Send Password Reset OTP
   */
  public static async sendPasswordResetOTP(params: SendPasswordResetOtpParams): Promise<EmailSendResult> {
    const { toEmail, recipientName, otpCode } = params;
    const displayName = recipientName ? recipientName.split(' ')[0] : 'Valued User';

    const subject = 'Reset Your Apex LMS Password';

    const textContent = `
Hello ${displayName},

We received a request to reset your password.

Your password reset code is:

${otpCode}

This code will expire in 10 minutes.

If you did not request this password reset, please ignore this email.

Regards,
Apex Loan Management System
    `.trim();

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
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
              <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.5px;">Apex LMS</span>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 12px 0 0 0; letter-spacing: -0.2px;">Reset Your Apex LMS Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #0f172a;">
                Hello <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #334155;">
                We received a request to reset your password.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px;">
                      Your password reset code is:
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12px; color: #2563eb; font-weight: 600; margin-top: 8px;">
                      This code will expire in 10 minutes.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 20px; color: #64748b;">
                If you did not request this password reset, please ignore this email.
              </p>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />

              <p style="margin: 0; font-size: 13px; line-height: 18px; color: #475569;">
                Regards,<br>
                <strong>Apex Loan Management System</strong>
              </p>
            </td>
          </tr>
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

    return this.dispatchEmail({
      toEmail,
      subject,
      textContent,
      htmlContent,
    });
  }

  /**
   * Generic OTP Email Sender (Maintains backwards compatibility for any caller)
   */
  public static async sendOtpEmail(params: SendOtpEmailParams): Promise<EmailSendResult> {
    const isReset = params.purpose === 'PASSWORD_RESET' || params.purpose === 'forgot_password';
    if (isReset) {
      return this.sendPasswordResetOTP({
        toEmail: params.toEmail,
        recipientName: params.recipientName || params.firstName,
        otpCode: params.otpCode,
      });
    }

    return this.sendVerificationOTP({
      toEmail: params.toEmail,
      recipientName: params.recipientName || params.firstName,
      otpCode: params.otpCode,
    });
  }

  /**
   * Sends confirmation email after successful password change.
   */
  public static async sendPasswordChangedEmail(params: SendPasswordChangedEmailParams): Promise<EmailSendResult> {
    const { toEmail, recipientName, firstName } = params;
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
              <span style="background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;">Apex LMS</span>
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
                If you did not perform this action, please contact your system administrator immediately.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
              <p style="margin: 0; font-size: 13px; color: #475569;">
                Regards,<br>
                <strong>Apex Loan Management System</strong>
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

Your password has been changed successfully. You can now sign in with your new password.

If you did not perform this action, please contact your system administrator immediately.

Regards,
Apex Loan Management System
    `.trim();

    return this.dispatchEmail({
      toEmail,
      subject,
      textContent,
      htmlContent,
    });
  }

  /**
   * Helper: Send email via SMTP / Nodemailer
   */
  private static async sendViaSmtp(params: {
    toEmail: string;
    subject: string;
    textContent: string;
    htmlContent: string;
  }): Promise<EmailSendResult> {
    try {
      const transporter = this.getSmtpTransporter();
      const from = this.getFromAddress('smtp');
      const info = await transporter.sendMail({
        from,
        to: params.toEmail,
        subject: params.subject,
        text: params.textContent,
        html: params.htmlContent,
      });

      console.log(`📧 [SMTP Sent] Email delivered to ${params.toEmail}. MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
      };
    } catch (err: any) {
      console.error(`❌ [SMTP Error] Exception sending email to ${params.toEmail}:`, err?.message || err);
      return {
        success: false,
        error: err?.message || 'SMTP delivery failed',
        provider: 'smtp',
      };
    }
  }

  /**
   * Internal Core Dispatcher: Routes email to active provider (Resend or SMTP)
   */
  private static async dispatchEmail(params: {
    toEmail: string;
    subject: string;
    textContent: string;
    htmlContent: string;
  }): Promise<EmailSendResult> {
    const { toEmail, subject, textContent, htmlContent } = params;
    const provider = this.getActiveProvider();
    const isDev = process.env.NODE_ENV !== 'production';

    // 1. Send via Resend
    if (provider === 'resend') {
      try {
        const resend = this.getResendClient();
        if (!resend) {
          throw new Error('Resend client failed to initialize');
        }

        const from = this.getFromAddress('resend');
        const response = await resend.emails.send({
          from,
          to: [toEmail],
          subject,
          text: textContent,
          html: htmlContent,
        });

        if (response.error) {
          console.error(`❌ [Resend Error] Delivery to ${toEmail} failed:`, response.error.message);

          // Try fallback to SMTP if configured
          if (this.isSmtpConfigured()) {
            console.log(`🔄 [Email Fallback] Resend failed. Attempting fallback via SMTP...`);
            const smtpFallback = await this.sendViaSmtp(params);
            if (smtpFallback.success) return smtpFallback;
          }

          // In dev mode, gracefully simulate delivery so developer/user is not blocked
          if (isDev) {
            console.warn(`⚠️ [Email Fallback] Live delivery failed (${response.error.message}). Simulating delivery in dev mode.`);
            return {
              success: true,
              isSimulated: true,
              error: response.error.message,
              provider: 'resend',
            };
          }

          return {
            success: false,
            error: response.error.message,
            provider: 'resend',
          };
        }

        console.log(`📧 [Resend Sent] Email delivered to ${toEmail}. MessageId: ${response.data?.id}`);
        return {
          success: true,
          messageId: response.data?.id,
          provider: 'resend',
        };
      } catch (err: any) {
        console.error(`❌ [Resend Error] Exception sending email to ${toEmail}:`, err?.message || err);

        // Try fallback to SMTP if configured
        if (this.isSmtpConfigured()) {
          console.log(`🔄 [Email Fallback] Resend exception. Attempting fallback via SMTP...`);
          const smtpFallback = await this.sendViaSmtp(params);
          if (smtpFallback.success) return smtpFallback;
        }

        // In dev mode, gracefully simulate delivery so developer/user is not blocked
        if (isDev) {
          console.warn(`⚠️ [Email Fallback] Live delivery exception (${err?.message}). Simulating delivery in dev mode.`);
          return {
            success: true,
            isSimulated: true,
            error: err?.message || 'Resend delivery failed',
            provider: 'resend',
          };
        }

        return {
          success: false,
          error: err?.message || 'Resend delivery failed',
          provider: 'resend',
        };
      }
    }

    // 2. Send via SMTP / Nodemailer
    if (provider === 'smtp') {
      const smtpResult = await this.sendViaSmtp(params);
      if (!smtpResult.success && isDev) {
        console.warn(`⚠️ [Email Fallback] SMTP failed (${smtpResult.error}). Simulating delivery in dev mode.`);
        return {
          success: true,
          isSimulated: true,
          error: smtpResult.error,
          provider: 'smtp',
        };
      }
      return smtpResult;
    }

    // 3. Provider is unconfigured
    if (isDev) {
      console.warn(
        `⚠️ [Email Service] No active email provider configured in .env. ` +
        `Simulating email delivery to ${toEmail} for development.`
      );
      return {
        success: true,
        isSimulated: true,
      };
    }

    return {
      success: false,
      isSimulated: true,
      error: 'Email provider not configured in .env. Please set RESEND_API_KEY or SMTP credentials.',
    };
  }
}
