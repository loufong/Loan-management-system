import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  Building2,
  Coins,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { Currency } from '../../types';

export interface ReportsViewProps {
  currency?: Currency;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currency: initialCurrency = 'USD'
}) => {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedOfficer, setSelectedOfficer] = useState('All Officers');
  const [dateRange, setDateRange] = useState({ start: '2026-10-01', end: '2026-10-31' });

  // Portfolio Aging Buckets Data
  const agingBuckets = [
    {
      label: 'Current (0 days)',
      khLabel: 'ទាន់ពេលវេលា',
      balanceUSD: 1620000,
      count: 1140,
      percentage: 90.8,
      color: 'bg-emerald-500',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      label: '1 - 30 days (PAR 30)',
      khLabel: 'ហួសកំណត់ ១-៣០ថ្ងៃ',
      balanceUSD: 72000,
      count: 48,
      percentage: 4.0,
      color: 'bg-amber-400',
      badgeClass: 'text-amber-300 bg-amber-500/10 border-amber-500/20'
    },
    {
      label: '31 - 60 days (PAR 60)',
      khLabel: 'ហួសកំណត់ ៣១-៦០ថ្ងៃ',
      balanceUSD: 36000,
      count: 18,
      percentage: 2.0,
      color: 'bg-orange-500',
      badgeClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    },
    {
      label: '90+ days (Default Risk)',
      khLabel: 'ហានិភ័យបាត់បង់ (៩០+)',
      balanceUSD: 56250,
      count: 12,
      percentage: 3.2,
      color: 'bg-rose-500',
      badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    }
  ];

  const totalPortfolioUSD = agingBuckets.reduce((sum, b) => sum + b.balanceUSD, 0);

  const handleExportCSV = () => {
    alert('Exporting Portfolio Aging Breakdown to CSV...');
  };

  const handlePrintAuditSheet = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Reporting & Portfolio Health Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Portfolio at Risk (PAR) stratification, aging buckets, and compliance audit reports.
          </p>
        </div>

        {/* Data Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintAuditSheet}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
          >
            <Printer className="w-4 h-4" />
            <span>Print Monthly Audit Sheet</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Date Range Picker */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Date Range Picker
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
              <span className="text-slate-500">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          {/* Loan Officer Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Loan Officer Filter
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option>All Officers</option>
              <option>Officer Sophea Pich</option>
              <option>Officer Dara Rath</option>
              <option>Officer Vannak Heng</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Branch Filter
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            >
              <option>All Branches</option>
              <option>Phnom Penh Main Branch</option>
              <option>Siem Reap Regional</option>
              <option>Battambang Branch</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Currency Filter
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`flex-1 py-1 rounded-lg font-bold transition ${
                  currency === 'USD' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('KHR')}
                className={`flex-1 py-1 rounded-lg font-bold transition ${
                  currency === 'KHR' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                KHR (៛)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PORTFOLIO AGING BUCKETS (HORIZONTAL BAR & CARD GRID) */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Portfolio Aging Buckets & Risk Delinquency
        </h2>

        {/* Stacked Horizontal Visualization Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Portfolio Quality Distribution</span>
            <span className="text-white font-mono font-bold">Total: <CurrencyDisplay amount={totalPortfolioUSD} currency={currency} /></span>
          </div>

          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
            {agingBuckets.map(b => (
              <div
                key={b.label}
                style={{ width: `${b.percentage}%` }}
                className={`${b.color} transition-all duration-500 hover:opacity-90`}
                title={`${b.label}: ${b.percentage}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400">
            {agingBuckets.map(b => (
              <div key={b.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                <span>{b.label}: <strong className="text-white">{b.percentage}%</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agingBuckets.map(b => (
            <div
              key={b.label}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white truncate">{b.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${b.badgeClass}`}>
                  {b.percentage}%
                </span>
              </div>

              <div className="text-xl font-black text-white font-mono tracking-tight mt-1">
                <CurrencyDisplay amount={b.balanceUSD} currency={currency} />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Active Accounts:</span>
                <span className="text-slate-200 font-bold">{b.count} loans</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
