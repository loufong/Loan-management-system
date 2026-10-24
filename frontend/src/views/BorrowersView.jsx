import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Filter,
  Plus,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Eye,
  FilePlus2
} from 'lucide-react';
import { MOCK_BORROWERS } from '../data/mockData';
import { BorrowerDetailModal } from './BorrowerDetailModal';

export const BorrowersView: React.FC<{ onNavigate?: (tab: string, params?: any) => void }> = ({
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'GOOD' | 'OVERDUE'>('ALL');
  const [selectedBorrower, setSelectedBorrower] = useState<any | null>(null);

  // Normalize borrowers list
  const borrowerList = useMemo(() => {
    return MOCK_BORROWERS.map((b: any, index: number) => {
      const code = b.code || `BOR-2026-${String(index + 1).padStart(4, '0')}`;
      const nameEn = b.nameEn || b.name || 'Client';
      const nameKh = b.nameKh || '';
      const nationalId = b.nationalId || `0102938${index}`;
      const phone = b.phone || '012 345 678';
      const activeLoansCount = b.activeLoansCount || 1;
      const totalDebt = b.totalDebtUSD || (index % 2 === 0 ? 3850 : 7200);
      const isOverdue = index === 1 || index === 3;
      const riskStatus = isOverdue ? 'HIGH' : 'LOW';

      return {
        ...b,
        code,
        nameEn,
        nameKh,
        nationalId,
        phone,
        activeLoansCount,
        totalDebtUSD: totalDebt,
        riskStatus,
        status: isOverdue ? 'OVERDUE' : 'ACTIVE'
      };
    });
  }, []);

  // Filter & Search Logic
  const filteredBorrowers = useMemo(() => {
    return borrowerList.filter((b) => {
      // Filter Tab
      if (filterTab === 'ACTIVE' && b.activeLoansCount === 0) return false;
      if (filterTab === 'GOOD' && b.riskStatus === 'HIGH') return false;
      if (filterTab === 'OVERDUE' && b.riskStatus !== 'HIGH') return false;

      // Search Query
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const matchNameEn = b.nameEn.toLowerCase().includes(q);
      const matchNameKh = b.nameKh && b.nameKh.toLowerCase().includes(q);
      const matchId = b.nationalId.toLowerCase().includes(q);
      const matchPhone = b.phone.toLowerCase().includes(q);
      const matchCode = b.code.toLowerCase().includes(q);

      return matchNameEn || matchNameKh || matchId || matchPhone || matchCode;
    });
  }, [borrowerList, filterTab, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100">
      {/* 1. Header with Title & Add Borrower Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Borrower Directory & KYC
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Master customer records, identity verification, and credit limits
          </p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('new-loan')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Borrower</span>
        </button>
      </div>

      {/* 2. Search Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name (English / ខ្មែរ), National ID, phone..."
            className="w-full rounded-2xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterTab === 'ALL'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Borrowers ({borrowerList.length})
          </button>
          <button
            onClick={() => setFilterTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterTab === 'ACTIVE'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Loans
          </button>
          <button
            onClick={() => setFilterTab('GOOD')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterTab === 'GOOD'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            In Good Standing
          </button>
          <button
            onClick={() => setFilterTab('OVERDUE')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterTab === 'OVERDUE'
                ? 'bg-slate-800 text-rose-400 shadow'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Overdue Accounts
          </button>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Customer Code</th>
                <th className="py-3.5 px-4">Borrower Name</th>
                <th className="py-3.5 px-4">Phone / National ID</th>
                <th className="py-3.5 px-4">Active Loans</th>
                <th className="py-3.5 px-4">Total Debt</th>
                <th className="py-3.5 px-4">Risk Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No borrower records match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredBorrowers.map((b) => (
                  <tr
                    key={b.id || b.code}
                    onClick={() => setSelectedBorrower(b)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-6 font-bold text-white">{b.code}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{b.nameEn}</span>
                        {b.nameKh && (
                          <span className="text-[11px] text-slate-400 font-khmer font-normal">
                            ({b.nameKh})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{b.phone}</div>
                      <div className="text-[10px] text-slate-500">ID: {b.nationalId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{b.activeLoansCount}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      ${b.totalDebtUSD.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {b.riskStatus === 'HIGH' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          High Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Good Standing
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedBorrower(b)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="View Profile & KYC"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigate && onNavigate('new-loan', { borrowerId: b.id })}
                          className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 transition"
                          title="Add New Loan Facility"
                        >
                          <FilePlus2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Borrower Detail KYC Modal */}
      {selectedBorrower && (
        <BorrowerDetailModal
          borrower={selectedBorrower}
          onClose={() => setSelectedBorrower(null)}
          onAddLoan={() => {
            setSelectedBorrower(null);
            if (onNavigate) onNavigate('new-loan', { borrowerId: selectedBorrower.id });
          }}
        />
      )}
    </div>
  );
};

export default BorrowersView;
