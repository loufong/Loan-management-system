import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApplicationService } from './application.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../config/prisma';
import {
  ApplicationStatus,
  ReviewRecommendation,
  ApprovalDecision
} from '@prisma/client';

const applicationInputSchema = z.object({
  borrowerId: z.string().min(1, 'Borrower ID is required'),
  productId: z.string().min(1, 'Loan Product ID is required'),
  requestedAmount: z.number().positive('Requested amount must be greater than 0'),
  requestedTerm: z.number().int().positive('Term must be at least 1 month'),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
  monthlyIncome: z.number().nonnegative().optional(),
  supportingInfo: z.string().optional(),
  isDraft: z.boolean().optional()
});

const reviewSchema = z.object({
  recommendation: z.nativeEnum(ReviewRecommendation),
  notes: z.string().min(3, 'Review notes are required')
});

const approveSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision).default(ApprovalDecision.APPROVED),
  approvedAmount: z.number().positive().optional(),
  approvedTerm: z.number().int().positive().optional(),
  approvedInterestRate: z.number().nonnegative().optional(),
  note: z.string().optional(),
  rejectionReason: z.string().optional()
});

const rejectSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason is required')
});

export class ApplicationController {
  // Save as Draft
  static async saveDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = applicationInputSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const app = await ApplicationService.saveDraft({
        ...validated,
        viewer: req.user!,
        ipAddress
      });
      sendSuccess(res, app, 'Application saved as Draft successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  // Update existing Draft
  static async updateDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = applicationInputSchema.partial().parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const app = await ApplicationService.updateDraft(
        req.params.id,
        validated,
        req.user!,
        ipAddress
      );
      sendSuccess(res, app, 'Draft application updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // Submit Application
  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;

      // If id is provided in params, finalize existing draft
      if (req.params.id) {
        const app = await ApplicationService.submitApplication(
          { ...req.body, viewer: req.user!, ipAddress },
          req.params.id
        );
        sendSuccess(res, app, 'Application finalized and submitted successfully');
        return;
      }

      // Direct creation
      const validated = applicationInputSchema.parse(req.body);

      // If isDraft is specified as true, save as draft
      if (validated.isDraft) {
        const app = await ApplicationService.saveDraft({
          ...validated,
          viewer: req.user!,
          ipAddress
        });
        sendSuccess(res, app, 'Application saved as Draft successfully', 201);
        return;
      }

      // Direct submission
      const app = await ApplicationService.submitApplication({
        ...validated,
        viewer: req.user!,
        ipAddress
      });
      sendSuccess(res, app, 'Loan application submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  // Get Pre-submission Confirmation Preview
  static async getPreview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const preview = await ApplicationService.getConfirmationPreview(req.params.id, req.user!);
      sendSuccess(res, preview, 'Application confirmation preview generated');
    } catch (err) {
      next(err);
    }
  }

  // Simulate Credit Assessment (DTI + Risk Tier)
  static async simulateAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assessment = await ApplicationService.simulateCreditAssessment(req.params.id);
      sendSuccess(res, assessment, 'Credit risk assessment simulated successfully');
    } catch (err) {
      next(err);
    }
  }

  // List Applications
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as ApplicationStatus | undefined,
        borrowerId: (req.query.borrowerId || req.query.borrower) as string | undefined,
        productId: (req.query.productId || req.query.product) as string | undefined,
        startDate: (req.query.dateFrom || req.query.startDate) as string | undefined,
        endDate: (req.query.dateTo || req.query.endDate) as string | undefined
      };
      const apps = await ApplicationService.listApplications(req.user!, filters);
      sendSuccess(res, apps, 'Loan applications retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // Get by ID
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const app = await ApplicationService.getApplicationById(req.params.id, req.user!);
      sendSuccess(res, app, 'Loan application details retrieved');
    } catch (err) {
      next(err);
    }
  }

  // Underwriting Credit Review
  static async review(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = reviewSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const review = await ApplicationService.reviewApplication({
        applicationId: req.params.id,
        reviewerId: req.user!.id,
        ...validated,
        ipAddress
      });
      sendSuccess(res, review, 'Credit review submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  // Committee Approval
  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = approveSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await ApplicationService.approveOrReject({
        applicationId: req.params.id,
        approverId: req.user!.id,
        ...validated,
        decision: ApprovalDecision.APPROVED,
        ipAddress
      });
      sendSuccess(res, result, 'Application approved successfully');
    } catch (err) {
      next(err);
    }
  }

  // Committee Rejection (Manager / Admin)
  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rejectionReason } = rejectSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await ApplicationService.approveOrReject({
        applicationId: req.params.id,
        approverId: req.user!.id,
        decision: ApprovalDecision.REJECTED,
        rejectionReason,
        ipAddress
      });
      sendSuccess(res, result, 'Application rejected successfully');
    } catch (err) {
      next(err);
    }
  }

  // Cancel Application
  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await ApplicationService.cancelApplication(
        req.params.id,
        req.user!,
        req.body?.reason,
        ipAddress
      );
      sendSuccess(res, result, 'Application cancelled successfully');
    } catch (err) {
      next(err);
    }
  }
}
