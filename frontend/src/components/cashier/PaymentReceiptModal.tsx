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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
      <div className="flex flex-col items-center max-h-[95vh] overflow-y-auto">
        {/* Pixel-perfect 380px Thermal POS Banking Slip */}
        <div
          id="printable-slip"
          className="w-[380px] bg-white text-[#0F172A] p-6 rounded-[8px] shadow-xl border border-[#CBD5E1] font-mono text-xs space-y-3 print:border-none print:shadow-none print:p-0 print:w-full select-text"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-[#CBD5E1] space-y-1">
            <h2 className="font-extrabold text-base uppercase tracking-wider font-sans text-[#0F172A]">
              APEX LMS
            </h2>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-sans">
              ENTERPRISE LOAN MANAGEMENT SYSTEM
            </p>
            <div className="pt-1 font-bold text-xs tracking-widest uppercase text-[#2563EB]">
              OFFICIAL PAYMENT RECEIPT
            </div>
          </div>

          {/* Receipt Number & Metadata */}
          <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-[#CBD5E1]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Receipt No:</span>
              <span className="font-bold text-[#0F172A]">{receipt.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Date &amp; Time:</span>
              <span className="text-[#0F172A]">{receipt.paidAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Cashier / Terminal:</span>
              <span className="text-[#0F172A]">{receipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Payment Channel:</span>
              <span className="text-[#0F172A]">{receipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Transaction Ref:</span>
              <span className="text-[#0F172A]">{receipt.transactionRef}</span>
            </div>
          </div>

          {/* Borrower & Loan Details */}
          <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-[#CBD5E1]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Borrower:</span>
              <span className="font-bold text-[#0F172A]">{receipt.borrowerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Borrower ID:</span>
              <span className="text-[#0F172A]">{receipt.borrowerId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Loan Facility:</span>
              <span className="font-bold text-[#0F172A]">{receipt.loanNumber}</span>
            </div>
            {receipt.installmentNo && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Installment Settled:</span>
                <span className="text-[#0F172A]">Installment #{receipt.installmentNo}</span>
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-1.5 py-1 border-b border-dashed border-[#CBD5E1] text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Principal Component:</span>
              <span>${receipt.principalAllocatedUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Interest Component:</span>
              <span>${receipt.interestAllocatedUSD.toFixed(2)}</span>
            </div>
            {receipt.lateFeeAllocatedUSD > 0 && (
              <div className="flex justify-between text-[#DC2626] font-bold">
                <span>Late Penalty Fee:</span>
                <span>${receipt.lateFeeAllocatedUSD.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-[#CBD5E1] text-xs font-bold text-[#0F172A]">
              <span>TOTAL RECEIVED (USD):</span>
              <span className="text-sm">${receipt.amountPaidUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#64748B]">
              <span>TOTAL RECEIVED (KHR):</span>
              <span>{new Intl.NumberFormat('km-KH').format(receipt.amountPaidKHR)} ៛</span>
            </div>
          </div>

          {/* Balance Remaining */}
          <div className="flex justify-between items-baseline py-1 text-xs font-bold text-[#0F172A]">
            <span>BALANCE REMAINING:</span>
            <span className="text-sm font-mono text-[#2563EB]">
              ${receipt.outstandingBalanceAfterUSD.toFixed(2)}
            </span>
          </div>

          {/* Barcode Graphic */}
          <div className="pt-2 text-center space-y-1">
            <div className="h-8 w-full bg-[#0F172A] flex items-center justify-around px-3 rounded-[4px] tracking-widest text-[10px] text-white">
              ||| | |||| | || ||| || |||| | ||| | |||
            </div>
            <p className="text-[9px] text-[#64748B] font-mono">AUTH-{receipt.transactionRef}</p>
          </div>

          {/* Cashier Signature Line */}
          <div className="pt-4 pb-2 border-t border-dashed border-[#CBD5E1]">
            <div className="flex justify-between items-end text-[10px] text-[#64748B] pt-5">
              <div className="text-center">
                <div className="w-24 border-b border-[#CBD5E1] mb-1" />
                <span>Customer Signature</span>
              </div>
              <div className="text-center">
                <div className="w-24 border-b border-[#CBD5E1] mb-1" />
                <span>Cashier Signature</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-2 text-[10px] text-[#64748B] font-sans leading-tight">
            <p>Thank you for banking with Apex LMS.</p>
            <p>Retain this voucher for administrative audit.</p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 mt-4 print:hidden w-[380px]">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptModal;
