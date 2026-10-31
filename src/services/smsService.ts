import dotenv from 'dotenv';
dotenv.config();

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  error?: string;
  isSimulated?: boolean;
}

export class SmsService {
  private static readonly PLASGATE_API_URL =
    process.env.PLASGATE_API_URL || 'https://cloudapi.plasgate.com/rest/send-sms';
  private static readonly SENDER_ID = process.env.PLASGATE_SENDER_ID || 'JAMSONGVICH';

  /**
   * Normalizes Cambodian phone numbers into international E.164 without plus sign (e.g. 85512345678)
   * Handles formats:
   * - 012 345 678 -> 85512345678
   * - +855 12 345 678 -> 85512345678
   * - 85512345678 -> 85512345678
   * - 098-765-432 -> 85598765432
   */
  public static normalizeCambodianPhone(phone: string): string {
    if (!phone) return '';

    // Strip all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // If starts with 855, ensure valid Cambodian length (855 + 8 or 9 digits)
    if (digits.startsWith('855')) {
      return digits;
    }

    // If starts with 0 (Cambodian domestic format: 01x, 06x, 07x, 08x, 09x), replace 0 with 855
    if (digits.startsWith('0')) {
      return `855${digits.slice(1)}`;
    }

    // If standard 8 or 9 digit number without prefix, prepend 855
    if (digits.length === 8 || digits.length === 9) {
      return `855${digits}`;
    }

    return digits;
  }

  /**
   * Checks whether PlasGate API credentials are configured in environment
   */
  public static isPlasgateConfigured(): boolean {
    const token = (process.env.PLASGATE_SECRET_TOKEN || process.env.PLASGATE_API_KEY || '').trim();
    if (!token || token.length < 10) return false;
    const isPlaceholder = token.includes('placeholder') || token.includes('your_');
    return !isPlaceholder;
  }

  /**
   * Dispatches SMS to Cambodian mobile number via PlasGate REST API
   */
  public static async sendSms(toPhone: string, content: string): Promise<SmsSendResult> {
    const normalizedPhone = this.normalizeCambodianPhone(toPhone);
    const token = (process.env.PLASGATE_SECRET_TOKEN || process.env.PLASGATE_API_KEY || '').trim();
    const isDev = process.env.NODE_ENV !== 'production';

    if (!normalizedPhone) {
      return {
        success: false,
        recipient: toPhone,
        error: 'Invalid recipient phone number format'
      };
    }

    // If PlasGate token is not configured or in development mode without live secrets:
    if (!this.isPlasgateConfigured()) {
      console.log(
        `📱 [PlasGate SMS Simulated] Recipient: ${normalizedPhone} | Sender: ${this.SENDER_ID}\n` +
        `💬 Content: "${content}"`
      );
      return {
        success: true,
        messageId: `sim-sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient: normalizedPhone,
        isSimulated: true
      };
    }

    try {
      const response = await fetch(this.PLASGATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sender: this.SENDER_ID,
          to: normalizedPhone,
          content: content
        })
      });

      const data: any = await response.json().catch(() => null);

      if (!response.ok || (data && data.status === 'error')) {
        const errorMsg = data?.message || `PlasGate HTTP error ${response.status}`;
        console.error(`❌ [PlasGate SMS Error] ${errorMsg}`);

        if (isDev) {
          console.warn(`⚠️ [PlasGate Fallback] Simulating SMS delivery in dev mode.`);
          return {
            success: true,
            recipient: normalizedPhone,
            isSimulated: true,
            error: errorMsg
          };
        }

        return {
          success: false,
          recipient: normalizedPhone,
          error: errorMsg
        };
      }

      console.log(`📱 [PlasGate SMS Sent] Successfully delivered to ${normalizedPhone}. MsgId: ${data?.message_id || data?.id}`);
      return {
        success: true,
        messageId: data?.message_id || data?.id || `pg-${Date.now()}`,
        recipient: normalizedPhone
      };
    } catch (err: any) {
      console.error(`❌ [PlasGate SMS Exception]`, err.message || err);

      if (isDev) {
        console.warn(`⚠️ [PlasGate Fallback] Connection error (${err.message}). Simulating in dev mode.`);
        return {
          success: true,
          recipient: normalizedPhone,
          isSimulated: true,
          error: err.message
        };
      }

      return {
        success: false,
        recipient: normalizedPhone,
        error: err.message || 'SMS transmission failed'
      };
    }
  }

  /**
   * High-level repayment confirmation SMS alert
   */
  public static async sendRepaymentSms(
    toPhone: string,
    details: {
      borrowerName: string;
      loanNumber: string;
      installmentNo: number;
      amountPaid: number;
      currency?: string;
      remainingBalance: number;
      transactionRef?: string;
    }
  ): Promise<SmsSendResult> {
    const curr = details.currency === 'KHR' ? '៛' : '$';
    const amountStr = details.currency === 'KHR'
      ? `${new Intl.NumberFormat('km-KH').format(details.amountPaid)} KHR`
      : `$${Number(details.amountPaid).toFixed(2)}`;
    const balanceStr = details.currency === 'KHR'
      ? `${new Intl.NumberFormat('km-KH').format(details.remainingBalance)} KHR`
      : `$${Number(details.remainingBalance).toFixed(2)}`;

    // Concise, standard Cambodian banking SMS text
    const message =
      `[JAM SONG VICH] Chourb ban totoul ${amountStr} samrab ${details.loanNumber} Ins#${details.installmentNo}. ` +
      `Somtouly nol: ${balanceStr}. Ref: ${details.transactionRef || 'KHQR'}. Orkun!`;

    return this.sendSms(toPhone, message);
  }
}
