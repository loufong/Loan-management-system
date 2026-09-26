import { prisma } from '../../config/prisma';
import {
  ApplicationStatus,
  ReviewRecommendation,
  ApprovalDecision,
  LoanStatus,
  Prisma,
  UserRole
} from '@prisma/client';
import { recordAuditLog } from '../../utils/audit';
import { AuthUser } from '../../middlewares/auth.middleware';
import { LoanCalculatorService } from '../calculator/loan-calculator.service';

export interface ApplicationInputDto {
  borrowerId: string;
  productId: string;
  requestedAmount: number;
  requestedTerm: number;
  purpose: string;
  monthlyIncome?: number;
  supportingInfo?: string;
  isDraft?: boolean;
  viewer: AuthUser;
  ipAddress?: string;
}

export interface ReviewApplicationDto {
  applicationId: string;
  reviewerId: string;
  recommendation: ReviewRecommendation;
  notes: string;
  ipAddress?: string;
}

export interface ApproveApplicationDto {
  applicationId: string;
  approverId: string;
  decision: ApprovalDecision;
  approvedAmount?: number;
  approvedTerm?: number;
  approvedInterestRate?: number;
  rejectionReason?: string;
  note?: string;
  ipAddress?: string;
}

export class ApplicationService {
  /**
   * Helper to validate application parameters against product limits
   */
  private static async validateProductLimits(productId: string, amount: number, term: number) {
    const product = await prisma.loanProduct.findUnique({ where: { id: productId } });
    if (!product) {
      throw { statusCode: 404, message: 'Loan product not found', code: 'PRODUCT_NOT_FOUND' };
    }

    const minAmt = Number(product.minAmount);
    const maxAmt = Number(product.maxAmount);
    if (amount < minAmt || amount > maxAmt) {
      throw {
        statusCode: 400,
        message: `Requested amount must be between $${minAmt.toLocaleString()} and $${maxAmt.toLocaleString()}`,
        code: 'AMOUNT_OUT_OF_RANGE'
      };
    }

    if (term < product.minTerm || term > product.maxTerm) {
      throw {
        statusCode: 400,
        message: `Requested term must be between ${product.minTerm} and ${product.maxTerm} months`,
        code: 'TERM_OUT_OF_RANGE'
      };
    }

    return product;
  }

  /**
   * Generate next application number APP-YYYY-XXXX
   */
  public static async generateApplicationNo(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await prisma.loanApplication.count();
    return `APP-${currentYear}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * 1. Save Application as DRAFT
   */
  static async saveDraft(dto: ApplicationInputDto) {
    const borrower = await prisma.borrower.findUnique({ where: { id: dto.borrowerId } });
    if (!borrower) {
      throw { statusCode: 404, message: 'Borrower not found', code: 'BORROWER_NOT_FOUND' };
    }

    if (dto.viewer.role === UserRole.BORROWER && borrower.userId !== dto.viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: borrowers can only create applications for themselves',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    await this.validateProductLimits(dto.productId, dto.requestedAmount, dto.requestedTerm);
    const applicationNo = await this.generateApplicationNo();
    const monthlyIncome = dto.monthlyIncome !== undefined ? dto.monthlyIncome : Number(borrower.monthlyIncome);

    const app = await prisma.$transaction(async (tx) => {
      const created = await tx.loanApplication.create({
        data: {
          applicationNo,
          borrowerId: dto.borrowerId,
          productId: dto.productId,
          requestedAmount: new Prisma.Decimal(dto.requestedAmount),
          requestedTerm: dto.requestedTerm,
          purpose: dto.purpose,
          monthlyIncome: new Prisma.Decimal(monthlyIncome),
          supportingInfo: dto.supportingInfo || null,
          status: ApplicationStatus.DRAFT,
          createdBy: dto.viewer.id
        },
        include: { borrower: true, product: true }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: created.id,
          previousStatus: null,
          newStatus: ApplicationStatus.DRAFT,
          changedBy: dto.viewer.id,
          note: 'Application initiated and saved as Draft.'
        }
      });

      return created;
    });

    await recordAuditLog({
      userId: dto.viewer.id,
      action: 'SAVE_APPLICATION_DRAFT',
      entityName: 'LoanApplication',
      entityId: app.id,
      details: { applicationNo: app.applicationNo, status: 'DRAFT' },
      ipAddress: dto.ipAddress
    });

    return app;
  }

  /**
   * 2. Update existing DRAFT
   */
  static async updateDraft(id: string, dto: Partial<ApplicationInputDto>, viewer: AuthUser, ipAddress?: string) {
    const app = await prisma.loanApplication.findUnique({
      where: { id },
      include: { borrower: true }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    if (app.status !== ApplicationStatus.DRAFT) {
      throw {
        statusCode: 400,
        message: `Cannot edit application with status '${app.status}'. Only DRAFT applications can be modified.`,
        code: 'NOT_A_DRAFT'
      };
    }

    if (viewer.role === UserRole.BORROWER && app.borrower.userId !== viewer.id) {
      throw { statusCode: 403, message: 'Access denied: not your application', code: 'FORBIDDEN_OWNERSHIP' };
    }

    const productId = dto.productId || app.productId;
    const requestedAmount = dto.requestedAmount || Number(app.requestedAmount);
    const requestedTerm = dto.requestedTerm || app.requestedTerm;

    await this.validateProductLimits(productId, requestedAmount, requestedTerm);

    const updated = await prisma.loanApplication.update({
      where: { id },
      data: {
        productId,
        requestedAmount: new Prisma.Decimal(requestedAmount),
        requestedTerm,
        ...(dto.purpose && { purpose: dto.purpose }),
        ...(dto.monthlyIncome && { monthlyIncome: new Prisma.Decimal(dto.monthlyIncome) }),
        ...(dto.supportingInfo !== undefined && { supportingInfo: dto.supportingInfo })
      },
      include: { borrower: true, product: true }
    });

    await recordAuditLog({
      userId: viewer.id,
      action: 'UPDATE_APPLICATION_DRAFT',
      entityName: 'LoanApplication',
      entityId: id,
      details: { applicationNo: app.applicationNo },
      ipAddress
    });

    return updated;
  }

  /**
   * 3. Submit Application (from Draft or directly)
   */
  static async submitApplication(dto: ApplicationInputDto, existingId?: string) {
    let application;

    if (existingId) {
      // Transition from DRAFT to SUBMITTED
      const existing = await prisma.loanApplication.findUnique({
        where: { id: existingId },
        include: { borrower: true, product: true }
      });
      if (!existing) {
        throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
      }
      if (existing.status !== ApplicationStatus.DRAFT) {
        throw { statusCode: 400, message: `Application status is already '${existing.status}'`, code: 'INVALID_STATUS' };
      }

      application = await prisma.$transaction(async (tx) => {
        const submitted = await tx.loanApplication.update({
          where: { id: existingId },
          data: { status: ApplicationStatus.SUBMITTED },
          include: { borrower: true, product: true }
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId: existingId,
            previousStatus: ApplicationStatus.DRAFT,
            newStatus: ApplicationStatus.SUBMITTED,
            changedBy: dto.viewer.id,
            note: 'Draft finalized and submitted for credit assessment.'
          }
        });

        // Automated notification
        if (submitted.borrower.userId) {
          await tx.notification.create({
            data: {
              userId: submitted.borrower.userId,
              title: `Application Submitted: ${submitted.applicationNo}`,
              message: `Your loan application for $${Number(submitted.requestedAmount).toLocaleString()} has been submitted.`,
              type: 'APPLICATION_SUBMITTED'
            }
          });
        }

        return submitted;
      });
    } else {
      // Direct submission
      const borrower = await prisma.borrower.findUnique({ where: { id: dto.borrowerId } });
      if (!borrower) {
        throw { statusCode: 404, message: 'Borrower not found', code: 'BORROWER_NOT_FOUND' };
      }

      if (dto.viewer.role === UserRole.BORROWER && borrower.userId !== dto.viewer.id) {
        throw {
          statusCode: 403,
          message: 'Access denied: borrowers can only submit applications for their own profile',
          code: 'FORBIDDEN_OWNERSHIP'
        };
      }

      const product = await this.validateProductLimits(dto.productId, dto.requestedAmount, dto.requestedTerm);
      const applicationNo = await this.generateApplicationNo();
      const monthlyIncome = dto.monthlyIncome !== undefined ? dto.monthlyIncome : Number(borrower.monthlyIncome);

      application = await prisma.$transaction(async (tx) => {
        const app = await tx.loanApplication.create({
          data: {
            applicationNo,
            borrowerId: dto.borrowerId,
            productId: dto.productId,
            requestedAmount: new Prisma.Decimal(dto.requestedAmount),
            requestedTerm: dto.requestedTerm,
            purpose: dto.purpose,
            monthlyIncome: new Prisma.Decimal(monthlyIncome),
            supportingInfo: dto.supportingInfo || null,
            status: ApplicationStatus.SUBMITTED,
            createdBy: dto.viewer.id
          },
          include: { borrower: true, product: true }
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            previousStatus: null,
            newStatus: ApplicationStatus.SUBMITTED,
            changedBy: dto.viewer.id,
            note: 'Loan application submitted for credit assessment.'
          }
        });

        if (borrower.userId) {
          await tx.notification.create({
            data: {
              userId: borrower.userId,
              title: `Application Submitted: ${app.applicationNo}`,
              message: `Your loan application for $${dto.requestedAmount.toLocaleString()} has been received.`,
              type: 'APPLICATION_SUBMITTED'
            }
          });
        }

        return app;
      });
    }

    await recordAuditLog({
      userId: dto.viewer.id,
      action: 'SUBMIT_LOAN_APPLICATION',
      entityName: 'LoanApplication',
      entityId: application.id,
      details: { applicationNo: application.applicationNo, amount: dto.requestedAmount },
      ipAddress: dto.ipAddress
    });

    return application;
  }

  /**
   * 4. Application Confirmation Preview (Payload showing all summary details before final submit)
   */
  static async getConfirmationPreview(id: string, viewer: AuthUser) {
    const app = await prisma.loanApplication.findUnique({
      where: { id },
      include: { borrower: true, product: true }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    if (viewer.role === UserRole.BORROWER && app.borrower.userId !== viewer.id) {
      throw { statusCode: 403, message: 'Access denied: not your application', code: 'FORBIDDEN_OWNERSHIP' };
    }

    const principal = Number(app.requestedAmount);
    const rate = Number(app.product.interestRate);
    const term = app.requestedTerm;

    const calculation = LoanCalculatorService.calculateSimpleInterest({
      principal,
      annualInterestRate: rate,
      termMonths: term,
      repaymentFrequency: app.product.repaymentFrequency
    });

    const dtiSimulation = this.calculateDti(Number(app.monthlyIncome), calculation.installmentAmount);

    return {
      applicationSummary: {
        applicationId: app.id,
        applicationNo: app.applicationNo,
        status: app.status,
        createdAt: app.createdAt
      },
      borrower: {
        id: app.borrower.id,
        borrowerId: app.borrower.borrowerId,
        fullName: app.borrower.fullName,
        email: app.borrower.email,
        phone: app.borrower.phone,
        occupation: app.borrower.occupation,
        monthlyIncome: Number(app.monthlyIncome)
      },
      product: {
        id: app.product.id,
        productName: app.product.productName,
        interestRate: rate,
        repaymentFrequency: app.product.repaymentFrequency
      },
      financialTerms: {
        requestedAmount: principal,
        requestedTermMonths: term,
        estimatedTotalInterest: calculation.totalInterest,
        estimatedTotalRepayment: calculation.totalRepayment,
        installmentCount: calculation.installmentCount,
        estimatedMonthlyInstallment: calculation.installmentAmount
      },
      underwritingPreliminaryCheck: dtiSimulation
    };
  }

  /**
   * Helper: Calculate Debt-to-Income (DTI) ratio & assign risk category
   */
  public static calculateDti(monthlyIncome: number, monthlyInstallment: number) {
    if (monthlyIncome <= 0) {
      return {
        dtiPercentage: 100.0,
        riskLevel: 'HIGH_RISK',
        recommendationGuidance: 'Borrower declares $0 monthly income; requires guarantor or formal income verification.'
      };
    }

    const dtiPercentage = LoanCalculatorService.round2((monthlyInstallment / monthlyIncome) * 100);

    let riskLevel: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
    let recommendationGuidance: string;

    if (dtiPercentage <= 25.0) {
      riskLevel = 'LOW_RISK';
      recommendationGuidance = 'Favorable DTI (<= 25%). Strong financial capacity; recommend approval.';
    } else if (dtiPercentage <= 40.0) {
      riskLevel = 'MEDIUM_RISK';
      recommendationGuidance = 'Moderate DTI (25% - 40%). Acceptable risk profile; verify employment tenure.';
    } else {
      riskLevel = 'HIGH_RISK';
      recommendationGuidance = 'Elevated DTI (> 40%). Debt burden exceeds prudent lending caps; caution advised.';
    }

    return {
      monthlyIncome,
      estimatedMonthlyInstallment: monthlyInstallment,
      dtiPercentage,
      riskLevel,
      recommendationGuidance
    };
  }

  /**
   * 5. Credit Assessment Simulation endpoint for Reviewers
   */
  static async simulateCreditAssessment(id: string) {
    const app = await prisma.loanApplication.findUnique({
      where: { id },
      include: { product: true }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    const calculation = LoanCalculatorService.calculateSimpleInterest({
      principal: Number(app.requestedAmount),
      annualInterestRate: Number(app.product.interestRate),
      termMonths: app.requestedTerm,
      repaymentFrequency: app.product.repaymentFrequency
    });

    return this.calculateDti(Number(app.monthlyIncome), calculation.installmentAmount);
  }

  /**
   * 6. Credit Review & Underwriting Recommendation
   */
  static async reviewApplication(dto: ReviewApplicationDto) {
    const app = await prisma.loanApplication.findUnique({
      where: { id: dto.applicationId },
      include: { borrower: true, product: true }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    if (app.status !== ApplicationStatus.SUBMITTED && app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw {
        statusCode: 400,
        message: `Cannot review application with status '${app.status}'.`,
        code: 'INVALID_STATUS'
      };
    }

    // Automatically compute Debt-to-Income (DTI) ratio: (estimatedMonthlyInstallment / borrower.monthlyIncome) * 100
    const calculation = LoanCalculatorService.calculateSimpleInterest({
      principal: Number(app.requestedAmount),
      annualInterestRate: Number(app.product.interestRate),
      termMonths: app.requestedTerm,
      repaymentFrequency: app.product.repaymentFrequency
    });
    const dtiAssessment = this.calculateDti(Number(app.monthlyIncome), calculation.installmentAmount);

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.applicationReview.create({
        data: {
          applicationId: dto.applicationId,
          reviewerId: dto.reviewerId,
          recommendation: dto.recommendation,
          notes: dto.notes
        }
      });

      await tx.loanApplication.update({
        where: { id: dto.applicationId },
        data: { status: ApplicationStatus.UNDER_REVIEW }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: dto.applicationId,
          previousStatus: app.status,
          newStatus: ApplicationStatus.UNDER_REVIEW,
          changedBy: dto.reviewerId,
          note: `Credit review submitted (${dto.recommendation}): ${dto.notes}. Computed DTI: ${dtiAssessment.dtiPercentage}% (${dtiAssessment.riskLevel})`
        }
      });

      if (app.borrower.userId) {
        await tx.notification.create({
          data: {
            userId: app.borrower.userId,
            title: `Application Under Review: ${app.applicationNo}`,
            message: `Your application ${app.applicationNo} is currently being assessed by our credit appraisal team.`,
            type: 'APPLICATION_UNDER_REVIEW'
          }
        });
      }

      return {
        ...review,
        computedDti: dtiAssessment.dtiPercentage,
        creditAssessment: dtiAssessment,
        applicationStatus: ApplicationStatus.UNDER_REVIEW
      };
    });

    await recordAuditLog({
      userId: dto.reviewerId,
      action: 'REVIEW_LOAN_APPLICATION',
      entityName: 'ApplicationReview',
      entityId: result.id,
      details: {
        recommendation: dto.recommendation,
        applicationId: dto.applicationId,
        computedDti: dtiAssessment.dtiPercentage,
        riskLevel: dtiAssessment.riskLevel
      },
      ipAddress: dto.ipAddress
    });

    return result;
  }

  /**
   * 7. Committee Approval / Rejection (Manager / Admin)
   */
  static async approveOrReject(dto: ApproveApplicationDto) {
    const app = await prisma.loanApplication.findUnique({
      where: { id: dto.applicationId },
      include: { borrower: true, product: true }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    if (app.status !== ApplicationStatus.SUBMITTED && app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw {
        statusCode: 400,
        message: `Application with status '${app.status}' cannot be decided upon. Must be SUBMITTED or UNDER_REVIEW.`,
        code: 'INVALID_APPLICATION_STATUS'
      };
    }

    const isApproval = dto.decision === ApprovalDecision.APPROVED;
    const finalStatus = isApproval ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;

    if (!isApproval && (!dto.rejectionReason || !dto.rejectionReason.trim())) {
      throw {
        statusCode: 400,
        message: 'A mandatory rejection reason is required when rejecting an application',
        code: 'REJECTION_REASON_REQUIRED'
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const approval = await tx.applicationApproval.create({
        data: {
          applicationId: dto.applicationId,
          approverId: dto.approverId,
          decision: dto.decision,
          approvedAmount: dto.approvedAmount ? new Prisma.Decimal(dto.approvedAmount) : null,
          approvedTerm: dto.approvedTerm || null,
          approvedInterestRate: dto.approvedInterestRate ? new Prisma.Decimal(dto.approvedInterestRate) : null,
          rejectionReason: dto.rejectionReason || null
        }
      });

      await tx.loanApplication.update({
        where: { id: dto.applicationId },
        data: { status: finalStatus }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: dto.applicationId,
          previousStatus: app.status,
          newStatus: finalStatus,
          changedBy: dto.approverId,
          note: isApproval
            ? (dto.note || `Approved for $${dto.approvedAmount} at ${dto.approvedInterestRate}% APR for ${dto.approvedTerm} months.`)
            : `Application rejected: ${dto.rejectionReason}`
        }
      });

      let createdLoan = null;

      if (isApproval) {
        const principal = dto.approvedAmount || Number(app.requestedAmount);
        const termMonths = dto.approvedTerm || app.requestedTerm;
        const interestRate = dto.approvedInterestRate || Number(app.product.interestRate);

        const currentYear = new Date().getFullYear();
        const loanCount = await tx.loan.count();
        const loanNumber = `LN-${currentYear}-${String(loanCount + 1).padStart(4, '0')}`;

        // Compute total repayment using loan calculation engine
        const calc = LoanCalculatorService.calculateSimpleInterest({
          principal,
          annualInterestRate: interestRate,
          termMonths,
          repaymentFrequency: app.product.repaymentFrequency
        });

        const startDate = new Date();
        const endDate = new Date(calc.maturityDate);

        createdLoan = await tx.loan.create({
          data: {
            loanNumber,
            applicationId: app.id,
            borrowerId: app.borrowerId,
            productId: app.productId,
            principalAmount: new Prisma.Decimal(principal),
            interestRate: new Prisma.Decimal(interestRate),
            termMonths,
            repaymentFrequency: app.product.repaymentFrequency,
            totalInterest: new Prisma.Decimal(calc.totalInterest),
            totalRepayment: new Prisma.Decimal(calc.totalRepayment),
            totalPaid: new Prisma.Decimal(0.00),
            outstandingBalance: new Prisma.Decimal(calc.totalRepayment),
            startDate,
            endDate,
            status: LoanStatus.PENDING
          }
        });
      }

      // Security Notification
      if (app.borrower.userId) {
        await tx.notification.create({
          data: {
            userId: app.borrower.userId,
            title: isApproval ? `Application Approved: ${app.applicationNo}` : `Application Update: ${app.applicationNo}`,
            message: isApproval
              ? `Congratulations! Your loan application ${app.applicationNo} has been approved.`
              : `Your loan application ${app.applicationNo} has been reviewed and rejected: ${dto.rejectionReason}`,
            type: isApproval ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED'
          }
        });
      }

      return {
        approval,
        applicationStatus: finalStatus,
        loan: createdLoan
      };
    });

    await recordAuditLog({
      userId: dto.approverId,
      action: isApproval ? 'APPROVE_LOAN_APPLICATION' : 'REJECT_LOAN_APPLICATION',
      entityName: 'ApplicationApproval',
      entityId: result.approval.id,
      details: { decision: dto.decision, applicationId: dto.applicationId },
      ipAddress: dto.ipAddress
    });

    return result;
  }

  /**
   * 8. List applications with role filters
   */
  static async listApplications(
    viewer: AuthUser,
    statusOrFilters?: ApplicationStatus | {
      status?: ApplicationStatus;
      borrower?: string;
      borrowerId?: string;
      product?: string;
      productId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const where: any = {};
    if (typeof statusOrFilters === 'string') {
      where.status = statusOrFilters;
    } else if (statusOrFilters && typeof statusOrFilters === 'object') {
      if (statusOrFilters.status) where.status = statusOrFilters.status;
      if (statusOrFilters.borrowerId || statusOrFilters.borrower) {
        const b = statusOrFilters.borrowerId || statusOrFilters.borrower;
        where.OR = [
          { borrowerId: b },
          { borrower: { borrowerId: b } },
          { borrower: { fullName: { contains: b, mode: 'insensitive' } } }
        ];
      }
      if (statusOrFilters.productId || statusOrFilters.product) {
        const p = statusOrFilters.productId || statusOrFilters.product;
        where.productId = p;
      }
      if (statusOrFilters.startDate || statusOrFilters.endDate) {
        where.createdAt = {};
        if (statusOrFilters.startDate) where.createdAt.gte = new Date(statusOrFilters.startDate);
        if (statusOrFilters.endDate) {
          const end = new Date(statusOrFilters.endDate);
          if (statusOrFilters.endDate.length <= 10) {
            end.setHours(23, 59, 59, 999);
          }
          where.createdAt.lte = end;
        }
      }
    }

    if (viewer.role === UserRole.BORROWER) {
      const borrower = await prisma.borrower.findFirst({
        where: { userId: viewer.id }
      });
      if (!borrower) return [];
      where.borrowerId = borrower.id;
    }

    return prisma.loanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: {
          select: {
            id: true,
            borrowerId: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        product: {
          select: {
            id: true,
            productName: true,
            interestRate: true,
            repaymentFrequency: true
          }
        },
        createdByUser: {
          select: { id: true, username: true, fullName: true }
        },
        approvals: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        loan: {
          select: { id: true, loanNumber: true, status: true }
        }
      }
    });
  }

  /**
   * 9. Get application by ID
   */
  static async getApplicationById(id: string, viewer: AuthUser) {
    const app = await prisma.loanApplication.findUnique({
      where: { id },
      include: {
        borrower: true,
        product: true,
        createdByUser: {
          select: { id: true, username: true, fullName: true, role: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedByUser: {
              select: { id: true, username: true, fullName: true, role: true }
            }
          }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: { id: true, username: true, fullName: true, role: true }
            }
          }
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            approver: {
              select: { id: true, username: true, fullName: true, role: true }
            }
          }
        },
        loan: {
          include: {
            disbursements: true,
            repaymentSchedules: {
              orderBy: { installmentNo: 'asc' }
            }
          }
        }
      }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Loan application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    if (viewer.role === UserRole.BORROWER && app.borrower.userId !== viewer.id) {
      throw {
        statusCode: 403,
        message: 'Access denied: you can only view your own loan applications',
        code: 'FORBIDDEN_OWNERSHIP'
      };
    }

    const calculation = LoanCalculatorService.calculateSimpleInterest({
      principal: Number(app.requestedAmount),
      annualInterestRate: Number(app.product.interestRate),
      termMonths: app.requestedTerm,
      repaymentFrequency: app.product.repaymentFrequency
    });

    const creditAssessment = this.calculateDti(Number(app.monthlyIncome), calculation.installmentAmount);

    return {
      ...app,
      creditAssessment: {
        ...creditAssessment,
        estimatedTotalInterest: calculation.totalInterest,
        estimatedTotalRepayment: calculation.totalRepayment,
        estimatedMonthlyInstallment: calculation.installmentAmount
      }
    };
  }

  /**
   * 10. Cancel Application (State Machine: -> CANCELLED)
   */
  static async cancelApplication(id: string, viewer: AuthUser, reason?: string, ipAddress?: string) {
    const app = await prisma.loanApplication.findUnique({
      where: { id },
      include: { borrower: true }
    });

    if (!app) {
      throw { statusCode: 404, message: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    if (viewer.role === UserRole.BORROWER && app.borrower.userId !== viewer.id) {
      throw { statusCode: 403, message: 'Access denied: you can only cancel your own applications', code: 'FORBIDDEN_OWNERSHIP' };
    }

    const cancelableStatuses: ApplicationStatus[] = [
      ApplicationStatus.DRAFT,
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW
    ];

    if (!cancelableStatuses.includes(app.status)) {
      throw {
        statusCode: 400,
        message: `Cannot cancel application with status '${app.status}'. Only DRAFT, SUBMITTED, or UNDER_REVIEW can be cancelled.`,
        code: 'INVALID_STATUS'
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.loanApplication.update({
        where: { id },
        data: { status: ApplicationStatus.CANCELLED },
        include: { borrower: true, product: true }
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          previousStatus: app.status,
          newStatus: ApplicationStatus.CANCELLED,
          changedBy: viewer.id,
          note: reason ? `Application cancelled: ${reason}` : 'Application cancelled by user.'
        }
      });

      return updated;
    });

    await recordAuditLog({
      userId: viewer.id,
      action: 'CANCEL_LOAN_APPLICATION',
      entityName: 'LoanApplication',
      entityId: id,
      details: { applicationNo: app.applicationNo, reason },
      ipAddress
    });

    return result;
  }
}
