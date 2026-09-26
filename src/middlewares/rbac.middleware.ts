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
  const rolesArray: string[] = (
    Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles, ...restRoles]
  ).map((r) => String(r));

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!rolesArray.includes(req.user.role)) {
      sendError(
        res,
        'FORBIDDEN',
        `Access denied: role '${req.user.role}' is not authorized to access this resource`,
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
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm) || roleHasPermission(req.user!.role, perm)
    );

    if (!hasAll) {
      sendError(
        res,
        `Access denied: required permission(s) missing: [${requiredPermissions.join(', ')}]`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
      return;
    }

    next();
  };
}

/**
 * Ensures BORROWER users can only access their own borrower profile
 */
export async function enforceBorrowerProfileOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    return;
  }

  // Staff roles can access borrower records per their role permissions
  if (req.user.role !== UserRole.BORROWER) {
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
      'Access denied: you can only view and manage your own borrower profile',
      403,
      'FORBIDDEN_OWNERSHIP'
    );
    return;
  }

  next();
}
