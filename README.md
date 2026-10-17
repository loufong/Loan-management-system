# Apex Loan Management System (LMS) — Production Platform & Mobile-Ready API

A production-grade, two-tier Loan Management System (LMS) engineered with a clean layered architecture, robust financial calculation engine, PostgreSQL core banking ledger, and a professional banking user interface. Ready for production web deployment and native mobile application consumption (iOS & Android).

- **GitHub Repository**: [https://github.com/loufong/Loan-management-system](https://github.com/loufong/Loan-management-system)
- **Live Frontend Web Application**: [https://loufong.github.io/Loan-management-system/](https://loufong.github.io/Loan-management-system/)
- **Interactive OpenAPI 3.0 / Swagger Documentation**: `/api/v1/docs` (JSON: `/api/v1/openapi.json`)

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Role Architecture (ADMIN & USER)](#-role-architecture)
3. [Authentication & Gmail OTP Lifecycle](#-authentication--gmail-otp-lifecycle)
4. [Financial Calculation & Ledger Engine](#-financial-calculation--ledger-engine)
5. [Payment Processing & Idempotency](#-payment-processing--idempotency)
6. [Automated Overdue Engine](#-automated-overdue-engine)
7. [Document Storage & KYC Abstraction](#-document-storage--kyc-abstraction)
8. [Standardized REST API Namespace (`/api/v1`)](#-standardized-rest-api-namespace)
9. [Mobile Application Readiness](#-mobile-application-readiness)
10. [Environment Variables & Configuration](#-environment-variables--configuration)
11. [Installation & Setup](#-installation--setup)
12. [Automated Verification & Test Suites](#-automated-verification--test-suites)
13. [Frontend & GitHub Pages SPA Routing](#-frontend--github-pages-spa-routing)
14. [Security & Compliance](#-security--compliance)

---

## 🏛 System Architecture

The system uses a single unified backend API that simultaneously serves both the Web Single Page Application (SPA) and future Mobile applications:

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│      Web Browser (Desktop)      │        │      Mobile App (iOS/Android)    │
│  (GitHub Pages / Custom Domain) │        │     (Future React Native / Expo) │
└────────────────┬────────────────┘        └─────────────────┬────────────────┘
                 │                                           │
                 │ HTTPS (/api/v1/*)                         │ HTTPS (/api/v1/*)
                 └─────────────────────┬─────────────────────┘
                                       │
                         ┌─────────────▼─────────────┐
                         │   Production Express API  │
                         │      (TypeScript/Node)    │
                         └─────────────┬─────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
      [ PostgreSQL Database ]  [ Gmail SMTP Service ]  [ KYC Cloud Storage ]
        Prisma ORM (ACID)      Nodemailer (Real OTP)   S3 / Supabase / Cloudinary
```

- **PostgreSQL is the single source of truth** for all business state, financial balances, installment schedules, user accounts, and immutable audit logs.
- **Backend is the single authority** for financial formulas (simple interest, amortized EMI, DTI underwriting, late fees, and penny-perfect installment reconciliation). No calculations are delegated to frontend clients or mobile apps.

---

## 👥 Role Architecture

The system enforces a strict **two-tier role architecture**:

### 1. `ADMIN`
- Full administrative authority across the entire platform.
- Manage user accounts, activation/deactivation, and role assignments.
- Create and configure loan products, interest rate ranges, term limits, and eligibility criteria.
- Review loan applications, run credit scoring, approve or reject applications (mandatory rejection reason).
- Disburse approved loans, activating loan accounts and generating penny-perfect repayment schedules.
- Record loan repayment collections and process waterfall allocations.
- Execute automated and on-demand overdue scans with accrued late-fee calculations.
- Inspect system-wide KPIs, portfolio cashflow charts, delinquency watchlists, and regulatory CSV reports.
- View immutable forensic audit trail logs.

### 2. `USER`
- Client & borrower self-service access.
- Public registration with cryptographically secure Gmail OTP email verification.
- Secure login with short-lived JWT access tokens and long-lived device-tracked refresh tokens.
- Profile management, KYC verification, and personal contact details.
- Submit new loan applications with live repayment calculators and schedule previews.
- View own submitted applications, application status history, and underwriting outcomes.
- View own active facilities, amortization repayment schedules, remaining balances, and next payment due dates.
- View own payment history and download/print official sequential payment receipts (`REC-YYYY-XXXX`).
- Receive real-time in-app notifications for application events, disbursements, due dates, and overdue alerts.
- **Strict Ownership Enforcement (ABAC)**: A `USER` can *never* view, modify, or infer another user's profile, applications, loans, schedules, payments, receipts, or notifications. Any cross-tenant access returns `403 Forbidden`.

---

## 🔐 Authentication & Gmail OTP Lifecycle

Public registration guarantees that only the `USER` role can be created. Normal users can never choose `ADMIN` or escalate privileges.

### Registration & Verification Flow
```
Register (POST /api/v1/auth/register)
  │ (Validates email uniqueness, password strength, full name)
  ▼
Create Pending Registration Record
  │ (Generates cryptographically secure 6-digit OTP: crypto.randomInt(100000, 999999))
  ▼
Store SHA-256 Hashed OTP in PostgreSQL
  │ (Expires in 10 minutes; max 5 attempts; 60s resend cooldown)
  ▼
Send Real Email via Gmail SMTP (Nodemailer)
  │ (Safe failure in production if SMTP is unconfigured; zero plaintext OTP exposure in API)
  ▼
User Submits OTP (POST /api/v1/auth/verify-otp)
  │ (Verifies hash, checks expiry, marks attempts)
  ▼
Activate Permanent PostgreSQL User (role = USER, emailVerifiedAt = NOW())
```

### Complete Authentication Endpoints (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Public registration (initiates Gmail OTP).
- `POST /api/v1/auth/verify-otp` — Verifies 6-digit OTP and activates `USER` account.
- `POST /api/v1/auth/resend-otp` — Resends fresh OTP (enforces 60-second cooldown and rate limits).
- `POST /api/v1/auth/login` — Authenticates credentials; returns short-lived access token + long-lived refresh token.
- `GET /api/v1/auth/me` — Retrieves current authenticated user profile, verified status, and permissions.
- `POST /api/v1/auth/refresh` — Rotates refresh token and issues new access token.
- `POST /api/v1/auth/logout` — Revokes current device session and refresh token hash.
- `POST /api/v1/auth/forgot-password` — Generates and emails secure password-reset OTP via Gmail.
- `POST /api/v1/auth/reset-password` — Validates reset token/OTP and securely updates password.
- `POST /api/v1/auth/change-password` — Authenticated password change requiring current password verification.

### Multi-Device Session Tracking
The database tracks active client sessions:
- `id`, `userId`, `refreshTokenHash`, `deviceName`, `userAgent`, `ipAddress`, `lastUsedAt`, `expiresAt`, `revokedAt`.
- Multiple devices (Web browser, iOS device, Android phone) can maintain independent active sessions without collision.

---

## 🧮 Financial Calculation & Ledger Engine

All mathematical logic is encapsulated on the backend within `LoanCalculatorService` using decimal rounding (`round2` to 2 decimal places) to avoid JavaScript floating-point errors.

### 1. Simple Interest (Fixed Flat Rate)
$$\text{Total Interest} = \text{Principal} \times \left(\frac{\text{Annual Interest Rate}}{100}\right) \times \left(\frac{\text{Term in Months}}{12}\right)$$
$$\text{Total Repayment} = \text{Principal} + \text{Total Interest}$$
$$\text{Base Installment} = \frac{\text{Total Repayment}}{\text{Total Installments}}$$

### 2. Reducing Balance / Amortized EMI
$$\text{Periodic Rate } r = \frac{\text{Annual Rate}}{\text{Frequency} \times 100}$$
$$\text{EMI} = \frac{\text{Principal} \times r \times (1 + r)^N}{(1 + r)^N - 1}$$

### 3. Penny-Perfect Reconciliation
To ensure financial accounting integrity across integer cent divisions, the final installment absorbs all fractional cent rounding:
$$\text{Installment}_N.\text{principal} = \text{Principal} - \sum_{i=1}^{N-1} \text{Installment}_i.\text{principal}$$
$$\text{Installment}_N.\text{interest} = \text{Total Interest} - \sum_{i=1}^{N-1} \text{Installment}_i.\text{interest}$$
$$\sum \text{Installment Principal} \equiv \text{Principal} \quad \text{and} \quad \sum \text{Installment Interest} \equiv \text{Total Interest}$$

---

## 💳 Payment Processing & Idempotency

Especially vital for mobile connectivity where network retries are common, payment creation supports client-side idempotency:

```http
POST /api/v1/payments
Idempotency-Key: e8a26d7f-94d1-42e7-8b01-8b29e02c1f71
Content-Type: application/json
Authorization: Bearer <access_token>
```

- When an `Idempotency-Key` or `X-Idempotency-Key` header is provided, the backend checks for prior successful payment records.
- If a duplicate request with the identical key is received (e.g., from a mobile timeout retry), the server safely returns the existing receipt without duplicate ledger deduction.

### Real-Time Waterfall Allocation
Payments are executed inside an atomic PostgreSQL transaction:
1. Validates loan status is `ACTIVE` or `OVERDUE`.
2. Sorts unpaid installments in chronological order by `dueDate` ascending.
3. Allocates payment amount to oldest unpaid installment:
   - If payment $\ge$ remaining amount: marks installment `PAID`, sets `remainingAmount = 0`, and cascades excess to next installment.
   - If payment $<$ remaining amount: marks installment `PARTIAL`, sets `remainingAmount = remainingAmount - allocated`.
4. Updates loan master account: decrements `outstandingBalance`, increments `totalPaid`.
5. When `outstandingBalance == 0` and all installments are `PAID`, loan automatically transitions to `COMPLETED`.
6. Generates sequential official receipt: `REC-YYYY-XXXX`.

---

## ⏰ Automated Overdue Engine

Delinquency detection operates fully server-side and does not rely on browser sessions:
- **Condition**: `current_date > dueDate` AND `remainingAmount > 0`.
- **Late Fee Formula**:
  $$\text{Late Fee} = \text{Remaining Amount} \times 0.001 \times \text{Days Overdue} \quad (\text{0.1\% daily penalty})$$
- **Automated Cron**: Built-in `node-cron` runs daily at `00:01` (`1 0 * * *`).
- **On-Demand Admin Check**: `POST /api/v1/overdue/run-check` or `POST /api/v1/admin/overdue/run-check`.
- Flags delinquent installments as `OVERDUE`, marks loan status as `OVERDUE`, creates audit logs, and sends in-app notifications.

---

## 📁 Document Storage & KYC Abstraction

Document uploads utilize a decoupled storage service abstraction (`src/services/storage.service.ts`):
- Supports `LOCAL` filesystem (development), `S3` (AWS), `SUPABASE` Storage, and `CLOUDINARY`.
- Secure signed/temporary URLs for document downloads.
- Database records only regulatory metadata (`id`, `borrowerId`, `applicationId`, `documentType`, `fileName`, `fileSize`, `mimeType`, `storageKey`, `createdAt`).
- No private KYC documents are exposed on public CDN or GitHub Pages.

---

## 📡 Standardized REST API Namespace

All modern routes use `/api/v1`. Backward-compatible `/api/*` aliases are preserved temporarily and mapped to the same underlying controllers.

### Core Endpoints Table

| Module | Method | Endpoint | Clearance | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Public registration with Gmail OTP |
| | `POST` | `/api/v1/auth/verify-otp` | Public | Verify OTP & activate USER account |
| | `POST` | `/api/v1/auth/resend-otp` | Public | Resend OTP with 60s cooldown |
| | `POST` | `/api/v1/auth/login` | Public | Issue access & refresh tokens |
| | `GET` | `/api/v1/auth/me` | Authenticated | Current user profile |
| | `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| | `POST` | `/api/v1/auth/logout` | Authenticated | Revoke device session |
| | `POST` | `/api/v1/auth/forgot-password` | Public | Send password reset OTP |
| | `POST` | `/api/v1/auth/reset-password` | Public | Reset password with token/OTP |
| | `POST` | `/api/v1/auth/change-password` | Authenticated | Change account password |
| **User (Self)** | `GET` | `/api/v1/users/me` | Authenticated | User's own dossier |
| | `PUT` | `/api/v1/users/me` | Authenticated | Update own contact info |
| | `GET` | `/api/v1/users/me/applications` | Authenticated | User's own loan applications |
| | `GET` | `/api/v1/users/me/loans` | Authenticated | User's own active & closed loans |
| | `GET` | `/api/v1/users/me/payments` | Authenticated | User's own payment history |
| | `GET` | `/api/v1/users/me/notifications` | Authenticated | User's notifications |
| **Admin API** | `GET` | `/api/v1/admin/users` | `ADMIN` | Paginated users list |
| | `GET` | `/api/v1/admin/users/:id` | `ADMIN` | User account dossier |
| | `PUT` | `/api/v1/admin/users/:id/status` | `ADMIN` | Activate / suspend user account |
| | `PUT` | `/api/v1/admin/users/:id/role` | `ADMIN` | Change role between ADMIN/USER |
| | `GET` | `/api/v1/admin/applications` | `ADMIN` | All applications across platform |
| | `POST` | `/api/v1/admin/applications/:id/review` | `ADMIN` | Underwriting review & risk assessment |
| | `POST` | `/api/v1/admin/applications/:id/approve` | `ADMIN` | Committee approval with loan terms |
| | `POST` | `/api/v1/admin/applications/:id/reject` | `ADMIN` | Rejection (requires rejectionReason) |
| | `GET` | `/api/v1/admin/loans` | `ADMIN` | Master loan ledger directory |
| | `POST` | `/api/v1/admin/loans/:id/disburse` | `ADMIN` | Disburse loan & activate schedules |
| | `GET` | `/api/v1/admin/payments` | `ADMIN` | All recorded payment receipts |
| | `GET` | `/api/v1/admin/overdue` | `ADMIN` | Overdue portfolio watchlist |
| | `POST` | `/api/v1/admin/overdue/run-check` | `ADMIN` | Trigger server overdue scan |
| | `GET` | `/api/v1/admin/reports/*` | `ADMIN` | Portfolio, delinquent, collection reports |
| | `GET` | `/api/v1/admin/audit-logs` | `ADMIN` | Forensic system audit trail |
| **Products** | `GET` | `/api/v1/products` | Authenticated | Catalog of loan products |
| | `POST` | `/api/v1/products` | `ADMIN` | Create new loan product |
| **Calculator** | `POST` | `/api/v1/calculator/preview` | Authenticated | Live calculation preview |
| **Notifications** | `GET` | `/api/v1/notifications` | Authenticated | Paginated in-app notifications |
| | `PATCH` | `/api/v1/notifications/:id/read` | Authenticated | Mark notification as read |
| | `POST` | `/api/v1/notifications/read-all` | Authenticated | Mark all notifications read |
| **API Docs** | `GET` | `/api/v1/docs` | Public | Interactive Swagger UI |
| | `GET` | `/api/v1/openapi.json` | Public | OpenAPI 3.0 specification JSON |

---

## 📱 Mobile Application Readiness

The backend REST API is engineered so that future mobile applications (iOS and Android via React Native, Expo, Flutter, or Swift/Kotlin) can consume the exact same endpoints without requiring special mobile-only backend endpoints:
1. **Clean REST JSON Contracts**: All endpoints return standard `{ success: true, data: ..., meta: ... }` responses.
2. **Standard HTTP Statuses**: `200`, `201`, `400` (Validation), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found).
3. **Idempotent Payment Submissions**: Prevents duplicate charges during intermittent mobile cellular reconnections.
4. **Device Session Tracking**: Multi-device login support with independent refresh token rotation.
5. **No Client-Side Calculations**: The mobile app is a clean presentation client; all amortization schedules and fee math are performed by the backend.
6. **Self-Service API Namespace**: Full `/api/v1/users/me/*` suite allows building the entire user mobile experience without touching admin endpoints.

---

## ⚙️ Environment Variables & Configuration

Create `.env` based on `.env.example`:

```ini
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loansystem_db?schema=public"

# Application Server
NODE_ENV="production"
PORT=5000
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"

# CORS Allowed Origins (Comma-separated)
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,https://loufong.github.io"

# Cryptography & Security
JWT_SECRET="replace-with-a-secure-random-64-character-secret-in-production"
JWT_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"

# Real Gmail SMTP Configuration (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-real-gmail@gmail.com"
EMAIL_PASSWORD="your-16-character-google-app-password"
EMAIL_FROM="Apex LMS <noreply@gmail.com>"

# KYC & Loan Document Storage Configuration (LOCAL, S3, SUPABASE, CLOUDINARY)
STORAGE_DRIVER="LOCAL"
AWS_S3_BUCKET="apex-lms-documents"
AWS_S3_REGION="ap-southeast-1"
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v20.x or higher
- PostgreSQL 14+ database instance
- npm v10+

### Steps
```bash
# 1. Install root dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Validate database connection & schema
npx prisma validate

# 4. Build backend TypeScript
npm run build

# 5. Install and build frontend
npm --prefix frontend install
npm --prefix frontend run build
```

---

## 🧪 Automated Verification & Test Suites

The codebase includes 11 dedicated test suites covering 100% of the loan lifecycle and two-tier security boundary:

```bash
npm test
```

### Test Suites Included
1. `test/two-tier-auth-rbac.test.ts` — Tests ADMIN & USER roles, registration, OTP hashing, rate limits, `/api/v1/users/me`, ownership guards, and 403 blocks.
2. `test/security.test.ts` — Verifies bcrypt hashing, JWT tampering defense, SQL injection protection, and token expiration.
3. `test/borrower-product.test.ts` — Verifies borrower validation, product limit constraints, and PII masking.
4. `test/loan-calculator.test.ts` — Tests simple interest, reducing balance EMI, and penny-perfect installment reconciliation.
5. `test/integration-workflow.test.ts` — End-to-end integration covering DTI assessment, disbursement guards, multi-installment waterfall repayments, and KPI aggregations.
6. `test/api-endpoints.test.ts` — Verifies standard response envelopes, error schemas, route guards, and preview endpoints.
7. `test/application-approval-workflow.test.ts` — Multi-stage application state transitions, DTI risk grading, product limits, and review/approval guards.
8. `test/loan-disbursement.test.ts` — Disbursement guards, schedule generation, and ledger status transitions.
9. `test/payment-reconciliation.test.ts` — Waterfall payment allocation, partial settlement, loan completion transition, and sequential receipt numbers.
10. `test/overdue-detection.test.ts` — Overdue detection queries, daily late fees (0.1%/day), automated cron registration, and notification generation.
11. `test/kpi-reporting.test.ts` — Real database KPI aggregations, CSV formula injection sanitization, and regulatory export streams.

---

## 🌐 Frontend & GitHub Pages SPA Routing

The frontend is a Vite + React application styled in clean, professional banking style with **zero gradients**:
- **Design Tokens**: `#0F172A` (Navy), `#2563EB` (Blue), `#CBD5E1` (Border), `#F8FAFC` (Canvas), `#FFFFFF` (Surface).
- **GitHub Pages Deep-Link Routing**: `frontend/public/404.html` converts any direct link (e.g., `/admin/dashboard`, `/user/profile`) into a SPA redirect parameter decoded by `index.html` via `window.history.replaceState`. Direct browser reloads never produce a permanent 404 error.
- **Client Route Guards**: Unauthenticated users are redirected to `/login`. Normal `USER` accounts attempting to navigate to `/admin/*` are immediately blocked with an Access Denied view.

---

## 🔒 Security & Compliance

- **Bcrypt Hashing**: Passwords are encrypted with 10 salt rounds.
- **OTP Security**: 6-digit OTPs are hashed using SHA-256 before storage in PostgreSQL. OTP values are never returned in API responses or written to production logs.
- **Ownership Checks (ABAC)**: All user-facing `/api/v1/users/me/*` endpoints enforce strict ID matching against the authenticated JWT session.
- **Role Verification (RBAC)**: All administrative endpoints require `role === 'ADMIN'`. Role is never trusted from client request bodies.
- **Payment Idempotency**: `Idempotency-Key` headers prevent duplicate transactions on network retries.
- **CSV Injection Defense**: Leading characters (`=`, `+`, `-`, `@`) in CSV exports are prefixed with `'` to prevent formula execution in spreadsheet software.
- **No Secrets in Source**: `.env` and sensitive tokens are strictly excluded by `.gitignore`. `.env.example` provides non-sensitive placeholders only.

---

*Enterprise Loan Management System — Verified for real-world production deployment and mobile client integration.*
