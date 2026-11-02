/**
 * ====================================================================
 * Cloud Object Storage Service (AWS S3 & Cloudflare R2 Compatible)
 * Core Banking Regulatory Document Vault
 * ====================================================================
 * Provides pre-signed upload and download URLs for private, encrypted (AES-256)
 * regulatory documents. Enforces strict MIME-type and 10MB file-size limits.
 */

import crypto from 'crypto';

export interface PreSignedUploadParams {
  userId: string;
  documentType: 'NATIONAL_ID' | 'PROOF_OF_RESIDENCE' | 'EMPLOYMENT_INCOME_CONTRACT';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  expiresInSeconds?: number;
}

export interface PreSignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
  headers: Record<string, string>;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface PreSignedReadResult {
  readUrl: string;
  fileKey: string;
  expiresAt: string;
}

// 1. Strict Regulatory Validation Rules
export const ALLOWED_KYC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

export const MAX_KYC_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export class S3StorageService {
  private static bucketName = process.env.AWS_S3_BUCKET || process.env.CLOUDFLARE_R2_BUCKET || 'jamsongvich-kyc-vault';
  private static region = process.env.AWS_REGION || 'ap-southeast-1';
  private static accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
  private static secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
  private static customEndpoint = process.env.AWS_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT || '';

  // In-memory simulated storage for offline unit tests and sandbox demo verification
  private static simulatedBlobStore = new Map<string, { buffer?: Buffer; mimeType: string; size: number; uploadedAt: Date }>();

  /**
   * Generates a pre-signed S3/R2 PUT URL for direct client-to-storage upload
   */
  public static generatePreSignedUploadUrl(params: PreSignedUploadParams): PreSignedUploadResult {
    const { userId, documentType, originalFilename, mimeType, fileSizeBytes, expiresInSeconds = 900 } = params;

    // Validate MIME Type
    if (!ALLOWED_KYC_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(
        `Invalid file type: "${mimeType}". Regulatory compliance requires documents in PDF, JPEG, or PNG format.`
      );
    }

    // Validate File Size (Max 10MB)
    if (fileSizeBytes > MAX_KYC_FILE_SIZE_BYTES) {
      const sizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
      throw new Error(
        `File size (${sizeMB}MB) exceeds regulatory maximum limit of 10MB.`
      );
    }

    if (fileSizeBytes <= 0) {
      throw new Error('File cannot be empty (0 bytes).');
    }

    // Clean filename and generate a collision-free private storage key
    const sanitizedExt = (originalFilename.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now();
    const randomEntropy = crypto.randomBytes(6).toString('hex');
    const fileKey = `kyc/${userId}/${documentType.toLowerCase()}_${timestamp}_${randomEntropy}.${sanitizedExt}`;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // Check if cloud credentials exist
    if (this.accessKeyId && this.secretAccessKey) {
      // Build real AWS SigV4 Presigned URL
      const host = this.customEndpoint ? new URL(this.customEndpoint).host : `${this.bucketName}.s3.${this.region}.amazonaws.com`;
      const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const datestamp = dateStr.slice(0, 8);
      const credentialScope = `${datestamp}/${this.region}/s3/aws4_request`;

      const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
        'X-Amz-Date': dateStr,
        'X-Amz-Expires': String(expiresInSeconds),
        'X-Amz-SignedHeaders': 'content-type;host;x-amz-server-side-encryption',
      };

      const canonicalQueryString = Object.keys(queryParams)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

      const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-server-side-encryption:AES256\n`;
      const signedHeaders = 'content-type;host;x-amz-server-side-encryption';
      const canonicalRequest = `PUT\n/${fileKey}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

      const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

      // SigV4 Key Derivation
      const kDate = crypto.createHmac('sha256', 'AWS4' + this.secretAccessKey).update(datestamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
      const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
      const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

      const baseUrl = this.customEndpoint ? `${this.customEndpoint}/${this.bucketName}` : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
      const uploadUrl = `${baseUrl}/${fileKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

      return {
        uploadUrl,
        fileKey,
        expiresAt,
        headers: {
          'Content-Type': mimeType,
          'x-amz-server-side-encryption': 'AES256',
        },
        maxFileSizeBytes: MAX_KYC_FILE_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_KYC_MIME_TYPES,
      };
    }

    // High-security tokenized fallback for sandbox / offline / local testing
    const token = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'apex-secure-kyc-key-2026')
      .update(`${fileKey}:${mimeType}:${fileSizeBytes}:${expiresAt}`)
      .digest('hex');

    const uploadUrl = `/api/v1/kyc/storage-simulator/upload?fileKey=${encodeURIComponent(fileKey)}&token=${token}&expiresAt=${encodeURIComponent(expiresAt)}`;

    return {
      uploadUrl,
      fileKey,
      expiresAt,
      headers: {
        'Content-Type': mimeType,
      },
      maxFileSizeBytes: MAX_KYC_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_KYC_MIME_TYPES,
    };
  }

  /**
   * Generates a short-lived pre-signed read URL for secure viewing
   */
  public static generatePreSignedReadUrl(fileKey: string, expiresInSeconds = 900): PreSignedReadResult {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    if (this.accessKeyId && this.secretAccessKey) {
      const host = this.customEndpoint ? new URL(this.customEndpoint).host : `${this.bucketName}.s3.${this.region}.amazonaws.com`;
      const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const datestamp = dateStr.slice(0, 8);
      const credentialScope = `${datestamp}/${this.region}/s3/aws4_request`;

      const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
        'X-Amz-Date': dateStr,
        'X-Amz-Expires': String(expiresInSeconds),
        'X-Amz-SignedHeaders': 'host',
      };

      const canonicalQueryString = Object.keys(queryParams)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

      const canonicalHeaders = `host:${host}\n`;
      const canonicalRequest = `GET\n/${fileKey}\n${canonicalQueryString}\n${canonicalHeaders}\nhost\nUNSIGNED-PAYLOAD`;
      const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

      const kDate = crypto.createHmac('sha256', 'AWS4' + this.secretAccessKey).update(datestamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
      const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
      const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

      const baseUrl = this.customEndpoint ? `${this.customEndpoint}/${this.bucketName}` : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
      const readUrl = `${baseUrl}/${fileKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

      return {
        readUrl,
        fileKey,
        expiresAt,
      };
    }

    const token = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'apex-secure-kyc-key-2026')
      .update(`${fileKey}:view:${expiresAt}`)
      .digest('hex');

    const readUrl = `/api/v1/kyc/storage-simulator/view?fileKey=${encodeURIComponent(fileKey)}&token=${token}&expiresAt=${encodeURIComponent(expiresAt)}`;

    return {
      readUrl,
      fileKey,
      expiresAt,
    };
  }

  /**
   * Helper to store simulated file bytes in sandbox/offline mode
   */
  public static storeSimulatedBlob(fileKey: string, mimeType: string, size: number, buffer?: Buffer): void {
    this.simulatedBlobStore.set(fileKey, {
      buffer,
      mimeType,
      size,
      uploadedAt: new Date(),
    });
  }

  public static getSimulatedBlob(fileKey: string) {
    return this.simulatedBlobStore.get(fileKey);
  }
}

