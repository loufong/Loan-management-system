import { Response, NextFunction } from 'express';
import { BorrowerService } from './borrower.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  createBorrowerSchema,
  queryBorrowerSchema,
  updateBorrowerSchema
} from './borrower.validation';

export class BorrowerController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = queryBorrowerSchema.parse(req.query);
      const result = await BorrowerService.listBorrowers(validatedQuery, req.user!);
      sendSuccess(res, result.items, 'Borrowers retrieved successfully', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const borrower = await BorrowerService.getBorrowerById(req.params.id, req.user!);
      sendSuccess(res, borrower, 'Borrower full profile details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createBorrowerSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const borrower = await BorrowerService.createBorrower(
        validated,
        req.user!.id,
        ipAddress
      );
      sendSuccess(res, borrower, 'Borrower created successfully with auto-generated ID', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateBorrowerSchema.parse(req.body);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const borrower = await BorrowerService.updateBorrower(
        req.params.id,
        validated,
        req.user!,
        ipAddress
      );
      sendSuccess(res, borrower, 'Borrower profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const result = await BorrowerService.deactivateBorrower(
        req.params.id,
        req.user!,
        ipAddress
      );
      sendSuccess(res, result.borrower, result.message);
    } catch (err) {
      next(err);
    }
  }
}
