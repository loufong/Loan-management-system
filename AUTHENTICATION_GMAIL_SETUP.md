# Apex LMS — Modern Authentication & Real Gmail OTP System

This document provides a comprehensive operational guide for the **Apex Loan Management System (Apex LMS)** authentication engine, featuring registration, login with session persistence, real Gmail SMTP 6-digit OTP verification, password recovery, and role-based access control (RBAC).

---

## 1. Authentication Architecture & Security Highlights

```
   [ User Browser ]
          │
          ├── 1. Register Account / Forgot Password Request
          ▼
   [ Backend Auth Controller ] ──> Validates input (Zod), hashes passwords (bcrypt)
          │
          ├── 2. Generates cryptographically secure 6-digit OTP
          ├── 3. Computes salted SHA-256 OTP hash & sets 5-minute expiry
          ▼
   [ Nodemailer SMTP Engine ] ──> Port 587 (STARTTLS)
          │
          ▼
   [ Real Gmail SMTP Server ] (smtp.gmail.com)
          │
          ▼
   [ User's Real Gmail Inbox ] ──> Receives professional HTML email with 6-digit code
          │
          ▼
   [ OTP Verification Page ] ──> Auto-focus 6 inputs, 60s cooldown, max 5 attempts
          │
          ▼
   [ Account Activated / Password Reset Token Issued ] ──> Direct Entry to Dashboard
```

- **Zero Gradients**: Modern, 100% solid flat banking design (`bg-slate-50`, `bg-white`, `border-slate-200`, `bg-slate-900`, `bg-blue-600`).
- **No Plaintext Passwords**: Hashed with `bcryptjs` (10 salt rounds). Passwords never appear in API responses or logs.
- **Real Gmail SMTP**: Uses Google App Passwords via Nodemailer over TLS (port 587).
- **Brute-Force & Rate-Limiting Protection**:
  - OTP expires strictly after **5 minutes**.
  - Maximum **5 incorrect attempts** before the OTP is permanently locked.
  - **60-second resend cooldown timer** enforced on both backend and frontend.
  - One-time use: verified OTPs are immediately invalidated.
- **Session Persistence**:
  - `Remember Me` checked $\rightarrow$ 30-day session saved in `localStorage`.
  - `Remember Me` unchecked $\rightarrow$ Browser-session only saved in `sessionStorage`.

---

## 2. Setting Up Real Gmail SMTP with Google App Password

> [!IMPORTANT]
> Google requires a **16-character App Password** when sending emails through SMTP. You **cannot** use your regular Google account password.

### Step-by-Step Instructions:

1. **Log in to Google**:
   - Go to [myaccount.google.com](https://myaccount.google.com/) and sign in with the Gmail account you want to send OTP emails from.

2. **Enable 2-Step Verification** (if not already enabled):
   - Go to **Security** in the left sidebar.
   - Under *How you sign in to Google*, click on **2-Step Verification** and follow the prompts to complete setup.

3. **Generate an App Password**:
   - In the top search bar of Google Account, type **`App passwords`** and select it (or go directly to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
   - In the **App name** field, type: `Loan Management System` (or `Apex LMS`).
   - Click **Create**.
   - Google will display a **16-character yellow box code** (e.g., `abcd efgh ijkl mnop`).

4. **Copy the 16-Character Password**:
   - Copy this 16-character code (you can paste it with or without spaces; our backend trims spaces automatically).

---

## 3. Configuring the `.env` File

Open `.env` in the root folder (`e:\Loan\Loansystem\.env`) and configure the `MAIL_*` variables:

```env
# Database & Core
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loansystem_db?schema=public"
NODE_ENV="development"
PORT=5000
JWT_SECRET="super-secure-academic-lms-jwt-secret-key-2026"

# Real Gmail SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=yourrealaccount@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=yourrealaccount@gmail.com
MAIL_FROM_NAME="Loan Management System"
```

> [!CAUTION]
> **Protecting Your Credentials Before Pushing to GitHub**:
> - The `.env` file is already added to `.gitignore` on line 3.
> - Verify before committing:
>   ```bash
>   git status --ignored
>   # Ensure .env appears under "Ignored files"
>   ```
> - Never hardcode passwords or App Passwords in source files.

---

## 4. Running the System

### 1. Install Dependencies
```bash
# Root backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Start Backend Server
```bash
# Starts Express API on port 5000
npm run dev
```

### 3. Start Frontend App
```bash
# In a new terminal window:
npm run frontend:dev
# Opens http://localhost:3000
```

---

## 5. End-to-End Testing Workflows

### Test Workflow A: User Registration & Real Gmail OTP Verification
1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Click **Create Account** at the bottom of the sign-in card.
3. Fill in your information:
   - **Full Name**: e.g., `David Serey`
   - **Username**: e.g., `davidserey`
   - **Email Address**: **Enter your real Gmail address** (e.g. `yourname@gmail.com`).
   - **Phone**: `012345678`
   - **Password**: `Password123!` (Observe the live green checklist meeting all 5 security criteria).
   - **Confirm Password**: `Password123!`
4. Click **Create Account**.
5. Check your Gmail inbox:
   - You will receive an email with subject: **`Your OTP Code - Loan Management System [XXXXXX]`**.
   - The email contains a stylized 6-digit code box and security notice.
6. Return to the browser:
   - Enter the 6 digits into the boxes.
   - Click **Verify OTP**.
7. Your account is activated and you are redirected to the Login page with a green confirmation banner:
   *"Email verified successfully! Your account is now active. Please sign in."*

---

### Test Workflow B: Forgot Password & Password Reset
1. On the Login page, click **Forgot Password?**.
2. Enter your registered email address and click **Send Verification Code**.
3. Check your Gmail inbox for the 6-digit password reset code.
4. Enter the 6-digit code on the OTP Verification page.
5. On the **Set New Password** screen:
   - Enter your new compliant password.
   - Confirm your new password.
   - Click **Reset Password**.
6. You are redirected to Login with the notification:
   *"Your password has been successfully reset. Please log in with your new credentials."*

---

### Test Workflow C: 1-Click Evaluation Bar (Demo Accounts)
If testing without an email setup, use the 4 quick-fill presets on the Login screen:
- **Manager**: `manager@apex.local` / `Password123!`
- **Loan Officer**: `officer@apex.local` / `Password123!`
- **Cashier**: `cashier@apex.local` / `Password123!`
- **Borrower**: `borrower@apex.local` / `Password123!`

---

## 6. Troubleshooting Gmail SMTP Errors

| Error Code / Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **`535-5.7.8 Username and Password not accepted` (EAUTH)** | Using normal Gmail account password instead of Google App Password, or typo in email. | 1. Enable 2-Step Verification in Google Account.<br>2. Generate a fresh 16-character App Password under `Security > App Passwords`.<br>3. Paste the 16 characters into `MAIL_PASSWORD` in `.env`. |
| **`ETIMEDOUT` or `ECONNREFUSED`** | Firewall or ISP blocking port 465/587 or strict network proxy. | Ensure `MAIL_PORT=587` and `MAIL_HOST=smtp.gmail.com`. TLS STARTTLS is used by default. |
| **Email going to Spam / Junk** | Brand new sender address sending to personal inbox. | Open your Spam folder in Gmail, select the message, and click **Not spam**. Future messages will land in your Primary inbox. |
| **Dev Mode Fallback** | `MAIL_USERNAME` not yet configured in `.env`. | The system detects missing credentials, logs a clear warning in the server terminal with the exact generated OTP code, and displays it in the UI so registration testing is never blocked. |

---

## 7. REST API Endpoints Reference

All endpoints accept and return JSON with standard HTTP status codes:

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new account & trigger Gmail OTP | `201 Created` |
| `POST` | `/api/v1/auth/login` | Sign in with email/username & password | `200 OK` / `401 Unauthorized` |
| `POST` | `/api/v1/auth/verify-otp` | Verify 6-digit OTP code for activation / reset | `200 OK` / `400 Bad Request` |
| `POST` | `/api/v1/auth/resend-otp` | Resend 6-digit code (60-second cooldown) | `200 OK` / `429 Too Many Requests` |
| `POST` | `/api/v1/auth/forgot-password` | Request password recovery OTP | `200 OK` |
| `POST` | `/api/v1/auth/reset-password` | Set new password with verified reset token | `200 OK` / `400 Bad Request` |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile & roles | `200 OK` / `401 Unauthorized` |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token and invalidate session | `200 OK` |
