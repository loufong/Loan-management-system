import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './user.validation';
import { ROLE_PERMISSIONS, getPermissionsForRole, Permission } from '../../security/permissions';
import { recordAuditLog } from '../../utils/audit';

export interface UserSummaryItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
}

export class UserService {
  /**
   * List users with optional search, role filter, status filter, and pagination
   */
  static async listUsers(query: QueryUserDto) {
    const { page, limit, search, role, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          position: true,
          department: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    const items: UserSummaryItem[] = users.map((u) => ({
      ...u,
      permissions: getPermissionsForRole(u.role)
    }));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single user by ID
   */
  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        department: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        borrowers: {
          select: {
            id: true,
            borrowerId: true,
            fullName: true,
            status: true
          }
        }
      }
    });

    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    return {
      ...user,
      permissions: getPermissionsForRole(user.role)
    };
  }

  /**
   * Create a new user with role assignment (Admin/Manager, Cashier, Borrower)
   */
  static async createUser(dto: CreateUserDto, actorId: string, ipAddress?: string) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }]
      }
    });

    if (existing) {
      const field = existing.email.toLowerCase() === dto.email.toLowerCase() ? 'Email' : 'Username';
      const err: any = new Error(`${field} is already registered to another account`);
      err.statusCode = 409;
      err.code = 'USER_ALREADY_EXISTS';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password || 'Password123!', salt);

    const newUser = await prisma.user.create({
      data: {
        username: dto.username.toLowerCase(),
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        status: dto.status || UserStatus.ACTIVE,
        phone: dto.phone || null,
        department: dto.department || null,
        position:
          dto.role === UserRole.MANAGER
            ? 'Administrator / Branch Manager'
            : dto.role === UserRole.CASHIER
            ? 'University Bursar & Cashier'
            : 'Academic Borrower'
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        department: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await recordAuditLog({
      userId: actorId,
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: newUser.id,
      details: {
        username: newUser.username,
        role: newUser.role,
        email: newUser.email
      },
      ipAddress
    }).catch(() => {});

    return {
      ...newUser,
      permissions: getPermissionsForRole(newUser.role)
    };
  }

  /**
   * Update user details and role
   */
  static async updateUser(id: string, dto: UpdateUserDto, actorId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() }
      });
      if (existing) {
        const err: any = new Error('Email is already registered by another account');
        err.statusCode = 409;
        err.code = 'EMAIL_IN_USE';
        throw err;
      }
    }

    const updateData: any = {};
    if (dto.fullName) updateData.fullName = dto.fullName;
    if (dto.email) updateData.email = dto.email.toLowerCase();
    if (dto.role) updateData.role = dto.role;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.status) updateData.status = dto.status;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        department: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await recordAuditLog({
      userId: actorId,
      action: 'USER_UPDATED',
      entityName: 'User',
      entityId: updated.id,
      details: {
        changes: updateData,
        newRole: updated.role,
        newStatus: updated.status
      },
      ipAddress
    }).catch(() => {});

    return {
      ...updated,
      permissions: getPermissionsForRole(updated.role)
    };
  }

  /**
   * Toggle user status (Activate / Deactivate)
   */
  static async toggleStatus(id: string, actorId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (user.id === actorId) {
      const err: any = new Error('Administrators cannot deactivate their own active account');
      err.statusCode = 400;
      err.code = 'SELF_DEACTIVATION_FORBIDDEN';
      throw err;
    }

    const nextStatus = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;

    const updated = await prisma.user.update({
      where: { id },
      data: { status: nextStatus },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    await recordAuditLog({
      userId: actorId,
      action: nextStatus === UserStatus.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityName: 'User',
      entityId: updated.id,
      details: { newStatus: nextStatus },
      ipAddress
    }).catch(() => {});

    return updated;
  }

  /**
   * Set user status directly (ACTIVE, INACTIVE, SUSPENDED)
   */
  static async setStatus(id: string, status: UserStatus, actorId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (user.id === actorId && status !== UserStatus.ACTIVE) {
      const err: any = new Error('Administrators cannot deactivate or suspend their own account');
      err.statusCode = 400;
      err.code = 'SELF_STATUS_CHANGE_FORBIDDEN';
      throw err;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    await recordAuditLog({
      userId: actorId,
      action: `USER_STATUS_${status}`,
      entityName: 'User',
      entityId: updated.id,
      details: { newStatus: status, previousStatus: user.status },
      ipAddress
    }).catch(() => {});

    return updated;
  }

  /**
   * Admin Reset User Password
   */
  static async resetPassword(id: string, newPassword = 'Password123!', actorId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await recordAuditLog({
      userId: actorId,
      action: 'ADMIN_RESET_PASSWORD',
      entityName: 'User',
      entityId: user.id,
      details: { username: user.username },
      ipAddress
    }).catch(() => {});

    return { success: true, message: `Password reset successfully for user ${user.username}` };
  }

  /**
   * Return the Role-Based Access Control matrix for the 3 core personas:
   * 1. Admin / Manager (MANAGER)
   * 2. Cashier (CASHIER)
   * 3. Borrower (BORROWER)
   */
  static getRolePermissionsMatrix() {
    return {
      roles: [
        {
          key: UserRole.MANAGER,
          name: 'Admin / Branch Manager',
          category: 'Executive & Governance',
          description:
            'Full administrative authority over the system, loan approvals, credit underwriting, borrower oversight, product catalogs, financial reporting, and user administration.',
          badgeColor: 'blue',
          permissionsCount: ROLE_PERMISSIONS[UserRole.MANAGER]?.length || 0,
          permissions: ROLE_PERMISSIONS[UserRole.MANAGER] || []
        },
        {
          key: UserRole.CASHIER,
          name: 'Desk Cashier & Bursar',
          category: 'Treasury & Operations',
          description:
            'Treasury operations, disbursement execution, payment receipt processing, multi-installment waterfall reconciliation, and overdue watchlist monitoring.',
          badgeColor: 'emerald',
          permissionsCount: ROLE_PERMISSIONS[UserRole.CASHIER]?.length || 0,
          permissions: ROLE_PERMISSIONS[UserRole.CASHIER] || []
        },
        {
          key: UserRole.BORROWER,
          name: 'Academic Borrower',
          category: 'Self-Service Client',
          description:
            'Self-service student/staff portal to submit loan applications, monitor approval progression, review amortization schedules, and track digital receipts.',
          badgeColor: 'amber',
          permissionsCount: ROLE_PERMISSIONS[UserRole.BORROWER]?.length || 0,
          permissions: ROLE_PERMISSIONS[UserRole.BORROWER] || []
        }
      ],
      allPermissions: Object.values(Permission)
    };
  }
}
