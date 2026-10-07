import { prisma } from '../../config/prisma';
import { LoanStatus, UserRole, UserStatus } from '@prisma/client';
import { recordAuditLog } from '../../utils/audit';
import { sanitizeBorrowerPII } from '../../security/masking';
import { AuthUser } from '../../middlewares/auth.middleware';
import { CreateBorrowerInput, QueryBorrowerInput, UpdateBorrowerInput } from './borrower.validation';

export class BorrowerService {
  /**
   * Auto-generate unique sequential Borrower ID formatted as BOR-YYYY-XXXX
   */
  public static async generateBorrowerId(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await prisma.borrower.count();
    return `BOR-${currentYear}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * List Borrowers with comprehensive multi-field search and PII masking
   */
  static async listBorrowers(query: QueryBorrowerInput, viewer: AuthUser) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Strict security constraint: BORROWER can only view their own profile
    if (viewer.role === UserRole.BORROWER) {
      where.userId = viewer.id;
    } else {
      if (query.status) {
        where.status = query.status;
      }
      if (query.borrowerId) {
        where.borrowerId = { contains: query.borrowerId, mode: 'insensitive' };
      }
      if (query.fullName) {
        where.fullName = { contains: query.fullName, mode: 'insensitive' };
      }
      if (query.phone) {
        where.phone = { contains: query.phone, mode: 'insensitive' };
      }
      if (query.email) {
        where.email = { contains: query.email, mode: 'insensitive' };
      }
      if (query.idNumber) {
        where.idNumber = { contains: query.idNumber, mode: 'insensitive' };
      }

      // General query across multiple fields
      if (query.search) {
        where.OR = [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { borrowerId: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
          { idNumber: { contains: query.search, mode: 'insensitive' } }
        ];
      }
    }

    // Normal users can only see their own borrower profile
    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER) {
      where.userId = viewer.id;
    }

    const orderBy = { [query.sortBy]: query.sortOrder };

    const [total, items] = await Promise.all([
      prisma.borrower.count({ where }),
      prisma.borrower.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { id: true, username: true, role: true, status: true }
          },
          _count: {
            select: { applications: true, loans: true }
          }
        }
      })
    ]);

    // Apply sensitive data masking
    const sanitizedItems = items.map((borrower) => {
      const isOwner = borrower.userId === viewer.id;
      return sanitizeBorrowerPII(borrower, viewer.role, isOwner);
    });

    return {
      items: sanitizedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get borrower profile including applications, active loans, and aggregated payment history
   */
  static async getBorrowerById(id: string, viewer: AuthUser) {
    const borrower = await prisma.borrower.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true, role: true, status: true }
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, productName: true, interestRate: true } }
          }
        },
        loans: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, productName: true } },
            repaymentSchedules: {
              orderBy: { installmentNo: 'asc' }
            }
          }
        }
      }
    });

    if (!borrower) {
      throw { statusCode: 404, message: 'Borrower record not found', code: 'BORROWER_NOT_FOUND' };
    }

    const isOwner = borrower.userId === viewer.id;

    // Strict constraint: Normal user cannot view other borrowers' profiles!
    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER && !isOwner) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view your own borrower profile',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    // Fetch associated KYC documents
    const documents = await prisma.loanDocument.findMany({
      where: {
        entityType: 'BORROWER',
        entityId: borrower.id
      }
    });

    // Aggregate payment history across all of borrower's loans
    const loanIds = borrower.loans.map((l) => l.id);
    const paymentHistory = await prisma.payment.findMany({
      where: {
        loanId: { in: loanIds }
      },
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: {
          select: { loanNumber: true }
        },
        receivedByUser: {
          select: { fullName: true }
        }
      }
    });

    // Active loans breakdown
    const activeLoans = borrower.loans.filter(
      (l) => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE
    );

    const totalBorrowed = borrower.loans.reduce((sum, l) => sum + Number(l.principalAmount), 0);
    const totalRepaid = borrower.loans.reduce((sum, l) => sum + Number(l.totalPaid), 0);

    const fullProfile = {
      ...borrower,
      activeLoans,
      activeLoansCount: activeLoans.length,
      totalBorrowed,
      totalRepaid,
      loanApplications: borrower.applications,
      documents,
      paymentHistory
    };

    return sanitizeBorrowerPII(fullProfile, viewer.role, isOwner);
  }

  /**
   * Onboard / Create a new borrower with auto-generated ID
   */
  static async createBorrower(dto: CreateBorrowerInput, createdById: string, ipAddress?: string) {
    // Check for duplicate ID Number or Email
    const existing = await prisma.borrower.findFirst({
      where: {
        OR: [
          { idNumber: dto.idNumber },
          { email: dto.email }
        ]
      }
    });

    if (existing) {
      throw {
        statusCode: 409,
        message: existing.idNumber === dto.idNumber
          ? `A borrower with ID number '${dto.idNumber}' is already registered.`
          : `A borrower with email '${dto.email}' is already registered.`,
        code: 'DUPLICATE_BORROWER'
      };
    }

    const borrowerId = await this.generateBorrowerId();

    const borrower = await prisma.borrower.create({
      data: {
        borrowerId,
        userId: dto.userId || null,
        fullName: dto.fullName,
        gender: dto.gender,
        dob: new Date(dto.dob),
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        occupation: dto.occupation,
        monthlyIncome: dto.monthlyIncome,
        idNumber: dto.idNumber,
        status: UserStatus.ACTIVE
      }
    });

    await recordAuditLog({
      userId: createdById,
      action: 'CREATE_BORROWER',
      entityName: 'Borrower',
      entityId: borrower.id,
      details: { borrowerId: borrower.borrowerId, name: borrower.fullName },
      ipAddress
    });

    return borrower;
  }

  /**
   * Update borrower profile
   */
  static async updateBorrower(
    id: string,
    dto: UpdateBorrowerInput,
    viewer: AuthUser,
    ipAddress?: string
  ) {
    const existing = await prisma.borrower.findUnique({ where: { id } });
    if (!existing) {
      throw { statusCode: 404, message: 'Borrower record not found', code: 'BORROWER_NOT_FOUND' };
    }

    if (viewer.role !== UserRole.ADMIN && viewer.role !== UserRole.MANAGER && existing.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only update your own borrower profile',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    // Duplicate check if email or idNumber updated
    if (dto.idNumber || dto.email) {
      const duplicate = await prisma.borrower.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.idNumber ? [{ idNumber: dto.idNumber }] : []),
            ...(dto.email ? [{ email: dto.email }] : [])
          ]
        }
      });
      if (duplicate) {
        throw {
          statusCode: 409,
          message: 'Another borrower already holds this ID number or email address.',
          code: 'DUPLICATE_BORROWER'
        };
      }
    }

    const updated = await prisma.borrower.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.dob && { dob: new Date(dto.dob) }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.email && { email: dto.email }),
        ...(dto.address && { address: dto.address }),
        ...(dto.occupation && { occupation: dto.occupation }),
        ...(dto.monthlyIncome !== undefined && { monthlyIncome: dto.monthlyIncome }),
        ...(dto.idNumber && { idNumber: dto.idNumber }),
        ...(dto.userId && { userId: dto.userId })
      }
    });

    await recordAuditLog({
      userId: viewer.id,
      action: 'UPDATE_BORROWER',
      entityName: 'Borrower',
      entityId: updated.id,
      details: { changes: dto },
      ipAddress
    });

    const isOwner = updated.userId === viewer.id;
    return sanitizeBorrowerPII(updated, viewer.role, isOwner);
  }

  /**
   * Deactivate / Delete Borrower
   * Policy: Cannot deactivate if borrower has active or overdue loans.
   */
  static async deactivateBorrower(id: string, viewer: AuthUser, ipAddress?: string) {
    const borrower = await prisma.borrower.findUnique({
      where: { id },
      include: {
        loans: {
          where: {
            status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.PENDING] }
          }
        }
      }
    });

    if (!borrower) {
      throw { statusCode: 404, message: 'Borrower record not found', code: 'BORROWER_NOT_FOUND' };
    }

    if (borrower.loans.length > 0) {
      throw {
        statusCode: 400,
        message: `Cannot deactivate borrower '${borrower.fullName}' (${borrower.borrowerId}). Borrower has ${borrower.loans.length} unsettled or pending loans.`,
        code: 'ACTIVE_LOANS_EXIST'
      };
    }

    const deactivated = await prisma.borrower.update({
      where: { id },
      data: { status: UserStatus.INACTIVE }
    });

    await recordAuditLog({
      userId: viewer.id,
      action: 'DEACTIVATE_BORROWER',
      entityName: 'Borrower',
      entityId: id,
      details: { borrowerId: borrower.borrowerId, previousStatus: borrower.status },
      ipAddress
    });

    return {
      message: `Borrower '${borrower.fullName}' (${borrower.borrowerId}) has been deactivated successfully.`,
      borrower: deactivated
    };
  }
}
