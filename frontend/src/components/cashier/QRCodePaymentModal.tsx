import React, { useState, useEffect } from 'react';
import { Currency } from '../../types';

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
  currency,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white max-w-sm w-full rounded-xl p-6 space-y-4 shadow-2xl text-center border border-slate-200">
        
        {/* Header with KHQR & EMVCo Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-extrabold text-xs flex items-center justify-center tracking-tighter">
              KHQR
            </span>
            <span className="text-xs font-extrabold text-slate-800 tracking-tight">EMVCo Universal QR</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">&times;</button>
        </div>

        {/* Merchant & Amount Banner */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium truncate">{merchantName}</p>
          <div className="flex items-center justify-center gap-2 font-mono font-black">
            <span className="text-2xl text-slate-900">${amountUSD.toFixed(2)}</span>
            <span className="text-sm text-slate-400">/ {new Intl.NumberFormat('km-KH').format(amountKHR)} ៛</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Bakong Interbank Account: {accountNumber}</p>
        </div>

        {/* Dynamic High-Contrast KHQR Code Card with Red Ribbon */}
        <div className="banking-card p-4 flex flex-col items-center justify-center space-y-3 border-rose-200">
          {/* Authentic Cambodian KHQR Red Header Ribbon */}
          <div className="w-full bg-red-600 text-white py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-between shadow-xs">
            <span className="font-mono tracking-wider">KHQR</span>
            <span className="text-[10px] font-sans opacity-90">National Bank of Cambodia</span>
          </div>

          <div className="w-48 h-48 bg-white border-2 border-slate-900 p-2 rounded-xl flex items-center justify-center shadow-inner relative">
            {/* Styled Matrix Pattern */}
            <div className="w-full h-full bg-slate-900 flex flex-col justify-between p-2 rounded-lg">
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded"></div>
                <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded"></div>
              </div>
              <div className="text-center text-[9px] font-mono text-white font-bold tracking-widest bg-red-600 py-1 rounded shadow-xs">
                BAKONG KHQR
              </div>
              <div className="flex justify-between">
                <div className="w-10 h-10 bg-white border-4 border-slate-900 rounded"></div>
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900">$</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <svg className="w-3.5 h-3.5 text-amber-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Scan with any Banking App &bull; Valid for <strong className="font-mono text-slate-900">{timeFormatted}</strong></span>
          </div>
        </div>

        {/* Demo Fast Simulator Button */}
        <button
          onClick={() => {
            const mockRef = `KHQR-BAKONG-${Date.now().toString().slice(-6)}`;
            onPaymentConfirmed(mockRef);
          }}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center"
        >
          Simulate Customer Scan &amp; Payment
        </button>

      </div>
    </div>
  );
};
