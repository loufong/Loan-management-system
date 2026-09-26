-- ====================================================================
-- Academic Loan Management System (LMS)
-- Database Initialization & Migration Script (PostgreSQL)
-- Version: 1.0.0
-- ====================================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. ENUM DEFINITIONS
-- ====================================================================

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM (
        'BORROWER',
        'LOAN_OFFICER',
        'CREDIT_OFFICER',
        'CASHIER',
        'MANAGER',
        'ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RepaymentFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ApplicationStatus" AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReviewRecommendation" AS ENUM (
        'RECOMMEND_APPROVAL',
        'RECOMMEND_REJECTION',
        'NEED_MORE_INFO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LoanStatus" AS ENUM (
        'PENDING',
        'ACTIVE',
        'OVERDUE',
        'COMPLETED',
        'CANCELLED',
        'WRITTEN_OFF'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DisbursementMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'DISBURSED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScheduleStatus" AS ENUM ('UPCOMING', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'QR_PAYMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EntityType" AS ENUM ('BORROWER', 'APPLICATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'INCOME_PROOF', 'EMPLOYMENT_PROOF', 'AGREEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- 2. TRIGGER FUNCTION: AUTO-UPDATE updated_at
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 3. TABLE DEFINITIONS
-- ====================================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "position" VARCHAR(100),
    "department" VARCHAR(100),
    "role" "UserRole" NOT NULL DEFAULT 'BORROWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. BORROWERS
CREATE TABLE IF NOT EXISTS "borrowers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "borrower_id" VARCHAR(30) NOT NULL UNIQUE, -- e.g. BOR-2026-0001
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "dob" DATE NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "occupation" VARCHAR(100) NOT NULL,
    "monthly_income" NUMERIC(15, 2) NOT NULL CHECK ("monthly_income" >= 0),
    "id_number" VARCHAR(50) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_borrowers_updated_at
BEFORE UPDATE ON "borrowers"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. LOAN PRODUCTS
CREATE TABLE IF NOT EXISTS "loan_products" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_name" VARCHAR(100) NOT NULL UNIQUE,
    "min_amount" NUMERIC(15, 2) NOT NULL CHECK ("min_amount" > 0),
    "max_amount" NUMERIC(15, 2) NOT NULL CHECK ("max_amount" >= "min_amount"),
    "interest_rate" NUMERIC(5, 2) NOT NULL CHECK ("interest_rate" >= 0),
    "min_term" INT NOT NULL CHECK ("min_term" > 0),
    "max_term" INT NOT NULL CHECK ("max_term" >= "min_term"),
    "repayment_frequency" "RepaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "description" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_loan_products_updated_at
BEFORE UPDATE ON "loan_products"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. LOAN APPLICATIONS
CREATE TABLE IF NOT EXISTS "loan_applications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "application_no" VARCHAR(30) NOT NULL UNIQUE, -- e.g. APP-2026-0001
    "borrower_id" UUID NOT NULL REFERENCES "borrowers"("id") ON DELETE RESTRICT,
    "product_id" UUID NOT NULL REFERENCES "loan_products"("id") ON DELETE RESTRICT,
    "requested_amount" NUMERIC(15, 2) NOT NULL CHECK ("requested_amount" > 0),
    "requested_term" INT NOT NULL CHECK ("requested_term" > 0),
    "purpose" TEXT NOT NULL,
    "monthly_income" NUMERIC(15, 2) NOT NULL CHECK ("monthly_income" >= 0),
    "supporting_info" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_loan_applications_updated_at
BEFORE UPDATE ON "loan_applications"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. APPLICATION STATUS HISTORIES
CREATE TABLE IF NOT EXISTS "application_status_histories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL REFERENCES "loan_applications"("id") ON DELETE CASCADE,
    "previous_status" "ApplicationStatus",
    "new_status" "ApplicationStatus" NOT NULL,
    "changed_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. APPLICATION REVIEWS
CREATE TABLE IF NOT EXISTS "application_reviews" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL REFERENCES "loan_applications"("id") ON DELETE CASCADE,
    "reviewer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "recommendation" "ReviewRecommendation" NOT NULL,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. APPLICATION APPROVALS
CREATE TABLE IF NOT EXISTS "application_approvals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL REFERENCES "loan_applications"("id") ON DELETE CASCADE,
    "approver_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "decision" "ApprovalDecision" NOT NULL,
    "approved_amount" NUMERIC(15, 2) CHECK ("approved_amount" IS NULL OR "approved_amount" > 0),
    "approved_term" INT CHECK ("approved_term" IS NULL OR "approved_term" > 0),
    "approved_interest_rate" NUMERIC(5, 2) CHECK ("approved_interest_rate" IS NULL OR "approved_interest_rate" >= 0),
    "rejection_reason" TEXT,
    "decision_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. LOANS
CREATE TABLE IF NOT EXISTS "loans" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "loan_number" VARCHAR(30) NOT NULL UNIQUE, -- e.g. LN-2026-0001
    "application_id" UUID NOT NULL UNIQUE REFERENCES "loan_applications"("id") ON DELETE RESTRICT,
    "borrower_id" UUID NOT NULL REFERENCES "borrowers"("id") ON DELETE RESTRICT,
    "product_id" UUID NOT NULL REFERENCES "loan_products"("id") ON DELETE RESTRICT,
    "principal_amount" NUMERIC(15, 2) NOT NULL CHECK ("principal_amount" > 0),
    "interest_rate" NUMERIC(5, 2) NOT NULL CHECK ("interest_rate" >= 0),
    "term_months" INT NOT NULL CHECK ("term_months" > 0),
    "repayment_frequency" "RepaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "total_interest" NUMERIC(15, 2) NOT NULL CHECK ("total_interest" >= 0),
    "total_repayment" NUMERIC(15, 2) NOT NULL CHECK ("total_repayment" >= "principal_amount"),
    "total_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK ("total_paid" >= 0),
    "outstanding_balance" NUMERIC(15, 2) NOT NULL CHECK ("outstanding_balance" >= 0),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL CHECK ("end_date" >= "start_date"),
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_loans_updated_at
BEFORE UPDATE ON "loans"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. DISBURSEMENTS
CREATE TABLE IF NOT EXISTS "disbursements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "loan_id" UUID NOT NULL REFERENCES "loans"("id") ON DELETE RESTRICT,
    "disbursement_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" NUMERIC(15, 2) NOT NULL CHECK ("amount" > 0),
    "payment_method" "DisbursementMethod" NOT NULL,
    "reference_no" VARCHAR(100) NOT NULL,
    "disbursed_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. REPAYMENT SCHEDULES
CREATE TABLE IF NOT EXISTS "repayment_schedules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "loan_id" UUID NOT NULL REFERENCES "loans"("id") ON DELETE CASCADE,
    "installment_no" INT NOT NULL CHECK ("installment_no" > 0),
    "due_date" DATE NOT NULL,
    "principal_amount" NUMERIC(15, 2) NOT NULL CHECK ("principal_amount" >= 0),
    "interest_amount" NUMERIC(15, 2) NOT NULL CHECK ("interest_amount" >= 0),
    "total_due" NUMERIC(15, 2) NOT NULL CHECK ("total_due" > 0),
    "amount_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK ("amount_paid" >= 0),
    "remaining_amount" NUMERIC(15, 2) NOT NULL CHECK ("remaining_amount" >= 0),
    "status" "ScheduleStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loan_installment UNIQUE ("loan_id", "installment_no")
);

CREATE TRIGGER trg_repayment_schedules_updated_at
BEFORE UPDATE ON "repayment_schedules"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. PAYMENTS
CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "receipt_no" VARCHAR(30) NOT NULL UNIQUE, -- e.g. REC-2026-0001
    "loan_id" UUID NOT NULL REFERENCES "loans"("id") ON DELETE RESTRICT,
    "installment_id" UUID REFERENCES "repayment_schedules"("id") ON DELETE SET NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" NUMERIC(15, 2) NOT NULL CHECK ("amount" > 0),
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_no" VARCHAR(100) NOT NULL,
    "received_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. LOAN DOCUMENTS
CREATE TABLE IF NOT EXISTS "loan_documents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entity_type" "EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_loan_documents_updated_at
BEFORE UPDATE ON "loan_documents"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_name" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "ip_address" VARCHAR(50),
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. REFRESH TOKENS
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "token_hash" VARCHAR(255) NOT NULL UNIQUE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "is_revoked" BOOLEAN NOT NULL DEFAULT FALSE,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 4. PERFORMANCE INDEXES
-- ====================================================================

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON "users"("role");
CREATE INDEX IF NOT EXISTS idx_users_status ON "users"("status");

-- Borrowers Indexes
CREATE INDEX IF NOT EXISTS idx_borrowers_user_id ON "borrowers"("user_id");
CREATE INDEX IF NOT EXISTS idx_borrowers_id_number ON "borrowers"("id_number");
CREATE INDEX IF NOT EXISTS idx_borrowers_status ON "borrowers"("status");

-- Loan Products Indexes
CREATE INDEX IF NOT EXISTS idx_loan_products_status ON "loan_products"("status");

-- Loan Applications Indexes
CREATE INDEX IF NOT EXISTS idx_loan_apps_borrower ON "loan_applications"("borrower_id");
CREATE INDEX IF NOT EXISTS idx_loan_apps_product ON "loan_applications"("product_id");
CREATE INDEX IF NOT EXISTS idx_loan_apps_status ON "loan_applications"("status");
CREATE INDEX IF NOT EXISTS idx_loan_apps_created_by ON "loan_applications"("created_by");

-- Application Status History Indexes
CREATE INDEX IF NOT EXISTS idx_app_status_hist_app_id ON "application_status_histories"("application_id");
CREATE INDEX IF NOT EXISTS idx_app_status_hist_changed_by ON "application_status_histories"("changed_by");

-- Application Reviews Indexes
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON "application_reviews"("application_id");
CREATE INDEX IF NOT EXISTS idx_app_reviews_reviewer ON "application_reviews"("reviewer_id");

-- Application Approvals Indexes
CREATE INDEX IF NOT EXISTS idx_app_approvals_app_id ON "application_approvals"("application_id");
CREATE INDEX IF NOT EXISTS idx_app_approvals_approver ON "application_approvals"("approver_id");
CREATE INDEX IF NOT EXISTS idx_app_approvals_decision ON "application_approvals"("decision");

-- Loans Indexes
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON "loans"("borrower_id");
CREATE INDEX IF NOT EXISTS idx_loans_product ON "loans"("product_id");
CREATE INDEX IF NOT EXISTS idx_loans_status ON "loans"("status");
CREATE INDEX IF NOT EXISTS idx_loans_dates ON "loans"("start_date", "end_date");

-- Disbursements Indexes
CREATE INDEX IF NOT EXISTS idx_disbursements_loan ON "disbursements"("loan_id");
CREATE INDEX IF NOT EXISTS idx_disbursements_by ON "disbursements"("disbursed_by");
CREATE INDEX IF NOT EXISTS idx_disbursements_status ON "disbursements"("status");
CREATE INDEX IF NOT EXISTS idx_disbursements_ref ON "disbursements"("reference_no");

-- Repayment Schedules Indexes
CREATE INDEX IF NOT EXISTS idx_repayment_sched_loan ON "repayment_schedules"("loan_id");
CREATE INDEX IF NOT EXISTS idx_repayment_sched_due_date ON "repayment_schedules"("due_date");
CREATE INDEX IF NOT EXISTS idx_repayment_sched_status ON "repayment_schedules"("status");

-- Payments Indexes
CREATE INDEX IF NOT EXISTS idx_payments_loan ON "payments"("loan_id");
CREATE INDEX IF NOT EXISTS idx_payments_installment ON "payments"("installment_id");
CREATE INDEX IF NOT EXISTS idx_payments_received_by ON "payments"("received_by");
CREATE INDEX IF NOT EXISTS idx_payments_date ON "payments"("payment_date");
CREATE INDEX IF NOT EXISTS idx_payments_status ON "payments"("status");

-- Loan Documents Indexes
CREATE INDEX IF NOT EXISTS idx_loan_docs_entity ON "loan_documents"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS idx_loan_docs_uploaded_by ON "loan_documents"("uploaded_by");
CREATE INDEX IF NOT EXISTS idx_loan_docs_status ON "loan_documents"("verification_status");

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS idx_notifications_created ON "notifications"("created_at");

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "audit_logs"("entity_name", "entity_id");
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON "audit_logs"("timestamp");

-- Refresh Tokens Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON "refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON "refresh_tokens"("token_hash");
