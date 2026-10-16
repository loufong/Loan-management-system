# Apex Loan Management System (LMS) — Production Enterprise Platform

A comprehensive, production-grade Loan Management System (LMS) engineered with a clean layered architecture, robust financial calculation engine, PostgreSQL core banking ledger, and a clean professional banking user interface.

GitHub Repository: [https://github.com/loufong/Loan-management-system](https://github.com/loufong/Loan-management-system)  
Live Frontend Deployment: [https://loufong.github.io/Loan-management-system/](https://loufong.github.io/Loan-management-system/)

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Features](#-core-features)
3. [Technology Stack](#-technology-stack)
4. [System Architecture](#-system-architecture)
5. [User Roles & RBAC Matrix](#-user-roles--rbac-matrix)
6. [Complete Loan Lifecycle Workflow](#-complete-loan-lifecycle-workflow)
7. [Financial Calculations & Decimal Safety](#-financial-calculations--decimal-safety)
8. [Installation & Setup](#-installation--setup)
9. [Environment Variables](#-environment-variables)
10. [Database Setup & Prisma Migrations](#-database-setup--prisma-migrations)
11. [Development & Seed Data](#-development--seed-data)
12. [Running Frontend & Backend](#-running-frontend--backend)
13. [Testing & Verification](#-testing--verification)
14. [Deployment (GitHub Pages & Backend)](#-deployment)
15. [REST API Overview](#-rest-api-overview)
16. [Security & Compliance](#-security--compliance)
17. [Production Operational Notes](#-production-notes)

---

## 🌟 Project Overview
Apex LMS manages the entire lifecycle of consumer, student, personal, and business micro-lending. Every single operation—from self-service borrower onboarding, underwriting review, credit assessment, manager approval, cashier disbursement, multi-installment waterfall reconciliation, overdue scanning with late fees, to full loan payoffs and immutable audit trails—is backed by real ACID database transactions in PostgreSQL.

There is zero fake data, no simulated mock states, and no hardcoded dashboard metrics. Every KPI is aggregated directly from live database tables.

---

## ⚡ Core Features
- **Borrower Self-Service**: Borrower registration with email OTP verification, complete KYC profile management, real-time application tracker, loan schedule viewer, and downloadable payment receipts.
- **Credit Assessment & DTI Engine**: Real-time Debt-to-Income (DTI) computation, risk tier classification (`LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`), and loan officer underwriting recommendations.
- **Strict Multi-Stage Approval**: Committee governance where managerial approval activates loan ledgers; rejection strictly requires a non-empty regulatory audit reason.
- **Window Cashier Terminal**: Real-time disbursement with reference tracking and automated generation of 100% database-persisted repayment installments.
- **Waterfall Payment Processing**: Automated multi-installment allocation (allocates payments to oldest unpaid installments, splits partial payments, decrements balances, and detects loan completion).
- **Automated Overdue Engine**: Automated daily cron job and on-demand trigger flagging delinquent installments (`current_date > due_date` and `remaining > 0`), calculating days overdue and accrued late fee penalties.
- **Role-Based Dashboards**: Tailored real-time dashboards for all 6 roles: Administrator, Branch Manager, Loan Underwriter, Credit Officer, Teller/Cashier, and Borrower.
- **Enterprise Reporting & CSV Export**: Real-time regulatory reports for Active Portfolio, Delinquencies, Daily Collections, Loan Products, and System Audit Logs with 1-click RFC 4180-compliant CSV exports.
- **Enterprise UI/UX**: Professional banking interface styled in crisp slate/white/indigo tokens with subtle borders and zero gradients.

---

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js (v20+ LTS)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma ORM v5 (21 relational schema tables)
- **Security**: JWT (Access & Refresh tokens), bcryptjs password hashing (10 salt rounds), Helmet security headers, CORS origin verification
- **Validation**: Zod schema DTO validation with custom sanitizers
- **Mailing**: Nodemailer with Gmail SMTP and development simulation fallback

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite v5 (SPA with GitHub Pages 404 router redirect)
- **Styling**: Tailwind CSS (Enterprise Banking Theme: `#0F172A`, `#2563EB`, `#CBD5E1`, `#F8FAFC`, zero gradients)
- **Icons**: Lucide React
- **State & Data**: Custom typed API client with token lifecycle handling and active role sync

---

## 🏛 System Architecture
```
                         [ Client Browser / SPA ]
                                    │
                         [ GitHub Pages / CDN ]
                                    │
                               (HTTPS API)
                                    │
                      [ Express.js REST Gateway ]
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
[ Helmet & CORS ]                                         [ Rate Limiting ]
    │                                                               │
[ JWT Authentication ]                                    [ Session Guards ]
    │                                                               │
[ Role-Based Access Control (RBAC) ]                      [ Ownership ABAC ]
    │                                                               │
[ Zod DTO Validation ]                                    [ Error Handling ]
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
  [ Domain Services ]                           [ Loan Calculator Engine ]
  - AuthService & OTP                           - Simple Interest
  - ApplicationService                          - Reducing Balance (EMI)
  - LoanService (Disbursement)                  - Penny Reconciliation
  - PaymentService (Waterfall)                  - Overdue Penalty Calc
  - OverdueService & Alerts                                 │
  - ReportService & CSV Export                              │
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    │
                        [ Prisma ORM Client ]
                                    │
                      (ACID Database Transactions)
                                    │
                     [ PostgreSQL Database Engine ]
```

---

## 👥 User Roles & RBAC Matrix

| Role | Navigation & Permissions | Primary Responsibilities |
|---|---|---|
| `ADMIN` | User Management, Loan Products, Audit Logs, Portfolio Reports, System Settings | Super-admin, system governance, account activation, product rules. |
| `MANAGER` | Committee Approvals, Portfolio Overview, Disbursements, Collections, Reports | Final approval/rejection decision maker, high-level portfolio supervisor. |
| `LOAN_OFFICER` | Loan Applications, KYC Verification, Underwriting Reviews, Borrower Profiles | Initial application review, document inspection, borrower verification. |
| `CREDIT_OFFICER`| Risk Assessments, DTI Computations, Credit Scoring, Risk Classification | Financial analysis, debt-to-income risk evaluation, credit recommendations. |
| `CASHIER` | Disbursements Queue, Payment Collection Terminal, Receipts, Overdue Ledger | Fund disbursement, payment receipt issuance, daily POS reconciliation. |
| `BORROWER` | Self-Service Portal, Product Catalog, Loan Application Wizard, Payment History | Loan applications, document uploads, repayment tracking, receipt printing. |

---

## 🔄 Complete Loan Lifecycle Workflow

```
[ 1. Borrower Registration ]
             │
[ 2. OTP Verification ] ──> Promotes account to permanent User & Borrower record
             │
[ 3. Product Selection ] ──> Choose terms, repayment frequency & amount
             │
[ 4. Submit Application ] ──> Status: SUBMITTED (Assigned APP-YYYY-XXXX)
             │
[ 5. Loan Officer Review ] ──> Status: UNDER_REVIEW (Underwriting notes recorded)
             │
[ 6. Credit Assessment ] ──> DTI calculated, risk tier assigned (LOW/MED/HIGH)
             │
[ 7. Manager Approval ] ──> APPROVED (or REJECTED with mandatory audit reason)
             │
[ 8. Cashier Disbursement ] ──> Creates Loan (LN-YYYY-XXXX), Status: ACTIVE
             │                  Generates RepaymentSchedule records in PostgreSQL
             │
[ 9. Payment Collection ] ──> Cashier records cash/transfer/card payment
             │                Waterfall engine updates installments, decrements balance
             │                Issues official Receipt (REC-YYYY-XXXX)
             │
[ 10. Overdue Check ] ──> Automated scan identifies late installments, applies late fees
             │
[ 11. Loan Completion ] ──> When balance = $0.00, Loan status becomes COMPLETED
```

---

## 🧮 Financial Calculations & Decimal Safety

### 1. Simple Interest (Annual Fixed Rate)
$$\text{Interest} = \text{Principal} \times \left(\frac{\text{Annual Rate}}{100}\right) \times \left(\frac{\text{Months}}{12}\right)$$
$$\text{Total Repayment} = \text{Principal} + \text{Interest}$$
$$\text{Installment Amount} = \frac{\text{Total Repayment}}{N}$$

### 2. Reducing Balance (Equated Monthly Installment - EMI)
$$\text{Periodic Rate } r = \frac{\text{Annual Rate}}{P \times 100} \quad (P = 12 \text{ Monthly}, 26 \text{ Biweekly}, 52 \text{ Weekly})$$
$$\text{Installment (EMI)} = \frac{\text{Principal} \times r \times (1 + r)^N}{(1 + r)^N - 1}$$

### 3. Penny-Perfect Reconciliation
To eliminate fractional cent drift in financial accounting, the final installment absorbs fractional cent differences:
$$\text{Final Principal} = \text{Principal} - \sum_{i=1}^{N-1} \text{Principal}_i$$
$$\text{Final Interest} = \text{Total Interest} - \sum_{i=1}^{N-1} \text{Interest}_i$$
Guaranteed: $\sum \text{Principal} \equiv \text{Principal}$ and $\sum \text{Interest} \equiv \text{Total Interest}$.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v20.x or higher
- PostgreSQL 14+ database instance
- npm v10+

### Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/loufong/Loan-management-system.git
   cd Loan-management-system
   ```

2. **Install root & backend dependencies**:
   ```bash
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

---

## ⚙️ Environment Variables

Create `.env` in the root directory based on `.env.example`:
```ini
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loansystem_db?schema=public"

# Application Server
NODE_ENV="production"
PORT=5000
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"

# Cryptography & Security
JWT_SECRET="super-secure-production-jwt-secret-key-2026-apex-lms"
JWT_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"

# Gmail SMTP Configuration (Optional - falls back to dev OTP simulation)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-google-app-password"
EMAIL_FROM="Apex LMS <noreply@apex.local>"
```

For frontend production deployment, create `frontend/.env`:
```ini
VITE_API_URL="https://api.yourdomain.com/api/v1"
```

---

## 🗄 Database Setup & Prisma Migrations

1. **Push Prisma schema to PostgreSQL**:
   ```bash
   npx prisma db push
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Seed Database with Standard Initial Accounts & Loan Products**:
   ```bash
   npm run seed
   ```

---

## 👥 Development & Seed Accounts

All development and test accounts are configured with password: `Password123!`

| Role | Username | Email | Permissions / Notes |
|---|---|---|---|
| **Admin** | `admin` | `admin@loansystem.edu` / `admin@apex.local` | Full system control, user management, audit logs |
| **Branch Manager** | `manager` | `manager@apex.local` | Final loan approvals & rejections, committee control |
| **Loan Officer** | `officer` | `officer@apex.local` | Application review, underwriting recommendations |
| **Credit Officer** | `credit` | `credit@apex.local` | Credit assessment, DTI scoring, risk tiers |
| **Cashier / Teller** | `cashier` | `cashier@apex.local` | Fund disbursement, payment collection, POS receipts |
| **Borrower** | `borrower` | `borrower@apex.local` | Self-service loan applications, payments, schedule |

> [!NOTE]
> Seed accounts are strictly development sample accounts. Real production instances require replacing default credentials upon initialization.

---

## 🏃 Running Frontend & Backend

### Running Backend (Development)
```bash
npm run dev
# Server listens at http://localhost:5000
```

### Running Frontend (Development)
```bash
cd frontend
npm run dev
# Frontend runs at http://localhost:3000 (Vite HMR)
```

### Production Build
```bash
# Build Backend TypeScript
npm run build

# Build Frontend Bundle
npm --prefix frontend run build
```

---

## 🧪 Testing & Verification

The system includes comprehensive automated testing:

```bash
# 1. Run all unit and integration test suites
npm test

# 2. Run Section 60 Complete Live E2E Verification against PostgreSQL
npx ts-node test/final-section-60-e2e.ts
```

### Test Coverage Highlights
- ✅ Borrower Registration & OTP Verification
- ✅ JWT Authentication & RBAC Route Protection
- ✅ Multi-Stage Application Workflow (Draft → Review → Assessment → Approval)
- ✅ Rejection Reason Enforcement (Fails with 400 when reason is missing)
- ✅ Cashier Disbursement & Repayment Schedule Activation in PostgreSQL
- ✅ Waterfall Payment Allocation across Multiple Installments
- ✅ Overdue Scan Engine & Accrued Late Fee Accrual
- ✅ Loan Completion Lifecycle Transition
- ✅ Real Database KPI Aggregations
- ✅ Immutable Regulatory Audit Logs & CSV Exports

---

## 🌐 Deployment

### Frontend (GitHub Pages)
The frontend is pre-configured for automated continuous deployment to GitHub Pages:
- Static assets build with relative path resolution (`base: './'`).
- The `404.html` SPA redirect script automatically converts deep links (e.g. `/admin/dashboard`) to route parameters, which `index.html` resolves via `window.history.replaceState`.
- Automated GitHub Actions workflow located in `.github/workflows/deploy-pages.yml`.

### Backend
Deploy the Node.js backend using PM2, Docker, or serverless container services (e.g., Render, Railway, AWS ECS):
```bash
npm run build
NODE_ENV=production node dist/server.js
```

---

## 📡 REST API Overview

All API endpoints are mounted under `/api/v1` (with `/api` compatibility aliases):

| Category | Endpoint | Methods | Description |
|---|---|---|---|
| **Authentication** | `/api/v1/auth/register` | `POST` | Self-service registration (generates 6-digit OTP) |
| | `/api/v1/auth/verify-otp` | `POST` | Validates OTP & promotes to permanent PostgreSQL user |
| | `/api/v1/auth/login` | `POST` | Authenticates user & issues JWT access/refresh tokens |
| | `/api/v1/auth/me` | `GET` | Returns authenticated user profile and permissions |
| **Borrowers** | `/api/v1/borrowers` | `GET`, `POST` | Paginated borrower directory & KYC onboarding |
| | `/api/v1/borrowers/:id` | `GET`, `PUT` | Full borrower profile & application history |
| **Loan Products** | `/api/v1/products` | `GET`, `POST` | Loan catalog management with limits & interest rules |
| **Applications** | `/api/v1/applications` | `GET`, `POST` | Application submission & status directory |
| | `/api/v1/applications/:id/review` | `POST` | Underwriting review & credit risk assessment |
| | `/api/v1/applications/:id/approve` | `POST` | Committee approval with loan terms |
| | `/api/v1/applications/:id/reject` | `POST` | Committee rejection (requires `rejectionReason`) |
| **Loans & Disbursements**| `/api/v1/loans` | `GET` | Master loan ledger directory with status filters |
| | `/api/v1/loans/:id/schedules` | `GET` | Amortization repayment schedule installments |
| | `/api/v1/loans/disburse` | `POST` | Cashier window disbursement & schedule generation |
| **Payments** | `/api/v1/payments` | `POST` | Payment processing with multi-installment waterfall |
| | `/api/v1/payments/receipt/:receiptNo` | `GET` | Official printable payment receipt |
| **Overdue Engine** | `/api/v1/overdue/run-check` | `POST` | Triggers automated overdue scan & late fee penalties |
| | `/api/v1/overdue/loans` | `GET` | Delinquent accounts ledger with days overdue |
| **Reports** | `/api/v1/reports/active-loans` | `GET` | Active portfolio report with `?export=csv` |
| | `/api/v1/reports/overdue-loans` | `GET` | Delinquent accounts report with `?export=csv` |
| | `/api/v1/reports/daily-collections`| `GET` | Grouped collections by cashier with `?export=csv` |
| | `/api/v1/reports/audit-logs` | `GET` | Immutable audit trail with `?export=csv` |
| **Dashboard** | `/api/v1/dashboard/kpis` | `GET` | Live PostgreSQL aggregations (Disbursed, Collected, Rates) |

---

## 🔒 Security & Compliance
- **Password Security**: Passwords hashed with bcrypt (salt rounds: 10). Plaintext passwords are never logged or stored.
- **Account Enumeration Defense**: Generic error messages on authentication failures prevent credential enumeration.
- **Role-Based & Object-Level Access**: Route middleware enforces role permissions (`checkRole`) and ownership checks (`checkOwnership`) so borrowers cannot access other borrowers' data.
- **Immutable Audit Trail**: Financial actions (approvals, disbursements, payments, role changes) generate write-only audit logs with timestamps, user IDs, and client IP addresses.
- **CSV Formula Injection Sanitization**: All exported CSV cells starting with `=`, `+`, `-`, or `@` are escaped with leading single quotes to prevent spreadsheet execution vulnerabilities.

---

## 📋 Production Notes
1. **Database Connection Pooling**: Ensure `DATABASE_URL` specifies proper connection limits (`?connection_limit=20`) when running under container clusters.
2. **Reverse Proxy Configuration**: When running behind Nginx or AWS ALB, ensure `X-Forwarded-For` and `X-Forwarded-Proto` headers are passed to enable accurate client IP tracking in audit logs.
3. **Automated Cron Jobs**: The system registers automated daily scans for delinquent loans (`00:01` daily). In multi-instance deployments, use a distributed scheduler (or call `/api/v1/overdue/run-check` via cron) to prevent redundant concurrent scans.

---

*Engineered with precision for real-world academic and commercial micro-lending programs.*
