-- ============================================================================
-- Supabase / PostgreSQL Row Level Security (RLS) Migration
-- File: supabase/migrations/20261024000005_row_level_security_policies.sql
-- Phase 2: Database Schema & Multi-Tenant Isolation Security
-- Prompt 2.2: Row Level Security (RLS) to Prevent Cross-Borrower Leaks
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enable Row Level Security (RLS) on all Core Banking Tables
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Security Definer Helper Functions (Avoids RLS Recursion)
-- ----------------------------------------------------------------------------

-- Helper: Retrieve current user's role from profiles
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'borrower')
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- Helper: Check if current authenticated user has bank staff clearance
-- Staff roles: admin, loan_officer, checker, teller
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('admin', 'loan_officer', 'checker', 'teller')
      AND is_active = true
  );
$$;

-- Helper: Check if current authenticated user is administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. PROFILES Table RLS Policies
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
  USING (
    public.is_admin()
    OR id = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 4. BORROWERS Table RLS Policies
-- Staff: Full read access to all borrower records
-- Borrowers: Strictly restricted to their own record where user_id = auth.uid()
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

DROP POLICY IF EXISTS "borrowers_delete_policy" ON public.borrowers;
CREATE POLICY "borrowers_delete_policy"
  ON public.borrowers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. LOANS Table RLS Policies
-- Staff: Full read access to company loan portfolio
-- Borrowers: Strictly restricted to loans where borrower_id IN (SELECT id FROM borrowers WHERE user_id = auth.uid())
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "loans_select_policy" ON public.loans;
CREATE POLICY "loans_select_policy"
  ON public.loans FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR borrower_id IN (
      SELECT id FROM public.borrowers WHERE user_id = auth.uid()
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

DROP POLICY IF EXISTS "loans_delete_policy" ON public.loans;
CREATE POLICY "loans_delete_policy"
  ON public.loans FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. REPAYMENT_SCHEDULES Table RLS Policies
-- Staff: Full read access to all installments
-- Borrowers: Cascading restriction to installments for their own loans
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "repayment_schedules_select_policy" ON public.repayment_schedules;
CREATE POLICY "repayment_schedules_select_policy"
  ON public.repayment_schedules FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR loan_id IN (
      SELECT id FROM public.loans
      WHERE borrower_id IN (
        SELECT id FROM public.borrowers WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "repayment_schedules_write_policy" ON public.repayment_schedules;
CREATE POLICY "repayment_schedules_write_policy"
  ON public.repayment_schedules FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS Table RLS Policies
-- Staff: Full read access to transaction ledger
-- Borrowers: Cascading restriction to payment receipts for their own loans
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    OR loan_id IN (
      SELECT id FROM public.loans
      WHERE borrower_id IN (
        SELECT id FROM public.borrowers WHERE user_id = auth.uid()
      )
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

-- ----------------------------------------------------------------------------
-- 8. Performance Indexes for Rapid RLS Subquery Evaluation
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_borrowers_user_id ON public.borrowers(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_loan_id ON public.repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments(loan_id);
