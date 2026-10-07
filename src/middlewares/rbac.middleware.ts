import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/response';
import { Permission, roleHasPermission } from '../security/permissions';
import { prisma } from '../config/prisma';

/**
 * Role-Based Access Control guard
 * Supports:
 * - checkRole(['ADMIN', 'MANAGER'])
 * - checkRole(UserRole.ADMIN, UserRole.MANAGER)
 */
export function checkRole(
  allowedRoles: (UserRole | string)[] | (UserRole | string),
  ...restRoles: (UserRole | string)[]
) {
  const rawRoles = (
    Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles, ...restRoles]
  ).map((r) => String(r).toUpperCase());

  const expandedAllowed = new Set<string>();
  for (const r of rawRoles) {
    expandedAllowed.add(r);
    if (r === 'ADMIN') {
      expandedAllowed.add('MANAGER');
    }
    if (r === 'MANAGER') {
      expandedAllowed.add('ADMIN');
    }
    if (r === 'USER') {
      expandedAllowed.add('BORROWER');
    }
    if (r === 'BORROWER') {
      expandedAllowed.add('USER');
    }
  }

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const userRole = String(req.user.role).toUpperCase();

    // ADMIN has full administrative permissions across all operations
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return next();
    }

    if (!expandedAllowed.has(userRole)) {
      sendError(
        res,
        'FORBIDDEN',
        'Access Denied: You do not have permission to access this page.',
        403
      );
      return;
    }

    next();
  };
}

// Backward-compatible alias
export const authorize = checkRole;

export function requireRole(roles: (UserRole | string)[] | (UserRole | string), ...moreRoles: (UserRole | string)[]) {
  return checkRole(roles, ...moreRoles);
}

/**
 * Permission-Based Access Control guard
 */
export function checkPermission(...requiredPermissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    // ADMIN has all permissions
    const userRole = String(req.user.role).toUpperCase();
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm) || roleHasPermission(req.user!.role, perm)
    );

    if (!hasAll) {
      sendError(
        res,
        'INSUFFICIENT_PERMISSIONS',
        `Access denied: required permission(s) missing: [${requiredPermissions.join(', ')}]`,
        403
      );
      return;
    }

    next();
  };
}

/**
 * Ensures normal users can only access their own borrower profile
 */
export async function enforceBorrowerProfileOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  // Admin can access all borrower records
  const userRole = String(req.user.role).toUpperCase();
  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    return next();
  }

  const borrowerIdOrParam = req.params.id || req.params.borrowerId;

  const borrower = await prisma.borrower.findUnique({
    where: { id: borrowerIdOrParam },
    select: { userId: true }
  });

  if (!borrower || borrower.userId !== req.user.id) {
    sendError(
      res,
      'FORBIDDEN_OWNERSHIP',
      'Access denied: you can only view and manage your own borrower profile',
      403
    );
    return;
  }

  next();
}
