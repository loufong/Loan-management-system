import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response';
import { UserRole, UserStatus } from '@prisma/client';
import { Permission, getPermissionsForRole } from '../security/permissions';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  permissions: Permission[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'super-secure-academic-lms-jwt-secret-key-2026';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'super-secure-academic-lms-refresh-secret-key-2026';

export const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived 15 minutes
export const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Long-lived 7 days

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication token missing or malformed', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as {
      id: string;
      username: string;
      email: string;
      role: UserRole;
      permissions?: Permission[];
    };

    let user: any = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          fullName: true,
        },
      });
    } catch {
      // Fallback for offline environments using verified cryptographically signed JWT payload
      user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        status: UserStatus.ACTIVE,
        fullName: decoded.username,
      };
    }

    if (!user || user.status !== UserStatus.ACTIVE) {
      sendError(res, 'User account not found or inactive', 401, 'USER_INACTIVE');
      return;
    }

    const permissions = decoded.permissions || getPermissionsForRole(user.role);

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      permissions
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Access token expired. Please refresh token.', 401, 'TOKEN_EXPIRED');
      return;
    }
    sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
}

/**
 * Create a signed JWT token
 */
export function createToken(payload: object, expiresIn: string | number = ACCESS_TOKEN_EXPIRY): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: expiresIn as any });
}

/**
 * Verify a JWT token string
 */
export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

export const requireAuth = authenticate;

