import React, { useState } from 'react';
import { SystemActivityEvent, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import {
  Search,
  Code,
  X,
  Copy,
  Check
} from 'lucide-react';

export interface AuditTrailLedgerProps {
  events: SystemActivityEvent[];
  currentUserRole: UserRole;
}

export const AuditTrailLedger: React.FC<AuditTrailLedgerProps> = ({
  events,
  currentUserRole
}) => {
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // JSON Details Modal State
  const [activeJsonEvent, setActiveJsonEvent] = useState<SystemActivityEvent | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Distinct actors for user filter dropdown
  const actors = Array.from(new Set(events.map((e) => e.actorName)));

  const filteredEvents = events.filter((ev) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      ev.entityReference.toLowerCase().includes(q) ||
      ev.action.toLowerCase().includes(q) ||
      ev.actorName.toLowerCase().includes(q) ||
      ev.ipAddress.includes(searchQuery);

    const matchesUser =
      selectedUserFilter === 'ALL' || ev.actorName === selectedUserFilter;

    const matchesCategory =
      selectedCategoryFilter === 'ALL' || ev.actionCategory === selectedCategoryFilter;

    const matchesDate = !dateFilter || ev.timestamp.startsWith(dateFilter);

    return matchesSearch && matchesUser && matchesCategory && matchesDate;
  });

  const handleCopyJson = () => {
    if (!activeJsonEvent) return;
    navigator.clipboard.writeText(JSON.stringify(activeJsonEvent, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              System Audit Trail &amp; Ledger
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
              Cryptographically Sequenced
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Forensic compliance audit trail recording all core transactions, underwriting decisions, and administrative actions.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Query */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Entity, IP, action..."
                className="w-full h-9 pl-8 pr-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Filter by User */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Actor / Operator</label>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Actors &amp; Officers</option>
              {actors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Action Category */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Action Category</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Event Categories</option>
              <option value="LOGIN">LOGIN (Auth)</option>
              <option value="APPLICATION_SUBMITTED">APPLICATION_SUBMITTED</option>
              <option value="LOAN_APPROVED">LOAN_APPROVED</option>
              <option value="DISBURSEMENT">DISBURSEMENT</option>
              <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
              <option value="SECURITY">SECURITY</option>
            </select>
          </div>

          {/* Filter by Date */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Date</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] font-mono text-xs focus:outline-none focus:border-[#2563EB]"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Table of System Events */}
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor / User</th>
                <th className="text-center">Action Category</th>
                <th>Action Detail</th>
                <th>Entity Reference</th>
                <th>IP Address</th>
                <th className="text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#64748B] font-sans">
                    No system audit records match your filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="tabular-nums text-[#64748B]">
                      {ev.timestamp}
                    </td>

                    {/* Actor */}
                    <td className="font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F172A]">{ev.actorName}</span>
                        <span className="inline-flex px-1.5 py-0.2 rounded-[3px] text-[10px] font-mono font-medium bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
                          {ev.actorRole}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="text-center font-sans">
                      <Badge
                        variant={
                          ev.actionCategory === 'LOAN_APPROVED' || ev.actionCategory === 'PAYMENT_RECORDED'
                            ? 'approved'
                            : ev.actionCategory === 'APPLICATION_SUBMITTED'
                            ? 'review'
                            : ev.actionCategory === 'SECURITY'
                            ? 'rejected'
                            : 'draft'
                        }
                        size="xs"
                      >
                        {ev.actionCategory}
                      </Badge>
                    </td>

                    {/* Detail */}
                    <td className="text-[#0F172A] font-sans font-medium text-xs">
                      {ev.action}
                    </td>

                    {/* Entity */}
                    <td className="font-bold text-[#2563EB]">
                      {ev.entityReference}
                    </td>

                    {/* IP */}
                    <td className="tabular-nums text-[#64748B]">
                      {ev.ipAddress}
                    </td>

                    {/* JSON Trigger */}
                    <td className="text-right font-sans">
                      <button
                        onClick={() => setActiveJsonEvent(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] transition-colors cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Payload</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. JSON Details Modal */}
      {activeJsonEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] shadow-xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Audit Event Payload: {activeJsonEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setActiveJsonEvent(null)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={handleCopyJson}
                className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[4px] bg-[#0F172A] text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>

              <pre className="p-4 bg-slate-950 text-slate-200 rounded-[6px] text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
                {JSON.stringify(activeJsonEvent, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
              <span>Timestamp: {activeJsonEvent.timestamp}</span>
              <button
                onClick={() => setActiveJsonEvent(null)}
                className="px-4 py-1.5 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] font-semibold font-sans cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailLedger;
