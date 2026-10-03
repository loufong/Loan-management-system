import React, { useState, useMemo } from 'react';
import { Currency, LoanProduct } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  Filter
} from 'lucide-react';

export interface ReportItem {
  id: string;
  referenceNo: string;
  borrowerName: string;
  productName: string;
  branch: string;
  disbursedAmountUSD: number;
  collectedAmountUSD: number;
  outstandingAmountUSD: number;
  overdueAmountUSD: number;
  status: string;
  date: string;
}

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

  // Mock Report Dataset
  const rawReportData: ReportItem[] = [
    {
      id: '1',
      referenceNo: 'LN-2026-0042',
      borrowerName: 'Sokha Chan',
      productName: 'Personal Loan',
      branch: 'Phnom Penh Main Branch',
      disbursedAmountUSD: 6000,
      collectedAmountUSD: 2540,
      outstandingAmountUSD: 3850,
      overdueAmountUSD: 0,
      status: 'ACTIVE',
      date: '2026-04-15',
    },
    {
      id: '2',
      referenceNo: 'LN-2026-0012',
      borrowerName: 'Dara Pich',
      productName: 'Emergency Loan',
      branch: 'Phnom Penh Main Branch',
      disbursedAmountUSD: 3000,
      collectedAmountUSD: 1472,
      outstandingAmountUSD: 1600,
      overdueAmountUSD: 512,
      status: 'OVERDUE',
      date: '2026-01-10',
    },
    {
      id: '3',
      referenceNo: 'LN-2026-0088',
      borrowerName: 'Vannak Keo',
      productName: 'Business Loan',
      branch: 'Phnom Penh Main Branch',
      disbursedAmountUSD: 15000,
      collectedAmountUSD: 9050,
      outstandingAmountUSD: 8500,
      overdueAmountUSD: 0,
      status: 'ACTIVE',
      date: '2025-09-01',
    },
    {
      id: '4',
      referenceNo: 'LN-2026-0004',
      borrowerName: 'Sokha Chea',
      productName: 'Business Loan',
      branch: 'Phnom Penh Main Branch',
      disbursedAmountUSD: 12000,
      collectedAmountUSD: 4200,
      outstandingAmountUSD: 7800,
      overdueAmountUSD: 1240,
      status: 'OVERDUE',
      date: '2026-03-15',
    },
    {
      id: '5',
      referenceNo: 'LN-2026-0005',
      borrowerName: 'Bopha Roth',
      productName: 'Personal Loan',
      branch: 'Phnom Penh Main Branch',
      disbursedAmountUSD: 5000,
      collectedAmountUSD: 0,
      outstandingAmountUSD: 5000,
      overdueAmountUSD: 0,
      status: 'ACTIVE',
      date: '2026-01-10',
    },
    {
      id: '6',
      referenceNo: 'LN-2026-0009',
      borrowerName: 'Kalyan Meas',
      productName: 'Agriculture Loan',
      branch: 'Battambang Agriloan Center',
      disbursedAmountUSD: 6500,
      collectedAmountUSD: 2900,
      outstandingAmountUSD: 3600,
      overdueAmountUSD: 0,
      status: 'ACTIVE',
      date: '2026-04-18',
    },
    {
      id: '7',
      referenceNo: 'LN-2026-0014',
      borrowerName: 'Samnang Heng',
      productName: 'Vehicle Loan',
      branch: 'Sihanoukville Commercial Desk',
      disbursedAmountUSD: 18000,
      collectedAmountUSD: 9200,
      outstandingAmountUSD: 8800,
      overdueAmountUSD: 0,
      status: 'ACTIVE',
      date: '2026-02-14',
    },
  ];

  // Filter & Sort Data
  const sortedData = useMemo(() => {
    return [...rawReportData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [rawReportData, sortField, sortAsc]);

  // Summary Totals Calculation Row for Footer
  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, item) => {
        acc.sumDisbursed += item.disbursedAmountUSD;
        acc.sumRepaid += item.collectedAmountUSD;
        acc.sumOutstanding += item.outstandingAmountUSD;
        acc.sumOverdue += item.overdueAmountUSD;
        return acc;
      },
      { sumDisbursed: 0, sumRepaid: 0, sumOutstanding: 0, sumOverdue: 0 }
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
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Portfolio Reports &amp; BI Analytics
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Audited Core Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic regulatory analytics, aging schedules, and disbursement ledger with CSV/Excel exports.
          </p>
        </div>
      </div>

      {/* 2. Clean Top Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Report Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Report:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="Active Loan Portfolio Report">1. Active Loan Portfolio Report</option>
              <option value="Loan Application Pipeline Report">2. Loan Application Pipeline Report</option>
              <option value="Disbursed Loans Report">3. Disbursed Loans Report</option>
              <option value="Overdue & NPL Aging Report">4. Overdue &amp; NPL Aging Report</option>
              <option value="Daily Cashier Collections Report">5. Daily Cashier Collections Report</option>
            </select>
          </div>

          {/* Date Range Picker with Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 mr-1 whitespace-nowrap">
              Range:
            </span>
            {(['Today', 'This Week', 'This Month', 'Year to Date'] as const).map((preset) => {
              const active = datePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* Currency Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
            <button
              onClick={() => setReportCurrency('USD')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                reportCurrency === 'USD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setReportCurrency('KHR')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                reportCurrency === 'KHR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              KHR (៛)
            </button>
          </div>

          {/* Export Toolbar */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export to CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Report Data Grid: Dense Sortable Table with Totals Footer */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th
                  onClick={() => handleSort('referenceNo')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Reference #</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('borrowerName')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Borrower</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Branch</th>
                <th
                  onClick={() => handleSort('disbursedAmountUSD')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Disbursed</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('collectedAmountUSD')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Repaid</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('outstandingAmountUSD')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Outstanding</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm text-slate-700"
                >
                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-indigo-600">
                    {row.referenceNo}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {row.borrowerName}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-600">
                    {row.productName}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {row.branch}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <MoneyText
                      amount={row.disbursedAmountUSD}
                      currency={reportCurrency}
                      className="font-semibold text-slate-800"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <MoneyText
                      amount={row.collectedAmountUSD}
                      currency={reportCurrency}
                      className="font-semibold text-emerald-600"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <MoneyText
                      amount={row.outstandingAmountUSD}
                      currency={reportCurrency}
                      className="font-bold text-slate-900"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        row.status === 'ACTIVE'
                          ? 'active'
                          : row.status === 'OVERDUE'
                          ? 'overdue'
                          : 'closed'
                      }
                      dot
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                    {row.date}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals Calculation Row in Footer */}
            <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-200 text-xs text-slate-900">
              <tr>
                <td colSpan={4} className="py-3.5 px-4 font-sans uppercase tracking-wider text-[11px] text-slate-700">
                  Portfolio Totals Summary ({sortedData.length} records)
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  <MoneyText amount={totals.sumDisbursed} currency={reportCurrency} className="text-slate-900" />
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                  <MoneyText amount={totals.sumRepaid} currency={reportCurrency} className="text-emerald-700" />
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-indigo-700">
                  <MoneyText amount={totals.sumOutstanding} currency={reportCurrency} className="text-indigo-700" />
                </td>
                <td colSpan={2} className="py-3.5 px-4 text-center text-[11px] font-mono text-slate-500">
                  Reconciled
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
