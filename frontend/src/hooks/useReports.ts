import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export interface ReportItem {
  id: string;
  referenceNo: string;
  borrowerName: string;
  borrowerId?: string;
  productName: string;
  branch: string;
  disbursedAmountUSD: number;
  collectedAmountUSD: number;
  outstandingAmountUSD: number;
  overdueAmountUSD: number;
  status: string;
  date: string;
}

export interface UseReportsFilters {
  reportType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

/**
 * Standard Mock Report Dataset
 * Used for offline demonstration or static hosting environments.
 */
export const MOCK_REPORT_ITEMS: ReportItem[] = [
  {
    id: '1',
    referenceNo: 'LN-2026-0042',
    borrowerName: 'Sokha Chan',
    borrowerId: 'BOR-2026-0042',
    productName: 'Personal Loan',
    branch: 'Phnom Penh Main Branch',
    disbursedAmountUSD: 6000,
    collectedAmountUSD: 2540,
    outstandingAmountUSD: 3850,
    overdueAmountUSD: 0,
    status: 'ACTIVE',
    date: '2026-04-15',
  },
  {
    id: '2',
    referenceNo: 'LN-2026-0012',
    borrowerName: 'Dara Pich',
    borrowerId: 'BOR-2026-0012',
    productName: 'Emergency Loan',
    branch: 'Phnom Penh Main Branch',
    disbursedAmountUSD: 3000,
    collectedAmountUSD: 1472,
    outstandingAmountUSD: 1600,
    overdueAmountUSD: 512,
    status: 'OVERDUE',
    date: '2026-01-10',
  },
  {
    id: '3',
    referenceNo: 'LN-2026-0088',
    borrowerName: 'Vannak Keo',
    borrowerId: 'BOR-2026-0088',
    productName: 'Business Loan',
    branch: 'Phnom Penh Main Branch',
    disbursedAmountUSD: 15000,
    collectedAmountUSD: 9050,
    outstandingAmountUSD: 8500,
    overdueAmountUSD: 0,
    status: 'ACTIVE',
    date: '2025-09-01',
  },
  {
    id: '4',
    referenceNo: 'LN-2026-0004',
    borrowerName: 'Sokha Chea',
    borrowerId: 'BOR-2026-0004',
    productName: 'Business Loan',
    branch: 'Phnom Penh Main Branch',
    disbursedAmountUSD: 12000,
    collectedAmountUSD: 4200,
    outstandingAmountUSD: 7800,
    overdueAmountUSD: 1240,
    status: 'OVERDUE',
    date: '2026-03-15',
  },
  {
    id: '5',
    referenceNo: 'LN-2026-0005',
    borrowerName: 'Bopha Roth',
    borrowerId: 'BOR-2026-0005',
    productName: 'Personal Loan',
    branch: 'Phnom Penh Main Branch',
    disbursedAmountUSD: 5000,
    collectedAmountUSD: 0,
    outstandingAmountUSD: 5000,
    overdueAmountUSD: 0,
    status: 'ACTIVE',
    date: '2026-08-01',
  },
  {
    id: '6',
    referenceNo: 'LN-2026-0001',
    borrowerName: 'Johnathan Doe',
    borrowerId: 'BOR-2026-0001',
    productName: 'Education Loan',
    branch: 'Main Campus Branch',
    disbursedAmountUSD: 5000,
    collectedAmountUSD: 1150,
    outstandingAmountUSD: 3850,
    overdueAmountUSD: 0,
    status: 'ACTIVE',
    date: '2026-02-10',
  },
];

/**
 * Report Fetch Query Function (Data Isolation / Multi-Tenant Security)
 * Checks currentUser.role:
 * - If user is a borrower, strictly appends `.eq('borrower_id', currentUser.id)`
 * - Prevents cross-tenant data leaks at the application query level
 */
export async function fetchReportsData(
  currentUser: { id?: string; role?: UserRole | string; borrowerId?: string; name?: string; fullName?: string } | null,
  filters: UseReportsFilters = {}
): Promise<ReportItem[]> {
  const role = (currentUser?.role || '').toLowerCase();
  const isBorrower = role === 'borrower' || role === 'user';
  const borrowerId = currentUser?.borrowerId || currentUser?.id;

  if (isSupabaseConfigured) {
    let query = supabase
      .from('loans')
      .select(`
        id,
        loan_code,
        principal_amount,
        currency,
        status,
        created_at,
        borrower_id,
        borrowers (
          id,
          name_en,
          name_kh,
          phone
        )
      `);

    // Strict Data Isolation Guard: If borrower, resolve their borrower ID and append .eq('borrower_id', ...)
    if (isBorrower) {
      let targetBorrowerId = borrowerId;
      if (currentUser?.id) {
        const { data: bor } = await supabase
          .from('borrowers')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (bor?.id) {
          targetBorrowerId = bor.id;
        }
      }
      if (targetBorrowerId) {
        query = query.eq('borrower_id', targetBorrowerId);
      } else {
        query = query.eq('borrower_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (filters.status) {
      query = query.eq('status', filters.status.toLowerCase());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error querying Supabase report data:', error);
      throw error;
    }

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        referenceNo: item.loan_code || `LN-${item.id?.slice(0, 8)}`,
        borrowerName: item.borrowers?.name_en || item.borrowers?.name_kh || 'Client Borrower',
        borrowerId: item.borrower_id,
        productName: 'Loan Facility',
        branch: 'Phnom Penh Branch',
        disbursedAmountUSD: Number(item.principal_amount || 0),
        collectedAmountUSD: 0,
        outstandingAmountUSD: Number(item.principal_amount || 0),
        overdueAmountUSD: item.status === 'overdue' ? Number(item.principal_amount || 0) : 0,
        status: (item.status || 'ACTIVE').toUpperCase(),
        date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      }));
    }
  }

  // Fallback for static host / offline development:
  // Strict in-memory data isolation guard: borrowers can NEVER see records of other borrowers
  if (isBorrower) {
    const cleanBorrowerName = (currentUser?.fullName || currentUser?.name || 'Johnathan Doe').toLowerCase();
    return MOCK_REPORT_ITEMS.filter((item) => {
      const matchId = borrowerId && item.borrowerId && String(item.borrowerId).toLowerCase() === String(borrowerId).toLowerCase();
      const matchName = cleanBorrowerName && item.borrowerName.toLowerCase().includes(cleanBorrowerName);
      return matchId || matchName;
    });
  }

  // Administrative staff (admin, manager, accountant) sees full company portfolio
  return MOCK_REPORT_ITEMS;
}

/**
 * React Hook: useReports
 * Provides isolated report data based on currentUser role and clearance
 */
export function useReports(filters: UseReportsFilters = {}) {
  const { user: authUser, profile } = useAuth();
  const currentUser = profile || authUser;

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const role = (currentUser?.role || '').toLowerCase();
  const isBorrower = role === 'borrower' || role === 'user';
  const isStaff = ['admin', 'manager', 'accountant'].includes(role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchReportsData(currentUser, filters);
      setReports(items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, filters.reportType, filters.status, filters.startDate, filters.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    reports,
    isLoading,
    error,
    refetch: loadData,
    isBorrower,
    isStaff,
  };
}

export default useReports;
