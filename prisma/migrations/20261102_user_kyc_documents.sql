-- ====================================================================
-- Production Regulatory KYC Documents & Verification Schema
-- Version: 1.1.0
-- Core Banking & Regulatory Compliance: National Bank of Cambodia (NBC)
-- ====================================================================

-- 1. Create KycDocumentType Enum if not exists
DO $$ BEGIN
    CREATE TYPE "KycDocumentType" AS ENUM (
        'NATIONAL_ID',
        'PROOF_OF_RESIDENCE',
        'EMPLOYMENT_INCOME_CONTRACT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create KycVerificationStatus Enum if not exists
DO $$ BEGIN
    CREATE TYPE "KycVerificationStatus" AS ENUM (
        'MISSING',
        'PENDING_REVIEW',
        'VERIFIED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create user_kyc_documents Table
CREATE TABLE IF NOT EXISTS "user_kyc_documents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "document_type" "KycDocumentType" NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "reference_number" VARCHAR(100) NOT NULL,
    "status" "KycVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verified_at" TIMESTAMPTZ(6) NULL,
    "verified_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
    "rejection_reason" TEXT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Strict 1 active document per regulatory type per user
    CONSTRAINT "uq_user_kyc_document_type" UNIQUE ("user_id", "document_type")
);

-- 4. Create Performance and Discovery Indices
CREATE INDEX IF NOT EXISTS "idx_user_kyc_documents_user_id" ON "user_kyc_documents" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_kyc_documents_status" ON "user_kyc_documents" ("status");
CREATE INDEX IF NOT EXISTS "idx_user_kyc_documents_ref_num" ON "user_kyc_documents" ("reference_number");
CREATE INDEX IF NOT EXISTS "idx_user_kyc_documents_doc_type" ON "user_kyc_documents" ("document_type");

-- Comment annotations for regulatory documentation
COMMENT ON TABLE "user_kyc_documents" IS 'Mandatory NBC Regulatory KYC Document Vault with 256-bit S3 object references';
COMMENT ON COLUMN "user_kyc_documents"."document_type" IS 'Regulatory document category: NATIONAL_ID, PROOF_OF_RESIDENCE, EMPLOYMENT_INCOME_CONTRACT';
COMMENT ON COLUMN "user_kyc_documents"."file_key" IS 'Private encrypted object key in AWS S3 or Cloudflare R2 bucket';
COMMENT ON COLUMN "user_kyc_documents"."reference_number" IS 'Official government or corporate reference ID (e.g. NID-KH-010992384, RES-PP-99401, EMP-CORP-2026)';
COMMENT ON COLUMN "user_kyc_documents"."status" IS 'Verification status: MISSING, PENDING_REVIEW, VERIFIED, REJECTED. Borrowing requires 3 of 3 VERIFIED.';

