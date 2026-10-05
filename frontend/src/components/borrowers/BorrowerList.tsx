import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Borrower, Currency, UserRole } from '../../types';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  MoreVertical,
  Calendar,
  Users,
  X,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  Check,
  Copy,
  ExternalLink,
  FilePlus,
  AlertTriangle,
  ChevronRight,
  Filter
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
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
    <div className="space-y-6 select-none font-sans">
      
      {/* 1. Header with Title, Count Badge, and Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
                Borrowers Directory
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {borrowers.length} Borrowers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage borrower profiles, identification, credit history, and active loans.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenNewBorrower) onOpenNewBorrower();
            else setShowNewBorrowerModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Register New Borrower</span>
        </button>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input: Name, ID, Phone, National ID */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Borrower ID, Phone, National ID..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills: All, Active, Has Overdue, Archived */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
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
                    'px-3 py-1.5 rounded-md text-xs transition font-sans cursor-pointer',
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-600 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  title="Clear Date"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Borrower ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">National ID</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Monthly Income</th>
                <th className="py-3 px-4 text-center">Active Loans</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
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
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Borrower ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{borrower.borrowerId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(borrower.borrowerId, e)}
                            title="Copy Borrower ID"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
                          >
                            {copiedId === borrower.borrowerId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Full Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                            {borrower.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {borrower.fullName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {borrower.occupation || 'Standard Account'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* National ID (Masked with Eye Reveal Toggle) */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {isRevealed ? borrower.nationalId : maskNationalId(borrower.nationalId)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleRevealNationalId(borrower.id, e)}
                            title={isRevealed ? 'Mask National ID' : 'Reveal National ID'}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-medium text-slate-800 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {borrower.phone}
                          </span>
                          <span className="text-slate-400 truncate max-w-[150px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {borrower.email}
                          </span>
                        </div>
                      </td>

                      {/* Monthly Income */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatMoney(borrower.monthlyIncomeUSD)}
                      </td>

                      {/* Active Loans Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {borrower.activeLoansCount} active
                        </span>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap tabular-nums">
                        <span className={hasDelinquency ? 'text-rose-600' : 'text-slate-900'}>
                          {formatMoney(borrower.totalOutstandingUSD)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasDelinquency ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Overdue Risk</span>
                          </span>
                        ) : borrower.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Verified Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBorrower(borrower.borrowerId || borrower.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3 h-3" />
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl p-6 text-slate-900 relative"
            >
              <button
                type="button"
                onClick={() => setShowNewBorrowerModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Register New Borrower
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create a new borrower profile for loan applications
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateBorrowerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="e.g. Sokha Mean"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      National ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={newNationalId}
                      onChange={(e) => setNewNationalId(e.target.value)}
                      placeholder="010892441"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+855 12 345 678"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="borrower@example.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Occupation / Sector
                    </label>
                    <input
                      type="text"
                      value={newOccupation}
                      onChange={(e) => setNewOccupation(e.target.value)}
                      placeholder="e.g. Retail Merchant / Farmer"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Income (USD)
                    </label>
                    <input
                      type="number"
                      value={newMonthlyIncome}
                      onChange={(e) => setNewMonthlyIncome(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewBorrowerModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0040C1] shadow-md shadow-blue-500/20 transition"
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
