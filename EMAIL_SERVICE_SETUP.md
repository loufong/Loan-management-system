# Apex LMS — Transactional Email & OTP Service Architecture

This document provides complete instructions for the **Apex Loan Management System (Apex LMS)** email service architecture.

---

## 1. Core Principle: One-Time System Owner Setup

> [!IMPORTANT]
> **Normal borrowers/users do NOT need to configure anything in Gmail or any email service!**
> - Users do NOT need to enable 2-Step Verification.
> - Users do NOT need to generate Google App Passwords.
> - Users do NOT configure SMTP or give their email passwords.
> 
> Only the **SYSTEM OWNER (ADMIN)** configures the email provider once in `.env`.
> Once configured, ANY user registering with ANY email provider (**Gmail, Yahoo, Outlook, Proton, etc.**) will automatically receive their 6-digit OTP in their inbox.

---

## 2. Architecture Diagram

```
   [ Borrower (Any Email: Gmail, Yahoo, Outlook) ]
                         │
                         ├── 1. Register / Forgot Password
                         ▼
             [ Apex LMS Backend API ]
                         │
                         ├── 2. Generates 6-Digit OTP & Hashes with Salt
                         ├── 3. Persists to PostgreSQL (10-minute expiry)
                         ▼
             [ EmailService Abstraction ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   [ Option 1: Resend ]          [ Option 2: SMTP / Gmail ]
   (Recommended Production)      (Development / Fallback)
        │                                 │
        ▼                                 ▼
   [ User's Inbox (Gmail / Yahoo / Outlook / Company Email) ]
```

---

## 3. Recommended Production Setup: Resend (30 Seconds Setup)

[Resend](https://resend.com) is a modern, reliable transactional email service built for Node.js/TypeScript applications.

### Step-by-Step Instructions:

1. **Sign Up for Resend**:
   - Go to [https://resend.com](https://resend.com) and create a free account.
2. **Create an API Key**:
   - Navigate to the **API Keys** section in the Resend dashboard.
   - Click **Create API Key**.
   - Name it `Apex LMS` and grant **Full Access**.
   - Copy the API key (starts with `re_...`).
3. **Configure `.env`**:
   Open `.env` in the root of your project:
   ```env
   EMAIL_PROVIDER="resend"
   RESEND_API_KEY="re_your_copied_api_key_here"
   EMAIL_FROM="Apex Loan Management System <onboarding@resend.dev>"
   EMAIL_FROM_NAME="Apex Loan Management System"
   ```
4. **Test Sending Immediately**:
   Run the verification CLI tool to send a live email to your personal inbox:
   ```powershell
   npx ts-node scripts/verify-email.ts your_personal_email@gmail.com
   ```

> [!TIP]
> **Using Your Custom Domain**:
> By default, Resend provides `onboarding@resend.dev` for immediate testing.
> To send emails to any recipient without domain restrictions, go to the **Domains** tab in Resend, add your domain (e.g., `apexloans.com`), add the DNS records, and set `EMAIL_FROM="Apex Loan Management System <noreply@apexloans.com>"`.

---

## 4. Alternative Setup: Gmail SMTP (Google App Password)

If you prefer using a Gmail account as the system-wide sender:

1. Sign in to your system Gmail account at [myaccount.google.com](https://myaccount.google.com/).
2. Enable **2-Step Verification** under **Security**.
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
4. Create an App Password named `Apex LMS`. Copy the 16-character code.
5. In `.env`:
   ```env
   EMAIL_PROVIDER="smtp"
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_SECURE="false"
   EMAIL_USER="your-system-gmail@gmail.com"
   EMAIL_PASSWORD="your-16-character-google-app-password"
   EMAIL_FROM="Apex Loan Management System <your-system-gmail@gmail.com>"
   ```
6. Verify with:
   ```powershell
   npx ts-node scripts/verify-email.ts your_personal_email@gmail.com
   ```

---

## 5. Security & Rate-Limiting Features

- **6-Digit Secure OTP**: Generated via `crypto.randomInt(100000, 1000000)`.
- **Database Storage**: OTP is hashed using salted SHA-256 before storage in PostgreSQL.
- **Expiration**: Strict **10-minute expiry** window.
- **Single Use**: Once verified, the OTP is invalidated immediately.
- **Attempt Limit**: Maximum **5 failed attempts** before locking.
- **Resend Cooldown**: Enforced **60-second cooldown** between requests.
- **Rate Limit**: Maximum **3 resend requests** within 10 minutes.
- **Zero Secrets in Git**: `.env` is ignored by Git. Secrets never leak to frontend code.

---

## 6. Endpoints Reference

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new borrower & send verification OTP |
| `POST` | `/api/v1/auth/verify-otp` | Verify 6-digit OTP code for activation / reset |
| `POST` | `/api/v1/auth/resend-otp` | Resend 6-digit OTP (60s cooldown, max 3/10m) |
| `POST` | `/api/v1/auth/login` | Sign in with email & password |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | Set new password with verified OTP |
