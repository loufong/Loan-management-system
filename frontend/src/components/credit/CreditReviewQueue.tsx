import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { MoneyText } from '../common/MoneyText';
import { Clock, ArrowRight, ShieldCheck, Search } from 'lucide-react';

export interface CreditReviewQueueProps {
  applications: LoanApplication[];
  currency: Currency;
  currentUserRole: UserRole;
  onAssessApplication: (appId: string) => void;
}

export const CreditReviewQueue: React.FC<CreditReviewQueueProps> = ({
  applications,
  currency,
  currentUserRole,
  onAssessApplication
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Pending assessment applications
  const queueItems = applications
    .filter((a) => a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED')
    .filter((a) => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        a.applicationNo.toLowerCase().includes(q) ||
        a.borrowerName.toLowerCase().includes(q) ||
        a.productName.toLowerCase().includes(q)
      );
    });

  // Simulated SLA waiting times
  const getSlaInfo = (index: number) => {
    const hours = [3.2, 1.8, 4.5, 0.9, 2.4][index % 5];
    const isUrgent = hours > 3.0;
    return { hours, isUrgent };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Credit Review &amp; Underwriting Queue
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
              {queueItems.length} Pending Files
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Prioritized underwriter assessment queue enforcing regulatory risk benchmarks and DTI evaluation.
          </p>
        </div>
      </div>

      {/* 2. Search Toolbar */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-3.5">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter queue by Application ID, Borrower, or Product..."
            className="w-full h-10 pl-9 pr-3.5 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* 3. Review Queue Table */}
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Priority / SLA</th>
                <th>Application ID</th>
                <th>Applicant Borrower</th>
                <th>Product</th>
                <th className="text-right">Requested Capital</th>
                <th className="text-right">Borrower Income</th>
                <th className="text-center">DTI Ratio</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShieldCheck className="w-8 h-8 text-[#16A34A] mx-auto" />
                      <p className="font-semibold text-[#0F172A] text-sm">Review queue is empty</p>
                      <p>All active applications have completed underwriting analysis.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                queueItems.map((app, idx) => {
                  const sla = getSlaInfo(idx);
                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* SLA Timer */}
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-mono font-medium border ${
                            sla.isUrgent
                              ? 'bg-red-50 text-[#DC2626] border-red-200 font-semibold'
                              : 'bg-amber-50 text-[#D97706] border-amber-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          Waiting {sla.hours} hrs
                        </span>
                      </td>

                      {/* Application ID */}
                      <td className="font-mono tabular-nums font-bold text-[#2563EB]">
                        {app.applicationNo || app.id}
                      </td>

                      {/* Borrower */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                            {app.borrowerName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-[#0F172A]">{app.borrowerName}</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="text-xs text-[#0F172A] font-medium">
                        {app.productName}
                      </td>

                      {/* Requested Capital */}
                      <td className="text-right">
                        <MoneyText
                          amount={app.requestedAmountUSD}
                          currency={currency}
                          className="font-bold text-[#0F172A]"
                        />
                      </td>

                      {/* Borrower Income */}
                      <td className="text-right">
                        <MoneyText
                          amount={app.borrowerIncomeUSD || 1500}
                          currency={currency}
                          className="font-bold text-[#0F172A]"
                        />
                        <span className="block text-[11px] text-[#64748B]">monthly</span>
                      </td>

                      {/* DTI Risk Badge */}
                      <td className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono tabular-nums text-xs font-semibold border ${
                            app.dtiRatio <= 30
                              ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                              : app.dtiRatio <= 45
                              ? 'bg-amber-50 text-[#D97706] border-amber-200'
                              : 'bg-red-50 text-[#DC2626] border-red-200'
                          }`}
                        >
                          {app.dtiRatio}% ({app.dtiRatio <= 30 ? 'Low' : app.dtiRatio <= 45 ? 'Moderate' : 'High'})
                        </span>
                      </td>

                      {/* Action */}
                      <td className="text-right">
                        <button
                          onClick={() => onAssessApplication(app.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>Assess</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
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

export default CreditReviewQueue;
