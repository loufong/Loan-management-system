import React from 'react';
import { PaymentReceipt } from '../../types';
import { Printer, Download, X } from 'lucide-react';

export interface PaymentReceiptModalProps {
  receipt: PaymentReceipt;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  receipt,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="flex flex-col items-center max-h-[95vh] overflow-y-auto">
        {/* Pixel-perfect 380px Thermal POS Banking Slip */}
        <div
          id="printable-slip"
          className="w-[380px] bg-white text-slate-900 p-6 rounded-xl shadow-2xl border border-slate-200 font-mono text-xs space-y-3 print:border-none print:shadow-none print:p-0 print:w-full select-text"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            <h2 className="font-extrabold text-sm uppercase tracking-wider font-sans text-slate-900">
              APEX LMS CORE BANKING
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">
              Phnom Penh Main Branch • Building #42, Norodom Blvd
            </p>
            <p className="text-[10px] text-slate-500 font-sans">
              Hotline: (+855) 23 999 888 • NBC Licensed Core MFI
            </p>
            <div className="pt-1.5 font-bold text-xs tracking-tight uppercase text-indigo-900">
              OFFICIAL PAYMENT RECEIPT
            </div>
          </div>

          {/* Receipt Number & Metadata */}
          <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold text-slate-900">{receipt.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date &amp; Time:</span>
              <span className="text-slate-800">{receipt.paidAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier / Terminal:</span>
              <span className="text-slate-800">{receipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Channel:</span>
              <span className="text-slate-800">{receipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction Ref:</span>
              <span className="text-slate-800">{receipt.transactionRef}</span>
            </div>
          </div>

          {/* Borrower & Loan Details */}
          <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Borrower:</span>
              <span className="font-bold text-slate-900">{receipt.borrowerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Borrower ID:</span>
              <span className="text-slate-800">{receipt.borrowerId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loan Facility:</span>
              <span className="font-bold text-slate-900">{receipt.loanNumber}</span>
            </div>
            {receipt.installmentNo && (
              <div className="flex justify-between">
                <span className="text-slate-500">Installment Settled:</span>
                <span className="text-slate-800">Installment #{receipt.installmentNo}</span>
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Principal Component:</span>
              <span>${receipt.principalAllocatedUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Interest Component:</span>
              <span>${receipt.interestAllocatedUSD.toFixed(2)}</span>
            </div>
            {receipt.lateFeeAllocatedUSD > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Late Penalty Fee:</span>
                <span>${receipt.lateFeeAllocatedUSD.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 text-xs font-bold text-slate-900">
              <span>TOTAL RECEIVED (USD):</span>
              <span className="text-sm">${receipt.amountPaidUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>TOTAL RECEIVED (KHR):</span>
              <span>{new Intl.NumberFormat('km-KH').format(receipt.amountPaidKHR)} ៛</span>
            </div>
          </div>

          {/* Balance Remaining */}
          <div className="flex justify-between items-baseline py-1 text-xs font-bold text-slate-900">
            <span>BALANCE REMAINING:</span>
            <span className="text-sm font-mono text-indigo-700">
              ${receipt.outstandingBalanceAfterUSD.toFixed(2)}
            </span>
          </div>

          {/* Barcode Graphic */}
          <div className="pt-2 text-center space-y-1">
            <div className="h-9 w-full bg-slate-900 flex items-center justify-around px-3 rounded tracking-widest text-[10px] text-white">
              ||| | |||| | || ||| || |||| | ||| | |||
            </div>
            <p className="text-[9px] text-slate-400 font-mono">AUTH-{receipt.transactionRef}</p>
          </div>

          {/* Cashier Signature Line */}
          <div className="pt-4 pb-2 border-t border-dashed border-slate-300">
            <div className="flex justify-between items-end text-[10px] text-slate-500 pt-6">
              <div className="text-center">
                <div className="w-28 border-b border-slate-400 mb-1" />
                <span>Customer Signature</span>
              </div>
              <div className="text-center">
                <div className="w-28 border-b border-slate-400 mb-1" />
                <span>Cashier Signature</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-2 text-[10px] text-slate-400 font-sans leading-tight">
            <p>Thank you for banking with Apex LMS.</p>
            <p>Please retain this thermal voucher for reconciliation.</p>
          </div>
        </div>

        {/* Action Buttons Toolbar (Hidden on Print) */}
        <div className="flex items-center gap-2 mt-4 print:hidden w-[380px]">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
