-- ============================================================================
-- Supabase / PostgreSQL Full Schema Migration
-- Core Banking & Microfinance Platform (Jam Song Vich LMS)
-- Phase 2: Database Schema & Multi-Tenant Isolation Security
-- ============================================================================

-- 0. Extensions Setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Helper Functions & Automation Triggers
-- ============================================================================

-- Function: Reusable Timestamp Updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Core Tables Definition
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: PROFILES
-- System users, officers, checkers, tellers, and borrowers (linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  khmer_name text,
  phone text,
  role text NOT NULL DEFAULT 'borrower' CHECK (role IN ('admin', 'loan_officer', 'checker', 'teller', 'borrower')),
  branch_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward-compatible column additions if profiles table already existed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS khmer_name text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id uuid;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    
    -- Relax/update check constraint to include all 5 designated roles
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('admin', 'loan_officer', 'checker', 'teller', 'borrower'));
  END IF;
END $$;

COMMENT ON TABLE public.profiles IS 'System user clearance profiles linked 1:1 with auth.users';
COMMENT ON COLUMN public.profiles.role IS 'RBAC Role: admin, loan_officer, checker, teller, borrower';
COMMENT ON COLUMN public.profiles.is_active IS 'Active status flag: false blocks authentication and authorization';

-- ----------------------------------------------------------------------------
-- Table 2: BORROWERS
-- Central borrower registry with national ID and optional linked user account
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.borrowers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_kh text,
  national_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  address text,
  monthly_income numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_income >= 0),
  guarantor_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward-compatible column additions if borrowers table already existed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'borrowers') THEN
    ALTER TABLE public.borrowers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    ALTER TABLE public.borrowers ADD COLUMN IF NOT EXISTS code text;
    ALTER TABLE public.borrowers ADD COLUMN IF NOT EXISTS monthly_income numeric(14, 2) DEFAULT 0.00 CHECK (monthly_income >= 0);
    
    -- Sync existing code column from legacy ID or code if null
    UPDATE public.borrowers 
    SET code = 'BOR-' || to_char(created_at, 'YYYY') || '-' || lpad(row_number() over (order by created_at)::text, 4, '0')
    WHERE code IS NULL;
    
    ALTER TABLE public.borrowers ALTER COLUMN code SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_borrowers_code') THEN
      ALTER TABLE public.borrowers ADD CONSTRAINT uq_borrowers_code UNIQUE (code);
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.borrowers IS 'Master directory of verified borrowers and KYC records';
COMMENT ON COLUMN public.borrowers.user_id IS 'Nullable link to auth user profile when the borrower registers an online portal account';
COMMENT ON COLUMN public.borrowers.code IS 'Unique human-readable borrower identification code (e.g., BOR-2026-0001)';

-- ----------------------------------------------------------------------------
-- Table 3: LOANS
-- Active and historical core banking loan facilities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_code text NOT NULL UNIQUE,
  borrower_id uuid NOT NULL REFERENCES public.borrowers(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  principal_amount numeric(14, 2) NOT NULL CHECK (principal_amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'KHR')),
  interest_rate_monthly numeric(5, 2) NOT NULL CHECK (interest_rate_monthly >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  method text NOT NULL DEFAULT 'reducing' CHECK (method IN ('reducing', 'flat')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'paid_off', 'defaulted')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward-compatible column additions if loans table already existed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') THEN
    ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS product_name text DEFAULT 'Standard Personal Loan';
    ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS method text DEFAULT 'reducing';
    
    ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_currency_check;
    ALTER TABLE public.loans ADD CONSTRAINT loans_currency_check CHECK (currency IN ('USD', 'KHR'));

    ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_method_check;
    ALTER TABLE public.loans ADD CONSTRAINT loans_method_check CHECK (method IN ('reducing', 'flat'));

    ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;
    ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
      CHECK (status IN ('pending', 'approved', 'disbursed', 'paid_off', 'defaulted'));
  END IF;
END $$;

COMMENT ON TABLE public.loans IS 'Core lending facilities and active loan accounts';
COMMENT ON COLUMN public.loans.loan_code IS 'Unique banking contract reference (e.g., LN-2026-0010)';
COMMENT ON COLUMN public.loans.method IS 'Amortization interest calculation method: reducing or flat';
COMMENT ON COLUMN public.loans.status IS 'Lifecycle stage: pending, approved, disbursed, paid_off, defaulted';

-- ----------------------------------------------------------------------------
-- Table 4: REPAYMENT_SCHEDULES
-- Penny-perfect installment amortization schedules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repayment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_no integer NOT NULL CHECK (installment_no > 0),
  due_date date NOT NULL,
  principal_due numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (principal_due >= 0),
  interest_due numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (interest_due >= 0),
  total_due numeric(14, 2) NOT NULL CHECK (total_due >= 0),
  paid_amount numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  paid_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_repayment_schedules_loan_installment UNIQUE (loan_id, installment_no)
);

-- Backward-compatible constraints update if table already existed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'repayment_schedules') THEN
    ALTER TABLE public.repayment_schedules DROP CONSTRAINT IF EXISTS repayment_schedules_status_check;
    ALTER TABLE public.repayment_schedules ADD CONSTRAINT repayment_schedules_status_check 
      CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue'));
  END IF;
END $$;

COMMENT ON TABLE public.repayment_schedules IS 'Amortization schedule installments per loan facility';
COMMENT ON COLUMN public.repayment_schedules.loan_id IS 'Parent loan ID (deleting loan cascades and purges schedules)';
COMMENT ON COLUMN public.repayment_schedules.status IS 'Installment status: unpaid, partial, paid, overdue';

-- ----------------------------------------------------------------------------
-- Table 5: PAYMENTS
-- Financial ledger entries and cashier transaction receipts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text NOT NULL UNIQUE,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
  schedule_id uuid NOT NULL REFERENCES public.repayment_schedules(id) ON DELETE RESTRICT,
  amount_paid numeric(14, 2) NOT NULL CHECK (amount_paid > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'KHR')),
  method text NOT NULL DEFAULT 'CASH' CHECK (method IN ('CASH', 'KHQR', 'BANK_TRANSFER')),
  cashier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward-compatible update for payments table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_no text;
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
    
    -- Normalize legacy reference_no to receipt_no
    UPDATE public.payments 
    SET receipt_no = COALESCE(receipt_no, 'REC-' || to_char(created_at, 'YYYY') || '-' || lpad(row_number() over (order by created_at)::text, 4, '0'))
    WHERE receipt_no IS NULL;

    ALTER TABLE public.payments ALTER COLUMN receipt_no SET NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_receipt_no') THEN
      ALTER TABLE public.payments ADD CONSTRAINT uq_payments_receipt_no UNIQUE (receipt_no);
    END IF;

    -- Enforce NOT NULL and foreign key constraint on schedule_id
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_schedule_id_fkey;
    ALTER TABLE public.payments ADD CONSTRAINT payments_schedule_id_fkey 
      FOREIGN KEY (schedule_id) REFERENCES public.repayment_schedules(id) ON DELETE RESTRICT;

    -- Update method constraint to uppercase CASH, KHQR, BANK_TRANSFER
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_method_check 
      CHECK (method IN ('CASH', 'KHQR', 'BANK_TRANSFER'));
  END IF;
END $$;

COMMENT ON TABLE public.payments IS 'Immutable collection receipts and audit ledger';
COMMENT ON COLUMN public.payments.receipt_no IS 'Official banking receipt number (e.g., REC-2026-0001)';
COMMENT ON COLUMN public.payments.schedule_id IS 'Required foreign key to the targeted installment schedule period';

-- ============================================================================
-- 3. Automatic updated_at Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_borrowers_updated_at ON public.borrowers;
CREATE TRIGGER trg_borrowers_updated_at
  BEFORE UPDATE ON public.borrowers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_loans_updated_at ON public.loans;
CREATE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_repayment_schedules_updated_at ON public.repayment_schedules;
CREATE TRIGGER trg_repayment_schedules_updated_at
  BEFORE UPDATE ON public.repayment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Automatic Profile Provisioning on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'borrower')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. High-Performance B-Tree Indexes
-- ============================================================================

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Borrowers Indexes
CREATE INDEX IF NOT EXISTS idx_borrowers_user_id ON public.borrowers(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_code ON public.borrowers(code);
CREATE INDEX IF NOT EXISTS idx_borrowers_national_id ON public.borrowers(national_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_phone ON public.borrowers(phone);
CREATE INDEX IF NOT EXISTS idx_borrowers_name_en ON public.borrowers(name_en);

-- Loans Indexes
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_loan_code ON public.loans(loan_code);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_currency ON public.loans(currency);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans(created_at DESC);

-- Repayment Schedules Indexes (Optimized for Amortization & Overdue Queries)
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_loan_id ON public.repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_status ON public.repayment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_due_date ON public.repayment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_loan_inst ON public.repayment_schedules(loan_id, installment_no);

-- Payments Indexes (Optimized for Receipt Lookup & Cashier Desk)
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_schedule_id ON public.payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON public.payments(receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_cashier_id ON public.payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- ============================================================================
-- 5. Row Level Security (RLS) & Multi-Tenant Isolation
-- Strictly isolates borrower data: borrowers can NEVER see other borrowers' data
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper Function: Current User Role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'borrower') FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper Function: Check Staff Clearance
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_current_role() IN ('admin', 'loan_officer', 'checker', 'teller');
$$;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_current_role() = 'admin' OR id = auth.uid())
  WITH CHECK (public.get_current_role() = 'admin' OR id = auth.uid());

-- ----------------------------------------------------------------------------
-- BORROWERS POLICIES (Data Isolation)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "borrowers_select_policy" ON public.borrowers;
CREATE POLICY "borrowers_select_policy"
  ON public.borrowers FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "borrowers_insert_policy" ON public.borrowers;
CREATE POLICY "borrowers_insert_policy"
  ON public.borrowers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('admin', 'loan_officer')
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "borrowers_update_policy" ON public.borrowers;
CREATE POLICY "borrowers_update_policy"
  ON public.borrowers FOR UPDATE
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'loan_officer')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.get_current_role() IN ('admin', 'loan_officer')
    OR user_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- LOANS POLICIES (Multi-Tenant Isolation)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "loans_select_policy" ON public.loans;
CREATE POLICY "loans_select_policy"
  ON public.loans FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR borrower_id IN (
      SELECT b.id FROM public.borrowers b WHERE b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "loans_insert_policy" ON public.loans;
CREATE POLICY "loans_insert_policy"
  ON public.loans FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('admin', 'loan_officer')
  );

DROP POLICY IF EXISTS "loans_update_policy" ON public.loans;
CREATE POLICY "loans_update_policy"
  ON public.loans FOR UPDATE
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'loan_officer', 'checker')
  )
  WITH CHECK (
    public.get_current_role() IN ('admin', 'loan_officer', 'checker')
  );

-- ----------------------------------------------------------------------------
-- REPAYMENT_SCHEDULES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "repayment_schedules_select_policy" ON public.repayment_schedules;
CREATE POLICY "repayment_schedules_select_policy"
  ON public.repayment_schedules FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR loan_id IN (
      SELECT l.id FROM public.loans l
      JOIN public.borrowers b ON b.id = l.borrower_id
      WHERE b.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR loan_id IN (
      SELECT l.id FROM public.loans l
      JOIN public.borrowers b ON b.id = l.borrower_id
      WHERE b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_insert_policy"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('admin', 'teller')
    OR cashier_id = auth.uid()
  );
