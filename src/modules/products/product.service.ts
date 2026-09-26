import { prisma } from '../../config/prisma';
import { Prisma, UserStatus } from '@prisma/client';
import { recordAuditLog } from '../../utils/audit';
import { calculateSimpleInterestLoanSchedule } from '../../types/loan.types';
import { CreateProductInput, QueryProductInput, UpdateProductInput } from './product.validation';

export class ProductService {
  /**
   * Create a new loan product
   */
  static async createProduct(dto: CreateProductInput, createdById: string, ipAddress?: string) {
    const existing = await prisma.loanProduct.findUnique({
      where: { productName: dto.productName }
    });

    if (existing) {
      throw {
        statusCode: 409,
        message: `A loan product named '${dto.productName}' already exists.`,
        code: 'DUPLICATE_PRODUCT'
      };
    }

    const product = await prisma.loanProduct.create({
      data: {
        productName: dto.productName,
        minAmount: new Prisma.Decimal(dto.minAmount),
        maxAmount: new Prisma.Decimal(dto.maxAmount),
        interestRate: new Prisma.Decimal(dto.interestRate),
        minTerm: dto.minTerm,
        maxTerm: dto.maxTerm,
        repaymentFrequency: dto.repaymentFrequency,
        description: dto.description || null,
        status: dto.status
      }
    });

    await recordAuditLog({
      userId: createdById,
      action: 'CREATE_LOAN_PRODUCT',
      entityName: 'LoanProduct',
      entityId: product.id,
      details: {
        productName: product.productName,
        interestRate: dto.interestRate,
        amountRange: `$${dto.minAmount} - $${dto.maxAmount}`,
        termRange: `${dto.minTerm} - ${dto.maxTerm} months`
      },
      ipAddress
    });

    return product;
  }

  /**
   * List loan products with advanced search, range filters, and pagination
   */
  static async listProducts(query: QueryProductInput) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.productName) {
      where.productName = { contains: query.productName, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { productName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    if (query.repaymentFrequency) {
      where.repaymentFrequency = query.repaymentFrequency;
    }

    // Filter by amount eligibility: products that can accommodate the specified amount
    if (query.minAmount !== undefined) {
      where.maxAmount = { gte: new Prisma.Decimal(query.minAmount) };
    }
    if (query.maxAmount !== undefined) {
      where.minAmount = { lte: new Prisma.Decimal(query.maxAmount) };
    }

    // Filter by interest rate range
    if (query.minInterestRate !== undefined || query.maxInterestRate !== undefined) {
      where.interestRate = {};
      if (query.minInterestRate !== undefined) {
        where.interestRate.gte = new Prisma.Decimal(query.minInterestRate);
      }
      if (query.maxInterestRate !== undefined) {
        where.interestRate.lte = new Prisma.Decimal(query.maxInterestRate);
      }
    }

    // Filter by term suitability
    if (query.term !== undefined) {
      where.minTerm = { lte: query.term };
      where.maxTerm = { gte: query.term };
    }

    const [total, items] = await Promise.all([
      prisma.loanProduct.count({ where }),
      prisma.loanProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { productName: 'asc' },
        include: {
          _count: {
            select: { applications: true, loans: true }
          }
        }
      })
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get loan product by ID with analytics
   */
  static async getProductById(id: string) {
    const product = await prisma.loanProduct.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            applications: true,
            loans: true
          }
        }
      }
    });

    if (!product) {
      throw { statusCode: 404, message: 'Loan product not found', code: 'PRODUCT_NOT_FOUND' };
    }

    return product;
  }

  /**
   * Update loan product details
   */
  static async updateProduct(
    id: string,
    dto: UpdateProductInput,
    updatedById: string,
    ipAddress?: string
  ) {
    const existing = await prisma.loanProduct.findUnique({ where: { id } });
    if (!existing) {
      throw { statusCode: 404, message: 'Loan product not found', code: 'PRODUCT_NOT_FOUND' };
    }

    if (dto.productName && dto.productName !== existing.productName) {
      const duplicate = await prisma.loanProduct.findUnique({
        where: { productName: dto.productName }
      });
      if (duplicate) {
        throw {
          statusCode: 409,
          message: `A loan product named '${dto.productName}' already exists.`,
          code: 'DUPLICATE_PRODUCT'
        };
      }
    }

    const updated = await prisma.loanProduct.update({
      where: { id },
      data: {
        ...(dto.productName && { productName: dto.productName }),
        ...(dto.minAmount !== undefined && { minAmount: new Prisma.Decimal(dto.minAmount) }),
        ...(dto.maxAmount !== undefined && { maxAmount: new Prisma.Decimal(dto.maxAmount) }),
        ...(dto.interestRate !== undefined && { interestRate: new Prisma.Decimal(dto.interestRate) }),
        ...(dto.minTerm !== undefined && { minTerm: dto.minTerm }),
        ...(dto.maxTerm !== undefined && { maxTerm: dto.maxTerm }),
        ...(dto.repaymentFrequency && { repaymentFrequency: dto.repaymentFrequency }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status })
      }
    });

    await recordAuditLog({
      userId: updatedById,
      action: 'UPDATE_LOAN_PRODUCT',
      entityName: 'LoanProduct',
      entityId: id,
      details: { changes: dto },
      ipAddress
    });

    return updated;
  }

  /**
   * Toggle or set status (ACTIVE ↔ INACTIVE)
   */
  static async toggleProductStatus(
    id: string,
    forcedStatus?: UserStatus,
    updatedById?: string,
    ipAddress?: string
  ) {
    const existing = await prisma.loanProduct.findUnique({ where: { id } });
    if (!existing) {
      throw { statusCode: 404, message: 'Loan product not found', code: 'PRODUCT_NOT_FOUND' };
    }

    const nextStatus = forcedStatus
      ? forcedStatus
      : existing.status === UserStatus.ACTIVE
      ? UserStatus.INACTIVE
      : UserStatus.ACTIVE;

    const updated = await prisma.loanProduct.update({
      where: { id },
      data: { status: nextStatus }
    });

    await recordAuditLog({
      userId: updatedById,
      action: 'TOGGLE_PRODUCT_STATUS',
      entityName: 'LoanProduct',
      entityId: id,
      details: {
        productName: existing.productName,
        previousStatus: existing.status,
        newStatus: nextStatus
      },
      ipAddress
    });

    return {
      message: `Product '${existing.productName}' status changed to ${nextStatus}.`,
      product: updated
    };
  }

  /**
   * Calculate amortization schedule preview
   */
  static calculateAmortization(principal: number, annualInterestRate: number, termMonths: number) {
    return calculateSimpleInterestLoanSchedule({
      principal,
      annualInterestRate,
      termMonths
    });
  }
}
