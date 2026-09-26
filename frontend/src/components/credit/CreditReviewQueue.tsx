import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { Clock, ArrowRight, ShieldCheck, Search, Filter } from 'lucide-react';

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
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Credit Review Queue
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
              {queueItems.length} pending underwriting
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized assessment inbox enforcing regulatory 4-hour SLA underwriting benchmark.
          </p>
        </div>
      </div>

      {/* 2. Search Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter queue by Application ID, Borrower, or Product..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. Review Queue Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Priority / SLA</th>
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Applicant Borrower</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4 text-right">Requested Capital</th>
                <th className="py-3.5 px-4 text-right">Borrower Income</th>
                <th className="py-3.5 px-4 text-center">DTI Risk Badge</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queueItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-slate-800 text-sm">Review queue is empty</p>
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
                      className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                    >
                      {/* SLA Timer */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                            sla.isUrgent
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          Waiting {sla.hours} hrs
                        </span>
                      </td>

                      {/* Application ID */}
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-indigo-600">
                        {app.applicationNo || app.id}
                      </td>

                      {/* Borrower */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {app.borrowerName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{app.borrowerName}</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {app.productName}
                      </td>

                      {/* Requested Capital */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={app.requestedAmountUSD}
                          currency={currency}
                          className="font-bold text-slate-900"
                        />
                      </td>

                      {/* Borrower Income */}
                      <td className="py-3.5 px-4 text-right">
                        <MoneyText
                          amount={app.borrowerIncomeUSD || 1500}
                          currency={currency}
                          className="font-semibold text-slate-700"
                        />
                        <span className="block text-[11px] text-slate-400">monthly</span>
                      </td>

                      {/* DTI Risk Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono tabular-nums text-xs font-semibold ${
                            app.dtiRatio <= 30
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : app.dtiRatio <= 45
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {app.dtiRatio}% ({app.dtiRatio <= 30 ? 'Low' : app.dtiRatio <= 45 ? 'Moderate' : 'High'})
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onAssessApplication(app.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          <span>Assess Application</span>
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
