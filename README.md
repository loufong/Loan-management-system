<<<<<<< HEAD
# My Loan Management System README
=======
# Academic Loan Management System (LMS) - Enterprise Documentation

A production-grade, enterprise-ready Loan Management System (LMS) designed for academic institutions, universities, and micro-lending programs. Built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

---

## 🏛️ System Architecture

The system implements a clean **Layered Architecture**:
```
                      [ Incoming HTTP Request ]
                                 │
                   [ Helmet & CORS Security Headers ]
                                 │
                 [ JWT Authentication: Bearer Token ]
              (Validates Signature, Expiry, User Status)
                                 │
               [ Role & Permission Guards (RBAC / PBAC) ]
              (checkRole([...]), checkPermission([...]))
                                 │
              [ Object-Level Ownership Filter (ABAC) ]
            (enforceBorrowerOwnership / Scope to User ID)
                                 │
                   [ Zod Request Validation DTOs ]
            (createBorrowerSchema, createProductSchema)
                                 │
           [ Financial Calculation Engine (LoanCalculatorService) ]
          (Simple Interest, Reducing Balance EMI, Penny Reconcile)
                                 │
                       [ Domain Service Logic ]
                   (prisma.$transaction atomicity)
                                 │
                     [ Sensitive PII Data Masking ]
                   (maskIdNumber, maskPhone, maskEmail)
                                 │
                      [ Compliance Audit Trail ]
                    (Automatic AuditLog Persisted)
```

---

## 🧮 Financial Calculation Engine (`LoanCalculatorService`)

The system features a dedicated mathematical calculation engine supporting both Simple Interest and Reducing Balance (EMI) amortization models with penny-perfect rounding reconciliation.

### 1. Simple Interest Model (Default LMS Rule)
$$\text{Interest} = \text{Principal} \times \left(\frac{\text{Annual Rate}}{100}\right) \times \left(\frac{\text{Term in Months}}{12}\right)$$
$$\text{Total Repayment} = \text{Principal} + \text{Total Interest}$$
$$\text{Installment Amount} = \frac{\text{Total Repayment}}{N}$$

**Installment Count ($N$) Calculation**:
- **Monthly**: $N = \text{termMonths}$
- **Biweekly**: $N = \text{round}\left(\frac{\text{termMonths} \times 26}{12}\right)$ (26 payments/year)
- **Weekly**: $N = \text{round}\left(\frac{\text{termMonths} \times 52}{12}\right)$ (52 payments/year)

### 2. Reducing Balance / Amortization Model (Equated Monthly Installment - EMI)
$$\text{Periodic Rate } r = \frac{\text{Annual Rate}}{P \times 100} \quad (P = 12 \text{ for Monthly}, 26 \text{ for Biweekly}, 52 \text{ for Weekly})$$
$$\text{EMI} = \frac{\text{Principal} \times r \times (1 + r)^N}{(1 + r)^N - 1}$$
*(When $r = 0$, $\text{EMI} = \frac{\text{Principal}}{N}$ to prevent zero-division).*

### 3. Penny-Perfect Rounding Reconciliation (Zero Cent Drift)
Financial systems suffer from fractional cent drift when dividing odd totals (e.g., $1,000 / 3 = 333.333...$). The engine reconciles the final installment:
$$\text{Final Principal} = \text{Principal} - \sum_{i=1}^{N-1} \text{Principal}_i$$
$$\text{Final Interest} = \text{Total Interest} - \sum_{i=1}^{N-1} \text{Interest}_i$$
Guaranteed: $\sum \text{Principal} \equiv \text{Principal}$ and $\sum \text{Interest} \equiv \text{Total Interest}$.

---

## 📡 REST API Reference

All core routes are mounted under `/api/v1` and `/api`.

### 1. Standalone Loan Calculator (`POST /api/calculator` & `POST /api/v1/calculator`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/calculator` | Public | Standalone financial calculation engine. Generates summary metrics and unpersisted preview schedule. |

**Request Body Example**:
```json
{
  "principal": 10000,
  "rate": 12.0,
  "term": 12,
  "repaymentFrequency": "MONTHLY",
  "interestMethod": "SIMPLE_INTEREST",
  "startDate": "2026-10-01"
}
```

**Response Example**:
```json
{
  "success": true,
  "message": "Loan quote and amortization preview generated successfully",
  "data": {
    "principal": 10000,
    "annualInterestRate": 12,
    "termMonths": 12,
    "repaymentFrequency": "MONTHLY",
    "interestMethod": "SIMPLE_INTEREST",
    "installmentCount": 12,
    "installmentAmount": 933.33,
    "totalInterest": 1200,
    "totalRepayment": 11200,
    "startDate": "2026-10-01T00:00:00.000Z",
    "maturityDate": "2027-10-01T00:00:00.000Z",
    "schedules": [
      {
        "installmentNo": 1,
        "dueDate": "2026-11-01T00:00:00.000Z",
        "principalAmount": 833.33,
        "interestAmount": 100,
        "totalDue": 933.33,
        "remainingBalance": 9166.67,
        "status": "UPCOMING"
      },
      ...
    ]
  }
}
```

---

### 2. Borrower Management (`/api/v1/borrowers`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/borrowers` | Staff / Borrower | Paginated directory. Multi-field search (`search`, `borrowerId`, `phone`, `email`, `status`). PII masked for unprivileged staff. |
| `GET` | `/api/v1/borrowers/:id` | Authenticated | Full borrower profile with applications, loans, and aggregated payment history. Ownership-scoped. |
| `POST` | `/api/v1/borrowers` | Loan Officer / Admin | Onboard new borrower. Validates phone/email/income & auto-generates `BOR-YYYY-XXXX`. |
| `PUT` | `/api/v1/borrowers/:id` | Loan Officer / Admin / Owner | Update borrower profile. |
| `DELETE` | `/api/v1/borrowers/:id` | Manager / Admin | Deactivate borrower. Guard prevents deactivation if active loans exist. |
| `PATCH` | `/api/v1/borrowers/:id/deactivate` | Manager / Admin | Deactivate borrower alias. |

---

### 3. Loan Product Management (`/api/v1/loan-products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/loan-products` | Public | List products with range filters (`minAmount`, `maxAmount`, `minInterestRate`, `maxInterestRate`, `term`, `status`). |
| `GET` | `/api/v1/loan-products/:id` | Public | Product parameters, limits, and active loan counts. |
| `POST` | `/api/v1/loan-products` | Manager / Admin | Create loan product with check constraint validation (`min <= max`). |
| `PUT` | `/api/v1/loan-products/:id` | Manager / Admin | Update product limits, rates, or descriptions. |
| `PATCH` | `/api/v1/loan-products/:id/toggle-status`| Manager / Admin | Toggle product status between `ACTIVE` and `INACTIVE`. |
| `POST` | `/api/v1/loan-products/calculate` | Public | Real-time amortization schedule calculator. |

---

### 4. Authentication & Sessions (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Login with username/email & password. Returns 15m `accessToken` & 7d `refreshToken`. |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh token rotation. |
| `POST` | `/api/v1/auth/register` | Public | Self-onboard new borrower account. |
| `GET` | `/api/v1/auth/me` | Authenticated | View authenticated profile & permissions. |
| `PUT` | `/api/v1/auth/profile` | Authenticated | Update user full name, phone number, department. |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Change password & revoke all active sessions. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke refresh token. |

---

### 5. Loan Origination & Servicing (`/api/v1/loan-applications`, `/api/v1/loans`, `/api/v1/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/loan-applications` | Borrower / Officer | Submit application (`APP-YYYY-XXXX`). |
| `POST` | `/api/v1/loan-applications/:id/review` | Credit Officer | Underwriting review & recommendation. |
| `POST` | `/api/v1/loan-applications/:id/approve` | Manager / Admin | Committee approval (automatically generates `Loan` ledger). |
| `POST` | `/api/v1/loans/:id/disburse` | Cashier / Manager | Disburse funds & activate amortization installments. |
| `POST` | `/api/v1/payments` | Cashier | Collect payment & reconcile schedule installments. |
| `GET` | `/api/v1/payments/receipt/:receiptNo` | Authenticated | Official payment receipt (`REC-YYYY-XXXX`). |
| `GET` | `/api/v1/dashboard/metrics` | Staff | Institutional portfolio KPI dashboard. |

---

### 6. Automated Overdue Engine & Late Fees (`/api/v1/overdue`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/overdue/trigger-check` | Manager / Admin | Conducts database scan for past-due installments, updates statuses to `OVERDUE`, accrues 0.1%/day late fee penalties, and dispatches reminders. |
| `GET` | `/api/v1/overdue/loans` | Staff | Returns all delinquent accounts with accrued penalty calculations and days overdue. |

---

### 7. BI Analytics & Portfolio Reporting (`/api/v1/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/reports/summary-kpis` | Staff | Executive KPIs: Approval Rate %, Repayment Rate %, Overdue Risk Rate %. |
| `GET` | `/api/v1/reports/loans/export-csv` | Staff | Regulatory portfolio audit ledger exported to downloadable CSV file. |
| `GET` | `/api/v1/reports/portfolio-aging` | Staff | Delinquency aging buckets (Current, 1-30 days, 31-60 days, 90+ days). |

---

## 💻 Interactive Frontend Single-Page Application (SPA)

The system includes a rich, responsive **React 18 + Tailwind CSS** Single-Page Application with dark mode glassmorphism served directly by Express at:
```
http://localhost:5000/  or  http://localhost:5000/app
```

### Key UI Features:
1. **Interactive Role Switcher**: Instant switching between all 6 roles (Borrower, Loan Officer, Credit Officer, Cashier, Manager, Admin) without re-authenticating.
2. **Borrower Self-Service Portal**: Active loan account telemetry, repayment progress ring, next installment countdown banner, and digital receipt viewer.
3. **5-Step Loan Application Wizard**: Product selection, KYC income verification, slider terms, real-time Debt-to-Income (DTI) risk simulator, and pre-submission confirmation.
4. **Credit Underwriting Console**: Real-time DTI score computation, risk tier badges (`LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`), and officer recommendation submission.
5. **Committee Approvals Modal**: Executive approval/rejection with custom terms and audit rationale.
6. **Cashier Repayment Terminal**: Live **Waterfall Allocation** across multiple installments, balance decrement, and official printable digital receipts (`REC-YYYY-XXXX`).
7. **Overdue Automation Console**: Delinquency ledger, 0.1%/day late fee accrued counter, and 1-click background audit scan trigger.
8. **BI & Analytics Viewer**: Aging bucket distributions, product breakdown, and CSV export trigger.
9. **Standalone Loan Calculator Modal**: Simple interest vs reducing balance (EMI) toggle with penny-perfect amortization schedules.

---

## 🧪 Automated Test Suites

Run all test suites with a single command:
```bash
# Execute entire automated test suite (All 4 modules)
npm test
```

Or execute individual test suites:
```bash
# 1. Security & RBAC Test Suite
npx ts-node test/security.test.ts

# 2. Borrower & Loan Product Test Suite
npx ts-node test/borrower-product.test.ts

# 3. Financial Calculation Engine & Loan Calculator Test Suite
npx ts-node test/loan-calculator.test.ts

# 4. End-to-End Workflow & Integration Test Suite
npx ts-node test/integration-workflow.test.ts

# 5. Production TypeScript Build Check
npm run build
```

---

## 👥 Seed Accounts (Default Password: `Password123!`)

| Username | Email | Role | Full Name | Department / Position |
|---|---|---|---|---|
| `admin` | `admin@loansystem.edu` | `ADMIN` | Dr. Alexander Wright | IT & Systems Governance |
| `m.vance` | `marcus.vance@loansystem.edu` | `MANAGER` | Marcus Vance, MBA | Head of Financial Aid & Lending |
| `s.chen` | `sarah.chen@loansystem.edu` | `CREDIT_OFFICER` | Dr. Sarah Chen | Senior Credit Risk Analyst |
| `d.miller` | `david.miller@loansystem.edu` | `LOAN_OFFICER` | David Miller | Senior Loan Origination Officer |
| `e.ross` | `emily.ross@loansystem.edu` | `CASHIER` | Emily Ross | University Bursar & Lead Cashier |
| `j.doe` | `johnathan.doe@student.edu` | `BORROWER` | Johnathan Doe | Graduate Research Assistant |
| `m.garcia` | `maria.garcia@student.edu` | `BORROWER` | Maria Garcia | Undergraduate Senior |

---

## 📚 Academic Documentation & Defense Script
For detailed academic defense papers, Mermaid architecture diagrams, LaTeX mathematical formulas, and a 7-minute live presentation script, refer to:
[Academic Project Documentation](file:///e:/Loan/Loansystem/docs/academic_project_documentation.md)

>>>>>>> 3713fa2 (feat: complete refactor of Apex LMS core banking platform with 3D tactile UI and 4 consolidated roles)
