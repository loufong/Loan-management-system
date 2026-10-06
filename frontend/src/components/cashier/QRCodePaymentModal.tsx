import React, { useState, useEffect } from 'react';
import { Currency } from '../../types';
import { X, Clock, CheckCircle2 } from 'lucide-react';

export interface QRCodePaymentModalProps {
  amountUSD: number;
  merchantName?: string;
  accountNumber?: string;
  currency: Currency;
  onClose: () => void;
  onPaymentConfirmed: (ref: string) => void;
}

export const QRCodePaymentModal: React.FC<QRCodePaymentModalProps> = ({
  amountUSD,
  merchantName = 'Apex Microfinance Institution (Cambodia) PLC',
  accountNumber = '001-8849-2019-USD',
  currency: _currency,
  onClose,
  onPaymentConfirmed
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(299); // 4 mins 59 secs

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const amountKHR = Math.round(amountUSD * 4100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white max-w-sm w-full rounded-[8px] p-5 space-y-3.5 shadow-md text-center border border-[#CBD5E1]">
        
        {/* Header with KHQR & EMVCo Badge */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-[4px] bg-[#DC2626] text-white font-extrabold text-[10px] flex items-center justify-center tracking-tighter">
              KHQR
            </span>
            <span className="text-xs font-bold text-[#0F172A] tracking-tight">EMVCo Universal QR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Merchant & Amount Banner */}
        <div className="space-y-0.5">
          <p className="text-[11px] text-[#64748B] font-medium truncate">{merchantName}</p>
          <div className="flex items-center justify-center gap-2 font-mono font-bold">
            <span className="text-xl text-[#0F172A]">${amountUSD.toFixed(2)}</span>
            <span className="text-xs text-[#64748B]">/ {new Intl.NumberFormat('km-KH').format(amountKHR)} ៛</span>
          </div>
          <p className="text-[10px] text-[#64748B] font-mono">Bakong Interbank: {accountNumber}</p>
        </div>

        {/* Dynamic High-Contrast KHQR Code Card */}
        <div className="p-3.5 flex flex-col items-center justify-center space-y-2.5 border border-[#CBD5E1] rounded-[6px] bg-slate-50">
          {/* Header Ribbon */}
          <div className="w-full bg-[#DC2626] text-white py-1 px-2.5 rounded-[4px] font-bold text-xs flex items-center justify-between">
            <span className="font-mono tracking-wider text-[11px]">KHQR</span>
            <span className="text-[10px] opacity-90">National Bank of Cambodia</span>
          </div>

          <div className="w-44 h-44 bg-white border border-[#0F172A] p-2 rounded-[4px] flex items-center justify-center relative">
            {/* Styled Matrix Pattern */}
            <div className="w-full h-full bg-[#0F172A] flex flex-col justify-between p-2 rounded-[2px]">
              <div className="flex justify-between">
                <div className="w-9 h-9 bg-white border-4 border-[#0F172A] rounded-[2px]" />
                <div className="w-9 h-9 bg-white border-4 border-[#0F172A] rounded-[2px]" />
              </div>
              <div className="text-center text-[8px] font-mono text-white font-bold tracking-widest bg-[#DC2626] py-0.5 rounded-[2px]">
                BAKONG KHQR
              </div>
              <div className="flex justify-between">
                <div className="w-9 h-9 bg-white border-4 border-[#0F172A] rounded-[2px]" />
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-[#0F172A]">$</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Valid for <strong className="font-mono text-[#0F172A]">{timeFormatted}</strong></span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              const mockRef = `KHQR-BAKONG-${Date.now().toString().slice(-6)}`;
              onPaymentConfirmed(mockRef);
            }}
            className="w-full py-2 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Simulate Customer Scan & Payment</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Cancel Transaction
          </button>
        </div>

      </div>
    </div>
  );
};
