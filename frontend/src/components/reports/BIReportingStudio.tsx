import React, { useState, useMemo, useEffect } from 'react';
import { Currency, LoanProduct } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useReports, ReportItem } from '../../hooks/useReports';
import {
  Download,
  FileSpreadsheet,
  Printer,
  ArrowUpDown,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export type { ReportItem };

export interface BIReportingStudioProps {
  products: LoanProduct[];
  currency: Currency;
}

// Utility: Export array of objects to standard CSV
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers
      .map((header) => {
        const val = obj[header];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(',')
  );
  const csvContent =
    'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const BIReportingStudio: React.FC<BIReportingStudioProps> = ({
  products,
  currency: initialCurrency
}) => {
  const { t } = useLanguage();
  const { user: authUser, profile } = useAuth();
  const currentUser = profile || authUser;

  const currentRole = (currentUser?.role || '').toLowerCase();
  const isAllowedStaff = ['admin', 'manager', 'accountant'].includes(currentRole);

  // Top Control Bar State
  const [reportType, setReportType] = useState<
    | 'Active Loan Portfolio Report'
    | 'Loan Application Pipeline Report'
    | 'Disbursed Loans Report'
    | 'Overdue & NPL Aging Report'
    | 'Daily Cashier Collections Report'
  >('Active Loan Portfolio Report');

  const [datePreset, setDatePreset] = useState<'Today' | 'This Week' | 'This Month' | 'Year to Date'>('This Month');
  const [reportCurrency, setReportCurrency] = useState<Currency>(initialCurrency);

  // Sorting
  const [sortField, setSortField] = useState<keyof ReportItem>('outstandingAmountUSD');
  const [sortAsc, setSortAsc] = useState(false);

  // Isolated Report Query Hook:
  // Strictly checks currentUser.role and appends .eq('borrower_id', currentUser.id) if borrower
  const { reports: rawReportData, isLoading, error } = useReports({ reportType });

  // Route Access Guard: If a borrower attempts to visit /admin/reports, immediately redirect to /my-loans
  useEffect(() => {
    if (!isAllowedStaff && typeof window !== 'undefined') {
      window.location.replace('/my-loans');
    }
  }, [isAllowedStaff]);

  if (!isAllowedStaff) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-3 animate-pulse" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Administrative reports are restricted to administrators, managers, and accountants. Redirecting to your customer portal (/my-loans)...
        </p>
      </div>
    );
  }

  const sortedData = useMemo(() => {
    return [...rawReportData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }, [rawReportData, sortField, sortAsc]);

  // Aggregate Totals
  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, item) => ({
        disbursed: acc.disbursed + item.disbursedAmountUSD,
        collected: acc.collected + item.collectedAmountUSD,
        outstanding: acc.outstanding + item.outstandingAmountUSD,
        overdue: acc.overdue + item.overdueAmountUSD,
      }),
      { disbursed: 0, collected: 0, outstanding: 0, overdue: 0 }
    );
  }, [sortedData]);

  const handleSort = (field: keyof ReportItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(sortedData, `apex_report_${reportType.toLowerCase().replace(/\s+/g, '_')}`);
  };

  const handleExportExcel = () => {
    handleExportCSV();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {t('Financial Reports & Portfolio BI')}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#E2E8F0]">
              {t('Audited Core Ledger')}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t('Regulatory financial statements, aging portfolio analysis, and collections reconciliation.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-[6px] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16A34A] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[6px] transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-[6px] transition-colors cursor-pointer shadow-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('Print Report')}</span>
          </button>
        </div>
      </div>

      {/* 2. Control & Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Report Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#0F172A] whitespace-nowrap">
              {t('Report Type:')}
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="h-9 px-3 text-xs font-semibold bg-white border border-[#E2E8F0] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="Active Loan Portfolio Report">{t('Active Loan Portfolio Report')}</option>
              <option value="Loan Application Pipeline Report">{t('Loan Application Pipeline Report')}</option>
              <option value="Disbursed Loans Report">{t('Disbursed Loans Report')}</option>
              <option value="Overdue & NPL Aging Report">{t('Overdue & NPL Aging Report')}</option>
              <option value="Daily Cashier Collections Report">{t('Daily Cashier Collections Report')}</option>
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[6px] border border-[#E2E8F0]">
            {(['Today', 'This Week', 'This Month', 'Year to Date'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDatePreset(preset)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-all cursor-pointer ${
                  datePreset === preset
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {t(preset)}
              </button>
            ))}
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[6px] border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setReportCurrency('USD')}
              className={`px-3 py-1 text-xs font-bold rounded-[4px] transition cursor-pointer ${
                reportCurrency === 'USD'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setReportCurrency('KHR')}
              className={`px-3 py-1 text-xs font-bold rounded-[4px] transition cursor-pointer ${
                reportCurrency === 'KHR'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              KHR (៛)
            </button>
          </div>
        </div>
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            {t('Total Disbursed')}
          </span>
          <div className="text-xl font-bold font-mono text-[#0F172A] mt-1">
            <MoneyText amount={totals.disbursed} currency={reportCurrency} />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            {t('Total Principal Collected')}
          </span>
          <div className="text-xl font-bold font-mono text-[#16A34A] mt-1">
            <MoneyText amount={totals.collected} currency={reportCurrency} />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            {t('Outstanding Portfolio Balance')}
          </span>
          <div className="text-xl font-bold font-mono text-[#2563EB] mt-1">
            <MoneyText amount={totals.outstanding} currency={reportCurrency} />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-4">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            {t('Overdue Portfolio at Risk')}
          </span>
          <div className="text-xl font-bold font-mono text-[#DC2626] mt-1">
            <MoneyText amount={totals.overdue} currency={reportCurrency} />
          </div>
        </div>
      </div>

      {/* 4. Report Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F172A]">{t(reportType)}</span>
            <span className="text-[11px] font-mono text-[#64748B]">
              ({sortedData.length} records)
            </span>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating ledger records...</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-4 cursor-pointer select-none" onClick={() => handleSort('referenceNo')}>
                  <div className="flex items-center gap-1">
                    <span>{t('Ref No')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-2.5 px-4 cursor-pointer select-none" onClick={() => handleSort('borrowerName')}>
                  <div className="flex items-center gap-1">
                    <span>{t('Borrower Name')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-2.5 px-4">{t('Product')}</th>
                <th className="py-2.5 px-4">{t('Branch')}</th>
                <th className="py-2.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('disbursedAmountUSD')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('Disbursed')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('collectedAmountUSD')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('Collected')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right cursor-pointer select-none" onClick={() => handleSort('outstandingAmountUSD')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('Outstanding')}</span>
                    <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-center">{t('Status')}</th>
                <th className="py-2.5 px-4">{t('Date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sortedData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-mono font-bold text-[#0F172A]">{row.referenceNo}</td>
                  <td className="font-semibold text-[#0F172A]">{row.borrowerName}</td>
                  <td className="text-[#64748B]">{row.productName}</td>
                  <td className="text-[#64748B]">{row.branch}</td>
                  <td className="text-right font-mono font-bold text-[#0F172A]">
                    <MoneyText amount={row.disbursedAmountUSD} currency={reportCurrency} />
                  </td>
                  <td className="text-right font-mono font-bold text-[#16A34A]">
                    <MoneyText amount={row.collectedAmountUSD} currency={reportCurrency} />
                  </td>
                  <td className="text-right font-mono font-bold text-[#2563EB]">
                    <MoneyText amount={row.outstandingAmountUSD} currency={reportCurrency} />
                  </td>
                  <td className="text-center">
                    <Badge variant={row.status} dot size="xs">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs text-[#64748B]">{row.date}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-[#E2E8F0]">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-[#0F172A] uppercase text-xs">
                  {t('Portfolio Aggregate Total')}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-[#0F172A]">
                  <MoneyText amount={totals.disbursed} currency={reportCurrency} />
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-[#16A34A]">
                  <MoneyText amount={totals.collected} currency={reportCurrency} />
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-[#2563EB]">
                  <MoneyText amount={totals.outstanding} currency={reportCurrency} />
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BIReportingStudio;
