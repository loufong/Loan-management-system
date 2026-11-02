/**
 * ====================================================================
 * Regulatory KYC Document & Verification Controller
 * ====================================================================
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { KycService, KycDocumentType, KycVerificationStatus } from './kyc.service';
import { S3StorageService } from '../../services/s3StorageService';

export class KycController {
  /**
   * GET /api/kyc/status
   * Returns current 3-of-3 status, count, and pre-signed read URLs
   */
  public static async status(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.query.userId as string) || req.user?.id || 'BOR-2026-8801';
      const status = await KycService.getKycStatus(userId);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/kyc/upload-url
   * Validates MIME-type and 10MB limit, returns pre-signed S3/R2 PUT URL
   */
  public static async uploadUrl(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId || 'BOR-2026-8801';
      const { documentType, originalFilename, mimeType, fileSizeBytes } = req.body;

      if (!documentType || !originalFilename || !mimeType || !fileSizeBytes) {
        res.status(400).json({
          success: false,
          error: 'MISSING_PAYLOAD_FIELDS',
          message: 'documentType, originalFilename, mimeType, and fileSizeBytes are mandatory.',
        });
        return;
      }

      const uploadResult = await KycService.generateUploadUrl({
        userId,
        documentType: documentType as KycDocumentType,
        originalFilename,
        mimeType,
        fileSizeBytes: Number(fileSizeBytes),
      });

      res.status(200).json({
        success: true,
        message: 'Pre-signed S3 upload URL generated successfully (Valid for 15 minutes).',
        data: uploadResult,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'INVALID_UPLOAD_SPECIFICATION',
        message: err.message || 'Failed to generate pre-signed upload URL.',
      });
    }
  }

  /**
   * POST /api/kyc/confirm-upload
   * Confirms client-side upload and marks document as PENDING_REVIEW
   */
  public static async confirmUpload(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId || 'BOR-2026-8801';
      const { documentType, fileKey, originalFilename, referenceNumber, fileSizeBytes, mimeType } = req.body;

      if (!documentType || !fileKey || !originalFilename) {
        res.status(400).json({
          success: false,
          error: 'MISSING_CONFIRMATION_FIELDS',
          message: 'documentType, fileKey, and originalFilename are required to confirm upload.',
        });
        return;
      }

      const doc = await KycService.confirmUpload({
        userId,
        documentType: documentType as KycDocumentType,
        fileKey,
        originalFilename,
        referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
        fileSizeBytes: Number(fileSizeBytes || 1024),
        mimeType: mimeType || 'application/pdf',
      });

      res.status(200).json({
        success: true,
        message: 'KYC Document queued for Compliance Review. Status set to PENDING_REVIEW.',
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/kyc/verify
   * Administrative decision: VERIFY or REJECT
   */
  public static async verify(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, documentType, status, rejectionReason } = req.body;
      const targetUserId = userId || req.user?.id || 'BOR-2026-8801';

      if (!documentType || !status) {
        res.status(400).json({
          success: false,
          error: 'MISSING_VERIFICATION_FIELDS',
          message: 'documentType and status (VERIFIED | REJECTED) are required.',
        });
        return;
      }

      const doc = await KycService.verifyDocument({
        userId: targetUserId,
        documentType: documentType as KycDocumentType,
        status: status as 'VERIFIED' | 'REJECTED',
        rejectionReason,
        verifiedBy: req.user?.email || req.user?.id || 'compliance-officer',
      });

      res.status(200).json({
        success: true,
        message: `KYC Document status transitioned to ${status}.`,
        data: doc,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: 'VERIFICATION_ERROR',
        message: err.message || 'Failed to update document status.',
      });
    }
  }

  /**
   * POST /api/kyc/simulate-status
   * Testing & demo helper to toggle statuses from frontend
   */
  public static async simulateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, documentType, status, rejectionReason } = req.body;
      const targetUserId = userId || req.user?.id || 'BOR-2026-8801';

      const updated = KycService.setSimulatedStatus(
        targetUserId,
        documentType as KycDocumentType,
        status as KycVerificationStatus,
        rejectionReason
      );

      const summary = await KycService.getKycStatus(targetUserId);

      res.status(200).json({
        success: true,
        message: `Simulated document status updated to ${status}.`,
        data: {
          updatedDocument: updated,
          summary,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/kyc/storage-simulator/view
   * Handles simulated secure viewing in local/demo mode
   */
  public static async simulatedView(req: AuthenticatedRequest, res: Response): Promise<void> {
    const fileKey = req.query.fileKey as string;
    const blob = S3StorageService.getSimulatedBlob(fileKey);

    res.setHeader('Content-Type', blob?.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="kyc_document.pdf"');
    res.send(
      blob?.buffer ||
        Buffer.from(
          `%PDF-1.4\n1 0 obj\n<< /Title (JAM SONG VICH Encrypted KYC Document: ${fileKey}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
        )
    );
  }

  /**
   * PUT /api/kyc/storage-simulator/upload
   * Handles simulated direct upload in local/demo mode
   */
  public static async simulatedUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    const fileKey = (req.query.fileKey as string) || `simulated-${Date.now()}`;
    const mimeType = req.headers['content-type'] || 'application/pdf';

    S3StorageService.storeSimulatedBlob(fileKey, mimeType, 1024);
    res.status(200).json({
      success: true,
      message: 'Simulated 256-bit encrypted storage PUT successful.',
      fileKey,
    });
  }
}

