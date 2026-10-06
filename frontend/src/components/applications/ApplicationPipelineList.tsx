import React, { useState, useMemo } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { Search, Plus, ArrowRight, FileSpreadsheet } from 'lucide-react';

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
    <div className="space-y-6 font-sans">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Loan Applications Pipeline
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
              {applications.length} Files
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Credit origination queue, automated debt-to-income analysis, and committee sign-off workflow.
          </p>
        </div>

        <button
          onClick={onOpenNewApplication}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Application</span>
        </button>
      </div>

      {/* 2. Filter & Stage Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Horizontal Stage Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-[6px] border border-[#CBD5E1] overflow-x-auto">
            {stages.map((stage) => {
              const active = selectedStage === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => setSelectedStage(stage.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#0F172A] shadow-xs font-bold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <span>{stage.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded-[3px] ${
                      active
                        ? 'bg-slate-100 text-[#0F172A] border border-[#CBD5E1]'
                        : 'bg-white text-[#64748B] border border-slate-200'
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, borrower, product..."
              className="w-full h-10 pl-9 pr-3.5 text-xs bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 3. Table */}
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Applicant Borrower</th>
                <th>Credit Product</th>
                <th className="text-right">Requested Capital</th>
                <th>Tenure</th>
                <th>Underwriting Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-[#0F172A] text-sm">No applications found</p>
                      <p>Try adjusting your search criteria or create a new loan application.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app.id)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Application ID */}
                    <td className="font-mono tabular-nums font-bold text-[#2563EB] group-hover:text-[#1D4ED8]">
                      {app.applicationNo}
                    </td>

                    {/* Borrower */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {app.borrowerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-[#0F172A] block">{app.borrowerName}</span>
                          <span className="text-[11px] text-[#64748B] font-mono">
                            Submitted: {app.createdAt}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="text-xs text-[#0F172A] font-medium">
                      {app.productName}
                    </td>

                    {/* Requested Amount */}
                    <td className="text-right">
                      <MoneyText
                        amount={app.requestedAmountUSD}
                        currency={currency}
                        className="font-bold text-[#0F172A]"
                      />
                    </td>

                    {/* Tenure */}
                    <td className="font-mono text-xs text-[#64748B]">
                      {app.requestedTermMonths} months
                    </td>

                    {/* Status Badge */}
                    <td>
                      <Badge
                        variant={
                          app.status === 'APPROVED'
                            ? 'approved'
                            : app.status === 'UNDER_REVIEW'
                            ? 'review'
                            : app.status === 'REJECTED'
                            ? 'rejected'
                            : 'pending'
                        }
                        dot
                      >
                        {app.status}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectApplication(app.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
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
    </div>
  );
};

export default ApplicationPipelineList;
