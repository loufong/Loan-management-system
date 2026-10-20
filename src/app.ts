import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middlewares/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { borrowerRouter } from './modules/borrowers/borrower.routes';
import { productRouter } from './modules/products/product.routes';
import { applicationRouter } from './modules/applications/application.routes';
import { loanRouter } from './modules/loans/loan.routes';
import { paymentRouter } from './modules/payments/payment.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { calculatorRouter } from './modules/calculator/calculator.routes';
import { overdueRouter } from './modules/overdue/overdue.routes';
import { reportRouter } from './modules/reports/report.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { userRouter } from './modules/users/user.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { demoRouter } from './modules/demo/demo.routes';
import { openApiSpec, renderDocs } from './modules/docs/openapi';
import { authenticate, verifyToken } from './middlewares/auth.middleware';
import { checkRole } from './middlewares/rbac.middleware';
import { sendError, sendSuccess } from './utils/response';

export function createApp(): Application {
  const app = express();

  // Security & Utility Middlewares (Permit CDN scripts for interactive frontend)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  // Dynamic Production CORS (supports GitHub Pages, Local dev, and Mobile clients)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'https://loufong.github.io'
      ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permit requests with no origin (such as mobile apps, Postman, curl) or allowed origins
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // Permissive in development, strict check in production
          if (process.env.NODE_ENV === 'production') {
            callback(new Error(`CORS blocked for origin: ${origin}`));
          } else {
            callback(null, true);
          }
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Idempotency-Key', 'X-Device-Name'],
      credentials: true
    })
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static Assets for Frontend SPA
  const publicDir = fs.existsSync(path.join(process.cwd(), 'public'))
    ? path.join(process.cwd(), 'public')
    : path.join(__dirname, '../public');

  // Intercept any asset request (including nested sub-routes like /admin/assets/*, /loans/assets/*)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes('/assets/')) {
      const assetFile = req.path.split('/assets/').pop();
      if (assetFile) {
        const fullPath = path.join(publicDir, 'assets', assetFile);
        if (fs.existsSync(fullPath)) {
          return res.sendFile(fullPath);
        }
      }
    }
    next();
  });

  app.use(express.static(publicDir));

  // Root & App Route: Return interactive SPA to browsers, JSON to API consumers
  app.get(['/', '/app'], (req: Request, res: Response) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (req.accepts('html') && fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return sendSuccess(res, {
      service: 'Academic Loan Management System (LMS) API',
      version: '1.0.0',
      docs: '/api/v1/health'
    });
  });

  app.get('/api/v1/health', (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime()
    });
  });

  // OpenAPI Documentation (Phase 24)
  app.get(['/api/v1/docs', '/api/docs'], renderDocs);
  app.get(['/api/v1/openapi.json', '/api/openapi.json'], (req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  // =========================================================================
  // BACKEND ADMIN ROUTE PROTECTION (/admin, /admin/*)
  // Direct access is strictly guarded: unauthenticated -> 401 / /login,
  // normal users (USER) -> 403 Forbidden / /user/dashboard or /access-denied.
  // =========================================================================
  app.all(['/admin', '/admin/*'], (req: Request, res: Response, next: NextFunction) => {
    // If this is an asset request, delegate to asset handler
    if (req.path.includes('/assets/') || req.path.includes('.')) {
      return next();
    }

    const isBrowserHtmlRequest =
      req.accepts('html') &&
      !req.xhr &&
      !req.headers.accept?.includes('application/json');



    // For direct API requests or non-browser clients to /admin or /admin/*:
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.split(' ')[1]
      : queryToken;

    if (!token) {
      if (isBrowserHtmlRequest) {
        return res.redirect('/login');
      }
      return sendError(
        res,
        'Authentication required to access administrative resources',
        401,
        'UNAUTHORIZED'
      );
    }

    try {
      const decoded = verifyToken(token);
      const userRole = String(decoded.role || '').toUpperCase();

      if (userRole !== 'ADMIN') {
        if (isBrowserHtmlRequest) {
          return res.redirect('/user/dashboard?denied=true');
        }
        return sendError(
          res,
          'Access Denied: You do not have permission to access this page.',
          403,
          'FORBIDDEN'
        );
      }

      // Authenticated ADMIN requesting HTML page
      const indexPath = path.join(publicDir, 'index.html');
      if (isBrowserHtmlRequest && fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }

      return sendSuccess(res, {
        service: 'Admin Console API',
        message: 'Admin access authorized',
        route: req.originalUrl,
      });
    } catch {
      if (isBrowserHtmlRequest) {
        return res.redirect('/login');
      }
      return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
    }
  });

  // Dedicated Admin API endpoints (/api/admin, /api/v1/admin) (Phase 10)
  app.use(['/api/admin', '/api/v1/admin'], adminRouter);

  // 1. Authentication & RBAC
  app.use(['/api/auth', '/api/v1/auth'], authRouter);

  // 2. Borrower Management
  app.use(['/api/borrowers', '/api/v1/borrowers'], borrowerRouter);

  // 3. Loan Products
  app.use(['/api/products', '/api/v1/products', '/api/loan-products', '/api/v1/loan-products'], productRouter);

  // 4. Financial Calculation Engine
  app.use(['/api/calculator', '/api/v1/calculator'], calculatorRouter);

  // 5. Loan Applications & Workflow
  app.use(['/api/applications', '/api/v1/applications', '/api/loan-applications', '/api/v1/loan-applications'], applicationRouter);

  // 6. Loan Disbursement & Active Loans
  app.use(['/api/loans', '/api/v1/loans'], loanRouter);

  // 7. Payment Processing & Ledger
  app.use(['/api/payments', '/api/v1/payments'], paymentRouter);

  // 8. Overdue Engine
  app.use(['/api/overdue', '/api/v1/overdue'], overdueRouter);

  // 9. KPI Dashboard & Reports
  app.use(['/api/dashboard', '/api/v1/dashboard'], dashboardRouter);
  app.use(['/api/reports', '/api/v1/reports'], reportRouter);

  // 10. Notifications & Alerts
  app.use(['/api/notifications', '/api/v1/notifications'], notificationRouter);

  // 11. User & Role Management (Strictly Admin superuser access)
  app.use(['/api/users', '/api/v1/users'], userRouter);

  // 12. Live Fast-Forward Demo Trigger
  app.use(['/api/demo', '/api/demo'], demoRouter);

  // SPA Route Fallback for all browser client navigation routes
  app.get(
    [
      '/',
      '/app',
      '/admin',
      '/admin/*',
      '/user',
      '/user/*',
      '/dashboard',
      '/applications',
      '/applications/*',
      '/apply-loan',
      '/loans',
      '/loans/*',
      '/repayments',
      '/payments',
      '/notifications',
      '/profile',
      '/settings',
      '/settings/*',
      '/access-denied',
      '/login',
      '/register',
      '/forgot-password',
      '/verify-otp',
      '/verify-email',
      '/reset-password',
      '/change-password',
      '*'
    ],
    (req: Request, res: Response, next: NextFunction) => {
      // Never intercept API routes, assets, or static files
      if (req.path.startsWith('/api/') || req.path.includes('/assets/') || req.path.includes('.')) {
        return next();
      }
      const indexPath = path.join(publicDir, 'index.html');
      if (req.accepts('html') && fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      return sendSuccess(res, { route: req.originalUrl });
    }
  );

  // 404 Route Handler
  app.use((req: Request, res: Response) => {
    sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
