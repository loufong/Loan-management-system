import { UserRole } from '@prisma/client';

/**
 * Mask National / Student ID Number:
 * e.g., 'STU-ID-8849201' -> '***-**-9201'
 * e.g., '123456789' -> '***-**-6789'
 */
export function maskIdNumber(idNumber: string | null | undefined): string {
  if (!idNumber) return '';
  const clean = idNumber.trim();
  if (clean.length <= 4) return '****';
  const lastFour = clean.slice(-4);
  return `***-**-${lastFour}`;
}

/**
 * Mask Phone Number:
 * e.g., '+1-555-0201' -> '***-***-0201'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  const lastFour = clean.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Mask Email Address:
 * e.g., 'johnathan.doe@student.edu' -> 'j***e@student.edu'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `*@${domain}`;
  const first = user[0];
  const last = user[user.length - 1];
  return `${first}***${last}@${domain}`;
}

/**
 * Determines whether the viewing actor has clearance to view unmasked PII.
 * ADMIN, MANAGER, LOAN_OFFICER, or the borrower itself (isOwner) are permitted.
 */
export function hasPiiClearance(viewerRole: UserRole, isOwner = false): boolean {
  if (isOwner) return true;
  const privilegedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.LOAN_OFFICER, UserRole.CREDIT_OFFICER];
  return privilegedRoles.includes(viewerRole);
}

/**
 * Dynamically sanitizes sensitive borrower fields if viewer lacks PII clearance.
 */
export function sanitizeBorrowerPII<T extends Record<string, any>>(
  borrower: T,
  viewerRole: UserRole,
  isOwner = false
): T {
  if (hasPiiClearance(viewerRole, isOwner)) {
    return borrower;
  }

  const copy = { ...borrower } as any;

  if ('idNumber' in copy) {
    copy.idNumber = maskIdNumber(copy.idNumber);
  }
  if ('id_number' in copy) {
    copy.id_number = maskIdNumber(copy.id_number);
  }
  if ('phone' in copy) {
    copy.phone = maskPhone(copy.phone);
  }
  if ('address' in copy && typeof copy.address === 'string') {
    // Show only city/state or masked address
    copy.address = 'Confidential (Protected PII)';
  }

  return copy as T;
}

/**
 * Helper function maskSensitiveData(borrower, userRole) to mask National IDs (***-**-1234)
 * and phone numbers for non-privileged viewers.
 */
export function maskSensitiveData<T extends Record<string, any>>(
  borrower: T,
  userRole: UserRole | string,
  isOwner = false
): T {
  return sanitizeBorrowerPII(borrower, userRole as UserRole, isOwner);
}
