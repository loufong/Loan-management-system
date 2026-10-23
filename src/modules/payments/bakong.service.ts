import { BakongKHQR, IndividualInfo, khqrData } from 'bakong-khqr';
import QRCode from 'qrcode';
import crypto from 'crypto';

export interface KhqrGenerationOptions {
  amount: number;
  currency?: 'USD' | 'KHR';
  billNumber: string; // Unique payment reference e.g. PAY-20261021-000001
  mobileNumber?: string;
  storeLabel?: string;
  terminalLabel?: string;
  expiryMinutes?: number;
}

export interface GeneratedKhqrResult {
  qr: string;
  md5: string;
  qrDataUrl: string;
  amount: number;
  currency: 'USD' | 'KHR';
  billNumber: string;
  merchantName: string;
  accountInfo: string;
  bankName: string;
  expiresAt: Date;
}

export interface BakongTransactionRecord {
  hash: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;
  currency: string;
  description?: string;
  createdDate?: number | string;
}

export interface BakongVerificationResult {
  isSuccess: boolean;
  isPending: boolean;
  isUnconfigured: boolean;
  isError: boolean;
  transaction?: BakongTransactionRecord;
  message: string;
  rawResponse?: any;
}

export class BakongService {
  /**
   * Environment Configuration Accessors
   */
  static getEnvironment(): 'production' | 'sandbox' | 'development' {
    const env = (process.env.KHQR_ENVIRONMENT || process.env.NODE_ENV || 'sandbox').toLowerCase();
    if (env === 'production') return 'production';
    if (env === 'sandbox') return 'sandbox';
    return 'development';
  }

  static getMerchantName(): string {
    return process.env.KHQR_MERCHANT_NAME || 'PHON RITHYA';
  }

  static getBakongAccountId(): string {
    return process.env.KHQR_BAKONG_ACCOUNT_ID || 'khqr@aclb';
  }

  static getAccountInformation(): string {
    return process.env.KHQR_ACCOUNT_INFORMATION || '85517790800';
  }

  static getAcquiringBank(): string {
    return process.env.KHQR_ACQUIRING_BANK || 'ACLEDA';
  }

  static getMerchantCity(): string {
    return process.env.KHQR_MERCHANT_CITY || 'Phnom Penh';
  }

  static getMerchantPhone(): string {
    return process.env.KHQR_MERCHANT_PHONE || '010487718';
  }

  static getApiUrl(): string {
    if (process.env.KHQR_API_URL) return process.env.KHQR_API_URL.replace(/\/+$/, '');
    if (process.env.BAKONG_API_URL) return process.env.BAKONG_API_URL.replace(/\/+$/, '');
    
    // Official NBC Bakong Open API Gateways
    return this.getEnvironment() === 'production'
      ? 'https://api-bakong.nbc.gov.kh/v1'
      : 'https://bakong-dev.nbc.org.kh/v1';
  }

  static getApiToken(): string | null {
    const token = process.env.KHQR_API_KEY || process.env.KHQR_SECRET || process.env.BAKONG_API_TOKEN;
    return token && token.trim().length > 0 ? token.trim() : null;
  }

  static getWebhookSecret(): string | null {
    const secret = process.env.KHQR_WEBHOOK_SECRET || process.env.BAKONG_WEBHOOK_SECRET;
    return secret && secret.trim().length > 0 ? secret.trim() : null;
  }

  /**
   * Generate an authentic, official EMVCo-compliant Bakong KHQR dynamic payment string
   */
  static async generateDynamicKhqr(options: KhqrGenerationOptions): Promise<GeneratedKhqrResult> {
    const amount = Number(Number(options.amount).toFixed(2));
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const currencyCode = (options.currency || 'USD').toUpperCase() === 'KHR' ? 'KHR' : 'USD';
    const khqrCurrency = currencyCode === 'KHR' ? khqrData.currency.khr : khqrData.currency.usd;
    const expiryMinutes = options.expiryMinutes || parseInt(process.env.KHQR_EXPIRY_MINUTES || '15', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expirationTimestamp = expiresAt.getTime();

    const merchantName = this.getMerchantName();
    const bakongAccountId = this.getBakongAccountId();
    const accountInformation = this.getAccountInformation();
    const acquiringBank = this.getAcquiringBank();
    const merchantCity = this.getMerchantCity();
    const mobileNumber = options.mobileNumber || this.getMerchantPhone();

    const individualInfo = new IndividualInfo(
      bakongAccountId,
      merchantName,
      merchantCity,
      {
        accountInformation,
        acquiringBank,
        currency: khqrCurrency,
        amount,
        billNumber: options.billNumber,
        mobileNumber,
        storeLabel: options.storeLabel || 'Loan Management System',
        terminalLabel: options.terminalLabel || 'Borrower Portal',
        expirationTimestamp
      }
    );

    const khqrInstance = new BakongKHQR();
    const generated = khqrInstance.generateIndividual(individualInfo);

    if (!generated || generated.status?.code !== 0 || !generated.data?.qr) {
      const errMsg = generated?.status?.message || 'Failed to encode Bakong KHQR dynamic payload';
      throw new Error(`KHQR Generation Error: ${errMsg}`);
    }

    const qr = generated.data.qr;
    const md5 = generated.data.md5;

    // Render high-contrast visual QR image for borrower display
    const qrDataUrl = await QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    });

    return {
      qr,
      md5,
      qrDataUrl,
      amount,
      currency: currencyCode,
      billNumber: options.billNumber,
      merchantName,
      accountInfo: accountInformation,
      bankName: acquiringBank,
      expiresAt
    };
  }

  /**
   * Verify real transaction clearance through Bakong Open API by MD5 hash
   */
  static async checkTransactionByMd5(md5: string): Promise<BakongVerificationResult> {
    const token = this.getApiToken();
    const apiUrl = this.getApiUrl();

    // If official Bakong API token is not yet configured, provide transparent diagnostic
    if (!token) {
      return {
        isSuccess: false,
        isPending: false,
        isUnconfigured: true,
        isError: false,
        message: 'Bakong API credentials (KHQR_API_KEY / BAKONG_API_TOKEN) are not configured in environment.'
      };
    }

    const endpoint = `${apiUrl}/check_transaction_by_md5`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ md5 })
      });

      const data: any = await response.json().catch(() => null);

      if (!response.ok || !data) {
        return {
          isSuccess: false,
          isPending: false,
          isUnconfigured: false,
          isError: true,
          message: data?.responseMessage || `Bakong gateway returned HTTP status ${response.status}`,
          rawResponse: data
        };
      }

      // Bakong Open API responseCode 0 represents confirmed settlement
      if (data.responseCode === 0 && data.data) {
        const tx = data.data;
        return {
          isSuccess: true,
          isPending: false,
          isUnconfigured: false,
          isError: false,
          transaction: {
            hash: tx.hash || tx.externalTransactionId || md5,
            fromAccountId: tx.fromAccountId || tx.sourceAccount,
            toAccountId: tx.toAccountId || tx.destinationAccount,
            amount: Number(tx.amount || 0),
            currency: tx.currency || 'USD',
            description: tx.description || tx.billNumber,
            createdDate: tx.createdDate || tx.settledAt
          },
          message: 'Transaction successfully cleared and settled on the Bakong network.',
          rawResponse: data
        };
      }

      // responseCode 1 or transaction not yet cleared -> PENDING
      return {
        isSuccess: false,
        isPending: true,
        isUnconfigured: false,
        isError: false,
        message: data.responseMessage || 'Transaction not found or pending customer scan/approval.',
        rawResponse: data
      };
    } catch (err: any) {
      return {
        isSuccess: false,
        isPending: false,
        isUnconfigured: false,
        isError: true,
        message: `Bakong network unreachable: ${err.message || 'Connection failed'}`
      };
    }
  }

  /**
   * Validate settled transaction metadata against expected installment amount & currency
   */
  static validateSettlementIntegrity(
    tx: BakongTransactionRecord,
    expected: { amount: number; currency: string }
  ): { isValid: boolean; reason?: string } {
    const expectedAmount = Number(expected.amount.toFixed(2));
    const settledAmount = Number(Number(tx.amount).toFixed(2));

    if (Math.abs(settledAmount - expectedAmount) > 0.009) {
      return {
        isValid: false,
        reason: `Amount mismatch: Expected $${expectedAmount.toFixed(2)}, but received $${settledAmount.toFixed(2)}`
      };
    }

    if (tx.currency && tx.currency.toUpperCase() !== expected.currency.toUpperCase()) {
      return {
        isValid: false,
        reason: `Currency mismatch: Expected ${expected.currency}, but received ${tx.currency}`
      };
    }

    return { isValid: true };
  }

  /**
   * Webhook Signature Verification for Bakong Callback Webhooks
   */
  static verifyWebhookSignature(body: any, signatureHeader?: string): boolean {
    const secret = this.getWebhookSecret();
    if (!secret) {
      // In development/test mode without secret configured
      return true;
    }
    if (!signatureHeader) return false;

    try {
      const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
      const computed = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  /**
   * Safe Diagnostic Summary for Administrator System Health Check
   */
  static getDiagnosticSummary() {
    const token = this.getApiToken();
    return {
      environment: this.getEnvironment(),
      merchantName: this.getMerchantName(),
      bakongAccountId: this.getBakongAccountId(),
      accountInformation: this.getAccountInformation(),
      acquiringBank: this.getAcquiringBank(),
      apiUrl: this.getApiUrl(),
      isCredentialsConfigured: !!token,
      isWebhookConfigured: !!this.getWebhookSecret(),
      emvcoStandard: 'KHQR 29 (National Bank of Cambodia)',
      status: token ? 'ONLINE_READY' : 'CREDENTIALS_REQUIRED'
    };
  }
}
