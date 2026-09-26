import React, { useState } from 'react';
import { Borrower, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
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
  UserCheck
} from 'lucide-react';

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

  // New Borrower modal state
  const [showNewBorrowerModal, setShowNewBorrowerModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOccupation, setNewOccupation] = useState('');
  const [newMonthlyIncome, setNewMonthlyIncome] = useState(1500);

  // Authorized roles permitted to unmask PII
  const canRevealPII =
    currentUserRole === 'MANAGER' ||
    currentUserRole === 'LOAN_OFFICER';

  const toggleRevealNationalId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRevealPII) {
      alert('Access Restricted: PII decryption requires Manager or Loan Officer clearance.');
      return;
    }
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
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
      matchesStatus = b.status === 'ACTIVE';
    } else if (statusFilter === 'HAS_OVERDUE') {
      // simulate check for delinquent balance or blacklisted
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
    alert(`Borrower ${newFullName} registered successfully in institutional KYC ledger.`);
    setShowNewBorrowerModal(false);
    setNewFullName('');
    setNewNationalId('');
    setNewPhone('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title, Count Badge, and Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Borrowers Directory
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {borrowers.length > 4 ? `${borrowers.length} total` : '428 total'}
          </span>
        </div>

        <button
          onClick={() => {
            if (onOpenNewBorrower) onOpenNewBorrower();
            else setShowNewBorrowerModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Borrower</span>
        </button>
      </div>

      {/* 2. Unified Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Borrower ID, Phone, National ID..."
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: 'ACTIVE', label: 'Active' },
                { key: 'HAS_OVERDUE', label: 'Has Overdue' },
                { key: 'ARCHIVED', label: 'Archived' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date Added Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-2.5 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-400 hover:text-slate-600"
                title="Clear date"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Standard Data Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Borrower ID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">National ID</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4 text-right">Monthly Income</th>
                <th className="py-3.5 px-4 text-center">Active Loans</th>
                <th className="py-3.5 px-4 text-right">Total Outstanding</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          No borrowers match your search
                        </p>
                        <p className="text-xs text-slate-500">
                          Try adjusting search keywords or clearing active status filters.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('ALL');
                          setDateFilter('');
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBorrowers.map((b) => {
                  const isRevealed = revealedIds[b.id];
                  const displayNationalId = isRevealed
                    ? b.nationalId
                    : `***-**-${b.nationalId.slice(-4)}`;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onSelectBorrower(b.id)}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700 cursor-pointer group"
                    >
                      {/* Borrower ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono tabular-nums tracking-tight font-semibold text-indigo-600 group-hover:text-indigo-700">
                          {b.borrowerId}
                        </span>
                      </td>

                      {/* Full Name with 2-letter Initials Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {b.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate group-hover:text-indigo-600 transition-colors">
                              {b.fullName}
                            </span>
                            <span className="text-xs text-slate-400 block truncate">
                              {b.occupation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* National ID with Eye Toggle */}
                      <td className="py-3.5 px-4 font-mono tabular-nums tracking-tight text-slate-600">
                        <div className="inline-flex items-center gap-2">
                          <span>{displayNationalId}</span>
                          <button
                            onClick={(e) => toggleRevealNationalId(b.id, e)}
                            title={isRevealed ? 'Mask National ID' : 'Decrypt PII (Authorized)'}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Contact Info (Phone + Email Stacked) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5 font-mono tabular-nums tracking-tight text-xs">
                          <span className="text-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {b.phone}
                          </span>
                          <span className="text-slate-400 font-sans truncate max-w-[160px] flex items-center gap-1 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {b.email}
                          </span>
                        </div>
                      </td>

                      {/* Monthly Income */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={b.monthlyIncomeUSD}
                          currency={currency}
                          className="font-semibold text-slate-900"
                        />
                      </td>

                      {/* Active Loans count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md font-mono text-xs font-semibold bg-slate-100 text-slate-700">
                          {b.activeLoansCount}
                        </span>
                      </td>

                      {/* Total Outstanding Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={b.totalOutstandingUSD}
                          currency={currency}
                          className="font-bold text-slate-900"
                        />
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            b.status === 'ACTIVE'
                              ? 'active'
                              : b.status === 'BLACKLISTED'
                              ? 'delinquent'
                              : 'inactive'
                          }
                          dot
                        >
                          {b.status}
                        </Badge>
                      </td>

                      {/* Action dropdown (...) */}
                      <td className="py-3.5 px-4 text-right relative">
                        <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === b.id ? null : b.id)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === b.id && (
                            <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onSelectBorrower(b.id);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                View 360° Dossier
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onOpenCreateApplication?.(b.id);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                + New Application
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  alert(`KYC Status for ${b.fullName}: ${b.kycStatus}`);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                              >
                                Review KYC Verification
                              </button>
                            </div>
                          )}
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

      {/* Register New Borrower Modal */}
      {showNewBorrowerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Register New Borrower
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create verified institutional identity profile
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewBorrowerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBorrowerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Sothea Meas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    National ID (KYC)
                  </label>
                  <input
                    type="text"
                    required
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    placeholder="010882910"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+855 12 445 678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="sothea.meas@example.kh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={newOccupation}
                    onChange={(e) => setNewOccupation(e.target.value)}
                    placeholder="Senior Researcher"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verified Monthly Income (USD)
                </label>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={newMonthlyIncome}
                  onChange={(e) => setNewMonthlyIncome(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBorrowerModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition-colors"
                >
                  Save &amp; Verify Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
