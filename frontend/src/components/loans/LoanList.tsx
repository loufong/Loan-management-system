import React, { useState } from 'react';
import { LoanAccount, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { Search, ArrowRight, Landmark } from 'lucide-react';

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
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Active Loans Ledger
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
              {loans.length} Facilities
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Active credit facilities, principal amortization schedules, and commercial portfolio repayment status.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Loan #, Borrower, Product..."
              className="w-full h-10 pl-9 pr-3.5 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-[6px] border border-[#CBD5E1]">
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
                  className={`px-3 py-1.5 text-xs rounded-[4px] transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#0F172A] font-bold shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
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
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Loan Number</th>
                <th>Borrower</th>
                <th>Product Name</th>
                <th className="text-right">Disbursed Principal</th>
                <th className="text-right">Outstanding Balance</th>
                <th className="text-center">Progress</th>
                <th className="text-center">Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Landmark className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-[#0F172A] text-sm">No loan accounts found</p>
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
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Loan Number */}
                      <td className="font-mono tabular-nums font-bold text-[#2563EB] group-hover:text-[#1D4ED8]">
                        {loan.loanNumber}
                      </td>

                      {/* Borrower */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {loan.borrowerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F172A] block truncate">
                              {loan.borrowerName}
                            </span>
                            <span className="text-[11px] text-[#64748B] font-mono">
                              Matures: {loan.maturityDate}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="text-xs text-[#0F172A]">
                        {loan.productName}
                      </td>

                      {/* Disbursed Principal */}
                      <td className="text-right">
                        <MoneyText
                          amount={loan.principalUSD}
                          currency={currency}
                          className="font-bold text-[#0F172A]"
                        />
                      </td>

                      {/* Outstanding Balance */}
                      <td className="text-right">
                        <MoneyText
                          amount={loan.outstandingBalanceUSD}
                          currency={currency}
                          className="font-bold text-[#2563EB]"
                        />
                      </td>

                      {/* Progress */}
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#16A34A] h-1.5 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-xs font-semibold text-[#0F172A]">
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="text-center">
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
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectLoan(loan.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition-colors cursor-pointer"
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

export default LoanList;
