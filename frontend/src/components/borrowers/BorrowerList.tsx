import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Borrower, Currency, UserRole } from '../../types';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  Calendar,
  Users,
  X,
  Phone,
  Mail,
  UserPlus,
  Check,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BorrowerListProps {
  borrowers: Borrower[];
  currency: Currency;
  currentUserRole: UserRole;
  onSelectBorrower: (borrowerId: string) => void;
  onOpenCreateApplication?: (borrowerId: string) => void;
  onOpenNewBorrower?: () => void;
}

export const BorrowerList: React.FC<BorrowerListProps> = ({
  borrowers,
  currency,
  currentUserRole,
  onSelectBorrower,
  onOpenCreateApplication,
  onOpenNewBorrower
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HAS_OVERDUE' | 'ARCHIVED'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Borrower modal state
  const [showNewBorrowerModal, setShowNewBorrowerModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOccupation, setNewOccupation] = useState('');
  const [newMonthlyIncome, setNewMonthlyIncome] = useState(1500);

  const rate = 4100;
  const formatMoney = (usdVal: number) => {
    if (currency === 'KHR') {
      const khr = usdVal * rate;
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0
      }).format(khr);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(usdVal);
  };

  // Masked National ID helper
  const maskNationalId = (rawId: string) => {
    if (!rawId) return '***-**-****';
    const clean = rawId.replace(/\D/g, '');
    if (clean.length <= 4) return '***-**-' + clean;
    return '***-**-' + clean.slice(-4);
  };

  const toggleRevealNationalId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyId = (bId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bId);
    setCopiedId(bId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter logic
  const filteredBorrowers = borrowers.filter((b) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      b.fullName.toLowerCase().includes(q) ||
      b.borrowerId.toLowerCase().includes(q) ||
      b.phone.includes(searchTerm) ||
      b.nationalId.includes(searchTerm) ||
      b.email.toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = b.status === 'ACTIVE' && b.totalOutstandingUSD <= 4000;
    } else if (statusFilter === 'HAS_OVERDUE') {
      matchesStatus = b.totalOutstandingUSD > 4000 || b.status === 'BLACKLISTED';
    } else if (statusFilter === 'ARCHIVED') {
      matchesStatus = b.status === 'INACTIVE' || b.status === 'BLACKLISTED';
    }

    const matchesDate = !dateFilter || b.createdAt >= dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleCreateBorrowerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;
    alert(`Borrower ${newFullName} has been registered successfully.`);
    setShowNewBorrowerModal(false);
    setNewFullName('');
    setNewNationalId('');
    setNewPhone('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Borrowers Directory
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
              {borrowers.length} Dossiers
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Institutional borrower profiles, identification registry, debt-to-income ratings, and commercial loan histories.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenNewBorrower) onOpenNewBorrower();
            else setShowNewBorrowerModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Register New Borrower</span>
        </button>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white p-4 rounded-[8px] border border-[#CBD5E1] space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Borrower ID, Phone, National ID..."
              className="w-full h-10 pl-9 pr-8 rounded-[6px] bg-white text-xs text-[#0F172A] placeholder:text-[#64748B] border border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-[6px] border border-[#CBD5E1] text-xs font-semibold">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'HAS_OVERDUE', label: 'Has Overdue' },
                  { id: 'ARCHIVED', label: 'Archived' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-[4px] text-xs transition font-sans cursor-pointer',
                    statusFilter === tab.id
                      ? 'bg-white text-[#0F172A] shadow-xs font-bold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#64748B]">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs text-[#0F172A] focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  title="Clear Date"
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white rounded-[8px] border border-[#CBD5E1] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Borrower ID</th>
                <th>Full Name</th>
                <th>National ID</th>
                <th>Contact Details</th>
                <th className="text-right">Monthly Income</th>
                <th className="text-center">Active Loans</th>
                <th className="text-right">Outstanding Balance</th>
                <th>KYC Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B] text-xs">
                    No borrower dossiers match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredBorrowers.map((borrower) => {
                  const isRevealed = !!revealedIds[borrower.id];
                  const hasDelinquency = borrower.totalOutstandingUSD > 4000;

                  return (
                    <tr
                      key={borrower.id}
                      onClick={() => onSelectBorrower(borrower.borrowerId || borrower.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Borrower ID */}
                      <td className="font-mono font-bold text-[#2563EB] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{borrower.borrowerId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(borrower.borrowerId, e)}
                            title="Copy Borrower ID"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-[4px] hover:bg-slate-200/60 text-[#64748B] hover:text-[#0F172A] transition"
                          >
                            {copiedId === borrower.borrowerId ? (
                              <Check className="w-3 h-3 text-[#16A34A]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Full Name & Avatar */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {borrower.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate">
                              {borrower.fullName}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {borrower.occupation || 'Standard Account'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* National ID */}
                      <td className="font-mono text-[#0F172A] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">
                            {isRevealed ? borrower.nationalId : maskNationalId(borrower.nationalId)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleRevealNationalId(borrower.id, e)}
                            title={isRevealed ? 'Mask National ID' : 'Reveal National ID'}
                            className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="whitespace-nowrap">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-medium text-[#0F172A] flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-[#64748B]" />
                            {borrower.phone}
                          </span>
                          <span className="text-[#64748B] truncate max-w-[150px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#64748B]" />
                            {borrower.email}
                          </span>
                        </div>
                      </td>

                      {/* Monthly Income */}
                      <td className="text-right font-mono font-bold text-[#0F172A] whitespace-nowrap tabular-nums">
                        {formatMoney(borrower.monthlyIncomeUSD)}
                      </td>

                      {/* Active Loans Count */}
                      <td className="text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-bold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                          {borrower.activeLoansCount} active
                        </span>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="text-right font-mono font-bold whitespace-nowrap tabular-nums">
                        <span className={hasDelinquency ? 'text-[#DC2626]' : 'text-[#0F172A]'}>
                          {formatMoney(borrower.totalOutstandingUSD)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="whitespace-nowrap">
                        {hasDelinquency ? (
                          <span className="badge badge-danger">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overdue Risk</span>
                          </span>
                        ) : borrower.status === 'ACTIVE' ? (
                          <span className="badge badge-success">
                            Verified Active
                          </span>
                        ) : (
                          <span className="badge badge-neutral">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onSelectBorrower(borrower.borrowerId || borrower.id)}
                            className="px-2.5 py-1 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectBorrower(borrower.borrowerId || borrower.id)}
                            className="px-2.5 py-1 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectBorrower(borrower.borrowerId || borrower.id)}
                            className="px-2.5 py-1 rounded-[6px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#2563EB] text-xs font-semibold transition"
                          >
                            Loan History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal for New Borrowers */}
      <AnimatePresence>
        {showNewBorrowerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-lg bg-white rounded-[8px] border border-[#CBD5E1] shadow-xl p-6 text-[#0F172A] relative"
            >
              <button
                type="button"
                onClick={() => setShowNewBorrowerModal(false)}
                className="absolute top-5 right-5 text-[#64748B] hover:text-[#0F172A] p-1 rounded-[4px]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#CBD5E1]">
                <div className="w-9 h-9 rounded-[6px] bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Register New Borrower
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Institutional borrower profile dossier registration
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateBorrowerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="e.g. Sokha Mean"
                      className="w-full h-10 px-3 rounded-[6px] bg-white border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      National ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={newNationalId}
                      onChange={(e) => setNewNationalId(e.target.value)}
                      placeholder="010892441"
                      className="w-full h-10 px-3 rounded-[6px] bg-white border border-[#CBD5E1] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+855 12 345 678"
                      className="w-full h-10 px-3 rounded-[6px] bg-white border border-[#CBD5E1] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="borrower@example.com"
                      className="w-full h-10 px-3 rounded-[6px] bg-white border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Occupation / Sector
                    </label>
                    <input
                      type="text"
                      value={newOccupation}
                      onChange={(e) => setNewOccupation(e.target.value)}
                      placeholder="e.g. Retail Merchant / Farmer"
                      className="w-full h-10 px-3 rounded-[6px] bg-white border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Monthly Income (USD)
                    </label>
                    <input
                      type="number"
                      value={newMonthlyIncome}
                      onChange={(e) => setNewMonthlyIncome(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-[6px] bg-white border border-[#CBD5E1] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#CBD5E1]">
                  <button
                    type="button"
                    onClick={() => setShowNewBorrowerModal(false)}
                    className="px-4 py-2 rounded-[6px] text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-[6px] text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] transition"
                  >
                    Save &amp; Open Dossier
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BorrowerList;
