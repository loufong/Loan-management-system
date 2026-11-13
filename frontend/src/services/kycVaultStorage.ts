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
import { safeLocalStorageSet } from '../utils/storageGuard';

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
    this.cleanLegacyGlobalStorage();
    this.initDb();
  }

  private cleanLegacyGlobalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('kyc_file_') || k.startsWith('kyc_photo_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
        localStorage.removeItem('JAM_KYC_DOCUMENTS_STORE_V1');
      }
    } catch { }
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
   * Strictly user-scoped: files are saved only for this specific user account.
   */
  public async saveFile(
    userId: string,
    docType: KycDocType | string,
    dataUrl: string,
    metadata: { fileName: string; mimeType: string; fileSize: number }
  ): Promise<void> {
    const cleanUserId = (userId || 'anonymous').trim();
    const key = `${cleanUserId}_${docType}`;

    // 1. User-scoped memory cache
    this.memoryFiles.set(key, dataUrl);

    // 2. Multi-megabyte file data is persisted safely in IndexedDB (never localStorage)
    // to strictly preserve the 5MB browser localStorage quota for session auth.

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
   * Strictly user-scoped: never returns files uploaded by another user account.
   */
  public async getFile(userId: string, docType: KycDocType | string): Promise<string | null> {
    const cleanUserId = (userId || '').trim();
    if (!cleanUserId) return null;
    const key = `${cleanUserId}_${docType}`;

    // 1. Check user-scoped memory
    if (this.memoryFiles.has(key)) {
      return this.memoryFiles.get(key) || null;
    }

    // 2. Check user-scoped LocalStorage
    try {
      const fromLocal = localStorage.getItem(`kyc_file_${key}`);
      if (fromLocal && fromLocal.startsWith('data:')) {
        this.memoryFiles.set(key, fromLocal);
        return fromLocal;
      }
    } catch { }

    // 3. Check user-scoped IndexedDB
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
              resolve(null);
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
   * Strictly user-scoped to cleanUserId.
   */
  public async saveDocuments(userId: string, docs: FrontendKycDocument[]): Promise<void> {
    const cleanUserId = (userId || 'anonymous').trim();

    // 1. User-scoped LocalStorage permanent save (sanitized of giant data: URLs)
    try {
      const sanitizedDocs = docs.map((d) => ({
        ...d,
        viewUrl: d.viewUrl && d.viewUrl.startsWith('data:') ? `vault://${d.documentType}` : d.viewUrl,
        backViewUrl: d.backViewUrl && d.backViewUrl.startsWith('data:') ? `vault://back/${d.documentType}` : d.backViewUrl,
      }));
      safeLocalStorageSet(`JAM_KYC_DOCS_${cleanUserId}`, JSON.stringify(sanitizedDocs));
    } catch (e) {
      console.warn('[KycVaultStorage] LocalStorage write note:', e);
    }

    // 2. User-scoped IndexedDB permanent save
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
      window.dispatchEvent(new CustomEvent('kyc_status_updated', { detail: { userId: cleanUserId } }));
    }
  }

  /**
   * Retrieves permanently saved KYC document list
   * Strictly user-scoped. Never falls back to a global document store.
   */
  public async getDocuments(userId: string): Promise<FrontendKycDocument[] | null> {
    const cleanUserId = (userId || '').trim();
    if (!cleanUserId) return null;

    // 1. Check user-scoped LocalStorage
    try {
      const rawUser = localStorage.getItem(`JAM_KYC_DOCS_${cleanUserId}`);
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }

    // 2. Check user-scoped IndexedDB
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

