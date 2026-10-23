declare module 'bakong-khqr' {
  export const khqrData: {
    currency: {
      usd: string;
      khr: string;
    };
    [key: string]: any;
  };

  export class IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      optional?: {
        accountInformation?: string;
        acquiringBank?: string;
        currency?: string;
        amount?: number;
        billNumber?: string;
        mobileNumber?: string;
        storeLabel?: string;
        terminalLabel?: string;
        purposeOfTransaction?: string;
        languagePreference?: string;
        merchantNameAlternateLanguage?: string;
        merchantCityAlternateLanguage?: string;
        upiMerchantAccount?: string;
        expirationTimestamp?: number;
        merchantCategoryCode?: string;
      }
    );
    [key: string]: any;
  }

  export class MerchantInfo {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export class SourceInfo {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): {
      status: { code: number; errorCode: any; message: any };
      data: { qr: string; md5: string } | null;
    };
    generateMerchant(info: MerchantInfo): {
      status: { code: number; errorCode: any; message: any };
      data: { qr: string; md5: string } | null;
    };
    static decode(qr: string): any;
    static verify(qr: string): any;
    [key: string]: any;
  }
}
