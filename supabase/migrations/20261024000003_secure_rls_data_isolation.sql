-- ============================================================================
-- Supabase Row Level Security (RLS) Policies Migration: Multi-Tenant Data Isolation
-- Gating: 'admin', 'manager', 'accountant', 'loan_officer', 'teller'
-- Restricts Borrowers to ONLY their own loans and records (Anti-Leak Defense)
-- ============================================================================

-- 1. Helper function: Get the authenticated user's role from public.profiles
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'borrower') FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Helper function: Check if current authenticated user has administrative clearance
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_current_role() IN ('admin', 'manager', 'accountant');
$$;

-- 3. Ensure Row Level Security (RLS) is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- BORROWERS TABLE POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "borrowers_select_staff" ON public.borrowers;
DROP POLICY IF EXISTS "borrowers_select_isolated" ON public.borrowers;
DROP POLICY IF EXISTS "borrowers_select_policy" ON public.borrowers;

-- Policy: Staff can view all borrowers; Borrowers can ONLY view their own borrower profile
CREATE POLICY "borrowers_select_policy"
  ON public.borrowers FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'manager', 'accountant', 'loan_officer', 'teller')
    OR id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "borrowers_insert_officer_admin" ON public.borrowers;
DROP POLICY IF EXISTS "borrowers_insert_policy" ON public.borrowers;
CREATE POLICY "borrowers_insert_policy"
  ON public.borrowers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('admin', 'manager', 'loan_officer')
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "borrowers_update_officer_admin" ON public.borrowers;
DROP POLICY IF EXISTS "borrowers_update_policy" ON public.borrowers;
CREATE POLICY "borrowers_update_policy"
  ON public.borrowers FOR UPDATE
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'manager', 'loan_officer')
    OR id = auth.uid()
  )
  WITH CHECK (
    public.get_current_role() IN ('admin', 'manager', 'loan_officer')
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "borrowers_delete_admin" ON public.borrowers;
DROP POLICY IF EXISTS "borrowers_delete_policy" ON public.borrowers;
CREATE POLICY "borrowers_delete_policy"
  ON public.borrowers FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'admin');

-- ----------------------------------------------------------------------------
-- LOANS TABLE POLICIES (Multi-Tenant Data Isolation / Anti-Cross-Tenant Leak)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "loans_select_staff" ON public.loans;
DROP POLICY IF EXISTS "loans_select_isolated" ON public.loans;
DROP POLICY IF EXISTS "loans_select_policy" ON public.loans;

-- Policy: Staff (admin, manager, accountant, loan_officer, teller) can view all loans
-- Borrowers can ONLY view loans where borrower_id matches their own user ID or borrower record
CREATE POLICY "loans_select_policy"
  ON public.loans FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'manager', 'accountant', 'loan_officer', 'teller')
    OR borrower_id = auth.uid()
    OR borrower_id IN (
      SELECT b.id FROM public.borrowers b
      WHERE b.id = auth.uid() OR b.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "loans_insert_officer_admin" ON public.loans;
DROP POLICY IF EXISTS "loans_insert_policy" ON public.loans;
CREATE POLICY "loans_insert_policy"
  ON public.loans FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'manager', 'loan_officer'));

DROP POLICY IF EXISTS "loans_update_officer_admin" ON public.loans;
DROP POLICY IF EXISTS "loans_update_policy" ON public.loans;
CREATE POLICY "loans_update_policy"
  ON public.loans FOR UPDATE
  TO authenticated
  USING (public.get_current_role() IN ('admin', 'manager', 'loan_officer'))
  WITH CHECK (public.get_current_role() IN ('admin', 'manager', 'loan_officer'));

DROP POLICY IF EXISTS "loans_delete_admin" ON public.loans;
DROP POLICY IF EXISTS "loans_delete_policy" ON public.loans;
CREATE POLICY "loans_delete_policy"
  ON public.loans FOR DELETE
  TO authenticated
  USING (public.get_current_role() = 'admin' AND status = 'pending');

-- ----------------------------------------------------------------------------
-- REPAYMENT SCHEDULES POLICIES (Cascading Isolation)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "schedules_select_staff" ON public.repayment_schedules;
DROP POLICY IF EXISTS "schedules_select_policy" ON public.repayment_schedules;

CREATE POLICY "schedules_select_policy"
  ON public.repayment_schedules FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'manager', 'accountant', 'loan_officer', 'teller')
    OR loan_id IN (
      SELECT l.id FROM public.loans l
      WHERE l.borrower_id = auth.uid()
      OR l.borrower_id IN (
        SELECT b.id FROM public.borrowers b WHERE b.id = auth.uid() OR b.created_by = auth.uid()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES (Cascading Isolation)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_select_staff" ON public.payments;
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;

CREATE POLICY "payments_select_policy"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('admin', 'manager', 'accountant', 'loan_officer', 'teller')
    OR loan_id IN (
      SELECT l.id FROM public.loans l
      WHERE l.borrower_id = auth.uid()
      OR l.borrower_id IN (
        SELECT b.id FROM public.borrowers b WHERE b.id = auth.uid() OR b.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "payments_insert_teller_admin" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_insert_policy"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'manager', 'teller'));

-- Add high-performance indexes on loan and borrower references
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_created_by ON public.borrowers(created_by);
