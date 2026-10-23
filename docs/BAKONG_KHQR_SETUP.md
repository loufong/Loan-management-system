# Cambodia Bakong KHQR Payment Gateway Integration Manual
## Academic & Commercial Loan Management System (LMS)

---

## 1. Executive Summary & Architecture Overview

This Loan Management System has been upgraded from simulated demo payments to a **production-ready, real-world Cambodia Bakong KHQR payment architecture** compliant with the National Bank of Cambodia (NBC) KHQR EMVCo 29 standard.

The architecture guarantees:
1. **Dynamic EMVCo KHQR Generation**: Creates individual dynamic QR codes with exact installment amounts, expiration timestamps (15 minutes), and merchant details pre-configured for **ACLEDA Bank** (`PHON RITHYA`).
2. **Zero-Trust Verification**: A payment is **NEVER** marked as `PAID` or `SUCCESS` simply because a user clicks a button. The system queries the NBC Bakong Open API (`/check_transaction_by_md5`) using the unique 32-character MD5 hash of the generated QR code.
3. **Automated Status Polling & Asynchronous Webhooks**: The borrower interface polls the transaction status every 3.5 seconds with live countdown timers. Simultaneously, the backend exposes an HMAC-SHA256 authenticated webhook endpoint for real-time clearance push notifications from the Bakong network.
4. **PostgreSQL ACID Settlement**: When a transaction is verified:
   - Payment record is updated to `SUCCESS` with official `receiptNo`, `khqrTransactionId`, `paidAt`, and `verifiedAt`.
   - The targeted `RepaymentSchedule` installment is marked `PAID` (or `PARTIAL` if underpaid).
   - The `Loan`'s `outstandingBalance` is decremented and `totalPaid` is incremented.
   - If all installments are cleared, the `Loan` status transitions to `COMPLETED`.
   - An immutable `AuditLog` entry and borrower `Notification` are recorded.
5. **Multi-Currency Support**: Full support for both **USD** (EMVCo Tag 53: `840`) and **KHR** (EMVCo Tag 53: `116`).
6. **Anti-Fraud & Replay Protection**: Detects and rejects amount tampering, currency mismatches, and replayed requests via strict cryptographic checks and idempotency guards.

---

## 2. Pre-Configured ACLEDA Merchant Credentials

Based on the merchant KHQR supplied by the organization, the backend environment `.env` has been pre-configured with the following verified ACLEDA Bank merchant parameters:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `KHQR_MERCHANT_NAME` | `PHON RITHYA` | Verified Individual Merchant Name (EMVCo Tag 59) |
| `KHQR_BAKONG_ACCOUNT_ID` | `khqr@aclb` | ACLEDA Bank Bakong Gateway Identifier (EMVCo Tag 29) |
| `KHQR_ACCOUNT_INFORMATION` | `85517790800` | Merchant ACLEDA Account Number |
| `KHQR_ACQUIRING_BANK` | `ACLEDA` | Primary Acquiring Financial Institution |
| `KHQR_MERCHANT_CITY` | `Phnom Penh` | Merchant City Location (EMVCo Tag 60) |
| `KHQR_MERCHANT_PHONE` | `010487718` | Official Merchant Contact Number (EMVCo Tag 62) |
| `KHQR_ENVIRONMENT` | `sandbox` / `production` | Active gateway environment |
| `KHQR_API_URL` | `https://bakong-dev.nbc.org.kh/v1` | Bakong Open API verification endpoint |

*(These defaults allow the system to immediately generate valid, scannable ACLEDA KHQRs even in local development).*

---

## 3. How to Obtain NBC Bakong Open API Credentials

To verify live transactions directly against Cambodia's national clearing house without manual bank statement reconciliation, register for Bakong Open API access:

### Step 3.1: Register on the NBC Bakong Developer Portal
1. Navigate to the official NBC Bakong Portal:
   - **Production Portal**: [https://api-bakong.nbc.gov.kh](https://api-bakong.nbc.gov.kh)
   - **Developer Sandbox**: [https://bakong-dev.nbc.org.kh](https://bakong-dev.nbc.org.kh)
2. Create an organization account for your financial institution or university.
3. Submit your merchant verification documents (Bank confirmation letter or ACLEDA merchant agreement).

### Step 3.2: Generate API Token & Webhook Secret
1. Inside the Bakong Developer Dashboard, go to **API Keys & Integrations**.
2. Click **Generate New API Key** and copy the Bearer Token.
3. Go to **Webhooks**, click **Add Webhook Endpoint**:
   - **URL**: `https://your-domain.com/api/v1/payments/webhook`
   - **Events**: `TRANSACTION_SETTLED`, `TRANSACTION_FAILED`
4. Copy the generated **Webhook Secret** (used for HMAC-SHA256 signature validation).

---

## 4. Configuring Backend Environment Variables

Open your backend `.env` file (or set environment variables on your cloud hosting platform):

```env
# ==========================================
# CAMBODIA BAKONG KHQR PAYMENT GATEWAY
# ==========================================
KHQR_ENVIRONMENT=production
KHQR_MERCHANT_NAME="PHON RITHYA"
KHQR_BAKONG_ACCOUNT_ID="khqr@aclb"
KHQR_ACCOUNT_INFORMATION="85517790800"
KHQR_ACQUIRING_BANK="ACLEDA"
KHQR_MERCHANT_CITY="Phnom Penh"
KHQR_MERCHANT_PHONE="010487718"

# Production API Endpoint: https://api-bakong.nbc.gov.kh/v1
# Sandbox API Endpoint:    https://bakong-dev.nbc.org.kh/v1
KHQR_API_URL="https://api-bakong.nbc.gov.kh/v1"

# Your NBC Bakong Open API Key / Token
KHQR_API_KEY="your_live_or_sandbox_bakong_token_here"
BAKONG_API_TOKEN="your_live_or_sandbox_bakong_token_here"

# Webhook Secret for HMAC-SHA256 verification of incoming payment callbacks
KHQR_WEBHOOK_SECRET="your_shared_webhook_secret_key"
```

> [!SECURITY NOTE]
> **Never commit your `.env` file or API tokens to GitHub.**
> The `.gitignore` file is strictly configured to omit `.env`. The frontend application never receives the `KHQR_API_KEY` or `KHQR_WEBHOOK_SECRET`. All API interactions and signature verifications happen strictly on the Express backend.

---

## 5. End-to-End Borrower Payment Workflow

```
[Borrower Portal]                 [Express Backend API]               [NBC Bakong Network]
       │                                   │                                    │
       │ 1. Click "Pay" on Installment #1  │                                    │
       │──────────────────────────────────>│                                    │
       │                                   │ 2. Generate EMVCo KHQR String      │
       │                                   │    Compute MD5 hash                │
       │                                   │    Store Payment (status: PENDING) │
       │                                   │    Render PNG DataURL              │
       │ 3. Display KHQR with Timer        │                                    │
       │<──────────────────────────────────│                                    │
       │                                   │                                    │
       │ 4. Scan KHQR with ACLEDA / Bakong │                                    │
       │    Mobile App & confirm PIN       │                                    │
       │───────────────────────────────────────────────────────────────────────>│
       │                                   │                                    │
       │ 5. Auto-Poll /payments/:id/status │                                    │
       │──────────────────────────────────>│ 6. Query Bakong by MD5             │
       │                                   │───────────────────────────────────>│
       │                                   │ 7. Return Clearance Status         │
       │                                   │<───────────────────────────────────│
       │                                   │ 8. Anti-Fraud & Exact Amount Check │
       │                                   │ 9. ACID PostgreSQL Transaction:    │
       │                                   │    - Payment -> SUCCESS            │
       │                                   │    - Installment -> PAID           │
       │                                   │    - Loan Balance Decreased        │
       │ 10. Return SUCCESS & Receipt JSON │                                    │
       │<──────────────────────────────────│                                    │
       │                                   │                                    │
       │ 11. Render Thermal Receipt Modal  │                                    │
```

### Steps Explained:
1. **Selection**: Borrower views their active loan in `Loans` or `Repayments`. Each unpaid schedule row displays a blue **"Pay"** button.
2. **Initiation**: The modal displays the exact installment details (due date, principal, interest, remaining balance). The borrower selects currency (USD or KHR) and clicks **"Generate KHQR Payment"**.
3. **Gateway Call**: The backend calls `BakongService.generateDynamicKhqr()`, which calculates the EMVCo string, computes the MD5 hash, creates the QR image, and saves a `Payment` record with status `PENDING`.
4. **QR Presentation**: An authentic Bakong KHQR card appears on screen with:
   - Official Red Header (`KHQR`)
   - Merchant Name: `PHON RITHYA`
   - Amount: e.g. `$100.00` (or KHR equivalent)
   - ACLEDA Bank branding
   - 15-minute countdown timer
   - Pulsing clearance status indicator
5. **Settlement**: The borrower scans the QR code with their ACLEDA Mobile app, Bakong app, or any Cambodian banking app (ABA, Canadia, Wing, Sathapana, etc.) and completes the transfer.
6. **Real-Time Verification**:
   - The frontend automatically polls `/api/v1/payments/:id/status` every 3.5 seconds.
   - The backend queries the Bakong Open API (`check_transaction_by_md5`).
   - If cleared, the backend atomically reconciles the installment and loan balance.
7. **Official Thermal Receipt**: The modal displays a green checkmark animation and presents the official printable payment receipt with unique Receipt No (`REC-2026-XXXX`), transaction reference, and updated remaining balance.

---

## 6. Anti-Fraud & Security Controls

The integration includes bank-grade security controls:

### 1. Ownership Isolation (RBAC)
- Borrowers can **ONLY** initiate payment sessions for loans belonging to their own borrower account.
- Non-owners receive HTTP `403 Forbidden` (`FORBIDDEN_OWNERSHIP`).

### 2. Exact Amount & Currency Validation
- When Bakong reports that a transaction cleared, `BakongService.validateSettlementIntegrity` verifies that:
  - `settled_amount === requested_amount` (rejection with `AMOUNT_MISMATCH` if underpaid).
  - `settled_currency === requested_currency` (rejection with `CURRENCY_MISMATCH`).
- On fraud or mismatch detection, the payment is flagged as `FAILED`, loan balances remain untouched, and an audit log event is recorded.

### 3. Replay Protection & Idempotency
- If a verification request or webhook is received multiple times for an already settled payment, the backend immediately returns the existing receipt without re-decrementing the loan balance.

### 4. Webhook HMAC-SHA256 Signatures
- All webhook requests sent to `/api/v1/payments/webhook` require an `x-bakong-signature` header computed using the shared secret.
- Forged or missing signatures are rejected with HTTP `401 Unauthorized` (`UNAUTHORIZED_WEBHOOK`).

---

## 7. Diagnostics & Operational Verification

### Check Gateway Health
Administrators can check Bakong gateway configuration at any time by calling:
```http
GET /api/v1/payments/khqr/diagnostics
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "environment": "production",
    "merchantName": "PHON RITHYA",
    "bakongAccountId": "khqr@aclb",
    "accountInformation": "85517790800",
    "acquiringBank": "ACLEDA",
    "apiUrl": "https://api-bakong.nbc.gov.kh/v1",
    "isCredentialsConfigured": true,
    "isWebhookConfigured": true,
    "emvcoStandard": "KHQR 29 (National Bank of Cambodia)",
    "status": "ONLINE_READY"
  }
}
```
*(Notice that secret keys and passwords are NEVER exposed in diagnostics).*

---

## 8. Automated Integration Testing

To run the complete automated test suite validating EMVCo generation, ownership RBAC, polling, Bakong Open API verification, anti-fraud checks, idempotency, and webhook HMAC validation:

```bash
npm run test:khqr
```

**Expected Output:**
```
🇰🇭 ========================================================================
🇰🇭 CAMBODIA BAKONG KHQR PRODUCTION-GRADE INTEGRATION TEST SUITE
🇰🇭 ACLEDA Bank Merchant: PHON RITHYA | Account: 85517790800
🇰🇭 ========================================================================

▶ Test 1: EMVCo KHQR Individual Dynamic Generation
  ✓ EMVCo tags 00, 01, 29, 53, 54, 58, 59, 60, 63 validated successfully
  ✓ Dynamic KHQR payload length: 246 chars | MD5: ...

▶ Test 2: Borrower Alice Initiates KHQR Payment via API
  ✓ Payment session created in DB with status: PENDING

▶ Test 3: Cross-Borrower Security (Bob tries to initiate payment on Alice's loan)
  ✓ Forbidden: Non-owner cannot initiate payment on another borrower's loan

▶ Test 4: Payment Status Query Polling (/payments/:id/status)
  ✓ Status polling returns PENDING without premature completion (900s remaining)

▶ Test 5: Bakong Open API Verification & Atomic Balance Reconciliation
  ✓ Payment marked SUCCESS, Installment #1 marked PAID
  ✓ Loan balance atomically reduced ($250 -> $150)

▶ Test 6: Anti-Fraud Protection (Amount Mismatch Detection)
  ✓ Fraud detected: Payment marked FAILED with AMOUNT_MISMATCH, loan balance untouched

▶ Test 7: Anti-Fraud Protection (Currency Mismatch Detection)
  ✓ Currency mismatch rejected with 400 CURRENCY_MISMATCH

▶ Test 8: Replay Attack Prevention (Verifying Already Paid Session)
  ✓ Idempotency protected: Re-verifying returns existing receipt without double-decrementing

▶ Test 9: Bakong Webhook Processing & HMAC Validation
  ✓ Webhook HMAC validated and Installment #2 settled asynchronously

▶ Test 10: Invalid Webhook Signature Rejection (401 Unauthorized)
  ✓ Forged webhook signature rejected with 401 UNAUTHORIZED_WEBHOOK

▶ Test 11: Bakong KHQR Diagnostics Endpoint
  ✓ Diagnostics returns verified configuration without exposing secrets

🎉 ALL 11 BAKONG KHQR PRODUCTION-GRADE INTEGRATION TESTS PASSED PERFECTLY!
```
