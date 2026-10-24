/**
 * ============================================================================
 * Safe Report & Portfolio Data Fetch Service (TypeScript)
 * File: frontend/src/services/safeReportService.ts
 * ============================================================================
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface SafeReportItem {
  id: string;
  loanCode: string;
  borrowerId: string;
  borrowerCode: string;
  borrowerName: string;
  productName: string;
  principalAmount: number;
  currency: string;
  interestRateMonthly: number;
  termMonths: number;
  method: string;
  status: string;
  collectedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  installmentCount: number;
  createdAt: string;
  disbursedAt?: string;
}

export interface SafeReportFilters {
  status?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
}

export interface SafeReportResult {
  data: SafeReportItem[];
  role: string;
  isScoped: boolean;
}

export async function fetchSafePortfolioReport(
  filters: SafeReportFilters = {},
  client: SupabaseClient = supabase
): Promise<SafeReportResult> {
  try {
    const {
      data: { user },
      error: authError
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required: No active session found.');
    }

    const { data: profile } = await client
      .from('profiles')
      .select('id, role, full_name, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role || 'borrower').toLowerCase();
    const isStaff = ['admin', 'loan_officer', 'checker', 'teller'].includes(role);

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

    if (!isStaff) {
      const { data: borrowerRecord } = await client
        .from('borrowers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (borrowerRecord?.id) {
        query = query.eq('borrower_id', borrowerRecord.id);
        isScoped = true;
      } else {
        query = query.eq('borrower_id', '00000000-0000-0000-0000-000000000000');
        isScoped = true;
      }
    }

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

    query = query.order('created_at', { ascending: false });

    const { data: loans, error: queryError } = await query;

    if (queryError) {
      console.error('Safe Portfolio Query Failed:', queryError);
      throw queryError;
    }

    const reportData: SafeReportItem[] = (loans || []).map((loan: any) => {
      const schedules = loan.repayment_schedules || [];
      const totalCollected = schedules.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
      const totalOutstanding = schedules.reduce((sum: number, s: any) => {
        return sum + (s.status !== 'paid' ? Number(s.total_due || 0) - Number(s.paid_amount || 0) : 0);
      }, 0);
      const overdueAmount = schedules
        .filter((s: any) => s.status === 'overdue')
        .reduce((sum: number, s: any) => sum + (Number(s.total_due || 0) - Number(s.paid_amount || 0)), 0);

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

export default {
  fetchSafePortfolioReport
};
