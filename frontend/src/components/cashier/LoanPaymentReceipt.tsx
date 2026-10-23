import React, { useState } from 'react';
import {
  Printer,
  Receipt,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  Building2,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';

export interface PaymentReceiptData {
  receiptNo: string; // e.g. REC-20261024-0042
  dateTime: string;
  branchAddress: string;
  borrowerNameEn: string;
  borrowerNameKh: string;
  loanAccountId: string;
  principalPaidUSD: number;
  interestPaidUSD: number;
  penaltyPaidUSD: number;
  totalPaidUSD: number;
  previousBalanceUSD: number;
  remainingPrincipalBalanceUSD: number;
  nextInstallmentDueDate: string;
  cashierName: string;
  paymentMethod: string;
}

export interface LedgerItem {
  id: string;
  receiptNo: string;
  date: string;
  principalPaidUSD: number;
  interestPaidUSD: number;
  penaltyPaidUSD: number;
  totalPaidUSD: number;
  balanceAfterUSD: number;
  paymentMethod: string;
  cashierName: string;
}

export interface LoanPaymentReceiptProps {
  receipt?: PaymentReceiptData;
  pastLedger?: LedgerItem[];
  onPrint?: () => void;
}

export const LoanPaymentReceipt: React.FC<LoanPaymentReceiptProps> = ({
  receipt = {
    receiptNo: 'REC-20261024-9981',
    dateTime: '24 Oct 2026, 10:45 AM',
    branchAddress: 'Building 128, Norodom Blvd, Sangkat Tonle Bassac, Khan Chamkarmon, Phnom Penh',
    borrowerNameEn: 'Sokha Chan',
    borrowerNameKh: 'ចាន់ សុខា',
    loanAccountId: 'LN-BKK-0081',
    principalPaidUSD: 396.12,
    interestPaidUSD: 63.38,
    penaltyPaidUSD: 0.00,
    totalPaidUSD: 459.50,
    previousBalanceUSD: 3816.62,
    remainingPrincipalBalanceUSD: 3420.50,
    nextInstallmentDueDate: '2026-11-24',
    cashierName: 'Teller Sophea Pich',
    paymentMethod: 'Bakong KHQR'
  },
  pastLedger = [
    {
      id: 'led-1',
      receiptNo: 'REC-20261024-9981',
      date: '2026-10-24 10:45',
      principalPaidUSD: 396.12,
      interestPaidUSD: 63.38,
      penaltyPaidUSD: 0,
      totalPaidUSD: 459.50,
      balanceAfterUSD: 3420.50,
      paymentMethod: 'Bakong KHQR',
      cashierName: 'Teller Sophea Pich'
    },
    {
      id: 'led-2',
      receiptNo: 'REC-20260924-8120',
      date: '2026-09-24 14:15',
      principalPaidUSD: 390.27,
      interestPaidUSD: 69.23,
      penaltyPaidUSD: 0,
      totalPaidUSD: 459.50,
      balanceAfterUSD: 3816.62,
      paymentMethod: 'Cash',
      cashierName: 'Teller Dara Rath'
    },
    {
      id: 'led-3',
      receiptNo: 'REC-20260824-7041',
      date: '2026-08-24 11:30',
      principalPaidUSD: 384.50,
      interestPaidUSD: 75.00,
      penaltyPaidUSD: 0,
      totalPaidUSD: 459.50,
      balanceAfterUSD: 4206.89,
      paymentMethod: 'Bank Transfer',
      cashierName: 'Teller Sophea Pich'
    }
  ],
  onPrint
}) => {
  const [activeTab, setActiveTab] = useState<'receipt' | 'ledger'>('receipt');
  const [selectedReceiptForPreview, setSelectedReceiptForPreview] = useState<PaymentReceiptData>(receipt);

  const handleTriggerPrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Print CSS for Thermal 80mm & A4 Slip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pos-thermal-receipt, #pos-thermal-receipt * {
            visibility: visible;
          }
          #pos-thermal-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 12px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header and Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800 no-print">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            Printable Receipt & Payment Ledger History
          </h1>
          <p className="text-xs text-slate-400">
            Standard 80mm POS thermal slip format and complete audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('receipt')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'receipt' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Thermal Receipt Slip
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'ledger' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Payment Ledger Tab
            </button>
          </div>

          {activeTab === 'receipt' && (
            <button
              onClick={handleTriggerPrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print 80mm Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: 80MM POS THERMAL RECEIPT VIEW */}
      {activeTab === 'receipt' && (
        <div className="flex justify-center">
          <div
            id="pos-thermal-receipt"
            className="w-full max-w-sm bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-300 font-mono text-xs"
          >
            {/* Institution Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
              <h2 className="text-base font-black tracking-wider text-slate-950 uppercase font-sans">
                JAM SONG VICH
              </h2>
              <p className="text-[11px] font-bold text-slate-700 tracking-tight">
                CORE BANKING SYSTEM (ប្រព័ន្ធគ្រប់គ្រងឥណទាន)
              </p>
              <p className="text-[9px] text-slate-500 leading-tight">
                {selectedReceiptForPreview.branchAddress}
              </p>
              <div className="inline-block mt-1 px-2 py-0.5 border border-slate-900 rounded text-[10px] font-bold uppercase">
                Official Repayment Voucher
              </div>
            </div>

            {/* Metadata */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-600">Receipt No:</span>
                <span className="font-bold text-slate-900">{selectedReceiptForPreview.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date/Time:</span>
                <span>{selectedReceiptForPreview.dateTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Customer:</span>
                <span className="font-bold text-slate-900">
                  {selectedReceiptForPreview.borrowerNameEn} ({selectedReceiptForPreview.borrowerNameKh})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Loan Account:</span>
                <span className="font-bold">{selectedReceiptForPreview.loanAccountId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Payment Channel:</span>
                <span className="font-bold">{selectedReceiptForPreview.paymentMethod}</span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="py-2.5 space-y-1.5 border-b-2 border-slate-900 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Principal Paid:</span>
                <span className="font-bold">${selectedReceiptForPreview.principalPaidUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Interest Paid:</span>
                <span className="font-bold">${selectedReceiptForPreview.interestPaidUSD.toFixed(2)}</span>
              </div>
              {selectedReceiptForPreview.penaltyPaidUSD > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Penalty / Late Fee:</span>
                  <span className="font-bold">${selectedReceiptForPreview.penaltyPaidUSD.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-300 font-sans">
                <span className="text-xs font-bold uppercase">Total Paid:</span>
                <span className="text-base font-black">${selectedReceiptForPreview.totalPaidUSD.toFixed(2)}</span>
              </div>
            </div>

            {/* Balances */}
            <div className="py-2 bg-slate-50 -mx-6 px-6 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Previous Balance:</span>
                <span>${selectedReceiptForPreview.previousBalanceUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-950">
                <span>Remaining Principal:</span>
                <span className="text-xs font-black">${selectedReceiptForPreview.remainingPrincipalBalanceUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Next Due Date:</span>
                <span className="font-semibold text-slate-900">{selectedReceiptForPreview.nextInstallmentDueDate}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-6 pb-2 grid grid-cols-2 gap-4 text-center text-[10px]">
              <div>
                <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                <span className="text-slate-600 block">Cashier Signature</span>
                <span className="font-bold text-slate-900">{selectedReceiptForPreview.cashierName}</span>
              </div>
              <div>
                <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                <span className="text-slate-600 block">Customer Signature</span>
                <span className="font-bold text-slate-900">ហត្ថលេខាអតិថិជន</span>
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-400 pt-3 border-t border-dashed border-slate-300">
              Please keep this thermal receipt for your financial records. Thank you!
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LEDGER TABLE */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Loan Repayment Ledger & Audit Trail (ប្រវត្តិបង់ប្រាក់)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every past transaction settled for facility {receipt.loanAccountId}.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-700">
              {pastLedger.length} Payments Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Interest</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pastLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {row.receiptNo}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      ${row.principalPaidUSD.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                      ${row.interestPaidUSD.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ${row.totalPaidUSD.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-400">
                      ${row.balanceAfterUSD.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {row.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                      {row.cashierName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedReceiptForPreview({
                            ...receipt,
                            receiptNo: row.receiptNo,
                            dateTime: row.date,
                            principalPaidUSD: row.principalPaidUSD,
                            interestPaidUSD: row.interestPaidUSD,
                            penaltyPaidUSD: row.penaltyPaidUSD,
                            totalPaidUSD: row.totalPaidUSD,
                            remainingPrincipalBalanceUSD: row.balanceAfterUSD,
                            cashierName: row.cashierName,
                            paymentMethod: row.paymentMethod
                          });
                          setActiveTab('receipt');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition"
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanPaymentReceipt;
