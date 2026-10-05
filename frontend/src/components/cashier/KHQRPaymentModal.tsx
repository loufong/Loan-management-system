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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="bg-white max-w-sm w-full rounded-xl p-6 space-y-4 shadow-2xl text-center border border-slate-200">
        {/* Header with Official Red KHQR Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center tracking-tighter shadow-xs">
              KHQR
            </span>
            <div className="text-left">
              <span className="text-xs font-black text-slate-900 block tracking-tight">National Bank of Cambodia</span>
              <span className="text-[10px] text-slate-400 font-mono">Bakong Interbank Standard</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-lg font-bold"
          >
            &times;
          </button>
        </div>

        {/* Merchant Name & Dual Amount */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-700 truncate">{merchantName}</p>
          <div className="flex items-baseline justify-center gap-2 font-mono font-black">
            <span className="text-3xl text-slate-900">${amountUSD.toFixed(2)}</span>
            <span className="text-sm text-slate-400">/ {new Intl.NumberFormat('km-KH').format(amountKHR)} ៛</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Terminal Acc: {accountNumber}</p>
        </div>

        {/* Flat High-Contrast KHQR Card Container with Red Header */}
        <div className="bg-slate-50 p-4 rounded-xl border-2 border-red-500/30 flex flex-col items-center justify-center space-y-3">
          {/* Official Red KHQR Header */}
          <div className="w-full bg-red-600 text-white py-1.5 px-3 rounded-lg font-black text-xs flex items-center justify-between shadow-xs">
            <span className="font-mono tracking-wider">KHQR</span>
            <span className="text-[10px] font-sans opacity-95">Apex Core Banking</span>
          </div>

          {/* Authentic QR Matrix representation */}
          <div className="w-48 h-48 bg-white border-2 border-slate-900 p-2.5 rounded-xl flex items-center justify-center shadow-sm relative">
            <div className="w-full h-full bg-slate-900 flex flex-col justify-between p-2 rounded-lg">
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded-md"></div>
                <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded-md"></div>
              </div>
              <div className="text-center text-[9px] font-mono text-white font-bold tracking-widest bg-red-600 py-1 rounded shadow-xs">
                BAKONG KHQR
              </div>
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded-md"></div>
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 shadow-xs">
                  $
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Valid for <strong className="font-mono text-slate-900">{timeFormatted}</strong></span>
          </div>
        </div>

        {/* Demo Fast Simulator Button */}
        <button
          type="button"
          onClick={() => {
            const mockRef = `KHQR-BAKONG-${Date.now().toString().slice(-6)}`;
            onPaymentConfirmed(mockRef);
          }}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <span>Simulate Customer Payment Received</span>
        </button>
      </div>
    </div>
  );
};
