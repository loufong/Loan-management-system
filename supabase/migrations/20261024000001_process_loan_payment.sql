-- ============================================================================
-- Supabase Migration: process_loan_payment Atomic Transaction Function
-- Enterprise Loan Management System (LMS)
-- ============================================================================

-- Step 1: Ensure columns exist on public.payments for waterfall breakdown and receipt tracking
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS receipt_no text UNIQUE,
  ADD COLUMN IF NOT EXISTS principal_component numeric(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS interest_component numeric(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS penalty_component numeric(14, 2) NOT NULL DEFAULT 0.00;

-- Step 2: Ensure penalty column exists on public.repayment_schedules
ALTER TABLE public.repayment_schedules 
  ADD COLUMN IF NOT EXISTS penalty_due numeric(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS penalty_paid numeric(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS principal_paid numeric(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS interest_paid numeric(14, 2) NOT NULL DEFAULT 0.00;

-- ============================================================================
-- Stored Procedure / RPC Function: process_loan_payment
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_loan_payment(
  p_loan_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_payment_method text DEFAULT 'cash',
  p_cashier_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loan record;
  v_sched record;
  v_remaining_amount numeric;
  v_total_paid numeric := 0;
  v_total_penalty_paid numeric := 0;
  v_total_interest_paid numeric := 0;
  v_total_principal_paid numeric := 0;
  v_excess_principal numeric := 0;
  v_pay_amount numeric;
  v_interest_due_rem numeric;
  v_principal_due_rem numeric;
  v_penalty_due_rem numeric;
  v_schedule_total_rem numeric;
  v_all_schedules_settled boolean := true;
  v_remaining_loan_principal numeric := 0;
  v_receipt_no text;
  v_payment_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Input Validations
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero. Received: %', p_amount;
  END IF;

  IF p_payment_method NOT IN ('cash', 'khqr', 'bank_transfer', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %. Must be cash, khqr, or bank_transfer', p_payment_method;
  END IF;

  -- 2. Lock the target loan row using FOR UPDATE to prevent race conditions & double charges
  SELECT * INTO v_loan
  FROM public.loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan account with ID % does not exist.', p_loan_id;
  END IF;

  IF v_loan.status = 'paid_off' THEN
    RAISE EXCEPTION 'Loan % is already fully paid off and closed.', v_loan.loan_code;
  END IF;

  IF v_loan.status NOT IN ('disbursed', 'approved', 'active') THEN
    RAISE EXCEPTION 'Loan % is in % status and cannot accept repayments.', v_loan.loan_code, v_loan.status;
  END IF;

  -- Verify currency match if specified
  IF p_currency IS NOT NULL AND UPPER(p_currency) <> UPPER(v_loan.currency) THEN
    RAISE EXCEPTION 'Currency mismatch: Payment received in %, but loan is denominated in %.', p_currency, v_loan.currency;
  END IF;

  v_remaining_amount := p_amount;

  -- 3. WATERFALL ALLOCATION: Phase A - Penalties across unpaid schedules
  FOR v_sched IN
    SELECT *
    FROM public.repayment_schedules
    WHERE loan_id = p_loan_id
      AND status IN ('unpaid', 'partial', 'overdue')
    ORDER BY installment_no ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_amount <= 0;
    
    v_penalty_due_rem := GREATEST(0, COALESCE(v_sched.penalty_due, 0) - COALESCE(v_sched.penalty_paid, 0));
    IF v_penalty_due_rem > 0 THEN
      v_pay_amount := LEAST(v_remaining_amount, v_penalty_due_rem);
      
      UPDATE public.repayment_schedules
      SET penalty_paid = COALESCE(penalty_paid, 0) + v_pay_amount
      WHERE id = v_sched.id;

      v_total_penalty_paid := v_total_penalty_paid + v_pay_amount;
      v_remaining_amount := v_remaining_amount - v_pay_amount;
    END IF;
  END LOOP;

  -- 3. WATERFALL ALLOCATION: Phase B - Overdue & Current Interest (oldest first)
  FOR v_sched IN
    SELECT *
    FROM public.repayment_schedules
    WHERE loan_id = p_loan_id
      AND status IN ('unpaid', 'partial', 'overdue')
    ORDER BY installment_no ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_amount <= 0;
    
    v_interest_due_rem := GREATEST(0, v_sched.interest_due - COALESCE(v_sched.interest_paid, 0));
    IF v_interest_due_rem > 0 THEN
      v_pay_amount := LEAST(v_remaining_amount, v_interest_due_rem);
      
      UPDATE public.repayment_schedules
      SET interest_paid = COALESCE(interest_paid, 0) + v_pay_amount
      WHERE id = v_sched.id;

      v_total_interest_paid := v_total_interest_paid + v_pay_amount;
      v_remaining_amount := v_remaining_amount - v_pay_amount;
    END IF;
  END LOOP;

  -- 3. WATERFALL ALLOCATION: Phase C - Principal (oldest first, then excess prepayments)
  FOR v_sched IN
    SELECT *
    FROM public.repayment_schedules
    WHERE loan_id = p_loan_id
      AND status IN ('unpaid', 'partial', 'overdue')
    ORDER BY installment_no ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_amount <= 0;
    
    v_principal_due_rem := GREATEST(0, v_sched.principal_due - COALESCE(v_sched.principal_paid, 0));
    IF v_principal_due_rem > 0 THEN
      v_pay_amount := LEAST(v_remaining_amount, v_principal_due_rem);
      
      UPDATE public.repayment_schedules
      SET principal_paid = COALESCE(principal_paid, 0) + v_pay_amount
      WHERE id = v_sched.id;

      v_total_principal_paid := v_total_principal_paid + v_pay_amount;
      v_remaining_amount := v_remaining_amount - v_pay_amount;
    END IF;
  END LOOP;

  -- If any excess money remains, apply as excess future principal prepayment
  IF v_remaining_amount > 0 THEN
    v_excess_principal := v_remaining_amount;
    v_total_principal_paid := v_total_principal_paid + v_remaining_amount;
    v_remaining_amount := 0;
  END IF;

  -- 4. Update status and remaining balances on all schedules for this loan
  FOR v_sched IN
    SELECT *
    FROM public.repayment_schedules
    WHERE loan_id = p_loan_id
    ORDER BY installment_no ASC
    FOR UPDATE
  LOOP
    v_schedule_total_rem := GREATEST(0, 
      (v_sched.principal_due - COALESCE(v_sched.principal_paid, 0)) +
      (v_sched.interest_due - COALESCE(v_sched.interest_paid, 0)) +
      (COALESCE(v_sched.penalty_due, 0) - COALESCE(v_sched.penalty_paid, 0))
    );

    IF v_schedule_total_rem <= 0.01 THEN
      UPDATE public.repayment_schedules
      SET status = 'paid',
          paid_amount = principal_due + interest_due + COALESCE(penalty_due, 0),
          paid_date = timezone('utc'::text, now())
      WHERE id = v_sched.id;
    ELSIF (COALESCE(v_sched.principal_paid, 0) + COALESCE(v_sched.interest_paid, 0) + COALESCE(v_sched.penalty_paid, 0)) > 0 THEN
      UPDATE public.repayment_schedules
      SET status = 'partial',
          paid_amount = COALESCE(principal_paid, 0) + COALESCE(interest_paid, 0) + COALESCE(penalty_paid, 0)
      WHERE id = v_sched.id;
      v_all_schedules_settled := false;
    ELSE
      v_all_schedules_settled := false;
    END IF;
  END LOOP;

  -- 5. Calculate remaining principal across the entire facility
  SELECT COALESCE(SUM(GREATEST(0, principal_due - COALESCE(principal_paid, 0))), 0)
  INTO v_remaining_loan_principal
  FROM public.repayment_schedules
  WHERE loan_id = p_loan_id;

  -- 6. Check if loan is completely paid off
  IF v_remaining_loan_principal <= 0.01 AND v_all_schedules_settled THEN
    UPDATE public.loans
    SET status = 'paid_off',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_loan_id;
  END IF;

  -- 7. Generate Receipt Number (REC-YYYYMMDD-XXXX)
  v_receipt_no := 'REC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  -- 8. Insert Immutable Audit Record into public.payments
  INSERT INTO public.payments (
    loan_id,
    amount_paid,
    payment_date,
    payment_method,
    cashier_id,
    receipt_no,
    principal_component,
    interest_component,
    penalty_component,
    notes
  )
  VALUES (
    p_loan_id,
    p_amount,
    timezone('utc'::text, now()),
    p_payment_method,
    COALESCE(p_cashier_id, auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid),
    v_receipt_no,
    v_total_principal_paid,
    v_total_interest_paid,
    v_total_penalty_paid,
    p_notes
  )
  RETURNING id INTO v_payment_id;

  -- 9. Construct JSON Return
  v_result := jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_no', v_receipt_no,
    'loan_id', p_loan_id,
    'amount_paid', p_amount,
    'principal_paid', v_total_principal_paid,
    'interest_paid', v_total_interest_paid,
    'penalty_paid', v_total_penalty_paid,
    'excess_principal', v_excess_principal,
    'remaining_loan_principal', v_remaining_loan_principal,
    'is_loan_closed', (v_remaining_loan_principal <= 0.01),
    'payment_date', timezone('utc'::text, now())
  );

  RETURN v_result;
END;
$$;
