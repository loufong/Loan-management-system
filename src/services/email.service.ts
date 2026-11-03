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

export interface RepaymentReceiptDetails {
  borrowerName: string;
  loanNumber: string;
  installmentNo: number;
  totalTenure?: number;
  amountPaid: number;
  currency?: 'USD' | 'KHR' | string;
  transactionRef: string;
  remainingBalance: number;
  paidAt?: Date | string;
  paymentMethod?: string;
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
      pass === 'your-16-digit-google-app-password' ||
      pass.includes('google-app-password') ||
      pass.includes('placeholder') ||
      pass.includes('your-');

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

    const subject = `[JAM SONG VICH] Your Verification Code: ${otpCode}`;

    const textContent = `
Hello ${displayName},

Thank you for registering with JAM SONG VICH Core Banking & Loan Management System.

Your verification code is:

${otpCode}

This code will expire in 10 minutes.

If you did not create this account, please ignore this email.

Regards,
JAM SONG VICH Core Banking System
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="background-color: #020617; padding: 24px 32px; border-bottom: 1px solid #1e293b; text-align: left;">
              <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">JAM SONG VICH</span>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 12px 0 0 0; letter-spacing: -0.2px;">Verify Your Account</h1>
              <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">Loan Management & Core Banking System</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #f8fafc;">
                Hello <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                Thank you for registering with JAM SONG VICH Core Banking. Please use the verification code below to verify your email address:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #020617; border: 1px solid #10b981; border-radius: 8px; padding: 24px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; margin-bottom: 8px;">
                      Your 6-Digit Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12px; color: #34d399; font-weight: 600; margin-top: 10px;">
                      ● Valid for 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 18px; color: #64748b;">
                If you did not request this verification code, please ignore this email or contact security support.
              </p>

              <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0 16px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                Regards,<br>
                <strong style="color: #ffffff;">JAM SONG VICH Core Banking Security Desk</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #020617; border-top: 1px solid #1e293b; padding: 14px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                National Bank of Cambodia Regulated Core Banking System • Automated Dispatch
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

    const subject = `[JAM SONG VICH] Password Reset Code: ${otpCode}`;

    const textContent = `
Hello ${displayName},

We received a request to reset your JAM SONG VICH account password.

Your verification code is:

${otpCode}

This code will expire in 10 minutes.

If you did not request this password reset, please ignore this email.

Regards,
JAM SONG VICH Core Banking Security Desk
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="background-color: #020617; padding: 24px 32px; border-bottom: 1px solid #1e293b; text-align: left;">
              <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">JAM SONG VICH</span>
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 12px 0 0 0; letter-spacing: -0.2px;">Password Reset Request</h1>
              <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">Loan Management & Core Banking System</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #f8fafc;">
                Hello <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                We received a request to reset your password. Use the authorization code below to establish a new password:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td align="center" style="background-color: #020617; border: 1px solid #10b981; border-radius: 8px; padding: 24px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; margin-bottom: 8px;">
                      Password Reset Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff;">
                      ${otpCode}
                    </div>
                    <div style="font-size: 12px; color: #34d399; font-weight: 600; margin-top: 10px;">
                      ● Valid for 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 18px; color: #64748b;">
                If you did not request this password reset, your account remains secure and you may safely disregard this message.
              </p>

              <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0 16px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                Regards,<br>
                <strong style="color: #ffffff;">JAM SONG VICH Core Banking Security Desk</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #020617; border-top: 1px solid #1e293b; padding: 14px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                National Bank of Cambodia Regulated Core Banking System • Automated Dispatch
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

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
   * Send Official Banking Repayment Receipt (Bakong KHQR Settlement)
   */
  public static async sendRepaymentReceipt(
    toEmail: string,
    details: RepaymentReceiptDetails
  ): Promise<EmailSendResult> {
    const isKHR = details.currency === 'KHR';
    const amountStr = isKHR
      ? `${new Intl.NumberFormat('km-KH').format(details.amountPaid)} KHR`
      : `${Number(details.amountPaid).toFixed(2)}`;
    const balanceStr = isKHR
      ? `${new Intl.NumberFormat('km-KH').format(details.remainingBalance)} KHR`
      : `${Number(details.remainingBalance).toFixed(2)}`;
    const dateFormatted = details.paidAt
      ? new Date(details.paidAt).toUTCString()
      : new Date().toUTCString();

    const subject = `[JAM SONG VICH] Official Payment Receipt: ${details.loanNumber} (Installment #${details.installmentNo})`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
          <!-- Top Brand Header -->
          <tr>
            <td style="background-color: #020617; padding: 24px 32px; border-bottom: 1px solid #1e293b;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="color: #10b981; font-weight: 800; font-size: 18px; letter-spacing: 0.5px;">JAM SONG VICH</span>
                    <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">Core Banking System • Loan Management System</div>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
                      SETTLED VIA KHQR
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Receipt Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">Official Payment Receipt</h2>
              <p style="color: #94a3b8; font-size: 13px; line-height: 20px; margin: 0 0 24px 0;">
                Dear <strong>${details.borrowerName}</strong>, your installment repayment has been cleared and settled successfully via NBC Bakong KHQR network.
              </p>

              <!-- Payment Summary Box -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #020617; border: 1px solid #1e293b; border-radius: 8px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">Amount Settled:</td>
                  <td style="padding: 16px; border-bottom: 1px solid #1e293b; color: #10b981; font-size: 18px; font-weight: 800; font-family: monospace; text-align: right;">${amountStr}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">Loan Account No:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 13px; font-weight: 600; font-family: monospace; text-align: right;">${details.loanNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">Installment Cycle:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 13px; text-align: right;">Cycle #${details.installmentNo}${details.totalTenure ? ` of ${details.totalTenure}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">Transaction Reference:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-size: 12px; font-family: monospace; text-align: right;">${details.transactionRef}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">Receiving Bank:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 13px; text-align: right;">ACLEDA Bank Plc.</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">Remaining Balance:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #f59e0b; font-size: 14px; font-weight: 700; font-family: monospace; text-align: right;">${balanceStr}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8; font-size: 12px;">Settlement Timestamp:</td>
                  <td style="padding: 12px 16px; color: #cbd5e1; font-size: 12px; text-align: right;">${dateFormatted}</td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 11px; line-height: 16px; margin: 0 0 20px 0;">
                This electronic advice serves as official proof of payment for Cambodian National Bank and Credit Bureau Cambodia (CBC) compliance. Keep this receipt for your records.
              </p>

              <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />

              <table width="100%">
                <tr>
                  <td style="color: #475569; font-size: 11px;">
                    JAM SONG VICH Microfinance & Core Banking<br>
                    Licensed by National Bank of Cambodia
                  </td>
                  <td align="right" style="color: #475569; font-size: 11px;">
                    Support: 010 487 718<br>
                    support@jamsongvich.com
                  </td>
                </tr>
              </table>
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
JAM SONG VICH - Official Repayment Receipt
Loan Account: ${details.loanNumber}
Installment: #${details.installmentNo}
Borrower: ${details.borrowerName}
Amount Paid: ${amountStr}
Remaining Balance: ${balanceStr}
Transaction Ref: ${details.transactionRef}
Settled: ${dateFormatted} via NBC Bakong KHQR (ACLEDA Bank Plc.)

Thank you for banking with JAM SONG VICH.
    `.trim();

    return this.dispatchEmail({
      toEmail,
      subject,
      textContent,
      htmlContent,
    });
  }

  /**
   * Generic dual-provider dispatch function: sendEmail({ to, subject, html, text })
   */
  public static async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<EmailSendResult> {
    const toEmail = Array.isArray(to) ? to[0] : to;
    return this.dispatchEmail({
      toEmail,
      subject,
      textContent: text || '',
      htmlContent: html,
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

      console.log(`[Email Service] Successfully sent email to ${params.toEmail} via smtp`);
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

        console.log(`[Email Service] Successfully sent email to ${toEmail} via resend`);
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
