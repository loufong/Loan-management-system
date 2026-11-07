import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  Search,
  Filter,
  DollarSign,
  Phone,
  User,
  Calendar,
  Layers,
  ChevronRight,
  TrendingDown,
  ShieldAlert,
  ArrowUpRight,
  Receipt,
  BellRing
} from 'lucide-react';

export interface DueTrackingItem {
  id: string;
  loanId: string;
  borrower: {
    id: string;
    clientCode: string;
    nameEn: string;
    nameKh: string;
    maskedNationalId?: string;
    phone: string;
    occupation?: string;
    avatarUrl?: string;
  };
  facility: {
    productName: string;
    currency: string;
    status: string;
    health: string;
    branch?: string;
  };
  principal: {
    disbursedAmountUSD: number;
    aprPercent: number;
    remainingMonths: number;
    termMonths: number;
  };
  repaymentProgress: {
    totalPaidUSD: number;
    outstandingBalanceUSD: number;
  };
  nextScheduledPayment: {
    dueDate: string;
    cycleNumber: number;
    scheduledEMIUSD: number;
    daysOverdue: number;
  };
}

interface UpcomingDueTrackerProps {
  loans: DueTrackingItem[];
  currency?: 'USD' | 'KHR' | 'DUAL';
  onViewLedger?: (loan: DueTrackingItem) => void;
  onRecordPayment?: (loan: DueTrackingItem) => void;
  onSendReminder?: (loan: DueTrackingItem) => void;
}

export type UrgencyLevel = 'CRITICAL' | 'IMMINENT' | 'UPCOMING' | 'OVERDUE' | 'LATER';

export interface TimeRemainingCalculation {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  urgency: UrgencyLevel;
  countdownText: string;
  badgeLabel: string;
}

export function computeTimeRemaining(dueDateStr: string, now: Date): TimeRemainingCalculation {
  // Parse YYYY-MM-DD and assume Cambodian banking close at 17:00:00 ICT
  const [year, month, day] = (dueDateStr || '').split('-').map(Number);
  const targetDate = !isNaN(year) && !isNaN(month) && !isNaN(day)
    ? new Date(year, month - 1, day, 17, 0, 0)
    : new Date(now.getTime() + 86400000 * 2);

  const diffMs = targetDate.getTime() - now.getTime();
  const totalSeconds = Math.floor(diffMs / 1000);

  if (totalSeconds < 0) {
    const overdueSeconds = Math.abs(totalSeconds);
    const overdueDays = Math.floor(overdueSeconds / 86400);
    const overdueHours = Math.floor((overdueSeconds % 86400) / 3600);
    return {
      totalSeconds,
      days: overdueDays,
      hours: overdueHours,
      minutes: Math.floor((overdueSeconds % 3600) / 60),
      seconds: overdueSeconds % 60,
      isOverdue: true,
      urgency: 'OVERDUE',
      countdownText: overdueDays > 0 ? `${overdueDays}d past deadline` : `${overdueHours}h past deadline`,
      badgeLabel: overdueDays > 0 ? `Overdue (${overdueDays}D)` : 'Grace Period Expiring',
    };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days === 0) {
    return {
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      isOverdue: false,
      urgency: 'CRITICAL',
      countdownText: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`,
      badgeLabel: 'Due Today (< 24h)',
    };
  } else if (days <= 3) {
    return {
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      isOverdue: false,
      urgency: 'IMMINENT',
      countdownText: `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`,
      badgeLabel: `Due in ${days} ${days === 1 ? 'Day' : 'Days'}`,
    };
  } else if (days <= 7) {
    return {
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      isOverdue: false,
      urgency: 'UPCOMING',
      countdownText: `${days} days remaining`,
      badgeLabel: `Due in ${days} Days`,
    };
  } else {
    return {
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      isOverdue: false,
      urgency: 'LATER',
      countdownText: `${days} days out`,
      badgeLabel: `Scheduled (${days}D)`,
    };
  }
}

export const UpcomingDueTracker: React.FC<UpcomingDueTrackerProps> = ({
  loans,
  currency = 'USD',
  onViewLedger,
  onRecordPayment,
  onSendReminder,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'IMMINENT' | 'UPCOMING' | 'OVERDUE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [reminderStatusMap, setReminderStatusMap] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live countdown ticker: re-renders every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const exchangeRate = 4100;
  const fmtUSD = (amt: number) => `$${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtKHR = (amt: number) => `${Math.round(amt * exchangeRate).toLocaleString()} ៛`;

  // Enriched loan items with live time calculations
  const calculatedItems = useMemo(() => {
    return loans.map((loan) => {
      const calc = computeTimeRemaining(loan.nextScheduledPayment.dueDate, now);
      return {
        ...loan,
        calc,
      };
    });
  }, [loans, now]);

  // Summary counts
  const criticalCount = calculatedItems.filter((i) => i.calc.urgency === 'CRITICAL').length;
  const imminentCount = calculatedItems.filter((i) => i.calc.urgency === 'IMMINENT').length;
  const upcomingCount = calculatedItems.filter((i) => i.calc.urgency === 'UPCOMING').length;
  const overdueCount = calculatedItems.filter((i) => i.calc.urgency === 'OVERDUE').length;

  const totalApproachingAmountUSD = calculatedItems
    .filter((i) => i.calc.urgency !== 'LATER')
    .reduce((sum, i) => sum + (i.nextScheduledPayment.scheduledEMIUSD || 0), 0);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return calculatedItems.filter((item) => {
      // Urgency filter
      if (urgencyFilter === 'CRITICAL' && item.calc.urgency !== 'CRITICAL') return false;
      if (urgencyFilter === 'IMMINENT' && item.calc.urgency !== 'IMMINENT') return false;
      if (urgencyFilter === 'UPCOMING' && item.calc.urgency !== 'UPCOMING') return false;
      if (urgencyFilter === 'OVERDUE' && item.calc.urgency !== 'OVERDUE') return false;
      if (urgencyFilter === 'ALL' && item.calc.urgency === 'LATER') {
        // In "ALL" view, default to showing items with due dates within 14 days or overdue
        if (item.calc.days > 14) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const bName = (item.borrower.nameEn || '').toLowerCase();
        const bKh = (item.borrower.nameKh || '').toLowerCase();
        const bCode = (item.borrower.clientCode || '').toLowerCase();
        const lId = (item.loanId || '').toLowerCase();
        const phone = (item.borrower.phone || '').toLowerCase();
        return bName.includes(query) || bKh.includes(query) || bCode.includes(query) || lId.includes(query) || phone.includes(query);
      }

      return true;
    }).sort((a, b) => a.calc.totalSeconds - b.calc.totalSeconds);
  }, [calculatedItems, urgencyFilter, searchTerm]);

  const handleSendReminderClick = (loan: DueTrackingItem) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setReminderStatusMap((prev) => ({
      ...prev,
      [loan.loanId]: `Sent at ${timeStr}`,
    }));
    setToastMessage(`Repayment reminder dispatched to ${loan.borrower.nameEn} (${loan.borrower.phone})`);
    setTimeout(() => setToastMessage(null), 4000);

    if (onSendReminder) {
      onSendReminder(loan);
    }
  };

  return (
    <section className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl space-y-5 animate-fadeIn">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-mono font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Upcoming Payment Due Date & Time Tracker
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  Live Countdown Engine
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-time repayment horizon tracking borrowers with approaching maturity or installment deadlines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-[#0f172a] border border-[#1e293b] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400 text-[11px]">System Time:</span>
            <span className="text-white font-bold">{now.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Urgency Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Critical Card */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            urgencyFilter === 'CRITICAL'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/50'
              : 'bg-[#0f172a] border-[#1e293b] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-rose-400 font-mono font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Due Today (&lt; 24h)
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">{criticalCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Immediate collection priority</div>
        </div>

        {/* Imminent Card */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'IMMINENT' ? 'ALL' : 'IMMINENT')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            urgencyFilter === 'IMMINENT'
              ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/50'
              : 'bg-[#0f172a] border-[#1e293b] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-mono font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Due in 1 – 3 Days
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">{imminentCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Upcoming SMS notice sent</div>
        </div>

        {/* Upcoming Card */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            urgencyFilter === 'UPCOMING'
              ? 'bg-teal-950/40 border-teal-500/60 shadow-lg shadow-teal-950/50'
              : 'bg-[#0f172a] border-[#1e293b] hover:border-teal-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-teal-400 font-mono font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Due in 4 – 7 Days
            </span>
            <span className="w-2 h-2 rounded-full bg-teal-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">{upcomingCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Standard billing cycle</div>
        </div>

        {/* Overdue Watchlist Card */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            urgencyFilter === 'OVERDUE'
              ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/50'
              : 'bg-[#0f172a] border-[#1e293b] hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-400 font-mono font-bold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Grace / Overdue
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">{overdueCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Requires committee action</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 bg-[#0f172a] rounded-xl border border-[#1e293b]">
        {/* Urgency Pill Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setUrgencyFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              urgencyFilter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Approaching ({criticalCount + imminentCount + upcomingCount + overdueCount})
          </button>
          <button
            onClick={() => setUrgencyFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow'
                : 'text-rose-400 hover:bg-rose-950/50'
            }`}
          >
            <span>🚨 Today (&lt; 24h)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300">
              {criticalCount}
            </span>
          </button>
          <button
            onClick={() => setUrgencyFilter('IMMINENT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyFilter === 'IMMINENT'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-400 hover:bg-amber-950/50'
            }`}
          >
            <span>⚠️ 1 – 3 Days</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300">
              {imminentCount}
            </span>
          </button>
          <button
            onClick={() => setUrgencyFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyFilter === 'UPCOMING'
                ? 'bg-teal-600 text-white shadow'
                : 'text-teal-400 hover:bg-teal-950/50'
            }`}
          >
            <span>📅 4 – 7 Days</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-950 text-teal-300">
              {upcomingCount}
            </span>
          </button>
          <button
            onClick={() => setUrgencyFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              urgencyFilter === 'OVERDUE'
                ? 'bg-purple-600 text-white shadow'
                : 'text-purple-400 hover:bg-purple-950/50'
            }`}
          >
            <span>⏱️ Overdue Watch</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-300">
              {overdueCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search borrower, loan ID, phone..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0b0f17] border border-[#1e293b] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0f172a] border-b border-[#1e293b] text-slate-400 font-mono uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Borrower Info</th>
              <th className="py-3 px-4">Credit Facility</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Scheduled Amount</th>
              <th className="py-3 px-4 text-center">Countdown / Time Remaining</th>
              <th className="py-3 px-4 text-center">Reminder Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/70 font-mono">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500 text-xs font-mono">
                  No upcoming payment deadlines match the selected filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const { calc } = row;
                const emi = row.nextScheduledPayment.scheduledEMIUSD || 0;
                const reminderStatus = reminderStatusMap[row.loanId];

                // Badge styling
                let urgencyBadgeClass = '';
                let urgencyDotClass = '';
                if (calc.urgency === 'CRITICAL') {
                  urgencyBadgeClass = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                  urgencyDotClass = 'bg-rose-400 animate-ping';
                } else if (calc.urgency === 'IMMINENT') {
                  urgencyBadgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                  urgencyDotClass = 'bg-amber-400';
                } else if (calc.urgency === 'UPCOMING') {
                  urgencyBadgeClass = 'bg-teal-500/10 text-teal-300 border-teal-500/30';
                  urgencyDotClass = 'bg-teal-400';
                } else if (calc.urgency === 'OVERDUE') {
                  urgencyBadgeClass = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
                  urgencyDotClass = 'bg-purple-400 animate-pulse';
                } else {
                  urgencyBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                  urgencyDotClass = 'bg-slate-400';
                }

                return (
                  <tr key={row.loanId} className="hover:bg-[#0f172a]/70 transition">
                    {/* Borrower Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                          {row.borrower.avatarUrl ? (
                            <img
                              src={row.borrower.avatarUrl}
                              alt={row.borrower.nameEn}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            row.borrower.nameEn?.slice(0, 2).toUpperCase() || 'BO'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{row.borrower.nameEn}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({row.borrower.nameKh || ''})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-amber-400 font-bold">{row.borrower.clientCode}</span>
                            <span>•</span>
                            <span>{row.borrower.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Credit Facility */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{row.loanId}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {row.facility.productName} •{' '}
                        <span className="text-emerald-400">Cycle #{row.nextScheduledPayment.cycleNumber}</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{row.nextScheduledPayment.dueDate}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">17:00 ICT Close</div>
                    </td>

                    {/* Scheduled Amount */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-emerald-400 text-sm font-mono">
                        {fmtUSD(emi)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {fmtKHR(emi)}
                      </div>
                    </td>

                    {/* Countdown / Time Remaining */}
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-xl border ${urgencyBadgeClass}`}>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span className={`w-2 h-2 rounded-full ${urgencyDotClass}`} />
                          <span className="tracking-wider">{calc.countdownText}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5 font-bold">
                          {calc.badgeLabel}
                        </span>
                      </div>
                    </td>

                    {/* Reminder Status */}
                    <td className="py-3 px-4 text-center">
                      {reminderStatus ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {reminderStatus}
                        </span>
                      ) : calc.urgency === 'CRITICAL' ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/20 animate-pulse">
                          <BellRing className="w-3 h-3" />
                          Action Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Scheduled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSendReminderClick(row)}
                          title="Send Repayment Reminder (SMS & In-App)"
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Remind</span>
                        </button>
                        <button
                          onClick={() => onRecordPayment && onRecordPayment(row)}
                          title="Record / Confirm Repayment"
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Pay</span>
                        </button>
                        <button
                          onClick={() => onViewLedger && onViewLedger(row)}
                          title="View Facility Ledger & Dossier"
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
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
    </section>
  );
};
