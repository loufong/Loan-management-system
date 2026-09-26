import React, { useState } from 'react';
import { LoanAccount, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { Search, Plus, Filter, ArrowRight, Landmark, Calendar } from 'lucide-react';

export interface LoanListProps {
  loans: LoanAccount[];
  currency: Currency;
  currentUserRole: UserRole;
  onSelectLoan: (loanId: string) => void;
  onOpenCashierForLoan?: (loanId: string) => void;
}

export const LoanList: React.FC<LoanListProps> = ({
  loans,
  currency,
  currentUserRole,
  onSelectLoan,
  onOpenCashierForLoan
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'COMPLETED'>('ALL');

  const filteredLoans = loans.filter((l) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      l.loanNumber.toLowerCase().includes(q) ||
      l.borrowerName.toLowerCase().includes(q) ||
      l.productName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Core Banking Loans
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {loans.length} active facilities
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Active credit ledger, principal amortization, and portfolio repayment tracking.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Loan # (LN-2026-...), borrower, product..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { key: 'ALL', label: 'All Accounts' },
                { key: 'ACTIVE', label: 'Active' },
                { key: 'OVERDUE', label: 'Overdue' },
                { key: 'COMPLETED', label: 'Completed' },
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
        </div>
      </div>

      {/* 3. Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Loan Number</th>
                <th className="py-3.5 px-4">Borrower</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4 text-right">Disbursed Principal</th>
                <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                <th className="py-3.5 px-4 text-center">Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Landmark className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-800 text-sm">No loans found</p>
                      <p>Adjust your search filters to view active loans.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const progressPct = Math.min(
                    100,
                    Math.round((loan.totalPaidUSD / loan.totalRepaymentUSD) * 100)
                  );
                  return (
                    <tr
                      key={loan.id}
                      onClick={() => onSelectLoan(loan.id)}
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700 cursor-pointer group"
                    >
                      {/* Loan Number */}
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-indigo-600 group-hover:text-indigo-700">
                        {loan.loanNumber}
                      </td>

                      {/* Borrower */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {loan.borrowerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block truncate">
                              {loan.borrowerName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Matures: {loan.maturityDate}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {loan.productName}
                      </td>

                      {/* Disbursed Principal */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={loan.principalUSD}
                          currency={currency}
                          className="font-semibold text-slate-900"
                        />
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={loan.outstandingBalanceUSD}
                          currency={currency}
                          className="font-bold text-indigo-600"
                        />
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-xs font-semibold text-slate-700">
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            loan.status === 'ACTIVE'
                              ? 'active'
                              : loan.status === 'OVERDUE'
                              ? 'overdue'
                              : 'closed'
                          }
                          dot
                        >
                          {loan.status}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectLoan(loan.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                          >
                            <span>Schedule</span>
                            <ArrowRight className="w-3.5 h-3.5" />
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
    </div>
  );
};
