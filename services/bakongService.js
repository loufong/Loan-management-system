const { BakongService } = require('../dist/src/services/bakongService.js') || {};

// Direct fallback implementation for commonjs/node
if (!BakongService) {
  const { BakongKHQR, IndividualInfo, khqrData } = require('bakong-khqr');
  const QRCode = require('qrcode');

  class BakongServiceJS {
    static async generateDynamicKhqr(options) {
      const { loanId, installmentNo, amount = 122.50, currency = 'USD' } = options;
      const billNumber = `${loanId || 'LN-2026-6042'}-INS${String(installmentNo || 5).padStart(2, '0')}`;
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

      const info = new IndividualInfo(
        process.env.KHQR_BAKONG_ACCOUNT_ID || 'khqr@aclb',
        process.env.KHQR_MERCHANT_NAME || 'JAM SONG VICH LMS',
        process.env.KHQR_MERCHANT_CITY || 'Phnom Penh',
        {
          accountInformation: process.env.KHQR_ACCOUNT_INFORMATION || '85517790800',
          acquiringBank: process.env.KHQR_ACQUIRING_BANK || 'ACLEDA Bank Plc.',
          currency: currency === 'KHR' ? khqrData.currency.khr : khqrData.currency.usd,
          amount: Number(amount),
          billNumber,
          mobileNumber: process.env.KHQR_MERCHANT_PHONE || '010487718',
          storeLabel: 'JAM SONG VICH Core Banking',
          terminalLabel: 'Borrower Portal KHQR',
          expirationTimestamp: expiresAt.getTime()
        }
      );

      const res = new BakongKHQR().generateIndividual(info);
      const qrDataUrl = await QRCode.toDataURL(res.data.qr, { width: 340, margin: 2 });

      return {
        qrString: res.data.qr,
        md5: res.data.md5,
        qrDataUrl,
        amount,
        currency,
        billNumber,
        merchantName: process.env.KHQR_MERCHANT_NAME || 'JAM SONG VICH LMS',
        bankName: process.env.KHQR_ACQUIRING_BANK || 'ACLEDA Bank Plc.',
        expiresAt,
        expiresInSeconds: 180,
        installmentNo,
        loanNumber: loanId
      };
    }
  }
  module.exports = { BakongService: BakongServiceJS };
} else {
  module.exports = { BakongService };
}

