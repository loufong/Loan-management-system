import { Request, Response } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Academic Loan Management System (LMS) - Production & Mobile API',
    version: '1.0.0',
    description:
      'Unified REST API specification for Web and Mobile platforms (iOS / Android). Source of truth is PostgreSQL. Strict Two-Role Architecture: ADMIN and USER.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Production / Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide short-lived JWT access token obtained from /api/v1/auth/login or /api/v1/auth/refresh',
      },
      IdempotencyKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
        description: 'Unique client-generated key (UUIDv4) to guarantee payment creation idempotency over mobile networks',
      },
    },
    schemas: {
      ApiResponseSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 45 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      ApiResponseError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid request input' },
              details: { type: 'object' },
            },
          },
        },
      },
      UserRole: {
        type: 'string',
        enum: ['ADMIN', 'USER'],
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Public User Registration (Atomic Gmail OTP Verification)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'phone', 'password', 'confirmPassword'],
                properties: {
                  fullName: { type: 'string', example: 'Kim Soreak' },
                  username: { type: 'string', example: 'kimsoreak' },
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  phone: { type: 'string', example: '+85512345678' },
                  password: { type: 'string', format: 'password', example: 'P@ssword123!' },
                  confirmPassword: { type: 'string', format: 'password', example: 'P@ssword123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OTP dispatched to Gmail. Enter 6-digit code to complete registration.' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email or username already exists' },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        summary: 'Verify 6-digit OTP code',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  code: { type: 'string', example: '849201' },
                  purpose: { type: 'string', enum: ['REGISTRATION', 'PASSWORD_RESET'], default: 'REGISTRATION' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Verification successful. User account created in PostgreSQL with role USER.' },
          '400': { description: 'Invalid or expired OTP' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User & Admin Login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  usernameOrEmail: { type: 'string', example: 'admin@loansystem.edu' },
                  password: { type: 'string', format: 'password', example: 'AdminSecurePass!2026' },
                  rememberMe: { type: 'boolean', default: false },
                  deviceName: { type: 'string', example: 'iPhone 15 Pro / Android Pixel 8' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful. Returns access token, refresh token, and user session.' },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Account inactive or unverified' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Authenticated User Profile',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Returns authenticated user profile, verified status, and permissions.' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh Access Token & Session Rotation',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Rotated token pair returned.' },
          '401': { description: 'Invalid or revoked refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout & Session Revocation',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged out successfully and refresh session marked as revoked.' },
        },
      },
    },
    '/users/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
      put: {
        summary: 'Update current user profile',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Profile updated' } },
      },
    },
    '/users/me/applications': {
      get: {
        summary: 'Get current user loan applications',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List of owned applications' } },
      },
    },
    '/users/me/loans': {
      get: {
        summary: 'Get current user active loans & repayment schedules',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List of owned loans' } },
      },
    },
    '/users/me/payments': {
      get: {
        summary: 'Get current user payment history & receipts',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List of payments' } },
      },
    },
    '/users/me/notifications': {
      get: {
        summary: 'Get current user notifications',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List of notifications' } },
      },
    },
    '/products': {
      get: {
        summary: 'List active loan products',
        tags: ['Loan Products'],
        responses: { '200': { description: 'List of available loan products' } },
      },
    },
    '/applications': {
      get: {
        summary: 'List loan applications (Filtered by role ownership)',
        tags: ['Applications'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
      post: {
        summary: 'Submit loan application',
        tags: ['Applications'],
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Application submitted' } },
      },
    },
    '/loans': {
      get: {
        summary: 'List active loans (Filtered by role ownership)',
        tags: ['Loans'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
    },
    '/payments': {
      get: {
        summary: 'List payment receipts',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
      post: {
        summary: 'Record payment (Strict waterfall allocation & Idempotency protection)',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }, { IdempotencyKey: [] }],
        responses: { '201': { description: 'Payment recorded and schedule reconciled' } },
      },
    },
    '/overdue/loans': {
      get: {
        summary: 'List overdue loans (ADMIN)',
        tags: ['Overdue'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
    },
    '/notifications': {
      get: {
        summary: 'List current user notifications',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
    },
    '/notifications/{id}/read': {
      post: {
        summary: 'Mark notification as read',
        tags: ['Notifications'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Notification marked as read' } },
      },
    },
    '/dashboard': {
      get: {
        summary: 'Dashboard real-time KPIs (Role-tailored: Admin vs User)',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Dashboard metrics calculated from PostgreSQL' } },
      },
    },
  },
};

export function renderDocs(req: Request, res: Response) {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Academic Loan Management System - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 28px; color: #0f172a; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`);
}
