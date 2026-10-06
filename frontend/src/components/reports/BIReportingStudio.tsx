import React, { useState, useMemo } from 'react';
import { Currency, LoanProduct } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  Download,
  FileSpreadsheet,
  Printer,
  ArrowUpDown
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
      date: '2026-08-01',
    },
  ];

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Financial Reports &amp; Portfolio BI
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
              Audited Core Ledger
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Regulatory financial statements, aging portfolio analysis, and collections reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Control & Filter Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-[8px] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Report Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#0F172A] whitespace-nowrap">
              Report Type:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="h-9 px-3 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="Active Loan Portfolio Report">Active Loan Portfolio Report</option>
              <option value="Loan Application Pipeline Report">Loan Application Pipeline Report</option>
              <option value="Disbursed Loans Report">Disbursed Loans Report</option>
              <option value="Overdue & NPL Aging Report">Overdue &amp; NPL Aging Report</option>
              <option value="Daily Cashier Collections Report">Daily Cashier Collections Report</option>
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-[6px] border border-[#CBD5E1]">
            <span className="text-xs font-semibold text-[#64748B] px-2 whitespace-nowrap">
              Range:
            </span>
            {(['Today', 'This Week', 'This Month', 'Year to Date'] as const).map((preset) => {
              const active = datePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1 text-xs rounded-[4px] transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#0F172A] font-bold shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* Currency Switcher */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-[6px] border border-[#CBD5E1]">
            <button
              onClick={() => setReportCurrency('USD')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-[4px] transition-colors ${
                reportCurrency === 'USD'
                  ? 'bg-white text-[#0F172A] font-bold shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setReportCurrency('KHR')}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-[4px] transition-colors ${
                reportCurrency === 'KHR'
                  ? 'bg-white text-[#0F172A] font-bold shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              KHR (៛)
            </button>
          </div>
        </div>
      </div>

      {/* Point 20: Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-[8px]">
          <span className="text-[11px] font-semibold uppercase text-[#64748B] block">Disbursed Total</span>
          <MoneyText amount={totals.disbursed} currency={reportCurrency} className="text-xl font-bold text-[#0F172A] block mt-1" />
        </div>
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-[8px]">
          <span className="text-[11px] font-semibold uppercase text-[#64748B] block">Collected Total</span>
          <MoneyText amount={totals.collected} currency={reportCurrency} className="text-xl font-bold text-[#16A34A] block mt-1" />
        </div>
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-[8px]">
          <span className="text-[11px] font-semibold uppercase text-[#64748B] block">Outstanding Balance</span>
          <MoneyText amount={totals.outstanding} currency={reportCurrency} className="text-xl font-bold text-[#2563EB] block mt-1" />
        </div>
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-[8px]">
          <span className="text-[11px] font-semibold uppercase text-[#64748B] block">Overdue Risk</span>
          <MoneyText amount={totals.overdue} currency={reportCurrency} className="text-xl font-bold text-[#DC2626] block mt-1" />
        </div>
      </div>

      {/* 3. Report Data Grid */}
      <div className="overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white">
        <div className="overflow-x-auto">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('referenceNo')}
                  className="cursor-pointer hover:text-[#0F172A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Reference #</span>
                    <ArrowUpDown className="w-3 h-3 text-[#64748B]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('borrowerName')}
                  className="cursor-pointer hover:text-[#0F172A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Borrower</span>
                    <ArrowUpDown className="w-3 h-3 text-[#64748B]" />
                  </div>
                </th>
                <th>Product</th>
                <th>Branch</th>
                <th
                  onClick={() => handleSort('disbursedAmountUSD')}
                  className="text-right cursor-pointer hover:text-[#0F172A]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Disbursed</span>
                    <ArrowUpDown className="w-3 h-3 text-[#64748B]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('collectedAmountUSD')}
                  className="text-right cursor-pointer hover:text-[#0F172A]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Repaid</span>
                    <ArrowUpDown className="w-3 h-3 text-[#64748B]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('outstandingAmountUSD')}
                  className="text-right cursor-pointer hover:text-[#0F172A]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Outstanding</span>
                    <ArrowUpDown className="w-3 h-3 text-[#64748B]" />
                  </div>
                </th>
                <th className="text-center">Status</th>
                <th>Disbursement Date</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="font-mono font-bold text-[#2563EB]">
                    {row.referenceNo}
                  </td>
                  <td className="font-bold text-[#0F172A]">
                    {row.borrowerName}
                  </td>
                  <td className="text-xs text-[#64748B]">{row.productName}</td>
                  <td className="text-xs text-[#64748B]">{row.branch}</td>
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
            <tfoot className="bg-slate-50 font-bold border-t border-[#CBD5E1]">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-[#0F172A] uppercase text-xs">
                  Portfolio Aggregate Total
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
