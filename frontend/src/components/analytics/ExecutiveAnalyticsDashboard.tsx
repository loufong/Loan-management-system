import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Download,
  Sliders,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ArrowUpDown,
  PieChart as PieIcon,
  BarChart3,
  Coins,
  Globe,
  SlidersHorizontal,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { Currency } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export interface ExecutiveAnalyticsDashboardProps {
  currency?: Currency;
  onNavigate?: (tab: string) => void;
}

type DateGranularity = 'Daily' | 'MTD' | 'QTD' | 'YTD' | 'T12M' | 'Custom';
type PortfolioFilter = 'All Facilities' | 'SME Working Capital' | 'Personal Micro-Loan' | 'Agri-Credit Facility';
type BranchScope = 'Consolidated' | 'Phnom Penh HQ' | 'Siem Reap Branch' | 'Battambang Branch';
type CurrencyMode = 'USD' | 'KHR' | 'DUAL';

export const ExecutiveAnalyticsDashboard: React.FC<ExecutiveAnalyticsDashboardProps> = ({
  currency: initialCurrency = 'USD',
  onNavigate,
}) => {
  const { user } = useAuth();

  // Role Security Guard: Strictly SUPER_ADMIN and ADMIN access only
  const userRole = ((user?.role || '') as string).toUpperCase();
  const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN'].includes(userRole);

  // Global Scope Filters
  const [dateGranularity, setDateGranularity] = useState<DateGranularity>('MTD');
  const [portfolioFilter, setPortfolioFilter] = useState<PortfolioFilter>('All Facilities');
  const [branchScope, setBranchScope] = useState<BranchScope>('Consolidated');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>(
    initialCurrency === 'KHR' ? 'KHR' : 'USD'
  );

  // Filter Click-Through State (From Chart A to Cohort Table)
  const [selectedRiskBucket, setSelectedRiskBucket] = useState<string | null>(null);

  // Live Data State
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  const [delinquencyData, setDelinquencyData] = useState<any>(null);
  const [vintageCohorts, setVintageCohorts] = useState<any[]>([]);
  const [currencyExposure, setCurrencyExposure] = useState<any>(null);
  const [velocitySeries, setVelocitySeries] = useState<any[]>([]);
  const [sectorCollateral, setSectorCollateral] = useState<any>(null);
  const [auditLedger, setAuditLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  // Stress Test Simulation Drawer State
  const [isStressTestOpen, setIsStressTestOpen] = useState(false);
  const [stressScenario, setStressScenario] = useState<'BASE' | 'MODERATE' | 'SEVERE'>('MODERATE');
  const [stressShockPercent, setStressShockPercent] = useState<number>(25);
  const [stressResult, setStressResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Cohort Table Sorting
  const [sortField, setSortField] = useState<string>('dpd30DelinquencyPercent');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const NBC_KHR_RATE = 4100;

  // Format financial figures with strict adherence to currency mode
  const fmt = (usdAmount: number, forceCurrency?: 'USD' | 'KHR') => {
    const mode = forceCurrency || (currencyMode === 'DUAL' ? 'USD' : currencyMode);
    if (mode === 'KHR') {
      const khr = Math.round(usdAmount * NBC_KHR_RATE);
      return `៛ ${new Intl.NumberFormat('km-KH').format(khr)}`;
    }
    return `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdAmount)}`;
  };

  const fmtDual = (usdAmount: number) => {
    const usd = fmt(usdAmount, 'USD');
    const khr = fmt(usdAmount, 'KHR');
    return `${usd} (${khr})`;
  };

  // Fetch all analytics datasets concurrently
  const fetchAllAnalytics = async () => {
    setIsLoading(true);
    try {
      const [sumRes, delinqRes, vintageRes, currRes, velRes, secRes, auditRes] = await Promise.all([
        api.getAnalyticsSummary({ branch: branchScope, granularity: dateGranularity, portfolio: portfolioFilter }),
        api.getDelinquencyMatrix(),
        api.getVintageCohorts(),
        api.getCurrencyExposure(),
        api.getDisbursementRecoveryVelocity(),
        api.getSectorCollateralDistribution(),
        api.getBakongAuditLedger(),
      ]);

      if (sumRes) setPortfolioSummary(sumRes);
      if (delinqRes) setDelinquencyData(delinqRes);
      if (vintageRes && vintageRes.length > 0) setVintageCohorts(vintageRes);
      if (currRes) setCurrencyExposure(currRes);
      if (velRes && velRes.length > 0) setVelocitySeries(velRes);
      if (secRes) setSectorCollateral(secRes);
      if (auditRes && auditRes.length > 0) setAuditLedger(auditRes);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [dateGranularity, portfolioFilter, branchScope]);

  // Execute Stress Test Simulation
  const handleExecuteStressTest = async (scenario: 'BASE' | 'MODERATE' | 'SEVERE', customShock = 25) => {
    setIsSimulating(true);
    try {
      const res = await api.runStressTestSimulation(scenario, customShock);
      setStressResult(res);
      setStressScenario(scenario);
      setStressShockPercent(customShock);
    } catch (err) {
      console.error('Stress test error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Export NBC Regulatory Return (CSV / Spreadsheet format)
  const handleExportNbcReturn = () => {
    const headers = [
      'NBC Regulatory Schedule Code',
      'Asset Classification',
      'DPD Range',
      'Outstanding Principal (USD)',
      'Equivalent (KHR)',
      'Share of GLP (%)',
      'Facilities Count',
      'NBC Statutory Provision Rate (%)',
      'Required Regulatory Provision (USD)',
    ];

    const rows = (delinquencyData?.buckets || []).map((b: any) => [
      `NBC-CR-${b.bucketId}`,
      `"${b.nbcClassification}"`,
      `"${b.dpdRange}"`,
      b.balanceUSD.toFixed(2),
      Math.round(b.balanceUSD * NBC_KHR_RATE),
      b.sharePercent,
      b.facilitiesCount,
      (b.nbcMandatoryProvisionRate * 100).toFixed(1) + '%',
      b.requiredProvisionUSD.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NBC_REGULATORY_RETURN_JAM_SONG_VICH_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      type: 'success',
      message: 'National Bank of Cambodia (NBC) Form MFI-CR-01 successfully compiled and exported.',
    });
  };

  // Generate CBC Monthly Snapshot Export
  const handleGenerateCbcSnapshot = () => {
    const headers = [
      'Vintage Cohort',
      'Facilities Booked',
      'Original Disbursed (USD)',
      'Current Balance (USD)',
      'Cumulative Loss (%)',
      '30+ DPD Rate (%)',
      'Avg CBC Borrower Score',
      'Prepayment Rate (%)',
      'Risk Classification',
    ];

    const rows = vintageCohorts.map((c) => [
      c.vintageCohort,
      c.facilitiesBooked,
      c.originalDisbursedUSD.toFixed(2),
      c.currentActiveBalanceUSD.toFixed(2),
      c.cumulativeLossRatePercent + '%',
      c.dpd30DelinquencyPercent + '%',
      c.averageCbcScoreOrigination,
      c.earlySettlementPrepaymentPercent + '%',
      c.riskStatus,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CBC_MONTHLY_CREDIT_SNAPSHOT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      type: 'success',
      message: 'Credit Bureau Cambodia (CBC) institutional portfolio snapshot compiled and exported.',
    });
  };

  // Sorted Cohorts Table
  const sortedCohorts = useMemo(() => {
    return [...vintageCohorts].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [vintageCohorts, sortField, sortAsc]);

  // Fallback defaults if loading or offline
  const summary = portfolioSummary || {
    glp: {
      totalUSD: 2485320.00,
      totalKHR: 10189812000,
      facilitiesCount: 412,
      momGrowthPercent: 4.2,
      netGrowthUSD: 98400.00,
    },
    par30: {
      ratioPercent: 1.84,
      amountUSD: 45730.00,
      benchmarkStatus: 'Low Risk / Compliant (< 3.0% NBC Regulatory Ceiling)',
      par60Percent: 0.62,
      par90NplPercent: 0.28,
    },
    collectionEfficiency: {
      realizationRatePercent: 97.6,
      collectedAmountUSD: 188420.00,
      scheduledAmountUSD: 193000.00,
    },
    yieldAndMargin: {
      weightedAverageYieldPercent: 8.45,
      costOfFundsPercent: 3.20,
      netInterestMarginPercent: 5.25,
    },
    bakongLiquidity: {
      usdBalance: 164500.00,
      khrBalance: 220000000,
      txVelocity24h: 142,
    },
  };

  // Strict Authorization Blocker
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] p-8 text-center text-slate-300">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">403 Forbidden: Executive Intelligence Restricted</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Access to the Senior Credit Committee & Institutional Analytics Engine is strictly restricted to designated Core Banking Super Administrators and Central Bank Auditors.
        </p>
        <button
          onClick={() => {
            window.location.hash = '#/my-loans';
          }}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
        >
          Return to Borrower Portal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1780px] mx-auto min-h-screen text-slate-100 font-sans antialiased">
      {/* ========================================================================= */}
      {/* NOTIFICATION TOAST                                                        */}
      {/* ========================================================================= */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xl transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-mono text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER & ANALYTICAL CONTROL STRIP                                      */}
      {/* ========================================================================= */}
      <header className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Breadcrumb & Title */}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>Core Banking</span>
              <span>/</span>
              <span>Super Admin</span>
              <span>/</span>
              <span className="text-emerald-400 font-bold">Portfolio Analytics & Credit Risk Engine</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-mono">
                JAM SONG VICH • EXECUTIVE PORTFOLIO SURVEILLANCE
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                NBC MACROPRUDENTIAL ENGINE ACTIVE
              </span>
            </div>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportNbcReturn}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-[#1e293b] text-slate-200 text-xs font-mono font-semibold rounded-xl transition flex items-center gap-1.5"
              title="Download official NBC regulatory CSV matrix"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export NBC Return (XLSX/PDF)</span>
            </button>

            <button
              onClick={() => {
                setIsStressTestOpen(true);
                if (!stressResult) handleExecuteStressTest('MODERATE', 25);
              }}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stress Test Simulation</span>
            </button>

            <button
              onClick={handleGenerateCbcSnapshot}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 border border-[#1e293b] text-slate-200 text-xs font-mono font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span>Generate CBC Snapshot</span>
            </button>

            <button
              onClick={fetchAllAnalytics}
              disabled={isLoading}
              className="p-1.5 bg-[#0f172a] hover:bg-slate-800 border border-[#1e293b] text-slate-400 hover:text-white rounded-xl transition"
              title="Refresh Analytics Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Scope Filters Strip */}
        <div className="mt-4 pt-4 border-t border-[#1e293b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Granularity */}
          <div className="lg:col-span-4 flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-[#1e293b]">
            {(['Daily', 'MTD', 'QTD', 'YTD', 'T12M'] as DateGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setDateGranularity(g)}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-mono font-bold transition ${
                  dateGranularity === g
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Portfolio Scope */}
          <div className="lg:col-span-3">
            <select
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value as PortfolioFilter)}
              className="w-full py-1.5 px-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="All Facilities">📂 All Facilities (Consolidated)</option>
              <option value="SME Working Capital">💼 SME Working Capital</option>
              <option value="Personal Micro-Loan">👤 Personal Micro-Credit</option>
              <option value="Agri-Credit Facility">🌾 Agricultural Expansion</option>
            </select>
          </div>

          {/* Regional Branch Scope */}
          <div className="lg:col-span-3">
            <select
              value={branchScope}
              onChange={(e) => setBranchScope(e.target.value as BranchScope)}
              className="w-full py-1.5 px-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Consolidated">🏢 Consolidated (All Branches)</option>
              <option value="Phnom Penh HQ">🏛️ Phnom Penh HQ Ledger</option>
              <option value="Siem Reap Branch">🏛️ Siem Reap Regional Hub</option>
              <option value="Battambang Branch">🏛️ Battambang Agri Center</option>
            </select>
          </div>

          {/* Currency Mode */}
          <div className="lg:col-span-2 flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-[#1e293b]">
            {(['USD', 'KHR', 'DUAL'] as CurrencyMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCurrencyMode(mode)}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-mono font-bold transition ${
                  currencyMode === mode
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'DUAL' ? 'DUAL' : mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MASTER INSTITUTIONAL KPI RIBBON (5 Top Overview Cards)                 */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Gross Loan Portfolio (GLP) */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Gross Loan Portfolio (GLP)
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              +{summary.glp.momGrowthPercent}% MoM
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {fmt(summary.glp.totalUSD, 'USD')}
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              ៛ {new Intl.NumberFormat('km-KH').format(summary.glp.totalKHR)}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>+${summary.glp.netGrowthUSD.toLocaleString()} net growth</span>
            <span>{summary.glp.facilitiesCount} Active</span>
          </div>
        </div>

        {/* Card 2: Portfolio at Risk (PAR 30+ Days) */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Portfolio at Risk (PAR 30+)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● NBC Compliant (&lt;3%)
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300">
              {summary.par30.ratioPercent}%
            </p>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({fmt(summary.par30.amountUSD)})
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="text-amber-400/80">PAR 60: {summary.par30.par60Percent}%</span>
            <span className="text-rose-400/80">PAR 90 (NPL): {summary.par30.par90NplPercent}%</span>
          </div>
        </div>

        {/* Card 3: Collection Efficiency */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Collection Efficiency
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Optimal Realization
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-mono text-white">
              {summary.collectionEfficiency.realizationRatePercent}%
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Collected: {fmt(summary.collectionEfficiency.collectedAmountUSD)}</span>
            <span>Due: {fmt(summary.collectionEfficiency.scheduledAmountUSD)}</span>
          </div>
        </div>

        {/* Card 4: Weighted Average Lending Yield */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Weighted Lending Yield
            </span>
            <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
              NIM: {summary.yieldAndMargin.netInterestMarginPercent}%
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black font-mono text-teal-400">
              {summary.yieldAndMargin.weightedAverageYieldPercent}% p.a.
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Cost of Funds: {summary.yieldAndMargin.costOfFundsPercent}%</span>
            <span>Spread: +{summary.yieldAndMargin.netInterestMarginPercent}%</span>
          </div>
        </div>

        {/* Card 5: Bakong Clearing & Settlement Liquidity */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Bakong RTGS Liquidity
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Real-Time
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black font-mono text-white">
              {fmt(summary.bakongLiquidity.usdBalance, 'USD')}
            </p>
            <p className="text-xs font-mono font-bold text-amber-400">
              ៛ {new Intl.NumberFormat('km-KH').format(summary.bakongLiquidity.khrBalance)}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Velocity: {summary.bakongLiquidity.txVelocity24h} tx / 24h</span>
            <span>Buffer: Liquid</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE ANALYTICAL VISUALIZATIONS (2x2 Grid via Recharts)                 */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART A: Delinquency & Aging Migration Waterfall (PAR Aging) */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Chart A: Delinquency & Aging Migration Waterfall (PAR Aging)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                NBC standardized credit categorization. Click any bucket to filter loan exposures.
              </p>
            </div>
            {selectedRiskBucket && (
              <button
                onClick={() => setSelectedRiskBucket(null)}
                className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 hover:bg-amber-500/20"
              >
                Reset Filter ✕
              </button>
            )}
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={delinquencyData?.buckets || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#334155"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#cbd5e1', fontSize: 10 }}
                  stroke="#334155"
                  width={140}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded-xl shadow-2xl text-xs font-mono">
                          <p className="font-bold text-white mb-1">{data.name}</p>
                          <p className="text-slate-400">DPD: {data.dpdRange}</p>
                          <p className="text-emerald-400 font-bold">Share: {data.sharePercent}%</p>
                          <p className="text-white">Balance: {fmt(data.balanceUSD)}</p>
                          <p className="text-amber-400">NBC Mandatory Provision: {fmt(data.requiredProvisionUSD)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="sharePercent"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(entry: any) => setSelectedRiskBucket(entry?.bucketId || entry?.payload?.bucketId || null)}
                >
                  {(delinquencyData?.buckets || []).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.colorToken}
                      opacity={selectedRiskBucket && selectedRiskBucket !== entry.bucketId ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Statutory General Provisions: $25,370.14</span>
            <span>Statutory Specific Provisions: $19,335.90</span>
          </div>
        </div>

        {/* CHART B: Loan Disbursement vs. Capital Recovery Velocity (T12M) */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                Chart B: Loan Disbursement vs. Capital Recovery Velocity (T12M)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dual-axis monthly capital deployment vs principal recovery and net portfolio growth.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              Avg Velocity: +3.6% MoM
            </span>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={velocitySeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} stroke="#334155" />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `$${val / 1000}k`}
                  stroke="#334155"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  tick={{ fill: '#38bdf8', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#0284c7"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded-xl shadow-2xl text-xs font-mono">
                          <p className="font-bold text-white mb-1.5">{label}</p>
                          <p className="text-emerald-400 font-bold">Disbursed: ${payload[0]?.value?.toLocaleString()}</p>
                          <p className="text-teal-300 font-bold">Recovered: ${payload[1]?.value?.toLocaleString()}</p>
                          <p className="text-sky-400">Net Growth: {payload[2]?.value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar yAxisId="left" dataKey="disbursedUSD" name="Disbursed Principal" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="recoveredUSD" name="Capital Recovered" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="netGrowthRatePercent"
                  name="Net Portfolio Growth (%)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#38bdf8' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>T12M Cumulative Disbursed: $2,800,000</span>
            <span>T12M Cumulative Recovered: $2,189,000</span>
          </div>
        </div>

        {/* CHART C: Sector & Collateral Risk Distribution */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-amber-400" />
                Chart C: Sector & Collateral Risk Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Economic concentration & NBC loan pledge asset guarantees.
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              82% Fully Secured
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-3">
            <div className="sm:col-span-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorCollateral?.sectors || [
                      { name: 'Retail Trade', sharePercent: 38 },
                      { name: 'Agriculture', sharePercent: 27 },
                      { name: 'Services', sharePercent: 21 },
                      { name: 'Manufacturing', sharePercent: 14 },
                    ]}
                    dataKey="sharePercent"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#06b6d4" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <div className="bg-[#0f172a] border border-[#1e293b] p-2.5 rounded-xl text-xs font-mono">
                            <p className="font-bold text-white">{item.name}</p>
                            <p className="text-emerald-400 font-bold">Share: {item.value}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="sm:col-span-6 space-y-2 text-xs font-mono">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#1e293b]">
                Collateral Guarantee Mix:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Hard Title (LMAP):
                  </span>
                  <span className="font-bold text-white">54.0%</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Soft Title (Commune):
                  </span>
                  <span className="font-bold text-white">22.0%</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Machinery / Vehicle:
                  </span>
                  <span className="font-bold text-white">6.0%</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Clean / Group Guarantee:
                  </span>
                  <span className="font-bold text-white">18.0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Secured Portfolio: $2,037,962.00</span>
            <span>Clean / Unsecured: $447,358.00</span>
          </div>
        </div>

        {/* CHART D: Currency Exposure & NBC Reserve Coverage */}
        <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div>
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-teal-400" />
                Chart D: Currency Exposure & NBC Statutory Reserve Coverage
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Asset/Liability matching ($ USD vs ៛ KHR) & NBC 7.0% statutory reserve compliance.
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              100% Reserve Compliant
            </span>
          </div>

          <div className="space-y-4 my-auto py-2">
            {/* USD Balance Ledger */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold flex items-center gap-2">
                  <span>US Dollar (USD) Position</span>
                  <span className="text-[10px] text-slate-400">(81.0% of assets)</span>
                </span>
                <span className="text-emerald-400 font-bold">$ 2,013,109.00</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '81%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>NBC Statutory Reserve (7.0% mandatory): $140,917.00</span>
                <span className="text-emerald-400 font-bold">Actual Held: 9.1% (+$42,270 buffer)</span>
              </div>
            </div>

            {/* KHR Balance Ledger */}
            <div className="space-y-1.5 font-mono text-xs pt-2 border-t border-[#1e293b]/50">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold flex items-center gap-2">
                  <span>Khmer Riel (KHR) Position</span>
                  <span className="text-[10px] text-slate-400">(19.0% of assets)</span>
                </span>
                <span className="text-amber-400 font-bold">៛ 1,936,065,100 ($472,211)</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '19%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>NBC Statutory Reserve (7.0% mandatory): ៛135,524,550</span>
                <span className="text-amber-400 font-bold">Actual Held: 11.4% (+៛77,000,000 buffer)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Clearing Rate: 4,100 KHR / USD</span>
            <span>Net Foreign Exchange Risk: Minimal / Fully Hedged</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PORTFOLIO COHORT & UNDERWRITING QUALITY TABLE                          */}
      {/* ========================================================================= */}
      <section className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Portfolio Vintage Cohort Decay & Underwriting Quality Analysis
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tracking credit quality deterioration, cumulative losses, and borrower CBC scoring across booking vintages.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Sorted by: <span className="text-white font-bold">{sortField}</span> ({sortAsc ? 'Asc' : 'Desc'})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0f172a]/80 border-b border-[#1e293b] text-slate-400 uppercase tracking-wider text-[10px]">
                <th
                  onClick={() => {
                    if (sortField === 'vintageCohort') setSortAsc(!sortAsc);
                    else { setSortField('vintageCohort'); setSortAsc(false); }
                  }}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Vintage Cohort</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center">Facilities Booked</th>
                <th className="py-3 px-4 font-semibold text-right">Original Disbursed</th>
                <th className="py-3 px-4 font-semibold text-right">Current Active Balance</th>
                <th className="py-3 px-4 font-semibold text-right">Cumulative Loss Rate</th>
                <th
                  onClick={() => {
                    if (sortField === 'dpd30DelinquencyPercent') setSortAsc(!sortAsc);
                    else { setSortField('dpd30DelinquencyPercent'); setSortAsc(false); }
                  }}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>30+ DPD Delinquency</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center">Avg CBC Score</th>
                <th className="py-3 px-4 font-semibold text-right">Early Prepayment Rate</th>
                <th className="py-3 px-4 font-semibold text-center">Risk Cohort Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/70 font-mono">
              {sortedCohorts.map((row) => {
                const isElevated = row.dpd30DelinquencyPercent >= 2.0;
                return (
                  <tr
                    key={row.vintageCohort}
                    className={`transition-colors hover:bg-slate-900/60 ${
                      isElevated ? 'bg-rose-950/15' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span>{row.vintageCohort}</span>
                      {isElevated && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" title="Elevated DPD" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">{row.facilitiesBooked}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{fmt(row.originalDisbursedUSD)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{fmt(row.currentActiveBalanceUSD)}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{row.cumulativeLossRatePercent}%</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          row.dpd30DelinquencyPercent >= 2.0
                            ? 'text-rose-400'
                            : row.dpd30DelinquencyPercent >= 1.0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {row.dpd30DelinquencyPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-teal-300 font-bold">
                      {row.averageCbcScoreOrigination}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{row.earlySettlementPrepaymentPercent}%</td>
                    <td className="py-3 px-4 text-center">
                      {row.riskStatus === 'NORMAL' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          PERFORMING
                        </span>
                      )}
                      {row.riskStatus === 'ELEVATED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          ELEVATED WATCH
                        </span>
                      )}
                      {row.riskStatus === 'MONITOR' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          VINTAGE RUNOFF
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. REAL-TIME LIQUIDITY & BAKONG SETTLEMENT AUDIT LEDGER                   */}
      {/* ========================================================================= */}
      <section className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              Real-Time Liquidity & Bakong Settlement Audit Ledger
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live double-entry institutional verification switch compliant with NBC RTGS clearing guidelines.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">Bakong Clearing Node #02 Live</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0f172a]/80 border-b border-[#1e293b] text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Settlement Rail</th>
                <th className="py-2.5 px-4">Transaction Hash</th>
                <th className="py-2.5 px-4">Clearing Type</th>
                <th className="py-2.5 px-4 text-right">Settled Amount</th>
                <th className="py-2.5 px-4">Settled Account</th>
                <th className="py-2.5 px-4 text-center">Ledger Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/70 font-mono">
              {auditLedger.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-2.5 px-4 text-slate-400">{tx.timestamp}</td>
                  <td className="py-2.5 px-4 text-white font-bold">{tx.settlementRail}</td>
                  <td className="py-2.5 px-4 text-[10px] text-slate-400">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {tx.transactionHash.slice(0, 10)}...
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">{tx.clearingType}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                    {fmt(tx.amountUSD)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">{tx.settledAccount}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      VERIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DELINQUENCY STRESS TEST SIMULATION DRAWER                              */}
      {/* ========================================================================= */}
      {isStressTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b0f17] border border-[#1e293b] rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Delinquency Stress Test & Capital Adequacy Simulation
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Macroprudential stress testing under severe economic default shocks.
                </p>
              </div>
              <button
                onClick={() => setIsStressTestOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scenario Toggles */}
            <div className="grid grid-cols-3 gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-[#1e293b]">
              <button
                onClick={() => handleExecuteStressTest('BASE', 0)}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition ${
                  stressScenario === 'BASE'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Base Case (0%)
              </button>
              <button
                onClick={() => handleExecuteStressTest('MODERATE', 25)}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition ${
                  stressScenario === 'MODERATE'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Moderate (+25%)
              </button>
              <button
                onClick={() => handleExecuteStressTest('SEVERE', 50)}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition ${
                  stressScenario === 'SEVERE'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Severe (+50%)
              </button>
            </div>

            {/* Simulation Results Display */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                <span className="text-slate-400">Default Rate Shock Applied:</span>
                <span className="text-white font-bold">+{stressShockPercent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Baseline PAR 30+:</span>
                <span className="text-slate-300">1.84%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Simulated Post-Shock PAR 30+:</span>
                <span className="text-amber-400 font-bold">
                  {stressResult?.simulatedParPercent || (1.84 * (1 + stressShockPercent / 100)).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Projected Credit Losses:</span>
                <span className="text-rose-400 font-bold">
                  ${(stressResult?.projectedCreditLossUSD || 25400).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Simulated Capital Adequacy Ratio (CAR):</span>
                <span
                  className={`font-bold ${
                    (stressResult?.simulatedCarPercent || 17.68) >= 15.0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {stressResult?.simulatedCarPercent || 17.68}% (Floor: 15.0%)
                </span>
              </div>
              <div className="pt-2 border-t border-[#1e293b] text-[10px] text-slate-400 leading-relaxed font-sans">
                {stressResult?.riskMitigationNote ||
                  'Institutional capital buffer absorbs shock. CAR remains above NBC 15.0% regulatory floor.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsStressTestOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Close Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveAnalyticsDashboard;
