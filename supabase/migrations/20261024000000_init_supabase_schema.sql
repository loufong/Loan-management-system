-- ============================================================================
-- Supabase (PostgreSQL) Production Schema & Migration Script
-- Academic & Enterprise Loan Management System (LMS)
-- ============================================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Helper Functions & Triggers
-- ============================================================================

-- Reusable timestamp updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Core Tables
-- ============================================================================

-- Table 1: Profiles (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'teller' CHECK (role IN ('admin', 'loan_officer', 'teller')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 2: Borrowers
CREATE TABLE IF NOT EXISTS public.borrowers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_kh text,
  national_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  address text,
  income_monthly numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (income_monthly >= 0),
  guarantor_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 3: Loans
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id uuid NOT NULL REFERENCES public.borrowers(id) ON DELETE RESTRICT,
  loan_code text NOT NULL UNIQUE,
  principal_amount numeric(14, 2) NOT NULL CHECK (principal_amount > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'KHR')),
  interest_rate_monthly numeric(5, 2) NOT NULL CHECK (interest_rate_monthly >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  payment_frequency text NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'biweekly', 'monthly')),
  interest_type text NOT NULL DEFAULT 'reducing' CHECK (interest_type IN ('reducing', 'flat')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'paid_off', 'defaulted')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 4: Repayment Schedules
CREATE TABLE IF NOT EXISTS public.repayment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_no integer NOT NULL CHECK (installment_no > 0),
  due_date date NOT NULL,
  principal_due numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (principal_due >= 0),
  interest_due numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (interest_due >= 0),
  total_due numeric(14, 2) NOT NULL CHECK (total_due >= 0),
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partial', 'overdue')),
  paid_amount numeric(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  paid_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_repayment_schedules_loan_installment UNIQUE (loan_id, installment_no)
);

-- Table 5: Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
  schedule_id uuid REFERENCES public.repayment_schedules(id) ON DELETE SET NULL,
  amount_paid numeric(14, 2) NOT NULL CHECK (amount_paid > 0),
  payment_date timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'khqr', 'card')),
  cashier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reference_no text UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

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

-- Automatic Profile Provisioning on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'teller')
  )
  ON CONFLICT (id) DO NOTHING;
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

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Borrowers
CREATE INDEX IF NOT EXISTS idx_borrowers_national_id ON public.borrowers(national_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_phone ON public.borrowers(phone);
CREATE INDEX IF NOT EXISTS idx_borrowers_name_en ON public.borrowers(name_en);

-- Loans
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_loan_code ON public.loans(loan_code);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_currency ON public.loans(currency);

-- Repayment Schedules
CREATE INDEX IF NOT EXISTS idx_schedules_loan_id ON public.repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date_status ON public.repayment_schedules(due_date, status);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.repayment_schedules(status);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_schedule_id ON public.payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payments_cashier_id ON public.payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date DESC);

-- ============================================================================
-- 5. Row Level Security (RLS) & Policies
-- ============================================================================

-- Security Definer function to check role avoiding recursive RLS checks
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.get_current_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_current_role() = 'admin');

-- ----------------------------------------------------------------------------
-- BORROWERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "borrowers_select_staff" ON public.borrowers;
CREATE POLICY "borrowers_select_staff"
  ON public.borrowers FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer', 'teller'));

DROP POLICY IF EXISTS "borrowers_insert_officer_admin" ON public.borrowers;
CREATE POLICY "borrowers_insert_officer_admin"
  ON public.borrowers FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'loan_officer'));

DROP POLICY IF EXISTS "borrowers_update_officer_admin" ON public.borrowers;
CREATE POLICY "borrowers_update_officer_admin"
  ON public.borrowers FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer'))
  WITH CHECK (public.get_current_role() IN ('admin', 'loan_officer'));

DROP POLICY IF EXISTS "borrowers_delete_admin" ON public.borrowers;
CREATE POLICY "borrowers_delete_admin"
  ON public.borrowers FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'admin');

-- ----------------------------------------------------------------------------
-- LOANS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "loans_select_staff" ON public.loans;
CREATE POLICY "loans_select_staff"
  ON public.loans FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer', 'teller'));

DROP POLICY IF EXISTS "loans_insert_officer_admin" ON public.loans;
CREATE POLICY "loans_insert_officer_admin"
  ON public.loans FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'loan_officer'));

DROP POLICY IF EXISTS "loans_update_officer_admin" ON public.loans;
CREATE POLICY "loans_update_officer_admin"
  ON public.loans FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer'))
  WITH CHECK (public.get_current_role() IN ('admin', 'loan_officer'));

DROP POLICY IF EXISTS "loans_delete_admin" ON public.loans;
CREATE POLICY "loans_delete_admin"
  ON public.loans FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'admin' AND status = 'pending');

-- ----------------------------------------------------------------------------
-- REPAYMENT SCHEDULES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "schedules_select_staff" ON public.repayment_schedules;
CREATE POLICY "schedules_select_staff"
  ON public.repayment_schedules FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer', 'teller'));

DROP POLICY IF EXISTS "schedules_insert_officer_admin" ON public.repayment_schedules;
CREATE POLICY "schedules_insert_officer_admin"
  ON public.repayment_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'loan_officer'));

DROP POLICY IF EXISTS "schedules_update_staff" ON public.repayment_schedules;
CREATE POLICY "schedules_update_staff"
  ON public.repayment_schedules FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer', 'teller'))
  WITH CHECK (public.get_current_role() IN ('admin', 'loan_officer', 'teller'));

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_select_staff" ON public.payments;
CREATE POLICY "payments_select_staff"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'loan_officer', 'teller'));

DROP POLICY IF EXISTS "payments_insert_teller_admin" ON public.payments;
CREATE POLICY "payments_insert_teller_admin"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'teller'));

-- Financial ledger entries are immutable: updates/deletes restricted to admin audit override
DROP POLICY IF EXISTS "payments_update_delete_admin" ON public.payments;
CREATE POLICY "payments_update_delete_admin"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.get_current_role() = 'admin')
  WITH CHECK (public.get_current_role() = 'admin');
