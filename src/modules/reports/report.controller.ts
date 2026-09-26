import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import { sendSuccess } from '../../utils/response';
import { sendCsvResponse } from '../../utils/csv';

export class ReportController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kpis = await ReportService.getKpiSummary();
      sendSuccess(res, kpis, 'KPI Summary and mathematical models retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('applications', req.query);
        sendCsvResponse(res, `lms_applications_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getApplicationsReport(req.query);
      sendSuccess(res, data, 'Applications report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getApprovedLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('approved-loans', req.query);
        sendCsvResponse(res, `lms_approved_loans_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getApprovedLoansReport(req.query);
      sendSuccess(res, data, 'Approved loans report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getRejectedLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('rejected-loans', req.query);
        sendCsvResponse(res, `lms_rejected_loans_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getRejectedLoansReport(req.query);
      sendSuccess(res, data, 'Rejected loans report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getActiveLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('active-loans', req.query);
        sendCsvResponse(res, `lms_active_loans_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getActiveLoansReport(req.query);
      sendSuccess(res, data, 'Active loans report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getOverdueLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('overdue-loans', req.query);
        sendCsvResponse(res, `lms_overdue_loans_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getOverdueLoansReport(req.query);
      sendSuccess(res, data, 'Overdue loans report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getDailyCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('daily-collections', req.query);
        sendCsvResponse(res, `lms_daily_collections_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getDailyCollectionsReport(req.query);
      sendSuccess(res, data, 'Daily collections grouped by date, method, and cashier retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getDisbursements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('disbursements', req.query);
        sendCsvResponse(res, `lms_disbursements_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getDisbursementsReport(req.query);
      sendSuccess(res, data, 'Disbursements report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.query.export === 'csv') {
        const csv = await ReportService.exportReportCsv('collections', req.query);
        sendCsvResponse(res, `lms_collections_${Date.now()}.csv`, csv);
        return;
      }
      const data = await ReportService.getCollectionsReport(req.query);
      sendSuccess(res, data, 'Collections report retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportType = (req.query.type as string) || 'daily-collections';
      const csv = await ReportService.exportReportCsv(reportType, req.query);
      sendCsvResponse(res, `lms_${reportType}_report_${Date.now()}.csv`, csv);
    } catch (err) {
      next(err);
    }
  }
}
