const dotenv = require('dotenv');
dotenv.config();

class SmsService {
  static PLASGATE_API_URL = process.env.PLASGATE_API_URL || 'https://cloudapi.plasgate.com/rest/send-sms';
  static SENDER_ID = process.env.PLASGATE_SENDER_ID || 'JAMSONGVICH';

  static normalizeCambodianPhone(phone) {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('855')) return digits;
    if (digits.startsWith('0')) return `855${digits.slice(1)}`;
    if (digits.length === 8 || digits.length === 9) return `855${digits}`;
    return digits;
  }

  static isPlasgateConfigured() {
    const token = (process.env.PLASGATE_SECRET_TOKEN || process.env.PLASGATE_API_KEY || '').trim();
    if (!token || token.length < 10) return false;
    return !token.includes('placeholder') && !token.includes('your_');
  }

  static async sendSms(toPhone, content) {
    const normalizedPhone = this.normalizeCambodianPhone(toPhone);
    const token = (process.env.PLASGATE_SECRET_TOKEN || process.env.PLASGATE_API_KEY || '').trim();
    const isDev = process.env.NODE_ENV !== 'production';

    if (!normalizedPhone) {
      return { success: false, recipient: toPhone, error: 'Invalid recipient phone number format' };
    }

    if (!this.isPlasgateConfigured()) {
      console.log(`📱 [PlasGate SMS Simulated] To: ${normalizedPhone} | Sender: ${this.SENDER_ID} | Msg: "${content}"`);
      return { success: true, messageId: `sim-sms-${Date.now()}`, recipient: normalizedPhone, isSimulated: true };
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

      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.status === 'error')) {
        const errorMsg = data?.message || `PlasGate HTTP error ${response.status}`;
        if (isDev) return { success: true, recipient: normalizedPhone, isSimulated: true, error: errorMsg };
        return { success: false, recipient: normalizedPhone, error: errorMsg };
      }

      return { success: true, messageId: data?.message_id || data?.id || `pg-${Date.now()}`, recipient: normalizedPhone };
    } catch (err) {
      if (isDev) return { success: true, recipient: normalizedPhone, isSimulated: true, error: err.message };
      return { success: false, recipient: normalizedPhone, error: err.message };
    }
  }

  static async sendRepaymentSms(toPhone, details) {
    const amountStr = details.currency === 'KHR'
      ? `${new Intl.NumberFormat('km-KH').format(details.amountPaid)} KHR`
      : `$${Number(details.amountPaid).toFixed(2)}`;
    const balanceStr = details.currency === 'KHR'
      ? `${new Intl.NumberFormat('km-KH').format(details.remainingBalance)} KHR`
      : `$${Number(details.remainingBalance).toFixed(2)}`;

    const message =
      `[JAM SONG VICH] Chourb ban totoul ${amountStr} samrab ${details.loanNumber} Ins#${details.installmentNo}. ` +
      `Somtouly nol: ${balanceStr}. Ref: ${details.transactionRef || 'KHQR'}. Orkun!`;

    return this.sendSms(toPhone, message);
  }
}

module.exports = { SmsService };

