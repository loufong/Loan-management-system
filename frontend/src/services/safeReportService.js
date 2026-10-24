/**
 * ============================================================================
 * Safe Report & Portfolio Data Fetch Service (JavaScript)
 * File: frontend/src/services/safeReportService.js
 *
 * Implements Multi-Tenant Data Isolation & Privacy Leak Prevention:
 * 1. Client-Side Defensive Scoping:
 *    - Authenticates the current user session via supabase.auth.getUser().
 *    - Checks role: Staff ('admin', 'loan_officer', 'teller') vs 'borrower'.
 *    - If 'borrower', automatically scopes queries with `.eq('borrower_id', borrowerId)`.
 * 2. Database-Level Enforcement (PostgreSQL Row Level Security):
 *    - Even if a client bypasses or omits client-side filters, PostgreSQL RLS
 *      policies on `borrowers`, `loans`, `repayment_schedules`, and `payments`
 *      strictly filter rows to `borrowers.user_id = auth.uid()`, preventing
 *      cross-tenant privacy leaks at the database kernel.
 * ============================================================================
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Fetch portfolio report data with role-aware security and scoping.
 *
 * @param {Object} [filters] Optional query filters
 * @param {string} [filters.status] Filter by loan status ('pending', 'approved', 'disbursed', 'paid_off', 'defaulted')
 * @param {string} [filters.currency] Currency ('USD' | 'KHR')
 * @param {string} [filters.startDate] ISO date string (YYYY-MM-DD)
 * @param {string} [filters.endDate] ISO date string (YYYY-MM-DD)
 * @param {string} [filters.branchId] UUID of branch
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] Supabase client instance (defaults to shared client)
 * @returns {Promise<{ data: Array<Object>, role: string, isScoped: boolean }>}
 */
export async function fetchSafePortfolioReport(filters = {}, client = supabase) {
  try {
    // 1. Authenticate Current Session
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required: No active session found.');
    }

    // 2. Fetch User Profile & Role Clearance
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, role, full_name, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Could not fetch user profile from Supabase:', profileError.message);
    }

    const role = (profile?.role || 'borrower').toLowerCase();
    const isStaff = ['admin', 'loan_officer', 'checker', 'teller'].includes(role);

    // 3. Construct Base Query
    let query = client
      .from('loans')
      .select(`
        id,
        loan_code,
        product_name,
        principal_amount,
        currency,
        interest_rate_monthly,
        term_months,
        method,
        status,
        created_at,
        disbursed_at,
        borrower_id,
        borrowers (
          id,
          code,
          name_en,
          name_kh,
          phone
        ),
        repayment_schedules (
          id,
          installment_no,
          due_date,
          total_due,
          paid_amount,
          status
        )
      `);

    let isScoped = false;

    // 4. Role-Aware Scoping Guard (Defense-in-Depth)
    if (!isStaff) {
      // User is a retail borrower: Resolve their borrower directory ID
      const { data: borrowerRecord, error: borError } = await client
        .from('borrowers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (borError) {
        console.warn('Error resolving borrower record for user:', borError.message);
      }

      if (borrowerRecord?.id) {
        // Explicitly scope query to prevent unnecessary database load
        query = query.eq('borrower_id', borrowerRecord.id);
        isScoped = true;
      } else {
        // If the borrower record is not yet linked, scope to a safe null UUID
        query = query.eq('borrower_id', '00000000-0000-0000-0000-000000000000');
        isScoped = true;
      }
    }

    // 5. Apply Business Filters (Optional)
    if (filters.status) {
      query = query.eq('status', filters.status.toLowerCase());
    }
    if (filters.currency) {
      query = query.eq('currency', filters.currency.toUpperCase());
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Sort newest loans first
    query = query.order('created_at', { ascending: false });

    // 6. Execute Query
    // NOTE: Even if client-side query modification was tampered with, PostgreSQL
    // Row Level Security (RLS) on `public.loans` intercepts this query and enforces:
    // USING (public.is_staff() OR borrower_id IN (SELECT id FROM borrowers WHERE user_id = auth.uid()))
    const { data: loans, error: queryError } = await query;

    if (queryError) {
      console.error('Safe Portfolio Query Failed:', queryError);
      throw queryError;
    }

    // 7. Format Clean, Sanitized Report DTOs
    const reportData = (loans || []).map((loan) => {
      const schedules = loan.repayment_schedules || [];
      const totalCollected = schedules.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
      const totalOutstanding = schedules.reduce((sum, s) => {
        return sum + (s.status !== 'paid' ? Number(s.total_due || 0) - Number(s.paid_amount || 0) : 0);
      }, 0);
      const overdueAmount = schedules
        .filter((s) => s.status === 'overdue')
        .reduce((sum, s) => sum + (Number(s.total_due || 0) - Number(s.paid_amount || 0)), 0);

      return {
        id: loan.id,
        loanCode: loan.loan_code,
        borrowerId: loan.borrower_id,
        borrowerCode: loan.borrowers?.code || 'N/A',
        borrowerName: loan.borrowers?.name_en || loan.borrowers?.name_kh || 'Anonymous Client',
        productName: loan.product_name,
        principalAmount: Number(loan.principal_amount || 0),
        currency: loan.currency || 'USD',
        interestRateMonthly: Number(loan.interest_rate_monthly || 0),
        termMonths: loan.term_months,
        method: loan.method,
        status: (loan.status || 'pending').toUpperCase(),
        collectedAmount: totalCollected,
        outstandingAmount: totalOutstanding,
        overdueAmount: overdueAmount,
        installmentCount: schedules.length,
        createdAt: loan.created_at,
        disbursedAt: loan.disbursed_at
      };
    });

    return {
      data: reportData,
      role,
      isScoped
    };
  } catch (error) {
    console.error('fetchSafePortfolioReport Error:', error);
    throw error;
  }
}

/**
 * Fetch a single loan's details, schedules, and payment receipts safely.
 *
 * @param {string} loanId UUID of loan
 * @param {import('@supabase/supabase-js').SupabaseClient} [client] Supabase client
 * @returns {Promise<Object>}
 */
export async function fetchSafeLoanDetails(loanId, client = supabase) {
  if (!loanId) throw new Error('loanId is required');

  const { data, error } = await client
    .from('loans')
    .select(`
      *,
      borrowers (
        id,
        code,
        name_en,
        name_kh,
        phone,
        address
      ),
      repayment_schedules (
        id,
        installment_no,
        due_date,
        principal_due,
        interest_due,
        total_due,
        paid_amount,
        status,
        paid_date
      ),
      payments (
        id,
        receipt_no,
        amount_paid,
        currency,
        method,
        created_at
      )
    `)
    .eq('id', loanId)
    .single();

  if (error) {
    // If borrower attempts to view someone else's loan, Supabase RLS returns
    // an empty result or error (PGRST116: The result contains 0 rows).
    throw new Error('Loan record not found or access denied by Row Level Security policy.');
  }

  return data;
}

export default {
  fetchSafePortfolioReport,
  fetchSafeLoanDetails
};
