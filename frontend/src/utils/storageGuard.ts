/**
 * ====================================================================
 * Storage Guard & Quota Recovery Utility
 * Prevents "Setting the value of 'apex_user' exceeded the quota"
 * Automatically cleans bloated base64 keys and provides fallback.
 * ====================================================================
 */

/**
 * Scan and remove bloated keys that exceed quota limits
 * (e.g. old kyc_file_* base64 blobs, massive data URLs mistakenly stored in localStorage)
 */
export function cleanupBloatedStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    const keysToSanitize: { key: string; sanitized: string }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Target known legacy bloated file keys
      if (
        key.startsWith('kyc_file_') ||
        key.startsWith('kyc_photo_') ||
        key.startsWith('temp_file_') ||
        key.startsWith('blob_')
      ) {
        keysToRemove.push(key);
        continue;
      }

      // 2. Check value size & content
      try {
        const val = localStorage.getItem(key);
        if (val && val.length > 30000) {
          // If value is a direct base64 data URL
          if (val.startsWith('data:image/') || val.startsWith('data:application/')) {
            keysToRemove.push(key);
            continue;
          }

          // If value is a JSON array/object containing massive data: URLs
          if (
            key.startsWith('JAM_KYC_DOCS_') ||
            key.startsWith('JAM_LEDGER_STORAGE_') ||
            key.startsWith('JAM_LOAN_DOCS_') ||
            key.startsWith('JAM_LOAN_DRAFT_') ||
            key === 'apex_registered_users'
          ) {
            try {
              const parsed = JSON.parse(val);
              let modified = false;

              if (Array.isArray(parsed)) {
                parsed.forEach((item: any) => {
                  if (item.viewUrl && typeof item.viewUrl === 'string' && item.viewUrl.startsWith('data:')) {
                    item.viewUrl = `vault://${item.documentType || 'doc'}`;
                    modified = true;
                  }
                  if (item.backViewUrl && typeof item.backViewUrl === 'string' && item.backViewUrl.startsWith('data:')) {
                    item.backViewUrl = `vault://back/${item.documentType || 'doc'}`;
                    modified = true;
                  }
                  if (item.salarySlipDoc && item.salarySlipDoc.dataUrl) {
                    delete item.salarySlipDoc.dataUrl;
                    modified = true;
                  }
                  if (item.collateralDoc && item.collateralDoc.dataUrl) {
                    delete item.collateralDoc.dataUrl;
                    modified = true;
                  }
                });
              } else if (parsed && typeof parsed === 'object') {
                // If it's an object (like JAM_LOAN_DOCS_ or JAM_LOAN_DRAFT_ or apex_registered_users)
                if (parsed.salarySlip && parsed.salarySlip.dataUrl && parsed.salarySlip.dataUrl.startsWith('data:')) {
                  parsed.salarySlip.dataUrl = 'vault://LOAN_SALARY_SLIP';
                  modified = true;
                }
                if (parsed.collateralDoc && parsed.collateralDoc.dataUrl && parsed.collateralDoc.dataUrl.startsWith('data:')) {
                  parsed.collateralDoc.dataUrl = 'vault://LOAN_COLLATERAL_DOC';
                  modified = true;
                }
                // Check apex_registered_users users
                Object.keys(parsed).forEach((k) => {
                  const u = parsed[k];
                  if (u && typeof u === 'object') {
                    if (u.avatar && typeof u.avatar === 'string' && u.avatar.startsWith('data:')) {
                      u.avatar = u.username ? u.username.substring(0, 2).toUpperCase() : 'US';
                      modified = true;
                    }
                    if (u.avatarUrl && typeof u.avatarUrl === 'string' && u.avatarUrl.startsWith('data:')) {
                      delete u.avatarUrl;
                      modified = true;
                    }
                  }
                });
              }

              if (modified) {
                keysToSanitize.push({ key, sanitized: JSON.stringify(parsed) });
              }
            } catch {
              // Not JSON, or too large to parse
              keysToRemove.push(key);
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // Apply removals
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    // Apply sanitizations
    keysToSanitize.forEach(({ key, sanitized }) => {
      try {
        localStorage.setItem(key, sanitized);
      } catch {}
    });
  } catch (err) {
    console.warn('[StorageGuard] Storage cleanup warning:', err);
  }
}

// Auto-run cleanup on initial load
cleanupBloatedStorage();

/**
 * Safely writes to localStorage with automatic cleanup and sessionStorage fallback on quota error.
 */
export function safeLocalStorageSet(key: string, value: string, useSessionFallback = true): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  // Attempt 1: Standard write
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[StorageGuard] Quota error writing "${key}". Running aggressive cleanup...`, err?.message);
  }

  // Attempt 2: Clean bloated keys and retry
  try {
    cleanupBloatedStorage();
    localStorage.setItem(key, value);
    return true;
  } catch (err2: any) {
    console.warn(`[StorageGuard] Retry failed for "${key}".`, err2?.message);
  }

  // Attempt 3: If still failing and key is apex_user or apex_token, trim large fields and retry
  if (key === 'apex_user') {
    try {
      const parsed = JSON.parse(value);
      // Remove giant avatar data URLs if present in the user profile
      if (parsed.avatar && typeof parsed.avatar === 'string' && parsed.avatar.startsWith('data:')) {
        parsed.avatar = parsed.username ? parsed.username.substring(0, 2).toUpperCase() : 'US';
      }
      if (parsed.avatarUrl && typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.startsWith('data:')) {
        delete parsed.avatarUrl;
      }
      localStorage.setItem(key, JSON.stringify(parsed));
      return true;
    } catch {}
  }

  // Attempt 4: Fallback to sessionStorage so user workflow is never blocked
  if (useSessionFallback && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem(key, value);
      console.info(`[StorageGuard] Successfully persisted "${key}" to sessionStorage fallback.`);
      return true;
    } catch (sessionErr) {
      console.error(`[StorageGuard] sessionStorage fallback also failed for "${key}":`, sessionErr);
    }
  }

  return false;
}

/**
 * Safely reads from localStorage with sessionStorage fallback
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {}

  try {
    return sessionStorage.getItem(key);
  } catch {}

  return null;
}

/**
 * Safely removes a key from both localStorage and sessionStorage
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
