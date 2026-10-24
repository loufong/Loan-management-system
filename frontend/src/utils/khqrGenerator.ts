/**
 * ============================================================================
 * EMVCo Compliant Bakong KHQR Payload Generator (Cambodia National Standard)
 * File: frontend/src/utils/khqrGenerator.ts
 *
 * Implements EMVCo Merchant-Presented QR Code specifications:
 * - Tag 00: Payload Format Indicator ("01")
 * - Tag 01: Point of Initiation Method ("12" for Dynamic QR)
 * - Tag 29: Merchant Account Information (Bakong Individual / Merchant Account)
 * - Tag 52: Merchant Category Code ("5999" or "6012")
 * - Tag 53: Transaction Currency (840 for USD, 116 for KHR)
 * - Tag 54: Transaction Amount
 * - Tag 58: Country Code ("KH")
 * - Tag 59: Merchant Name
 * - Tag 60: Merchant City ("Phnom Penh")
 * - Tag 62: Additional Data Field Template (Bill Number / Reference)
 * - Tag 63: CRC16-CCITT Checksum
 * ============================================================================
 */

export interface KhqrPayloadOptions {
  billNumber: string;
  amount: number;
  currency: 'USD' | 'KHR';
  merchantName?: string;
  bakongAccountId?: string;
  accountInformation?: string;
  merchantCity?: string;
}

/**
 * Computes standard CRC16-CCITT (0xFFFF polynomial 0x1021) checksum for Tag 63
 */
export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats a single EMVCo TLV (Tag-Length-Value) chunk
 */
export function formatTag(tag: string, value: string): string {
  const length = String(value.length).padStart(2, '0');
  return `${tag}${length}${value}`;
}

/**
 * Generates an EMVCo-compliant Bakong KHQR string
 */
export function generateBakongKHQRPayload(options: KhqrPayloadOptions): string {
  const {
    billNumber,
    amount,
    currency,
    merchantName = 'JAM SONG VICH MICROFINANCE',
    bakongAccountId = 'khqr@aclb',
    accountInformation = '85517790800',
    merchantCity = 'Phnom Penh'
  } = options;

  // Format amount cleanly: USD uses 2 decimals, KHR rounded to integer
  const formattedAmount =
    currency === 'KHR'
      ? Math.round(amount).toString()
      : Number(amount).toFixed(2);

  // Tag 29: Merchant Account Info Sub-TLVs
  const subTag00 = formatTag('00', bakongAccountId);
  const subTag01 = formatTag('01', accountInformation);
  const merchantAccountInfo = formatTag('29', `${subTag00}${subTag01}`);

  // Currency Code: 840 = USD, 116 = KHR
  const currencyCode = currency === 'KHR' ? '116' : '840';

  // Tag 62: Additional Data (Bill Reference)
  const subTag01Bill = formatTag('01', billNumber.slice(0, 25));
  const additionalData = formatTag('62', subTag01Bill);

  // Construct Base Payload (Tags 00 to 62)
  const basePayload =
    formatTag('00', '01') + // Format indicator
    formatTag('01', '12') + // 12 = Dynamic QR (specific amount)
    merchantAccountInfo +
    formatTag('52', '6012') + // Financial Institutions
    formatTag('53', currencyCode) +
    formatTag('54', formattedAmount) +
    formatTag('58', 'KH') +
    formatTag('59', merchantName.slice(0, 25)) +
    formatTag('60', merchantCity.slice(0, 15)) +
    additionalData +
    '6304'; // Tag 63 with length 04

  // Append 4-character hex CRC
  const crc = calculateCRC16(basePayload);
  return `${basePayload}${crc}`;
}

export default {
  generateBakongKHQRPayload,
  calculateCRC16,
  formatTag
};
