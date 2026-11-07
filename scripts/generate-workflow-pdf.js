const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputPdfPath = path.resolve(__dirname, '..', 'Jam_Song_Vich_Loan_Management_System_Complete_Workflow_and_Specification.pdf');
const tempHtmlPath = path.resolve(__dirname, 'temp_workflow_report.html');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Jam Song Vich | Loan Management System - Complete System Workflow & Architecture</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.5;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Cover Page */
    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px 10px;
    }

    .cover-top {
      border-top: 6px solid #2563EB;
      padding-top: 30px;
    }

    .badge-pill {
      display: inline-block;
      padding: 4px 12px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 4px;
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
      margin-bottom: 20px;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.15;
      margin: 0 0 10px 0;
    }

    .cover-subtitle {
      font-size: 16pt;
      font-weight: 500;
      color: #475569;
      margin: 0 0 25px 0;
    }

    .cover-desc {
      font-size: 11pt;
      color: #64748B;
      max-width: 600px;
      line-height: 1.6;
    }

    .cover-meta {
      border-top: 1px solid #E2E8F0;
      padding-top: 20px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      font-size: 9.5pt;
    }

    .meta-item strong {
      display: block;
      color: #0F172A;
      font-size: 10pt;
    }

    .meta-item span {
      color: #64748B;
    }

    /* Standard Layout */
    h1, h2, h3, h4 {
      color: #0F172A;
      font-weight: 700;
      margin-top: 0;
    }

    h1 {
      font-size: 19pt;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 6px;
      margin-bottom: 16px;
      margin-top: 20px;
    }

    h2 {
      font-size: 14pt;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
      margin-bottom: 12px;
      margin-top: 18px;
      color: #1E293B;
    }

    h3 {
      font-size: 11.5pt;
      margin-bottom: 8px;
      margin-top: 14px;
      color: #334155;
    }

    p {
      margin: 0 0 10px 0;
      color: #334155;
      line-height: 1.55;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 9pt;
    }

    th, td {
      border: 1px solid #CBD5E1;
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
    }

    tr:nth-child(even) {
      background-color: #F8FAFC;
    }

    /* Badges & Tags */
    .status-badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 7.5pt;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      font-family: monospace;
    }

    .status-active { background: #DCFCE7; color: #166534; border: 1px solid #86EFAC; }
    .status-approved { background: #DBEAFE; color: #1E40AF; border: 1px solid #93C5FD; }
    .status-pending { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .status-completed { background: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE; }
    .status-overdue { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .status-rejected { background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; }

    /* Callout Boxes */
    .callout {
      background: #F8FAFC;
      border-left: 4px solid #2563EB;
      padding: 10px 14px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      font-size: 9.5pt;
    }

    .callout-warning {
      background: #FFFBEB;
      border-left-color: #D97706;
      color: #78350F;
    }

    .callout-success {
      background: #F0FDF4;
      border-left-color: #16A34A;
      color: #14532D;
    }

    /* Diagram Styles */
    .diagram-container {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px;
      margin: 14px 0;
      text-align: center;
    }

    .diagram-title {
      font-size: 9pt;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }

    svg {
      max-width: 100%;
      height: auto;
    }

    /* Grid layout */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 10px 0;
    }

    .card {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px;
      background: #FFFFFF;
    }

    .card h4 {
      margin: 0 0 6px 0;
      font-size: 10.5pt;
      color: #1E293B;
    }

    .footer {
      font-size: 8pt;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- ================= PAGE 1: COVER PAGE ================= -->
  <div class="cover page-break">
    <div class="cover-top">
      <span class="badge-pill">Enterprise Core Banking System Documentation</span>
      <h1 class="cover-title">Jam Song Vich</h1>
      <div class="cover-subtitle">Loan Management System & Core Banking Ledger</div>
      <p class="cover-desc">
        Comprehensive Architectural Specification, Module Directory, Security Governance,
        Financial Calculation Engine, and End-to-End Operational Lifecycle Workflows.
      </p>
    </div>

    <div class="diagram-container" style="background:#FFFFFF; border:1px solid #E2E8F0;">
      <svg width="650" height="150" viewBox="0 0 650 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="25" width="130" height="100" rx="6" fill="#EFF6FF" stroke="#2563EB" stroke-width="2"/>
        <text x="75" y="65" text-anchor="middle" font-weight="bold" font-size="11" fill="#1E40AF">Client Portal</text>
        <text x="75" y="85" text-anchor="middle" font-size="9" fill="#3B82F6">Borrower Services</text>

        <path d="M140 75 L180 75" stroke="#94A3B8" stroke-width="2" marker-end="url(#arrow)"/>

        <rect x="180" y="25" width="140" height="100" rx="6" fill="#F8FAFC" stroke="#475569" stroke-width="2"/>
        <text x="250" y="60" text-anchor="middle" font-weight="bold" font-size="11" fill="#0F172A">Core API & Engine</text>
        <text x="250" y="78" text-anchor="middle" font-size="9" fill="#64748B">Express & Prisma</text>
        <text x="250" y="94" text-anchor="middle" font-size="8" fill="#10B981">● 16 Validated Suites</text>

        <path d="M320 75 L360 75" stroke="#94A3B8" stroke-width="2"/>

        <rect x="360" y="25" width="130" height="100" rx="6" fill="#FEF2F2" stroke="#DC2626" stroke-width="2"/>
        <text x="425" y="65" text-anchor="middle" font-weight="bold" font-size="11" fill="#991B1B">Super Admin</text>
        <text x="425" y="85" text-anchor="middle" font-size="9" fill="#EF4444">Underwriting Desk</text>

        <path d="M490 75 L530 75" stroke="#94A3B8" stroke-width="2"/>

        <rect x="530" y="25" width="110" height="100" rx="6" fill="#F0FDF4" stroke="#16A34A" stroke-width="2"/>
        <text x="585" y="60" text-anchor="middle" font-weight="bold" font-size="11" fill="#166534">NBC Bakong</text>
        <text x="585" y="78" text-anchor="middle" font-size="9" fill="#15803D">KHQR Rails</text>
        <text x="585" y="94" text-anchor="middle" font-size="8" fill="#16A34A">Settlement Switch</text>

        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8"/>
          </marker>
        </defs>
      </svg>
    </div>

    <div class="cover-meta">
      <div class="meta-item">
        <strong>Author & Core Team</strong>
        <span>Jam Song Vich Core Banking Engineering Desk</span>
      </div>
      <div class="meta-item">
        <strong>Regulatory Compliance</strong>
        <span>National Bank of Cambodia (NBC) Microfinance Framework</span>
      </div>
      <div class="meta-item">
        <strong>Current Release Version</strong>
        <span>v2.4.0 (Enterprise Authentication & Payment Ledger Build)</span>
      </div>
      <div class="meta-item">
        <strong>Publication Date</strong>
        <span>November 7, 2026</span>
      </div>
    </div>
  </div>

  <!-- ================= PAGE 2: TABLE OF CONTENTS & SYSTEM OVERVIEW ================= -->
  <div class="page-break">
    <h1>1. Executive Summary & Complete Website Inventory</h1>
    
    <p>
      <strong>Jam Song Vich</strong> is an enterprise-grade full-stack loan management and core banking platform engineered for rigorous financial institutions. The system manages the entire credit origination, multi-tier risk committee underwriting, penny-perfect installment amortization, NBC Bakong KHQR settlement reconciliation, and automated delinquency tracking.
    </p>

    <h2>1.1 Two-Tier Portal Structure</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Portal</th>
          <th style="width: 20%;">Target Audience</th>
          <th style="width: 20%;">Access Route</th>
          <th style="width: 35%;">Key Functional Capabilities</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Super Admin Portal</strong></td>
          <td>Risk Officers, Credit Committee, System Administrators</td>
          <td><code>/admin</code><br><code>/admin/dashboard</code><br><code>/admin/approvals</code></td>
          <td>Credit underwriting approvals desk, active facilities ledger, payment history management, upcoming due tracker, KHQR switch, BI reports, audit logs.</td>
        </tr>
        <tr>
          <td><strong>Borrower Portal</strong></td>
          <td>Individual Borrowers, Small Business Clients</td>
          <td><code>/portal</code><br><code>/my-loans</code><br><code>/apply</code></td>
          <td>Single active loan enforcement, installment schedule, real-time KHQR payment QR, transaction history, loan payoff certificates.</td>
        </tr>
        <tr>
          <td><strong>Security Operations</strong></td>
          <td>Bank IT Staff & System Auditors</td>
          <td><code>/login?view=core</code></td>
          <td>Bank-Grade Dark Core Banking Screen with real-time SOC activity feed, biometric session simulation, and NBC regulatory compliance monitor.</td>
        </tr>
      </tbody>
    </table>

    <h2>1.2 Complete URL Sitemap & Page Catalog</h2>
    <table>
      <thead>
        <tr>
          <th>Page Route</th>
          <th>Screen Name</th>
          <th>Authorization Level</th>
          <th>Description & Business Purpose</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>/login</code></td>
          <td>Institutional Sign In</td>
          <td>Public (Unauthenticated)</td>
          <td>Secure login with email/username, password, show/hide, remember me, forgot password, rate limiting (5 attempts lockout), EN/KH toggle.</td>
        </tr>
        <tr>
          <td><code>/register</code></td>
          <td>Borrower Registration</td>
          <td>Public (Unauthenticated)</td>
          <td>Clean signup for regular users: Full Name, Email, Phone, Password strength checklist, live match, Terms & Conditions consent.</td>
        </tr>
        <tr>
          <td><code>/verify-otp</code></td>
          <td>Identity Verification</td>
          <td>Public (Pending OTP)</td>
          <td>6-digit email cryptographic OTP verification code entry with resend timer and automated bypass for previously verified devices.</td>
        </tr>
        <tr>
          <td><code>/forgot-password</code></td>
          <td>Credential Recovery</td>
          <td>Public (Unauthenticated)</td>
          <td>Self-service password reset request with time-bound cryptographic token generation and neutral status response.</td>
        </tr>
        <tr>
          <td><code>/reset-password</code></td>
          <td>Set New Password</td>
          <td>Token Gated</td>
          <td>Password replacement screen requiring single-use cryptographic token, strength validation, and active session invalidation.</td>
        </tr>
        <tr>
          <td><code>/admin/dashboard</code></td>
          <td>Super Admin Overview</td>
          <td>Role: <code>ADMIN</code> only</td>
          <td>Live portfolio KPIs (Disbursed, Collected, Outstanding, PAR), delinquency warnings, and operational shortcuts.</td>
        </tr>
        <tr>
          <td><code>/admin/approvals</code></td>
          <td>Credit Review Desk</td>
          <td>Role: <code>ADMIN</code> only</td>
          <td>Credit committee underwriting queue, borrower KYC inspection, DTI ratios, SLA timers, 1-click Approval, and Rejection with documented reason.</td>
        </tr>
        <tr>
          <td><code>/admin/facilities</code></td>
          <td>Active Facilities Ledger</td>
          <td>Role: <code>ADMIN</code> only</td>
          <td>Active credit facilities tracker, live outstanding balance, amortization schedules, and borrower profile dossiers.</td>
        </tr>
        <tr>
          <td><code>/admin/payments</code></td>
          <td>Payment History Desk</td>
          <td>Role: <code>ADMIN</code> only</td>
          <td>Full transaction table, 6 dynamic KPI cards, search/filter, payment receipts, manual verification, and audit logs.</td>
        </tr>
        <tr>
          <td><code>/admin/dues</code></td>
          <td>Upcoming Due Tracker</td>
          <td>Role: <code>ADMIN</code> only</td>
          <td>Real-time countdown timer, urgency buckets (&lt;24h, 1-3d, 4-7d, overdue watch), 1-click SMS/email reminders, quick pay.</td>
        </tr>
        <tr>
          <td><code>/admin/reports</code></td>
          <td>Reports & BI Studio</td>
          <td>Role: <code>ADMIN</code> only</td>
          <td>Portfolio aging reports, daily collection breakdowns, Excel/CSV exports, printable official regulatory statements.</td>
        </tr>
        <tr>
          <td><code>/portal</code></td>
          <td>Borrower Dashboard</td>
          <td>Role: <code>USER</code> only</td>
          <td>Active loan status, remaining principal, next installment banner, amortization schedule, and "One Active Loan" lock message.</td>
        </tr>
        <tr>
          <td><code>/apply</code></td>
          <td>New Loan Application</td>
          <td>Role: <code>USER</code> only</td>
          <td>Loan product selector, dynamic loan calculator (Flat Rate vs Reducing Balance EMI), automated schedule preview, KYC file upload.</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>Jam Song Vich Core Banking System Documentation</span>
      <span>Page 2</span>
    </div>
  </div>

  <!-- ================= PAGE 3: TWO-TIER SECURITY & RBAC SPECIFICATION ================= -->
  <div class="page-break">
    <h1>2. Security Architecture & Two-Tier RBAC Specification</h1>

    <p>
      The platform enforces a strict two-tier Role-Based Access Control (RBAC) security paradigm: <strong>Super Admin</strong> vs <strong>Regular User</strong>. Security is validated server-side across middleware, controllers, and Prisma database constraints.
    </p>

    <h2>2.1 Account Type Governance & Boundary Isolation</h2>
    <div class="grid-2">
      <div class="card">
        <h4>Super Admin Account Governance</h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 8.5pt; color: #334155;">
          <li>Exactly <strong>ONE</strong> Super Admin account allowed in the entire database.</li>
          <li>Super Admin accounts <strong>cannot</strong> be registered via the public registration screen.</li>
          <li>Created strictly via authorized CLI (<code>npm run init:super-admin</code>) or secure database seeding.</li>
          <li>Any attempt to register with role <code>ADMIN</code> is rejected with <code>400 ADMIN_REGISTRATION_FORBIDDEN</code>.</li>
          <li>Full access to loan approvals, disbursements, payment reconciliation, audit trails, and financial BI.</li>
        </ul>
      </div>

      <div class="card">
        <h4>Regular User (Borrower) Governance</h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 8.5pt; color: #334155;">
          <li>Users can freely register their own accounts with name, email, and phone.</li>
          <li>System unconditionally forces role to <code>USER</code> (client privilege escalation blocked).</li>
          <li>Borrowers have self-service access to apply for loans, view repayment schedules, and make payments.</li>
          <li>Strictly prohibited from accessing any <code>/admin</code> page or administrative API route (returns <code>403 Forbidden</code>).</li>
          <li>Strict <strong>Ownership Isolation</strong>: User A cannot read or modify User B's loan files or payments.</li>
        </ul>
      </div>
    </div>

    <h2>2.2 Authentication Lifecycle & Security Measures</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 28%;">Security Feature</th>
          <th style="width: 32%;">Implementation Mechanism</th>
          <th style="width: 40%;">Regulatory & Technical Standard</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Password Hashing</strong></td>
          <td>Bcrypt with 12 salt rounds (one-way cryptographic hash)</td>
          <td>NIST SP 800-63B standards; plaintext passwords never stored.</td>
        </tr>
        <tr>
          <td><strong>Brute-Force Protection</strong></td>
          <td>Rate limiter triggers after 5 consecutive failed logins</td>
          <td>5-minute lockout with HTTP <code>429 RATE_LIMITED</code>.</td>
        </tr>
        <tr>
          <td><strong>Generic Error Responses</strong></td>
          <td>"Invalid email/username or password."</td>
          <td>Prevents user enumeration attacks (never reveals if email exists).</td>
        </tr>
        <tr>
          <td><strong>JWT Session Tokens</strong></td>
          <td>Short-lived Access Token + Cryptographic Refresh Token</td>
          <td>Stored in secure HTTP-only cookies / authorized authorization headers.</td>
        </tr>
        <tr>
          <td><strong>Account Inactive Guard</strong></td>
          <td>Checks <code>status === 'ACTIVE'</code> before issuing token</td>
          <td>Inactive or suspended accounts receive HTTP <code>403 ACCOUNT_INACTIVE</code>.</td>
        </tr>
        <tr>
          <td><strong>PII Data Masking</strong></td>
          <td>Phone (<code>***-***-0201</code>), Email (<code>j***e@domain.edu</code>), ID</td>
          <td>NBC consumer privacy compliance for unauthorized/non-owner views.</td>
        </tr>
      </tbody>
    </table>

    <div class="diagram-container">
      <div class="diagram-title">Workflow Diagram 1: Two-Tier Authentication & RBAC Gate</div>
      <svg width="650" height="130" viewBox="0 0 650 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="40" width="100" height="50" rx="4" fill="#F1F5F9" stroke="#64748B"/>
        <text x="60" y="65" text-anchor="middle" font-size="9" font-weight="bold">User Submits</text>
        <text x="60" y="77" text-anchor="middle" font-size="8" fill="#64748B">Email & Password</text>

        <path d="M110 65 L140 65" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <polygon points="175,40 215,65 175,90 135,65" fill="#EFF6FF" stroke="#2563EB"/>
        <text x="175" y="63" text-anchor="middle" font-size="8" font-weight="bold">Verify Hash</text>
        <text x="175" y="73" text-anchor="middle" font-size="7" fill="#2563EB">& Lockout</text>

        <path d="M215 65 L255 65" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <polygon points="295,40 335,65 295,90 255,65" fill="#FEF3C7" stroke="#D97706"/>
        <text x="295" y="63" text-anchor="middle" font-size="8" font-weight="bold">Account</text>
        <text x="295" y="73" text-anchor="middle" font-size="7" fill="#D97706">Role?</text>

        <path d="M295 40 L295 20 L370 20" stroke="#DC2626" stroke-width="1.5" marker-end="url(#arrow)"/>
        <text x="325" y="15" font-size="7.5" font-weight="bold" fill="#DC2626">ADMIN</text>
        <rect x="370" y="5" width="130" height="32" rx="4" fill="#FEF2F2" stroke="#DC2626"/>
        <text x="435" y="24" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#991B1B">/admin/dashboard</text>

        <path d="M295 90 L295 110 L370 110" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arrow)"/>
        <text x="325" y="105" font-size="7.5" font-weight="bold" fill="#16A34A">USER</text>
        <rect x="370" y="94" width="130" height="32" rx="4" fill="#F0FDF4" stroke="#16A34A"/>
        <text x="435" y="113" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#166534">/portal (My Loans)</text>

        <rect x="525" y="50" width="115" height="35" rx="4" fill="#F8FAFC" stroke="#94A3B8" stroke-dasharray="3 3"/>
        <text x="582" y="67" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#475569">Direct URL Guard</text>
        <text x="582" y="77" text-anchor="middle" font-size="7" fill="#64748B">User to /admin = 403</text>
      </svg>
    </div>

    <div class="footer">
      <span>Jam Song Vich Core Banking System Documentation</span>
      <span>Page 3</span>
    </div>
  </div>

  <!-- ================= PAGE 4: ONE ACTIVE LOAN BUSINESS LOGIC ================= -->
  <div class="page-break">
    <h1>3. "One Active Loan Per User" Core Business Engine</h1>

    <p>
      In strict compliance with microfinance and core banking debt-to-income regulations, each borrower is allowed <strong>at most one active loan facility</strong> at any given time.
    </p>

    <h2>3.1 Loan Facility Status Lifecycle Rules</h2>
    <table>
      <thead>
        <tr>
          <th>Loan Status</th>
          <th>Lock Category</th>
          <th>Can Apply for New Loan?</th>
          <th>Operational State Definition</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="status-badge status-pending">PENDING</span></td>
          <td>Active Lock</td>
          <td><strong>NO (Blocked)</strong></td>
          <td>Application submitted; under review by Credit Committee desk.</td>
        </tr>
        <tr>
          <td><span class="status-badge status-approved">APPROVED</span></td>
          <td>Active Lock</td>
          <td><strong>NO (Blocked)</strong></td>
          <td>Approved by credit committee; queued for treasury disbursement.</td>
        </tr>
        <tr>
          <td><span class="status-badge status-active">ACTIVE</span></td>
          <td>Active Lock</td>
          <td><strong>NO (Blocked)</strong></td>
          <td>Funds disbursed; borrower currently repaying installments.</td>
        </tr>
        <tr>
          <td><span class="status-badge status-overdue">OVERDUE</span></td>
          <td>Active Lock</td>
          <td><strong>NO (Blocked)</strong></td>
          <td>Installment overdue; subject to daily late fees and watchlist.</td>
        </tr>
        <tr>
          <td><span class="status-badge status-completed">COMPLETED</span></td>
          <td>Unlocked</td>
          <td><strong style="color:#16A34A;">YES (Unlocked)</strong></td>
          <td>All principal, interest, and fees 100% paid off. Fully settled.</td>
        </tr>
        <tr>
          <td><span class="status-badge status-rejected">REJECTED</span></td>
          <td>Unlocked</td>
          <td><strong style="color:#16A34A;">YES (Unlocked)</strong></td>
          <td>Application rejected with documented reason; borrower may re-apply.</td>
        </tr>
        <tr>
          <td><span class="status-badge status-rejected">CANCELLED</span></td>
          <td>Unlocked</td>
          <td><strong style="color:#16A34A;">YES (Unlocked)</strong></td>
          <td>Withdrawn by borrower before disbursement; borrower may re-apply.</td>
        </tr>
      </tbody>
    </table>

    <h2>3.2 Server-Side Database Transaction Validation</h2>
    <div class="callout callout-warning">
      <strong>Critical Backend Rule:</strong> Eligibility checks are never trusted to the frontend. The server-side API (<code>POST /api/v1/loan-applications</code>) executes a transactional query against the database using Prisma:
      <br>
      <code>where: { borrowerId: user.id, status: { in: ['PENDING', 'APPROVED', 'ACTIVE', 'OVERDUE'] } }</code>.
      <br>
      If any record exists, the request is immediately rejected with HTTP <code>400</code> and message:
      <em>"You already have an active loan. Please complete your current repayment before applying for another loan."</em>
    </div>

    <div class="diagram-container">
      <div class="diagram-title">Workflow Diagram 2: Loan State Machine & Re-Origination Eligibility</div>
      <svg width="650" height="150" viewBox="0 0 650 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="75" r="16" fill="#EFF6FF" stroke="#2563EB" stroke-width="2"/>
        <text x="40" y="79" text-anchor="middle" font-size="8" font-weight="bold">Start</text>

        <path d="M56 75 L85 75" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="85" y="55" width="85" height="40" rx="4" fill="#FEF3C7" stroke="#D97706"/>
        <text x="127" y="74" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#92400E">PENDING</text>
        <text x="127" y="86" text-anchor="middle" font-size="7" fill="#B45309">Locked</text>

        <path d="M170 75 L200 75" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="200" y="55" width="85" height="40" rx="4" fill="#DBEAFE" stroke="#2563EB"/>
        <text x="242" y="74" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#1E40AF">APPROVED</text>
        <text x="242" y="86" text-anchor="middle" font-size="7" fill="#3B82F6">Locked</text>

        <path d="M285 75 L315 75" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="315" y="55" width="85" height="40" rx="4" fill="#DCFCE7" stroke="#16A34A"/>
        <text x="357" y="74" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#166534">ACTIVE</text>
        <text x="357" y="86" text-anchor="middle" font-size="7" fill="#15803D">Disbursed</text>

        <path d="M357 55 C357 25, 470 25, 470 55" stroke="#DC2626" stroke-dasharray="2 2" stroke-width="1.5"/>
        <text x="415" y="22" text-anchor="middle" font-size="7" font-weight="bold" fill="#DC2626">Late Payment</text>

        <rect x="440" y="55" width="85" height="40" rx="4" fill="#FEE2E2" stroke="#DC2626"/>
        <text x="482" y="74" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#991B1B">OVERDUE</text>
        <text x="482" y="86" text-anchor="middle" font-size="7" fill="#B91C1C">Late Fee</text>

        <path d="M400 75 L440 75" stroke="#94A3B8" stroke-width="1.5"/>
        <path d="M525 75 L555 75" stroke="#16A34A" stroke-width="2" marker-end="url(#arrow)"/>

        <rect x="555" y="55" width="85" height="40" rx="4" fill="#E0E7FF" stroke="#4338CA"/>
        <text x="597" y="74" text-anchor="middle" font-size="8" font-weight="bold" fill="#3730A3">COMPLETED</text>
        <text x="597" y="86" text-anchor="middle" font-size="7" fill="#4F46E5">Unlocked!</text>

        <path d="M597 95 C597 135, 127 135, 127 95" stroke="#10B981" stroke-width="1.5" stroke-dasharray="3 3"/>
        <text x="360" y="140" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#059669">✓ 100% Repaid: Borrower is now eligible to apply for a new loan facility</text>
      </svg>
    </div>

    <div class="footer">
      <span>Jam Song Vich Core Banking System Documentation</span>
      <span>Page 4</span>
    </div>
  </div>

  <!-- ================= PAGE 5: SUPER ADMIN MODULES & CREDIT UNDERWRITING ================= -->
  <div class="page-break">
    <h1>4. Super Admin Modules & Operational Review Desk</h1>

    <p>
      The Super Admin dashboard provides authorized risk executives and operations officers with granular control over credit risk, underwriting, ledger reconciliation, and treasury flows.
    </p>

    <h2>4.1 Credit Committee Approvals Queue (<code>/admin/approvals</code>)</h2>
    <p>
      Borrower loan applications enter this queue in real time. The desk provides credit committee members with instant financial metrics to approve or reject requests:
    </p>
    <ul>
      <li><strong>Borrower KYC Dossier:</strong> Full legal name, verified email, phone number, national ID, and credit score.</li>
      <li><strong>Requested vs Recommended:</strong> Loan principal amount requested vs underwriter recommended sanction.</li>
      <li><strong>Debt-to-Income (DTI) & Risk Assessment:</strong> Automated calculation of debt coverage ceiling.</li>
      <li><strong>SLA Clock:</strong> Real-time turnaround countdown showing hours remaining before regulatory SLA escalation.</li>
      <li><strong>Action Gate:</strong>
        <ul>
          <li><strong>Approve:</strong> Transitions application to <code>APPROVED</code>, queues facility for treasury disbursement.</li>
          <li><strong>Reject:</strong> Requires documented reason (minimum 3 characters), transitions application to <code>REJECTED</code>, unblocking the user for future submissions.</li>
        </ul>
      </li>
    </ul>

    <h2>4.2 User Payment History Management & Audit Logs</h2>
    <p>
      Super Admin has an audited ledger to oversee all repayment transactions made by users:
    </p>
    <table>
      <thead>
        <tr>
          <th>Summary KPI Card</th>
          <th>Calculation Formula</th>
          <th>Significance to Credit Operations</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total Payments Received</strong></td>
          <td><code>COUNT(payments WHERE status = 'PAID')</code></td>
          <td>Volume of successfully settled repayments across the entire bank.</td>
        </tr>
        <tr>
          <td><strong>Total Amount Collected</strong></td>
          <td><code>SUM(paymentAmount WHERE status = 'PAID')</code></td>
          <td>Aggregate liquidity recovered (principal + interest + late fees).</td>
        </tr>
        <tr>
          <td><strong>Pending Payments</strong></td>
          <td><code>COUNT(payments WHERE status = 'PENDING')</code></td>
          <td>Transactions awaiting clearing switch confirmation or admin verification.</td>
        </tr>
        <tr>
          <td><strong>Failed Payments</strong></td>
          <td><code>COUNT(payments WHERE status = 'FAILED')</code></td>
          <td>Transactions rejected due to insufficient funds, bad signature, or admin rejection.</td>
        </tr>
        <tr>
          <td><strong>Overdue Payments</strong></td>
          <td><code>COUNT(schedules WHERE dueDate &lt; NOW() AND status != 'PAID')</code></td>
          <td>Delinquent payment cycles requiring immediate collection follow-up.</td>
        </tr>
        <tr>
          <td><strong>Total Outstanding Balance</strong></td>
          <td><code>SUM(loans.outstandingBalance WHERE status IN ('ACTIVE', 'OVERDUE'))</code></td>
          <td>Total active credit risk exposure currently on the balance sheet.</td>
        </tr>
      </tbody>
    </table>

    <h2>4.3 Upcoming Payment Due Tracker (Live Countdown)</h2>
    <p>
      A live operational surveillance board with an active ticking clock (<code>HH:mm:ss</code>) categorizing upcoming client maturities into urgency tiers:
    </p>
    <div class="grid-2">
      <div class="card" style="border-left: 4px solid #DC2626;">
        <h4>Critical Due (&lt; 24 Hours)</h4>
        <p style="font-size: 8.5pt;">Maturities due today or within 24 hours. Offers instant 1-click SMS/Email payment reminder dispatch.</p>
      </div>
      <div class="card" style="border-left: 4px solid #D97706;">
        <h4>Imminent Due (1 to 3 Days)</h4>
        <p style="font-size: 8.5pt;">Installments falling due within 72 hours. Provides instant Bakong KHQR bill link sharing.</p>
      </div>
      <div class="card" style="border-left: 4px solid #2563EB;">
        <h4>Upcoming Due (4 to 7 Days)</h4>
        <p style="font-size: 8.5pt;">Scheduled maturities within the week for cash flow planning and treasury forecasting.</p>
      </div>
      <div class="card" style="border-left: 4px solid #475569;">
        <h4>Overdue Watchlist</h4>
        <p style="font-size: 8.5pt;">Delinquent cycles past maturity showing elapsed days overdue and penalty fee accrual.</p>
      </div>
    </div>

    <div class="footer">
      <span>Jam Song Vich Core Banking System Documentation</span>
      <span>Page 5</span>
    </div>
  </div>

  <!-- ================= PAGE 6: REPAYMENT & BAKONG KHQR SETTLEMENT SWITCH ================= -->
  <div class="page-break">
    <h1>5. Repayment Processing & NBC Bakong KHQR Rails</h1>

    <p>
      The platform features an automated real-time payment reconciliation engine integrated with the <strong>National Bank of Cambodia (NBC) Bakong KHQR</strong> core settlement switch.
    </p>

    <h2>5.1 Multi-Installment Waterfall Allocation Engine</h2>
    <p>
      When a user submits a repayment amount (e.g. via Bakong KHQR or branch cash deposit), the payment engine executes a penny-perfect waterfall allocation in this priority order:
    </p>
    <ol style="font-size: 9pt; color: #334155; padding-left: 20px;">
      <li><strong>Late Penalty Fees:</strong> Settles accrued delinquency penalty fees first to prevent perpetual interest compounding.</li>
      <li><strong>Accrued Interest:</strong> Covers cycle interest according to the amortization schedule.</li>
      <li><strong>Principal Balance:</strong> Reduces the outstanding principal debt of the earliest unpaid installment.</li>
      <li><strong>Excess Waterfall:</strong> Any excess amount flows automatically into subsequent future installments, reducing overall loan term.</li>
    </ol>

    <div class="diagram-container">
      <div class="diagram-title">Workflow Diagram 3: Bakong KHQR Scan-to-Pay & Settlement Flow</div>
      <svg width="650" height="130" viewBox="0 0 650 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="35" width="100" height="60" rx="4" fill="#EFF6FF" stroke="#2563EB"/>
        <text x="60" y="60" text-anchor="middle" font-size="8.5" font-weight="bold">Borrower</text>
        <text x="60" y="72" text-anchor="middle" font-size="7.5" fill="#3B82F6">Clicks "Pay Now"</text>
        <text x="60" y="82" text-anchor="middle" font-size="7" fill="#64748B">Selects Cycle</text>

        <path d="M110 65 L145 65" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="145" y="35" width="115" height="60" rx="4" fill="#F8FAFC" stroke="#475569"/>
        <text x="202" y="58" text-anchor="middle" font-size="8.5" font-weight="bold">Dynamic KHQR</text>
        <text x="202" y="70" text-anchor="middle" font-size="7" fill="#64748B">Generates EMVCo Tag</text>
        <text x="202" y="80" text-anchor="middle" font-size="7" fill="#10B981">Dual USD / KHR</text>

        <path d="M260 65 L295 65" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="295" y="35" width="115" height="60" rx="4" fill="#FEF3C7" stroke="#D97706"/>
        <text x="352" y="58" text-anchor="middle" font-size="8.5" font-weight="bold">Mobile Banking</text>
        <text x="352" y="70" text-anchor="middle" font-size="7" fill="#92400E">Scans via ABA / Wing /</text>
        <text x="352" y="80" text-anchor="middle" font-size="7" fill="#92400E">Canadia / ACLEDA</text>

        <path d="M410 65 L445 65" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="445" y="35" width="105" height="60" rx="4" fill="#F0FDF4" stroke="#16A34A"/>
        <text x="497" y="58" text-anchor="middle" font-size="8.5" font-weight="bold">Bakong Switch</text>
        <text x="497" y="70" text-anchor="middle" font-size="7" fill="#166534">Clearing & Webhook</text>
        <text x="497" y="80" text-anchor="middle" font-size="7" fill="#166534">HMAC Signed</text>

        <path d="M550 65 L580 65" stroke="#94A3B8" stroke-width="1.5" marker-end="url(#arrow)"/>

        <rect x="580" y="35" width="60" height="60" rx="4" fill="#E0E7FF" stroke="#4338CA"/>
        <text x="610" y="60" text-anchor="middle" font-size="8" font-weight="bold" fill="#3730A3">Ledger</text>
        <text x="610" y="72" text-anchor="middle" font-size="7" fill="#4F46E5">Receipt</text>
        <text x="610" y="82" text-anchor="middle" font-size="6.5" fill="#4F46E5">Generated</text>
      </svg>
    </div>

    <h2>5.2 Financial Calculation Engine Specifications</h2>
    <table>
      <thead>
        <tr>
          <th>Calculation Engine</th>
          <th>Formula / Logic</th>
          <th>Round-Off & Cent Drift Policy</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Flat Rate Method</strong></td>
          <td>
            <code>TotalInterest = Principal * (APR / 100) * (Months / 12)</code><br>
            <code>MonthlyEMI = (Principal + TotalInterest) / Months</code>
          </td>
          <td>Every cent reconciled so <code>SUM(PrincipalDue) == DisbursedPrincipal</code> exactly (0 drift).</td>
        </tr>
        <tr>
          <td><strong>Reducing Balance (EMI)</strong></td>
          <td>
            <code>r = APR / 1200</code><br>
            <code>EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)</code>
          </td>
          <td>Final installment auto-adjusts for fractions of cents to achieve exact $0.00 ending balance.</td>
        </tr>
        <tr>
          <td><strong>Overdue Daily Late Fee</strong></td>
          <td>
            <code>LateFee = PrincipalDue * 0.10 * (DaysOverdue / 30)</code><br>
            Capped at maximum regulatory limit per NBC circular.
          </td>
          <td>Accrues nightly at 00:01 AM via automated cron job (<code>1 0 * * *</code>).</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>Jam Song Vich Core Banking System Documentation</span>
      <span>Page 6</span>
    </div>
  </div>

  <!-- ================= PAGE 7: DATABASE SCHEMA & API CATALOG ================= -->
  <div class="page-break">
    <h1>6. Database Architecture & API Catalog</h1>

    <p>
      The persistence tier is built on PostgreSQL with Prisma ORM. The relational model enforces strict foreign keys, cascade safety, and ACID transactional integrity.
    </p>

    <h2>6.1 Core Database Entity Models</h2>
    <table>
      <thead>
        <tr>
          <th>Table Name</th>
          <th>Primary Key</th>
          <th>Essential Columns & Constraints</th>
          <th>Relationships</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>users</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>email (unique), username (unique), phone, passwordHash, role (ADMIN|USER), status (ACTIVE|INACTIVE)</code></td>
          <td>Has many LoanApplications, Loans, Payments, AuditLogs.</td>
        </tr>
        <tr>
          <td><code>loan_applications</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>applicationNo (unique), borrowerId, requestedAmount, interestRate, termMonths, status, reviewNotes</code></td>
          <td>Belongs to User; Has one Loan.</td>
        </tr>
        <tr>
          <td><code>loans</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>loanNo (unique), applicationId, borrowerId, principalAmount, outstandingBalance, status, disbursedAt</code></td>
          <td>Belongs to Application; Has many Schedules & Payments.</td>
        </tr>
        <tr>
          <td><code>loan_schedules</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>loanId, installmentNo, dueDate, principalDue, interestDue, totalDue, amountPaid, status, lateFee</code></td>
          <td>Belongs to Loan; Has many Payments.</td>
        </tr>
        <tr>
          <td><code>payments</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>receiptNo (unique), loanId, scheduleId, amount, paymentMethod, status, verifiedBy, settledAt</code></td>
          <td>Belongs to Loan & Schedule; Verified by User.</td>
        </tr>
        <tr>
          <td><code>audit_logs</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>userId, action, resource, details (JSON), ipAddress, userAgent, createdAt</code></td>
          <td>Belongs to User; immutable financial audit log.</td>
        </tr>
        <tr>
          <td><code>login_history</code></td>
          <td><code>id (UUID)</code></td>
          <td><code>userId, email, ipAddress, userAgent, status (SUCCESS|FAILED|LOCKED), failureReason, createdAt</code></td>
          <td>Belongs to User; security authentication telemetry.</td>
        </tr>
      </tbody>
    </table>

    <h2>6.2 Primary REST API Catalog</h2>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Endpoint</th>
          <th>Auth / Clearance</th>
          <th>Summary of Behavior</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/auth/login</code></td>
          <td>Public</td>
          <td>Validates credentials, checks rate limits, issues JWT token and session cookie.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/auth/register</code></td>
          <td>Public</td>
          <td>Registers new standard borrower; strictly denies administrative role assignment.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/auth/forgot-password</code></td>
          <td>Public</td>
          <td>Dispatches password reset verification token with rate limiting.</td>
        </tr>
        <tr>
          <td><code>GET</code></td>
          <td><code>/api/v1/loan-applications</code></td>
          <td>ADMIN / USER (Filtered)</td>
          <td>Super Admin reads all applications; Borrower reads only their own files.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/v1/loan-applications</code></td>
          <td>USER</td>
          <td>Originates loan application; rejects if user has an existing active loan.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/v1/loan-applications/:id/approve</code></td>
          <td>ADMIN</td>
          <td>Credit Committee approval; transitions application status to <code>APPROVED</code>.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/v1/loan-applications/:id/reject</code></td>
          <td>ADMIN</td>
          <td>Rejection desk; requires mandatory rejection reason.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/v1/loans/:id/disburse</code></td>
          <td>ADMIN</td>
          <td>Treasury disbursement; activates installment amortization schedule.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/v1/payments/khqr/initiate</code></td>
          <td>ADMIN / USER</td>
          <td>Generates NBC Bakong dynamic KHQR payload with CRC16 verification checksum.</td>
        </tr>
        <tr>
          <td><code>POST</code></td>
          <td><code>/api/v1/payments/:id/verify</code></td>
          <td>ADMIN</td>
          <td>Verifies pending transaction; updates remaining balances and loan status.</td>
        </tr>
      </tbody>
    </table>

    <div class="callout callout-success" style="margin-top: 18px;">
      <strong>Automated Verification Status:</strong> All 16 automated backend test suites (consisting of 80+ end-to-end integration assertions, two-tier RBAC rules, Bakong KHQR settlement, and the 18 authentication scenarios) are verified and passing 100%.
    </div>

    <div class="footer">
      <span>Jam Song Vich Core Banking System Documentation</span>
      <span>Page 7</span>
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

console.log('Generating PDF via Google Chrome headless...');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "${tempHtmlPath}"`;

try {
  execSync(cmd, { stdio: 'inherit' });
  if (fs.existsSync(outputPdfPath)) {
    const stats = fs.statSync(outputPdfPath);
    console.log(`\n======================================================`);
    console.log(`✅ PDF Generated Successfully!`);
    console.log(`📄 Path: ${outputPdfPath}`);
    console.log(`📦 Size: ${(stats.size / 1024).toFixed(1)} KB (${stats.size} bytes)`);
    console.log(`======================================================\n`);
  } else {
    console.error('❌ Failed: PDF file was not created.');
  }
} catch (error) {
  console.error('❌ Error executing Chrome PDF generator:', error);
} finally {
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
}
