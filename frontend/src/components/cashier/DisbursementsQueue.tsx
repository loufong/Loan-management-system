import React, { useState } from 'react';
import { LoanApplication, Currency, UserRole } from '../../types';
import { MoneyText } from '../common/MoneyText';
import {
  Landmark,
  CheckCircle2,
  Search
} from 'lucide-react';

export interface DisbursementsQueueProps {
  applications: LoanApplication[];
  currency: Currency;
  currentUserRole: UserRole;
  currentUserName: string;
  onDisbursementComplete: () => void;
  onNavigateToLoan?: (loanId: string) => void;
}

export const DisbursementsQueue: React.FC<DisbursementsQueueProps> = ({
  applications,
  currency,
  currentUserRole,
  currentUserName,
  onDisbursementComplete,
  onNavigateToLoan
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Applications approved and auto-disbursed
  const approvedPendingDisbursement = applications.filter((a) => {
    const isApproved = a.status === 'APPROVED' || (a.status as any) === 'ACTIVE';
    const matchesSearch =
      !searchQuery.trim() ||
      a.applicationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.productName.toLowerCase().includes(searchQuery.toLowerCase());
    return isApproved && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Loan Disbursement Operations Desk
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {approvedPendingDisbursement.length} Facilities Ready
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Execute final capital disbursements for committee-approved loan applications and generate initial amortized repayment schedules.
          </p>
        </div>
      </div>

      {/* 2. Filter & Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approved applications, borrowers, products..."
            className="w-full h-9 pl-8 pr-3 bg-white border border-[#E2E8F0] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <div className="text-xs text-[#64748B]">
          Authorized Treasury Staff: <span className="font-semibold text-[#0F172A]">{currentUserName}</span>
        </div>
      </div>

      {/* 3. Approved Facilities Queue */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Sanctioned Applications Pending Disbursement
            </h3>
          </div>
        </div>

        {approvedPendingDisbursement.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-[#0F172A]">Disbursement Queue Cleared</p>
            <p>There are no sanctioned applications currently awaiting capital release.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-enterprise">
              <thead>
                <tr>
                  <th>Application #</th>
                  <th>Borrower</th>
                  <th>Product</th>
                  <th className="text-right">Sanctioned Amount</th>
                  <th>Tenure</th>
                  <th>Sanctioned By</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {approvedPendingDisbursement.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="font-mono font-bold text-[#2563EB]">{app.applicationNo}</td>
                    <td>
                      <div className="font-semibold text-[#0F172A]">{app.borrowerName}</div>
                      <div className="text-[11px] font-mono text-[#64748B]">{app.borrowerId}</div>
                    </td>
                    <td className="text-[#0F172A]">{app.productName}</td>
                    <td className="text-right font-bold text-[#0F172A]">
                      <MoneyText
                        amount={app.committeeApproval?.approvedAmountUSD || app.requestedAmountUSD}
                        currency={currency}
                      />
                    </td>
                    <td className="text-[#64748B]">
                      {app.committeeApproval?.approvedTermMonths || app.requestedTermMonths} Months
                    </td>
                    <td>
                      <div className="text-[#0F172A]">{app.committeeApproval?.approverName || 'Executive Committee'}</div>
                      <div className="text-[10px] text-[#64748B]">
                        {app.committeeApproval?.decidedAt ? new Date(app.committeeApproval.decidedAt).toLocaleDateString() : 'Approved'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">APPROVED</span>
                    </td>
                    <td className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Auto-Disbursed</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
