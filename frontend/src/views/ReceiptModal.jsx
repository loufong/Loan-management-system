import React from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';

export interface ReceiptModalProps {
  receipt: {
    receiptNumber: string;
    loanCode: string;
    borrowerName: string;
    amountPaid: number;
    currency: 'USD' | 'KHR';
    method: string;
    principalPortion?: number;
    interestPortion?: number;
    cashierName?: string;
    paymentDate?: string;
  };
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const principal = receipt.principalPortion || receipt.amountPaid * 0.85;
  const interest = receipt.interestPortion || receipt.amountPaid * 0.15;
  const currencySymbol = receipt.currency === 'KHR' ? '៛' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Actions bar (hidden during print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 print:hidden">
          <span className="text-xs font-bold text-white">80mm Thermal Receipt Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 80mm Thermal Receipt Layout */}
        <div className="p-6 bg-white text-slate-900 font-mono text-xs leading-relaxed print:p-0 print:m-0 print:w-[80mm]">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #thermal-receipt, #thermal-receipt * { visibility: visible; }
              #thermal-receipt { position: absolute; left: 0; top: 0; width: 80mm; font-size: 11px; }
            }
          `}</style>

          <div id="thermal-receipt" className="space-y-3 text-center">
            {/* Bank Header */}
            <div className="border-b border-dashed border-slate-400 pb-3">
              <h2 className="text-sm font-black tracking-tight uppercase">
                JAM SONG VICH - CORE BANKING SYSTEM
              </h2>
              <p className="text-[10px] text-slate-600">Phnom Penh Main Branch, Cambodia</p>
              <p className="text-[10px] text-slate-600">Tel: +855 23 998 844 • NBC Lic: MFI-2026-09</p>
            </div>

            {/* Official Receipt Metadata */}
            <div className="text-left space-y-1 border-b border-dashed border-slate-400 pb-2 text-[11px]">
              <div className="flex justify-between">
                <span className="font-semibold">Receipt No:</span>
                <span className="font-bold">{receipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{receipt.paymentDate || new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receipt.cashierName || 'Sophea Pich'}</span>
              </div>
            </div>

            {/* Customer & Loan Reference */}
            <div className="text-left space-y-1 border-b border-dashed border-slate-400 pb-2 text-[11px]">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{receipt.borrowerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Account:</span>
                <span className="font-bold">{receipt.loanCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span>{receipt.method}</span>
              </div>
            </div>

            {/* Itemized Breakdown */}
            <div className="text-left space-y-1.5 border-b border-dashed border-slate-400 pb-2 text-[11px]">
              <div className="flex justify-between">
                <span>Principal Repaid:</span>
                <span>{currencySymbol}{principal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interest Settled:</span>
                <span>{currencySymbol}{interest.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black border-t border-slate-300 pt-1.5">
                <span>TOTAL SETTLED:</span>
                <span className="text-sm">
                  {currencySymbol}{receipt.amountPaid.toFixed(2)} {receipt.currency}
                </span>
              </div>
            </div>

            {/* Signature Line & Verification Footer */}
            <div className="pt-4 text-center space-y-8">
              <div className="flex justify-between text-[10px] px-2">
                <div>
                  <div className="w-24 border-b border-slate-400 mx-auto mb-1" />
                  <span>Customer Signature</span>
                </div>
                <div>
                  <div className="w-24 border-b border-slate-400 mx-auto mb-1" />
                  <span>Authorized Cashier</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500">
                Thank you for banking with Jam Song Vich LMS.
                <br />
                Official NBC electronic transaction record.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
