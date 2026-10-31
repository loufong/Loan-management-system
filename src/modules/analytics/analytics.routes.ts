import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { checkRole } from '../../middlewares/rbac.middleware';
import { UserRole } from '@prisma/client';
import { AnalyticsController } from './analytics.controller';

export const analyticsRouter = Router();

// Strictly protect all analytics endpoints for SUPER_ADMIN and ADMIN
analyticsRouter.use(authenticate, checkRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]));

// Core Institutional Analytics Endpoints
analyticsRouter.get('/portfolio-summary', AnalyticsController.getPortfolioSummary);
analyticsRouter.get('/delinquency-matrix', AnalyticsController.getDelinquencyMatrix);
analyticsRouter.get('/vintage-cohorts', AnalyticsController.getVintageCohorts);
analyticsRouter.get('/currency-exposure', AnalyticsController.getCurrencyExposure);
analyticsRouter.get('/velocity-t12m', AnalyticsController.getDisbursementRecoveryVelocity);
analyticsRouter.get('/sector-collateral', AnalyticsController.getSectorCollateralDistribution);
analyticsRouter.get('/bakong-audit-ledger', AnalyticsController.getBakongAuditLedger);
analyticsRouter.post('/stress-test', AnalyticsController.runStressTest);

