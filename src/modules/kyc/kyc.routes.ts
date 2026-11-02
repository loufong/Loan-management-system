/**
 * ====================================================================
 * Regulatory KYC Document Vault Routes
 * ====================================================================
 */

import { Router } from 'express';
import { KycController } from './kyc.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';

export const kycRouter = Router();

// Storage simulator routes (view/upload can be accessed via short-lived signed token)
kycRouter.get('/storage-simulator/view', KycController.simulatedView);
kycRouter.put('/storage-simulator/upload', KycController.simulatedUpload);

// Protected Core KYC Operations
kycRouter.use(authenticate);

// 1. Get current 3-of-3 status, count, and pre-signed read URLs
kycRouter.get('/status', KycController.status);

// 2. Request pre-signed S3/R2 upload URL (validates MIME & max 10MB)
kycRouter.post('/upload-url', KycController.uploadUrl);

// 3. Confirm document upload completion -> sets status to PENDING_REVIEW
kycRouter.post('/confirm-upload', KycController.confirmUpload);

// 4. Admin / Committee Document Verification (VERIFIED / REJECTED)
kycRouter.post('/verify', authorize(UserRole.ADMIN), KycController.verify);

// 5. Sandbox / Demo status simulation (for testing borrowing lock)
kycRouter.post('/simulate-status', KycController.simulateStatus);

