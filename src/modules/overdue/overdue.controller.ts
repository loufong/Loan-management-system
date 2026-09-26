import { Request, Response, NextFunction } from 'express';
import { OverdueService } from './overdue.service';
import { sendSuccess } from '../../utils/response';

export class OverdueController {
  static async triggerCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const penaltyRate = req.body.penaltyRate ? parseFloat(req.body.penaltyRate) : undefined;
      const result = await OverdueService.triggerOverdueScan(penaltyRate);
      sendSuccess(res, result, 'Overdue portfolio scan executed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const penaltyRate = req.query.penaltyRate ? parseFloat(req.query.penaltyRate as string) : undefined;
      const loans = await OverdueService.getOverdueLoans(penaltyRate);
      sendSuccess(res, loans, 'Overdue loans retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await OverdueService.getOverdueSummary();
      sendSuccess(res, summary, 'Overdue portfolio summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async sendReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OverdueService.sendDueDateReminders();
      sendSuccess(res, result, 'Automated payment reminders dispatched');
    } catch (err) {
      next(err);
    }
  }
}
