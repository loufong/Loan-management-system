# Apex LMS — Authentication & Email Service Setup Guide

This document provides a comprehensive operational guide for the **Apex Loan Management System (Apex LMS)** authentication engine and email service integration.

---

## 1. System-Wide Email Architecture

> [!IMPORTANT]
> **Borrowers / End-Users never configure email settings!**
> - Normal users simply type their email (Gmail, Yahoo, Outlook, Proton, etc.).
> - Only the **System Owner** sets up the email sender credentials once in `.env`.

---

## 2. Choosing Your Email Provider

The system supports two delivery methods configured via `EMAIL_PROVIDER`:

### Option A: Resend (Recommended for Production)
1. Sign up at [resend.com](https://resend.com).
2. Generate an API Key under **API Keys**.
3. In `.env`:
   ```env
   EMAIL_PROVIDER="resend"
   RESEND_API_KEY="re_your_api_key_here"
   EMAIL_FROM="Apex Loan Management System <onboarding@resend.dev>"
   EMAIL_FROM_NAME="Apex Loan Management System"
   ```

### Option B: Gmail SMTP (Google App Password)
1. Sign in to your system Gmail at [myaccount.google.com](https://myaccount.google.com).
2. Enable 2-Step Verification.
3. Generate a 16-character App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
4. In `.env`:
   ```env
   EMAIL_PROVIDER="smtp"
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_SECURE="false"
   EMAIL_USER="your-system-gmail@gmail.com"
   EMAIL_PASSWORD="your-16-char-app-password"
   EMAIL_FROM="Apex Loan Management System <your-system-gmail@gmail.com>"
   ```

---

## 3. Testing Your Email Setup in 1 Step

Run the diagnostic tool to test your configuration and send a live test email to any inbox:

```powershell
npx ts-node scripts/verify-email.ts your_personal_email@gmail.com
```

---

## 4. End-to-End User Flow

1. **Borrower Registration**:
   - Borrower navigates to `/register` and enters their Name, Email (any provider), and Password.
   - Backend creates record in `pending_registrations` (30m expiry).
   - A cryptographically random 6-digit OTP is hashed, saved to `otp_verifications`, and delivered to the user's inbox.
   - Expiry is set to **10 minutes**.

2. **OTP Verification & Account Activation**:
   - Borrower is redirected to `/verify-email`.
   - Borrower enters the 6-digit OTP received in their email.
   - Backend verifies hash, attempt count (< 5), and expiry.
   - Upon success, the pending registration is transactionally promoted to the permanent `users` table and linked to a `borrowers` profile.
   - User is redirected to `/login` with success banner.

3. **Login & Session Management**:
   - User enters email and password on `/login`.
   - Password verified with bcrypt.
   - Returns JWT access token and 7-day (or 30-day with Remember Me) refresh token.
   - User enters borrower dashboard.

4. **Forgot Password & Password Reset**:
   - User clicks **Forgot Password** on `/login` and enters their email.
   - Backend sends a 6-digit reset OTP to the user's email.
   - User enters OTP and new password on `/reset-password`.
   - Password is updated and old sessions revoked.
   - User logs in with new password.

---

## 5. Security Guardrails

- Passwords hashed with `bcryptjs` (10 rounds).
- OTPs hashed with salted `SHA-256` before PostgreSQL storage.
- Rate limits: 60-second resend cooldown, max 3 resends per 10 minutes.
- Rate limits on login: 5 failed attempts locks for 5 minutes.
- Public registration strictly restricted to standard user role; cannot register as administrator.
- Zero secrets committed to Git (`.env` in `.gitignore`).
