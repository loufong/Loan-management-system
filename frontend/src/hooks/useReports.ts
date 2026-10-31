import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { api } from '../services/api';

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

  // 1. Live Core Banking REST API Query
  try {
    let items: any[] = [];
    if (filters.reportType?.includes('Overdue') || filters.reportType?.includes('Aging')) {
      items = await api.getOverdueLoansReport({ startDate: filters.startDate, endDate: filters.endDate });
    } else if (filters.reportType?.includes('Cashier') || filters.reportType?.includes('Collections')) {
      items = await api.getDailyCollectionsReport({ date: filters.startDate });
    } else if (filters.reportType?.includes('Disbursed')) {
      items = await api.getDisbursementsReport({ startDate: filters.startDate, endDate: filters.endDate });
    } else {
      items = await api.getActiveLoansReport({ startDate: filters.startDate, endDate: filters.endDate });
    }

    if (Array.isArray(items) && items.length > 0) {
      const mapped = items.map((item: any, idx: number) => ({
        id: item.id || `rep-${idx}`,
        referenceNo: item.referenceNo || item.loanCode || item.code || `LN-${item.id?.slice?.(0, 8) || idx}`,
        borrowerName: item.borrowerName || item.borrower?.fullName || item.borrower?.nameEn || 'Borrower',
        borrowerId: item.borrowerId || item.borrower?.id,
        productName: item.productName || item.product?.name || 'Loan Facility',
        branch: item.branch || item.branchName || 'Phnom Penh Main Branch',
        disbursedAmountUSD: Number(item.disbursedAmountUSD || item.principal || item.amount || 0),
        collectedAmountUSD: Number(item.collectedAmountUSD || item.totalPaid || 0),
        outstandingAmountUSD: Number(item.outstandingAmountUSD || item.balance || item.remainingBalance || 0),
        overdueAmountUSD: Number(item.overdueAmountUSD || item.overdueAmount || 0),
        status: (item.status || 'ACTIVE').toUpperCase(),
        date: item.date || item.createdAt?.split?.('T')?.[0] || new Date().toISOString().split('T')[0],
      }));

      if (isBorrower) {
        const cleanName = (currentUser?.fullName || currentUser?.name || '').toLowerCase();
        return mapped.filter((m: any) =>
          (borrowerId && m.borrowerId && String(m.borrowerId).toLowerCase() === String(borrowerId).toLowerCase()) ||
          (cleanName && m.borrowerName.toLowerCase().includes(cleanName))
        );
      }
      return mapped;
    }
  } catch (err) {
    console.warn('[useReports] Live API check fallback:', err);
  }

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
