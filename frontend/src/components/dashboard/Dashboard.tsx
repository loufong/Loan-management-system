import React, { useState } from 'react';
import { Currency } from '../../types';
import {
  Wallet,
  TrendingUp,
  AlertOctagon,
  FileCheck2,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  UserPlus,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';

export interface DashboardProps {
  currency: Currency;
  onNavigate: (tabId: string) => void;
  onOpenNewBorrower?: () => void;
  onOpenNewApplication?: () => void;
  onOpenQuickPayment?: (loanId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currency,
  onNavigate,
  onOpenNewBorrower,
  onOpenNewApplication,
  onOpenQuickPayment
}) => {
  const [selectedBranch, setSelectedBranch] = useState('Phnom Penh Main Branch');
  const [timeframe, setTimeframe] = useState<'6M' | 'YTD' | '1Y'>('6M');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Currency multiplier helper (1 USD = 4,100 KHR)
  const rate = 4100;
  const formatMoney = (usdVal: number, curr = currency) => {
    if (curr === 'KHR') {
      const khr = usdVal * rate;
      return new Intl.NumberFormat('km-KH', {
        style: 'currency',
        currency: 'KHR',
        maximumFractionDigits: 0
      }).format(khr);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(usdVal);
  };

  const formatShortNumber = (usdVal: number) => {
    if (currency === 'KHR') {
      const khr = usdVal * rate;
      return `${(khr / 1_000_000).toFixed(1)}M ៛`;
    }
    return `$${Math.round(usdVal / 1000)}k`;
  };

  // 6-Month Historical Data for Disbursement vs Collection
  const historicalCashflow = [
    { month: 'May', fullMonth: 'May 2026', disbursedUSD: 142000, collectedUSD: 128000 },
    { month: 'Jun', fullMonth: 'Jun 2026', disbursedUSD: 168000, collectedUSD: 139000 },
    { month: 'Jul', fullMonth: 'Jul 2026', disbursedUSD: 195000, collectedUSD: 164000 },
    { month: 'Aug', fullMonth: 'Aug 2026', disbursedUSD: 210000, collectedUSD: 175000 },
    { month: 'Sep', fullMonth: 'Sep 2026', disbursedUSD: 225000, collectedUSD: 184500 },
    { month: 'Oct', fullMonth: 'Oct 2026 (Est)', disbursedUSD: 240000, collectedUSD: 195000 }
  ];

  // Portfolio Breakdown by Product
  const productDistribution = [
    { name: 'Business Loan', percentage: 42, color: 'bg-indigo-600', dot: 'bg-indigo-600', valUSD: 1041810 },
    { name: 'Personal Loan', percentage: 28, color: 'bg-sky-500', dot: 'bg-sky-500', valUSD: 694540 },
    { name: 'Agriculture Loan', percentage: 18, color: 'bg-emerald-500', dot: 'bg-emerald-500', valUSD: 446490 },
    { name: 'Emergency Loan', percentage: 12, color: 'bg-amber-500', dot: 'bg-amber-500', valUSD: 297660 }
  ];

  // Urgent Overdue Accounts
  const overdueWatchlist = [
    {
      id: 'od-1',
      loanId: 'loan-2',
      loanNumber: 'LN-2026-0042',
      borrowerName: 'Sokha Chea',
      borrowerPhone: '+855-12-889-102',
      installmentNo: 3,
      daysOverdue: 38,
      severity: 'RED',
      overdueAmountUSD: 1240.0
    },
    {
      id: 'od-2',
      loanId: 'loan-5',
      loanNumber: 'LN-2026-0089',
      borrowerName: 'Vanna Rath',
      borrowerPhone: '+855-98-332-901',
      installmentNo: 2,
      daysOverdue: 24,
      severity: 'ORANGE',
      overdueAmountUSD: 850.0
    },
    {
      id: 'od-3',
      loanId: 'loan-7',
      loanNumber: 'LN-2026-0112',
      borrowerName: 'Dara Chan',
      borrowerPhone: '+855-77-665-219',
      installmentNo: 1,
      daysOverdue: 19,
      severity: 'ORANGE',
      overdueAmountUSD: 420.0
    },
    {
      id: 'od-4',
      loanId: 'loan-9',
      loanNumber: 'LN-2026-0145',
      borrowerName: 'Kalyan Meas',
      borrowerPhone: '+855-15-778-992',
      installmentNo: 4,
      daysOverdue: 11,
      severity: 'YELLOW',
      overdueAmountUSD: 310.0
    },
    {
      id: 'od-5',
      loanId: 'loan-12',
      loanNumber: 'LN-2026-0178',
      borrowerName: 'Bopha Pich',
      borrowerPhone: '+855-88-112-445',
      installmentNo: 2,
      daysOverdue: 6,
      severity: 'YELLOW',
      overdueAmountUSD: 290.0
    }
  ];

  // Recent Activity Timeline
  const recentActivities = [
    { id: 'act-1', time: '3 mins ago', actor: 'Cashier Emily Ross', text: 'recorded $511.25 payment on LN-2026-0001 (Johnathan Doe)', type: 'PAYMENT' },
    { id: 'act-2', time: '18 mins ago', actor: 'Manager Marcus Vance', text: 'approved $15,000.00 Personal Loan for Dr. Robert Taylor', type: 'APPROVAL' },
    { id: 'act-3', time: '42 mins ago', actor: 'Credit Officer Dr. Chen', text: 'submitted Low-Risk underwriting recommendation for APP-2026-0002', type: 'REVIEW' },
    { id: 'act-4', time: '1 hr ago', actor: 'Automated Overdue Engine', text: 'executed daily cron scan (1 account flagged as OVERDUE)', type: 'OVERDUE' },
    { id: 'act-5', time: '2 hrs ago', actor: 'Cashier Emily Ross', text: 'disbursed $3,000.00 via Bank Transfer to Student Account *4892', type: 'DISBURSEMENT' }
  ];

  // Max value for chart scaling (250k ceiling)
  const chartMaxVal = 250000;
  const yTicks = [240000, 180000, 120000, 60000, 0];

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          3. Page Header & Action Bar
          ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational snapshot as of Sep 21, 2026
          </p>
        </div>

        {/* Action Group: Unified border, font, and button aesthetics */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Selector: Ghost select dropdown */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-3 py-2 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer pr-8"
            >
              <option>Phnom Penh Main Branch</option>
              <option>Siem Reap Regional Office</option>
              <option>Battambang Agriloan Center</option>
              <option>Sihanoukville Commercial Desk</option>
            </select>
          </div>

          {/* Secondary Action: + New Borrower */}
          <button
            type="button"
            onClick={onOpenNewBorrower}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Borrower</span>
          </button>

          {/* Secondary Action: Record Payment */}
          <button
            type="button"
            onClick={() => onOpenQuickPayment?.()}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Record Payment</span>
          </button>

          {/* Primary Action: + New Application */}
          <button
            type="button"
            onClick={onOpenNewApplication}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-xs transition flex items-center gap-1.5 font-semibold"
          >
            <span>+</span>
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards (Uniform Grid with 3D Elevation Tokens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Active Portfolio */}
        <div className="card-3d-floating p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Active Portfolio
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          {/* Middle Row */}
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            {formatMoney(2480500.0)}
          </div>
          {/* Bottom Row */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <span className="text-xs text-slate-500 font-medium">428 active accounts</span>
            <span className="badge-3d-emerald flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              <span>+12.4% MoM</span>
            </span>
          </div>
        </div>

        {/* Card 2: Monthly Collection */}
        <div className="card-3d-floating p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Monthly Collection
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          {/* Middle Row */}
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            {formatMoney(184500.0)}
          </div>
          {/* Bottom Row */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <span className="text-xs text-slate-500 font-medium">Target: {formatMoney(220000.0)}</span>
            <span className="badge-3d-emerald text-[11px]">
              83.8% target
            </span>
          </div>
        </div>

        {/* Card 3: PAR 30+ Risk */}
        <div className="card-3d-floating p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              PAR 30+ Risk
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          {/* Middle Row */}
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            {formatMoney(36800.0)}
          </div>
          {/* Bottom Row */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <span className="text-xs text-slate-500 font-medium">Cap limit: &lt; 3.0%</span>
            <span className="badge-3d-emerald text-[11px]">
              1.48% PAR
            </span>
          </div>
        </div>

        {/* Card 4: Application Pipeline */}
        <div className="card-3d-floating p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Application Pipeline
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          {/* Middle Row */}
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
            14 Pending
          </div>
          {/* Bottom Row */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
            <span className="text-xs text-slate-500 font-medium">7 ready for committee</span>
            <span className="badge-3d-amber text-[11px]">
              82.5% Approved
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          5. Refactored Charts Section (2 Columns: 60% / 40%)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: Cashflow Trends (Disbursements vs. Collections) - 60% (col-span-7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Monthly Capital Cashflow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                6-Month Historical Disbursements vs Collections
              </p>
            </div>

            {/* Controls: Legend Pills + Timeframe Selector */}
            <div className="flex items-center gap-3">
              {/* Legend Pills */}
              <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span>Disbursed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Collected</span>
                </span>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 text-xs font-medium text-slate-600">
                {(['6M', 'YTD', '1Y'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      timeframe === t
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clean Vertical Grouped Double-Bar Chart */}
          <div className="relative pt-4">
            
            {/* Chart Canvas Area */}
            <div className="h-60 relative w-full">
              
              {/* Subtle Horizontal Gridlines & Y-Axis Labels */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((tickVal, i) => (
                  <div key={i} className="flex items-center w-full">
                    <span className="w-12 text-[10px] font-mono text-slate-400 tabular-nums text-right pr-2 select-none">
                      {formatShortNumber(tickVal)}
                    </span>
                    <div className="flex-1 border-b border-slate-100"></div>
                  </div>
                ))}
              </div>

              {/* Grouped Vertical Bars Container */}
              <div className="absolute inset-0 ml-14 flex items-end justify-around px-2 z-10">
                {historicalCashflow.map((item, idx) => {
                  const disbHeightPct = Math.min(100, Math.max(12, Math.round((item.disbursedUSD / chartMaxVal) * 100)));
                  const collHeightPct = Math.min(100, Math.max(12, Math.round((item.collectedUSD / chartMaxVal) * 100)));
                  const isHovered = hoveredBarIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer max-w-[72px]"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Floating Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute -top-12 z-30 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                          <p className="font-semibold text-slate-200">{item.fullMonth}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono">
                            <span className="text-indigo-400">Disb: {formatMoney(item.disbursedUSD)}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-emerald-400">Coll: {formatMoney(item.collectedUSD)}</span>
                          </div>
                        </div>
                      )}

                      {/* Side-by-side grouped bars with rounded-t-[4px] */}
                      <div className="flex items-end gap-1.5 w-full justify-center h-full pb-0.5">
                        {/* Disbursed Bar (Indigo) */}
                        <div
                          style={{ height: `${disbHeightPct}%` }}
                          className={`w-3.5 sm:w-4 bg-indigo-600 rounded-t-[4px] transition-all duration-300 shadow-sm ${
                            isHovered ? 'bg-indigo-500 scale-y-[1.02]' : 'hover:bg-indigo-500'
                          }`}
                        ></div>

                        {/* Collected Bar (Emerald) */}
                        <div
                          style={{ height: `${collHeightPct}%` }}
                          className={`w-3.5 sm:w-4 bg-emerald-500 rounded-t-[4px] transition-all duration-300 shadow-sm ${
                            isHovered ? 'bg-emerald-400 scale-y-[1.02]' : 'hover:bg-emerald-400'
                          }`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* X-Axis Month Labels */}
            <div className="ml-14 flex items-center justify-between px-2 pt-2 border-t border-slate-200/80 text-xs font-medium text-slate-500">
              {historicalCashflow.map((item, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <span className={hoveredBarIndex === idx ? 'text-slate-900 font-semibold' : ''}>
                    {item.month}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right Card: Portfolio Distribution by Product - 40% (col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="pb-2 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Portfolio by Product
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Weighted Risk &amp; Asset Allocation
              </p>
            </div>

            {/* Visual: Sleek Segmented Horizontal Progress Bar */}
            <div className="my-5">
              <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
                <span>Asset Composition</span>
                <span className="font-mono font-medium text-slate-700">100% Allocation</span>
              </div>
              <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-slate-100/80 shadow-inner">
                {productDistribution.map((p, i) => (
                  <div
                    key={i}
                    className={`${p.color} transition-all duration-300`}
                    style={{ width: `${p.percentage}%` }}
                    title={`${p.name}: ${p.percentage}%`}
                  ></div>
                ))}
              </div>
            </div>

            {/* List: 4 Clean Rows (Business, Personal, Agriculture, Emergency) */}
            <div className="space-y-3 pt-1">
              {productDistribution.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${p.dot} flex-shrink-0`}></span>
                    <span className="font-medium text-slate-700 truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatMoney(p.valUSD)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums w-10 text-right">
                      {p.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Callout Note */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px] text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-700">Microfinance regulatory rule:</span> Agricultural and Business lending must represent at least 50% of outstanding loan assets.
          </div>
        </div>

      </div>

      {/* =========================================================================
          Overdue Watchlist & Live Core Banking Activity Feed
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Overdue Watchlist (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Urgent Delinquency &amp; Overdue Watchlist</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                5 High Priority
              </span>
            </div>
            <button
              onClick={() => onNavigate('overdue')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
            >
              View All &rarr;
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-3">Borrower</th>
                  <th className="py-2.5 px-3">Loan #</th>
                  <th className="py-2.5 px-3">Days Late</th>
                  <th className="py-2.5 px-3">Overdue Amt</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueWatchlist.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{acc.borrowerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{acc.borrowerPhone}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                      {acc.loanNumber}
                      <span className="block text-[10px] text-slate-400">Inst #{acc.installmentNo}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        acc.severity === 'RED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : acc.severity === 'ORANGE'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {acc.daysOverdue} Days Late
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-rose-600 tabular-nums">
                      {formatMoney(acc.overdueAmountUSD)}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => alert(`Triggered automated SMS reminder to ${acc.borrowerName}`)}
                        className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium border border-slate-200 transition shadow-xs"
                      >
                        Notify
                      </button>
                      <button
                        onClick={() => onOpenQuickPayment?.(acc.loanId)}
                        className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition shadow-xs"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Core Banking Activity Feed (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Live Core Banking Activity Feed</h3>
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    act.type === 'PAYMENT' ? 'bg-emerald-500' :
                    act.type === 'APPROVAL' ? 'bg-indigo-600' :
                    act.type === 'OVERDUE' ? 'bg-rose-500' :
                    'bg-slate-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 leading-snug">
                      <span className="font-semibold text-slate-900">{act.actor}</span> {act.text}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Immutable Audit Trail Verified • Socket Sync ID: #SY-8921
          </div>
        </div>

      </div>

    </div>
  );
};
