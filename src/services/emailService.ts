import { EmailService } from './email.service';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  sendEmail: EmailService.sendEmail.bind(EmailService),
  sendRepaymentReceipt: EmailService.sendRepaymentReceipt.bind(EmailService),
  dispatchEmail: (EmailService as any).dispatchEmail?.bind(EmailService),
  isResendConfigured: EmailService.isResendConfigured.bind(EmailService),
  isSmtpConfigured: EmailService.isSmtpConfigured.bind(EmailService),
};

export { EmailService };
export default EmailService;
