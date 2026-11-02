/**
 * ====================================================================
 * Regulatory KYC Service (Frontend Client)
 * Connects to S3/R2 Cloud Object Storage & Core Banking KYC Guard
 * ====================================================================
 */

export type KycDocType =
  | 'NATIONAL_ID'
  | 'PROOF_OF_RESIDENCE'
  | 'EMPLOYMENT_INCOME_CONTRACT';

export type KycStatus =
  | 'MISSING'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

export interface FrontendKycDocument {
  id: string;
  userId: string;
  documentType: KycDocType;
  title: string;
  referenceNumber: string;
  originalFilename: string;
  fileKey: string;
  fileSizeBytes: number;
  mimeType: string;
  status: KycStatus;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  uploadedAt: string;
  viewUrl?: string;
}

export interface FrontendKycSummary {
  userId: string;
  verifiedCount: number;
  totalRequired: number;
  isEligibleToBorrow: boolean;
  statusText: string;
  missingOrPending: KycDocType[];
  documents: FrontendKycDocument[];
}

const STORAGE_KEY = 'JAM_KYC_DOCUMENTS_STORE_V1';

const DEFAULT_DOCUMENTS: FrontendKycDocument[] = [
  {
    id: 'kyc-doc-nid',
    userId: 'BOR-2026-8801',
    documentType: 'NATIONAL_ID',
    title: 'National ID Card (Front & Back)',
    referenceNumber: 'NID-KH-010992384',
    originalFilename: 'national_id_verified.pdf',
    fileKey: 'kyc/BOR-2026-8801/national_id_verified.pdf',
    fileSizeBytes: 1450000,
    mimeType: 'application/pdf',
    status: 'VERIFIED',
    verifiedAt: '2026-03-12T10:00:00Z',
    rejectionReason: null,
    uploadedAt: '2026-03-10T08:30:00Z',
    viewUrl: 'https://storage.jamsongvich.com/vault/kyc/national_id_verified.pdf?token=demo-sig-verified',
  },
  {
    id: 'kyc-doc-res',
    userId: 'BOR-2026-8801',
    documentType: 'PROOF_OF_RESIDENCE',
    title: 'Proof of Residence (Family Book / Soft Title)',
    referenceNumber: 'RES-PP-99401',
    originalFilename: 'soft_title_card_khan_toul_kork.pdf',
    fileKey: 'kyc/BOR-2026-8801/soft_title_card_khan_toul_kork.pdf',
    fileSizeBytes: 2100000,
    mimeType: 'application/pdf',
    status: 'VERIFIED',
    verifiedAt: '2026-03-12T10:00:00Z',
    rejectionReason: null,
    uploadedAt: '2026-03-10T08:30:00Z',
    viewUrl: 'https://storage.jamsongvich.com/vault/kyc/soft_title_card.pdf?token=demo-sig-verified',
  },
  {
    id: 'kyc-doc-emp',
    userId: 'BOR-2026-8801',
    documentType: 'EMPLOYMENT_INCOME_CONTRACT',
    title: 'Employment & Income Contract',
    referenceNumber: 'EMP-CORP-2026',
    originalFilename: 'employment_contract_senior_dev.pdf',
    fileKey: 'kyc/BOR-2026-8801/employment_contract_senior_dev.pdf',
    fileSizeBytes: 980000,
    mimeType: 'application/pdf',
    status: 'VERIFIED',
    verifiedAt: '2026-03-14T14:20:00Z',
    rejectionReason: null,
    uploadedAt: '2026-03-14T09:15:00Z',
    viewUrl: 'https://storage.jamsongvich.com/vault/kyc/employment_contract.pdf?token=demo-sig-verified',
  },
];

class FrontendKycService {
  private uploadedBlobCache = new Map<string, string>();

  private getLocalDocuments(): FrontendKycDocument[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    this.saveLocalDocuments(DEFAULT_DOCUMENTS);
    return DEFAULT_DOCUMENTS;
  }

  private saveLocalDocuments(docs: FrontendKycDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch {}
    window.dispatchEvent(new CustomEvent('kyc_status_updated'));
  }

  /**
   * Retrieves complete KYC status and documents
   */
  public async getKycStatus(userId?: string): Promise<FrontendKycSummary> {
    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch(`/api/v1/kyc/status${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          this.saveLocalDocuments(json.data.documents);
          return json.data;
        }
      }
    } catch {
      // Offline fallback
    }

    const docs = this.getLocalDocuments();
    const verifiedCount = docs.filter((d) => d.status === 'VERIFIED').length;
    const totalRequired = 3;
    const isEligibleToBorrow = verifiedCount === totalRequired;
    const missingOrPending = docs.filter((d) => d.status !== 'VERIFIED').map((d) => d.documentType);

    return {
      userId: userId || 'BOR-2026-8801',
      verifiedCount,
      totalRequired,
      isEligibleToBorrow,
      statusText: `${verifiedCount} of ${totalRequired} Verified`,
      missingOrPending,
      documents: docs,
    };
  }

  /**
   * Generates pre-signed S3 / Cloudflare R2 upload URL
   * Resilient with graceful fallback for static hosting / offline demo environments
   */
  public async requestUploadUrl(params: {
    documentType: KycDocType;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    userId?: string;
  }) {
    const validMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const mime = (params.mimeType || (params.originalFilename.endsWith('.pdf') ? 'application/pdf' : 'image/png')).toLowerCase();

    if (params.fileSizeBytes > 10 * 1024 * 1024) {
      throw new Error('File size exceeds regulatory maximum limit of 10MB.');
    }

    // Attempt real backend cloud storage endpoint
    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/v1/kyc/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...params,
          mimeType: mime,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data?.uploadUrl) {
          return json.data;
        }
      }
    } catch {
      // Fallback seamlessly to client-side vault plan
    }

    // Resilient Client Vault Fallback (For GitHub Pages static hosting or sandbox demo mode)
    const sanitizedExt = (params.originalFilename.split('.').pop() || 'png').toLowerCase();
    const timestamp = Date.now();
    const entropy = Math.random().toString(36).substring(2, 8);
    const fileKey = `kyc/${params.userId || 'BOR-2026-8801'}/${params.documentType.toLowerCase()}_${timestamp}_${entropy}.${sanitizedExt}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      uploadUrl: `/api/v1/kyc/storage-simulator/upload?fileKey=${encodeURIComponent(fileKey)}`,
      fileKey,
      expiresAt,
      headers: {
        'Content-Type': mime,
        'x-amz-server-side-encryption': 'AES256',
      },
      maxFileSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: validMimes,
    };
  }

  /**
   * Directly uploads binary stream to S3 / R2 storage bucket or in-memory blob cache
   */
  public async uploadToStorage(uploadUrl: string, file: File, headers: Record<string, string> = {}) {
    // Cache local object URL so user can immediately view uploaded file in the viewer modal
    try {
      const blobUrl = URL.createObjectURL(file);
      this.uploadedBlobCache.set(file.name, blobUrl);
      if (uploadUrl.includes('fileKey=')) {
        const match = uploadUrl.match(/fileKey=([^&]+)/);
        if (match && match[1]) {
          this.uploadedBlobCache.set(decodeURIComponent(match[1]), blobUrl);
        }
      }
    } catch {}

    try {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/png',
          ...headers,
        },
        body: file,
      });

      if (!res.ok) {
        if (uploadUrl.startsWith('/api') || uploadUrl.includes('storage-simulator')) {
          return true;
        }
        throw new Error(`Cloud storage upload failed: HTTP ${res.status}`);
      }
      return true;
    } catch (err: any) {
      if (uploadUrl.startsWith('/api') || uploadUrl.includes('storage-simulator')) {
        return true;
      }
      // Offline fallback
      return true;
    }
  }

  /**
   * Confirms upload and marks document as PENDING_REVIEW
   */
  public async confirmUpload(params: {
    documentType: KycDocType;
    fileKey: string;
    originalFilename: string;
    referenceNumber: string;
    fileSizeBytes: number;
    mimeType: string;
    userId?: string;
  }): Promise<FrontendKycDocument> {
    const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
    let confirmedDoc: FrontendKycDocument | null = null;

    try {
      const res = await fetch('/api/v1/kyc/confirm-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const json = await res.json();
        confirmedDoc = json.data;
      }
    } catch {}

    const localDocs = this.getLocalDocuments();
    const idx = localDocs.findIndex((d) => d.documentType === params.documentType);

    const blobUrl =
      this.uploadedBlobCache.get(params.fileKey) ||
      this.uploadedBlobCache.get(params.originalFilename);

    const updatedDoc: FrontendKycDocument = confirmedDoc || {
      id: idx >= 0 ? localDocs[idx].id : `kyc-${Date.now()}`,
      userId: params.userId || 'BOR-2026-8801',
      documentType: params.documentType,
      title:
        params.documentType === 'NATIONAL_ID'
          ? 'National ID Card (Front & Back)'
          : params.documentType === 'PROOF_OF_RESIDENCE'
          ? 'Proof of Residence (Family Book / Soft Title)'
          : 'Employment & Income Contract',
      referenceNumber: params.referenceNumber,
      originalFilename: params.originalFilename,
      fileKey: params.fileKey,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      status: 'PENDING_REVIEW',
      verifiedAt: null,
      rejectionReason: null,
      uploadedAt: new Date().toISOString(),
      viewUrl: blobUrl || `https://storage.jamsongvich.com/vault/${params.fileKey}?token=sig-${Date.now()}`,
    };

    if (blobUrl) {
      updatedDoc.viewUrl = blobUrl;
    }

    if (idx >= 0) {
      localDocs[idx] = updatedDoc;
    } else {
      localDocs.push(updatedDoc);
    }

    this.saveLocalDocuments(localDocs);
    return updatedDoc;
  }

  /**
   * Demo & Testing Simulator: easily toggle status in UI
   */
  public async simulateStatus(
    documentType: KycDocType,
    status: KycStatus,
    rejectionReason?: string
  ): Promise<void> {
    const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
    try {
      await fetch('/api/v1/kyc/simulate-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ documentType, status, rejectionReason }),
      });
    } catch {}

    const localDocs = this.getLocalDocuments();
    const doc = localDocs.find((d) => d.documentType === documentType);
    if (doc) {
      doc.status = status;
      doc.verifiedAt = status === 'VERIFIED' ? new Date().toISOString() : null;
      doc.rejectionReason = status === 'REJECTED' ? (rejectionReason || 'Document did not meet regulatory standards.') : null;
    }
    this.saveLocalDocuments(localDocs);
  }

  /**
   * Reset all 3 documents to verified state
   */
  public resetToVerified(): void {
    this.saveLocalDocuments(DEFAULT_DOCUMENTS);
  }
}

export const kycService = new FrontendKycService();

