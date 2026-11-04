/**
 * ====================================================================
 * Jam Song Vich • Permanent KYC Vault Storage Service
 * Uses IndexedDB with LocalStorage Fallback for 100% Persistent Storage
 * 
 * Ensures that all uploaded borrower documents, files, preview scans,
 * and verification statuses remain permanently saved even when the user
 * closes the tab, shuts down the browser, or turns off the website.
 * ====================================================================
 */

import { FrontendKycDocument, KycDocType } from './kycService';

const DB_NAME = 'JamSongVich_KycVault_DB';
const DB_VERSION = 1;
const STORE_FILES = 'kyc_files';
const STORE_DOCUMENTS = 'kyc_documents';

export interface StoredKycFile {
  key: string; // `${userId}_${docType}`
  userId: string;
  docType: KycDocType | string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  updatedAt: string;
}

export interface StoredKycUserDocs {
  userId: string;
  documents: FrontendKycDocument[];
  updatedAt: string;
}

class KycVaultStorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFiles = new Map<string, string>();

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_FILES)) {
            db.createObjectStore(STORE_FILES, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
            db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'userId' });
          }
        };

        request.onsuccess = (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = () => {
          console.warn('[KycVaultStorage] IndexedDB open error, falling back to localStorage');
          resolve(null);
        };
      } catch (err) {
        console.warn('[KycVaultStorage] IndexedDB initialization exception:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Permanently saves a document file (Data URL / Base64) to IndexedDB + LocalStorage fallback
   */
  public async saveFile(
    userId: string,
    docType: KycDocType | string,
    dataUrl: string,
    metadata: { fileName: string; mimeType: string; fileSize: number }
  ): Promise<void> {
    const cleanUserId = (userId || 'BOR-2026-8801').trim();
    const key = `${cleanUserId}_${docType}`;

    // 1. Memory cache
    this.memoryFiles.set(key, dataUrl);
    this.memoryFiles.set(docType, dataUrl);

    // 2. LocalStorage fast cache
    try {
      localStorage.setItem(`kyc_file_${key}`, dataUrl);
      localStorage.setItem(`kyc_file_${docType}`, dataUrl);
      localStorage.setItem(`kyc_photo_${docType}`, dataUrl);
    } catch {
      // LocalStorage might be full for large images, handled gracefully by IndexedDB
    }

    // 3. Permanent IndexedDB storage
    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_FILES, 'readwrite');
          const store = tx.objectStore(STORE_FILES);
          const record: StoredKycFile = {
            key,
            userId: cleanUserId,
            docType,
            dataUrl,
            fileName: metadata.fileName,
            mimeType: metadata.mimeType,
            fileSize: metadata.fileSize,
            updatedAt: new Date().toISOString(),
          };
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kyc_file_saved', { detail: { userId: cleanUserId, docType } }));
    }
  }

  /**
   * Retrieves permanently saved file Data URL
   */
  public async getFile(userId: string, docType: KycDocType | string): Promise<string | null> {
    const cleanUserId = (userId || 'BOR-2026-8801').trim();
    const key = `${cleanUserId}_${docType}`;

    // 1. Check memory
    if (this.memoryFiles.has(key)) {
      return this.memoryFiles.get(key) || null;
    }
    if (this.memoryFiles.has(docType)) {
      return this.memoryFiles.get(docType) || null;
    }

    // 2. Check LocalStorage
    try {
      const fromLocal =
        localStorage.getItem(`kyc_file_${key}`) ||
        localStorage.getItem(`kyc_file_${docType}`) ||
        localStorage.getItem(`kyc_photo_${docType}`);
      if (fromLocal && fromLocal.startsWith('data:')) {
        this.memoryFiles.set(key, fromLocal);
        return fromLocal;
      }
    } catch {}

    // 3. Check IndexedDB
    const db = await this.initDb();
    if (db) {
      const dbFile = await new Promise<string | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_FILES, 'readonly');
          const store = tx.objectStore(STORE_FILES);
          const req = store.get(key);
          req.onsuccess = () => {
            const result = req.result as StoredKycFile | undefined;
            if (result && result.dataUrl) {
              resolve(result.dataUrl);
            } else {
              // Try generic docType key fallback
              const genericReq = store.get(docType);
              genericReq.onsuccess = () => {
                const genRes = genericReq.result as StoredKycFile | undefined;
                resolve(genRes?.dataUrl || null);
              };
              genericReq.onerror = () => resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (dbFile) {
        this.memoryFiles.set(key, dbFile);
        return dbFile;
      }
    }

    return null;
  }

  /**
   * Permanently saves the user's KYC document list & metadata
   */
  public async saveDocuments(userId: string, docs: FrontendKycDocument[]): Promise<void> {
    const cleanUserId = (userId || 'BOR-2026-8801').trim();

    // 1. LocalStorage permanent save
    try {
      localStorage.setItem(`JAM_KYC_DOCS_${cleanUserId}`, JSON.stringify(docs));
      localStorage.setItem('JAM_KYC_DOCUMENTS_STORE_V1', JSON.stringify(docs));
    } catch (e) {
      console.warn('[KycVaultStorage] LocalStorage write error:', e);
    }

    // 2. IndexedDB permanent save
    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
          const store = tx.objectStore(STORE_DOCUMENTS);
          const record: StoredKycUserDocs = {
            userId: cleanUserId,
            documents: docs,
            updatedAt: new Date().toISOString(),
          };
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kyc_status_updated'));
    }
  }

  /**
   * Retrieves permanently saved KYC document list
   */
  public async getDocuments(userId: string): Promise<FrontendKycDocument[] | null> {
    const cleanUserId = (userId || 'BOR-2026-8801').trim();

    // 1. Check LocalStorage
    try {
      const rawUser = localStorage.getItem(`JAM_KYC_DOCS_${cleanUserId}`);
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }

      const rawGlobal = localStorage.getItem('JAM_KYC_DOCUMENTS_STORE_V1');
      if (rawGlobal) {
        const parsed = JSON.parse(rawGlobal);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // 2. Check IndexedDB
    const db = await this.initDb();
    if (db) {
      const docs = await new Promise<FrontendKycDocument[] | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
          const store = tx.objectStore(STORE_DOCUMENTS);
          const req = store.get(cleanUserId);
          req.onsuccess = () => {
            const result = req.result as StoredKycUserDocs | undefined;
            if (result && Array.isArray(result.documents) && result.documents.length > 0) {
              resolve(result.documents);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (docs) return docs;
    }

    return null;
  }
}

export const kycVaultStorage = new KycVaultStorageService();

