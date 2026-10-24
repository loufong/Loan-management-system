-- ============================================================================
-- Supabase / PostgreSQL Row Level Security (RLS) Policies
-- File: supabase/rls_data_isolation_policies.sql
-- Module: Multi-Tenant Data Isolation & Privacy Leak Prevention
-- Target Tables: profiles, borrowers, loans, repayment_schedules, payments
-- ============================================================================

-- ============================================================================
-- 1. Enable Row Level Security (RLS) on all relevant tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Helper Functions (SECURITY DEFINER to prevent recursive RLS)
-- ============================================================================

-- Function: Get current authenticated user's role from profiles table
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

-- Function: Check if caller is bank staff (admin, loan_officer, checker, teller)
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

-- Function: Check if caller is system administrator
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

-- ============================================================================
-- 3. PROFILES Table Policies
-- ============================================================================
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

-- ============================================================================
-- 4. BORROWERS Table Policies (Data Privacy Isolation)
-- Rule:
-- - Staff (admin, loan_officer, teller) have full access to read all records.
-- - Role 'borrower': Strictly restricted to borrowers.user_id = auth.uid()
-- ============================================================================
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

-- ============================================================================
-- 5. LOANS Table Policies (Anti-Cross-Tenant Leak)
-- Rule:
-- - Staff (admin, loan_officer, teller) have full access to read all loans.
-- - Role 'borrower': Strictly restricted to:
--     loans.borrower_id IN (SELECT id FROM borrowers WHERE user_id = auth.uid())
-- ============================================================================
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

-- ============================================================================
-- 6. REPAYMENT_SCHEDULES Table Policies (Cascading Isolation)
-- Rule:
-- - Staff: Full read access.
-- - Role 'borrower': Strictly restricted to schedules for their own loans.
-- ============================================================================
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

-- ============================================================================
-- 7. PAYMENTS Table Policies (Cascading Isolation)
-- Rule:
-- - Staff: Full read access to the transaction ledger.
-- - Role 'borrower': Strictly restricted to payments for their own loans.
-- ============================================================================
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

-- ============================================================================
-- 8. Performance Indexes Supporting RLS Subqueries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_borrowers_user_id ON public.borrowers(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_repayment_schedules_loan_id ON public.repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments(loan_id);
