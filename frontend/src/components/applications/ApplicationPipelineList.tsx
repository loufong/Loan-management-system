import React, { useState, useMemo } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { Search, Plus, Filter, ArrowRight, FileSpreadsheet, FileText } from 'lucide-react';

export interface ApplicationPipelineListProps {
  applications: LoanApplication[];
  currency: Currency;
  currentUserRole: UserRole;
  onSelectApplication: (appId: string) => void;
  onOpenNewApplication: () => void;
  onAssessApplication?: (appId: string) => void;
}

export const ApplicationPipelineList: React.FC<ApplicationPipelineListProps> = ({
  applications,
  currency,
  currentUserRole,
  onSelectApplication,
  onOpenNewApplication,
  onAssessApplication
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate counts for each stage
  const counts = useMemo(() => {
    const drafts = applications.filter((a) => a.status === 'DRAFT').length;
    const submitted = applications.filter((a) => a.status === 'SUBMITTED').length;
    const underReview = applications.filter((a) => a.status === 'UNDER_REVIEW').length;
    const approved = applications.filter((a) => a.status === 'APPROVED').length;
    const rejected = applications.filter((a) => a.status === 'REJECTED').length;
    return {
      all: applications.length,
      drafts,
      submitted,
      underReview,
      approved,
      rejected
    };
  }, [applications]);

  const stages = [
    { key: 'ALL', label: 'All', count: counts.all },
    { key: 'DRAFT', label: 'Draft', count: counts.drafts },
    { key: 'SUBMITTED', label: 'Submitted', count: counts.submitted },
    { key: 'UNDER_REVIEW', label: 'Under Review', count: counts.underReview },
    { key: 'APPROVED', label: 'Approved', count: counts.approved },
    { key: 'REJECTED', label: 'Rejected', count: counts.rejected },
  ];

  const filteredApplications = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      app.applicationNo.toLowerCase().includes(q) ||
      app.borrowerName.toLowerCase().includes(q) ||
      app.productName.toLowerCase().includes(q);

    const matchesStage = selectedStage === 'ALL' || app.status === selectedStage;

    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Loan Applications
          </h1>
          <p className="text-xs text-slate-500">
            Origination pipeline, credit assessment queue, and committee sign-off.
          </p>
        </div>

        <button
          onClick={onOpenNewApplication}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Application</span>
        </button>
      </div>

      {/* 2. Horizontal Status Pills with Count Badges (Kanban / Stage Tabs) */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Horizontal Stage Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {stages.map((stage) => {
              const active = selectedStage === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => setSelectedStage(stage.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <span>{stage.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded-md ${
                      active
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {stage.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, borrower, product..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 3. Standard Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Borrower</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4 text-right">Requested Amount</th>
                <th className="py-3.5 px-4 text-center">Term</th>
                <th className="py-3.5 px-4 text-center">DTI Estimate</th>
                <th className="py-3.5 px-4">Submission Date</th>
                <th className="py-3.5 px-4 text-center">Current Stage</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        No loan applications found in this stage
                      </p>
                      <p className="text-xs text-slate-500">
                        Change the stage filter or originate a new loan application.
                      </p>
                      <button
                        onClick={onOpenNewApplication}
                        className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        + Originate New Application
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                  >
                    {/* Application ID */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono tabular-nums tracking-tight font-semibold text-indigo-600">
                        {app.applicationNo || app.id}
                      </span>
                    </td>

                    {/* Borrower with initials */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {app.borrowerName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900 truncate">
                          {app.borrowerName}
                        </span>
                      </div>
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {app.productName}
                    </td>

                    {/* Requested Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <MoneyText
                        amount={app.requestedAmountUSD}
                        currency={currency}
                        className="font-bold text-slate-900"
                      />
                    </td>

                    {/* Term */}
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-xs text-slate-600">
                      {app.requestedTermMonths} mo
                    </td>

                    {/* DTI Estimate */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono tabular-nums text-xs font-semibold ${
                          app.dtiRatio <= 30
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : app.dtiRatio <= 40
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}
                      >
                        {app.dtiRatio}%
                      </span>
                    </td>

                    {/* Submission Date */}
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                      {app.createdAt}
                    </td>

                    {/* Current Stage Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          app.status === 'APPROVED'
                            ? 'approved'
                            : app.status === 'REJECTED'
                            ? 'rejected'
                            : app.status === 'UNDER_REVIEW'
                            ? 'review'
                            : app.status === 'SUBMITTED'
                            ? 'pending'
                            : 'draft'
                        }
                        dot
                      >
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </td>

                    {/* Review / Action button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          if (onAssessApplication && (app.status === 'UNDER_REVIEW' || app.status === 'SUBMITTED')) {
                            onAssessApplication(app.id);
                          } else {
                            onSelectApplication(app.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <span>Review / Action</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
