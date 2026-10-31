import { EmailService } from './email.service';

export const emailService = {
  sendRepaymentReceipt: EmailService.sendRepaymentReceipt.bind(EmailService),
  dispatchEmail: (EmailService as any).dispatchEmail?.bind(EmailService),
  isResendConfigured: EmailService.isResendConfigured.bind(EmailService),
};

export { EmailService };
export default EmailService;

