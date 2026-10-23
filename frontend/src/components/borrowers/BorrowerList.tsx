import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Users,
  Phone,
  Mail,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Building2,
  DollarSign
} from 'lucide-react';
import { Borrower, Currency, UserRole } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { EmptyState } from '../common/EmptyState';

export interface BorrowerListProps {
  borrowers?: Borrower[];
  currency?: Currency;
  currentUserRole?: UserRole;
  onSelectBorrower?: (borrowerId: string) => void;
  onOpenCreateApplication?: (borrowerId: string) => void;
  onOpenNewBorrower?: () => void;
}

export const BorrowerList: React.FC<BorrowerListProps> = ({
  borrowers = [],
  currency = 'USD',
  currentUserRole = 'ADMIN',
  onSelectBorrower,
  onOpenCreateApplication,
  onOpenNewBorrower
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusChip, setStatusChip] = useState<'All' | 'Active Loans' | 'In Good Standing' | 'Overdue'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // New Borrower modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameKh, setNewNameKh] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newMonthlyIncome, setNewMonthlyIncome] = useState(1200);

  // Baseline mock data if none provided
  const baseBorrowers: Borrower[] = useMemo(() => {
    if (borrowers && borrowers.length > 0) return borrowers;
    return [
      {
        id: 'b-101',
        borrowerId: 'BOR-2026-0042',
        fullName: 'Sokha Chan',
        avatarUrl: '',
        nationalId: '010892743',
        phone: '012 345 678',
        email: 'sokha.chan@gmail.com',
        address: 'Boeung Keng Kang 1, Phnom Penh',
        occupation: 'SME Retail Owner',
        monthlyIncomeUSD: 1450,
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        activeLoansCount: 1,
        totalBorrowedUSD: 5000,
        totalRepaidUSD: 1579.50,
        totalOutstandingUSD: 3420.50,
        dtiRatio: 28,
        createdAt: '2026-01-12'
      },
      {
        id: 'b-102',
        borrowerId: 'BOR-2026-0043',
        fullName: 'Chhaya Meng',
        avatarUrl: '',
        nationalId: '090123847',
        phone: '098 765 432',
        email: 'chhaya.meng@gmail.com',
        address: 'Siem Reap Town',
        occupation: 'Farm Supervisor',
        monthlyIncomeUSD: 950,
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        activeLoansCount: 1,
        totalBorrowedUSD: 3500,
        totalRepaidUSD: 1350,
        totalOutstandingUSD: 2150,
        dtiRatio: 32,
        createdAt: '2026-02-18'
      },
      {
        id: 'b-103',
        borrowerId: 'BOR-2026-0044',
        fullName: 'Dara Rath',
        avatarUrl: '',
        nationalId: '020485912',
        phone: '077 889 900',
        email: 'dara.rath@gmail.com',
        address: 'Battambang Municipality',
        occupation: 'Logistics Driver',
        monthlyIncomeUSD: 1100,
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        activeLoansCount: 2,
        totalBorrowedUSD: 8000,
        totalRepaidUSD: 3110,
        totalOutstandingUSD: 4890,
        dtiRatio: 42,
        createdAt: '2026-03-01'
      },
      {
        id: 'b-104',
        borrowerId: 'BOR-2026-0045',
        fullName: 'Piseth Oeng',
        avatarUrl: '',
        nationalId: '050293841',
        phone: '010 998 877',
        email: 'piseth.oeng@gmail.com',
        address: 'Takeo Province',
        occupation: 'Commercial Property Landlord',
        monthlyIncomeUSD: 3200,
        status: 'BLACKLISTED',
        kycStatus: 'VERIFIED',
        activeLoansCount: 1,
        totalBorrowedUSD: 25000,
        totalRepaidUSD: 6550,
        totalOutstandingUSD: 18450,
        dtiRatio: 58,
        createdAt: '2025-11-20'
      }
    ];
  }, [borrowers]);

  // Filtered list based on Search & Status Chips
  const filtered = useMemo(() => {
    return baseBorrowers.filter(b => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.fullName.toLowerCase().includes(q) ||
        b.nationalId.includes(q) ||
        b.phone.includes(q) ||
        b.borrowerId.toLowerCase().includes(q);

      let matchStatus = true;
      if (statusChip === 'Active Loans') {
        matchStatus = b.activeLoansCount > 0;
      } else if (statusChip === 'In Good Standing') {
        matchStatus = b.status === 'ACTIVE' && b.totalOutstandingUSD <= 4000;
      } else if (statusChip === 'Overdue') {
        matchStatus = b.status === 'BLACKLISTED' || b.totalOutstandingUSD > 4000;
      }

      return matchSearch && matchStatus;
    });
  }, [baseBorrowers, searchTerm, statusChip]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Borrower ${newNameEn} registered successfully!`);
    setShowAddModal(false);
    setNewNameEn('');
    setNewNameKh('');
    setNewPhone('');
    setNewNationalId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Borrower Management Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search dossiers, review debt-to-income ratings, and open client profile view.
          </p>
        </div>

        <button
          onClick={() => {
            if (onOpenNewBorrower) onOpenNewBorrower();
            else setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-950/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Borrower</span>
        </button>
      </div>

      {/* Search Input & Status Filter Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search by name, national ID, phone */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, national ID, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Filter Chips: All, Active Loans, In Good Standing, Overdue */}
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Active Loans', 'In Good Standing', 'Overdue'] as const).map(chip => (
              <button
                key={chip}
                onClick={() => {
                  setStatusChip(chip);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusChip === chip
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Borrower & Ref</th>
                <th className="py-3 px-4">National ID</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-right">Total Borrowed</th>
                <th className="py-3 px-4 text-center">Active Loans</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length > 0 ? (
                paginated.map(borrower => {
                  const statusLabel =
                    borrower.status === 'BLACKLISTED' || borrower.totalOutstandingUSD > 4000
                      ? 'Overdue'
                      : borrower.activeLoansCount > 0
                      ? 'Active'
                      : 'In Good Standing';

                  return (
                    <tr
                      key={borrower.id}
                      onClick={() => onSelectBorrower?.(borrower.id)}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* Avatar / Initials & Full Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 shadow-sm shrink-0">
                            {borrower.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white group-hover:text-emerald-400 transition block">
                              {borrower.fullName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">{borrower.borrowerId}</span>
                          </div>
                        </div>
                      </td>

                      {/* National ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {borrower.nationalId}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {borrower.phone}
                      </td>

                      {/* Total Borrowed */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        <CurrencyDisplay amount={borrower.totalBorrowedUSD} currency="USD" />
                      </td>

                      {/* Active Loan Count */}
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                        {borrower.activeLoansCount}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={statusLabel} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBorrower?.(borrower.id);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <EmptyState
                      headline="No Borrowers Found"
                      description="No records match your search query or status filter."
                      actionLabel="Register New Borrower"
                      onAction={() => setShowAddModal(true)}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page <strong className="text-white">{currentPage}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong> ({filtered.length} total borrowers)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Borrower Modal Trigger */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Register New Borrower</h3>
                <p className="text-xs text-slate-400">Create client profile in KYC registry</p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Full Name (English)</label>
                <input
                  type="text"
                  required
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Full Name (Khmer)</label>
                <input
                  type="text"
                  value={newNameKh}
                  onChange={(e) => setNewNameKh(e.target.value)}
                  placeholder="e.g. ចាន់ សុខា"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">National ID</label>
                  <input
                    type="text"
                    required
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    placeholder="e.g. 010892743"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 012 345 678"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-md shadow-emerald-950/40"
                >
                  Save Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerList;
