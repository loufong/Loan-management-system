import React, { useState, useEffect } from 'react';
import { Currency } from '../../types';

export interface KHQRPaymentModalProps {
  amountUSD: number;
  merchantName?: string;
  accountNumber?: string;
  currency?: Currency;
  onClose: () => void;
  onPaymentConfirmed: (ref: string) => void;
}

export const KHQRPaymentModal: React.FC<KHQRPaymentModalProps> = ({
  amountUSD,
  merchantName = 'Apex Core Banking',
  accountNumber = '001-8849-2019-USD',
  currency = 'USD',
  onClose,
  onPaymentConfirmed
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(299); // 04:59

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
      <div className="bg-white max-w-sm w-full rounded-[8px] p-6 space-y-4 shadow-xl text-center border border-[#CBD5E1]">
        {/* Header with KHQR Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-[4px] bg-[#DC2626] text-white font-black text-xs flex items-center justify-center tracking-tighter">
              KHQR
            </span>
            <div className="text-left">
              <span className="text-xs font-bold text-[#0F172A] block tracking-tight">National Bank of Cambodia</span>
              <span className="text-[11px] text-[#64748B] font-mono">Bakong Interbank Standard</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center text-lg font-bold"
          >
            &times;
          </button>
        </div>

        {/* Merchant Name & Dual Amount */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-[#0F172A] truncate">{merchantName}</p>
          <div className="flex items-baseline justify-center gap-2 font-mono font-bold">
            <span className="text-2xl text-[#0F172A]">${amountUSD.toFixed(2)}</span>
            <span className="text-xs text-[#64748B]">/ {new Intl.NumberFormat('km-KH').format(amountKHR)} ៛</span>
          </div>
          <p className="text-[11px] text-[#64748B] font-mono">Terminal Acc: {accountNumber}</p>
        </div>

        {/* KHQR Card Container */}
        <div className="bg-slate-50 p-4 rounded-[6px] border border-[#CBD5E1] flex flex-col items-center justify-center space-y-3">
          {/* KHQR Header */}
          <div className="w-full bg-[#DC2626] text-white py-1.5 px-3 rounded-[4px] font-bold text-xs flex items-center justify-between">
            <span className="font-mono tracking-wider">KHQR</span>
            <span className="text-[10px] opacity-95">Apex Core Banking</span>
          </div>

          {/* QR Matrix */}
          <div className="w-48 h-48 bg-white border border-[#CBD5E1] p-2.5 rounded-[6px] flex items-center justify-center relative">
            <div className="w-full h-full bg-[#0F172A] flex flex-col justify-between p-2 rounded-[4px]">
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-white border-4 border-[#0F172A] rounded-[2px]" />
                <div className="w-10 h-10 bg-white border-4 border-[#0F172A] rounded-[2px]" />
              </div>
              <div className="text-center text-[9px] font-mono text-white font-bold tracking-widest bg-[#DC2626] py-1 rounded-[2px]">
                BAKONG KHQR
              </div>
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-white border-4 border-[#0F172A] rounded-[2px]" />
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-[#0F172A]">
                  $
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
            <div className="w-2 h-2 rounded-full bg-[#D97706]" />
            <span>Valid for <strong className="font-mono text-[#0F172A]">{timeFormatted}</strong></span>
          </div>
        </div>

        {/* Demo Fast Simulator Button */}
        <button
          onClick={() => {
            const mockRef = `KHQR-BAKONG-${Date.now().toString().slice(-6)}`;
            onPaymentConfirmed(mockRef);
          }}
          className="w-full py-2.5 rounded-[6px] bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
        >
          Confirm Payment Received
        </button>
      </div>
    </div>
  );
};

export default KHQRPaymentModal;
