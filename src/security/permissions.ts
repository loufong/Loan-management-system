import { UserRole } from '@prisma/client';

export enum Permission {
  // Borrowers
  BORROWER_READ = 'borrower:read',
  BORROWER_READ_ALL = 'borrower:read_all',
  BORROWER_CREATE = 'borrower:create',
  BORROWER_UPDATE = 'borrower:update',

  // Loan Applications
  APPLICATION_READ_OWN = 'application:read_own',
  APPLICATION_READ_ALL = 'application:read_all',
  APPLICATION_CREATE_OWN = 'application:create_own',
  APPLICATION_CREATE_ANY = 'application:create_any',
  APPLICATION_REVIEW = 'application:review',
  APPLICATION_APPROVE = 'application:approve',

  // Loans
  LOAN_READ_OWN = 'loan:read_own',
  LOAN_READ_ALL = 'loan:read_all',
  LOAN_DISBURSE = 'loan:disburse',

  // Payments
  PAYMENT_READ_OWN = 'payment:read_own',
  PAYMENT_READ_ALL = 'payment:read_all',
  PAYMENT_COLLECT = 'payment:collect',

  // Documents
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_VERIFY = 'document:verify',
  DOCUMENT_READ = 'document:read',

  // Dashboard & System Administration
  DASHBOARD_VIEW = 'dashboard:view',
  AUDIT_VIEW = 'audit:view',
  USER_MANAGE = 'user:manage',
  SYSTEM_CONFIG = 'system:config'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.MANAGER]: Object.values(Permission),

  [UserRole.LOAN_OFFICER]: [
    Permission.BORROWER_READ_ALL,
    Permission.BORROWER_CREATE,
    Permission.BORROWER_UPDATE,
    Permission.APPLICATION_READ_ALL,
    Permission.APPLICATION_CREATE_ANY,
    Permission.APPLICATION_REVIEW,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_VERIFY,
    Permission.DOCUMENT_READ,
    Permission.LOAN_READ_ALL,
    Permission.DASHBOARD_VIEW
  ],

  [UserRole.CASHIER]: [
    Permission.BORROWER_READ_ALL,
    Permission.LOAN_READ_ALL,
    Permission.LOAN_DISBURSE,
    Permission.PAYMENT_COLLECT,
    Permission.PAYMENT_READ_ALL,
    Permission.DOCUMENT_READ,
    Permission.DASHBOARD_VIEW
  ],

  [UserRole.BORROWER]: [
    Permission.BORROWER_READ,
    Permission.APPLICATION_READ_OWN,
    Permission.APPLICATION_CREATE_OWN,
    Permission.LOAN_READ_OWN,
    Permission.PAYMENT_READ_OWN,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_READ
  ]
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
