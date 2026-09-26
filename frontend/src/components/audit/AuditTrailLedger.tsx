import React, { useState } from 'react';
import { SystemActivityEvent, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import {
  History,
  Search,
  Filter,
  Code,
  X,
  ShieldCheck,
  Calendar,
  User,
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
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Audit Trail &amp; Immutable Ledger
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Cryptographically Sequenced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable regulatory forensic ledger of all transactions, authentication events, and credit committee sign-offs.
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Query */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entity, IP, action..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Filter by User */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Filter by Actor / User</label>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
            <label className="block font-semibold text-slate-700 mb-1">Action Category</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
            <label className="block font-semibold text-slate-700 mb-1">Date</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Table of System Events */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor / User</th>
                <th className="py-3.5 px-4 text-center">Action Category</th>
                <th className="py-3.5 px-4">Action Detail</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-sans">
                    No system audit records match your filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-slate-700"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 tabular-nums text-slate-600">
                      {ev.timestamp}
                    </td>

                    {/* Actor / User */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{ev.actorName}</span>
                        <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {ev.actorRole}
                        </span>
                      </div>
                    </td>

                    {/* Action Category Badge */}
                    <td className="py-3.5 px-4 text-center font-sans">
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

                    {/* Action Detail */}
                    <td className="py-3.5 px-4 text-slate-800 font-sans font-medium text-xs">
                      {ev.action}
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      {ev.entityReference}
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-4 tabular-nums text-slate-500">
                      {ev.ipAddress}
                    </td>

                    {/* JSON Details Modal Trigger */}
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setActiveJsonEvent(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>JSON</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Event Payload: {activeJsonEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setActiveJsonEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={handleCopyJson}
                className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
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

              <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
                {JSON.stringify(activeJsonEvent, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Timestamp: {activeJsonEvent.timestamp}</span>
              <button
                onClick={() => setActiveJsonEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold font-sans"
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
