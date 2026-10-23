import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  Clock,
  X,
  Volume2,
  ShieldCheck,
  Building2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';

export interface BakongKHQRParams {
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: 'USD' | 'KHR';
  billNumber: string;
  storeLabel?: string;
  terminalLabel?: string;
}

/**
 * EMVCo-Compliant Bakong KHQR String Generator
 * Follows National Bank of Cambodia (NBC) KHQR Specification
 */
export function generateBakongKHQRString(params: BakongKHQRParams): string {
  const {
    merchantId = 'khqr@aclb',
    merchantName = 'JAM SONG VICH',
    amount,
    currency,
    billNumber,
    storeLabel = 'Phnom Penh Main',
    terminalLabel = 'POS-01'
  } = params;

  // Format amount (USD 2 decimals, KHR integer)
  const formattedAmount = currency === 'USD' ? amount.toFixed(2) : Math.round(amount).toString();
  const ccyCode = currency === 'USD' ? '840' : '116';

  // Helper: TLV (Tag-Length-Value)
  const tlv = (tag: string, val: string) => {
    const len = val.length.toString().padStart(2, '0');
    return `${tag}${len}${val}`;
  };

  // 29: Merchant Account Information
  const maiBakong = tlv('00', merchantId) + tlv('01', merchantId.includes('@') ? merchantId.split('@')[1] : 'aclb');
  const tag29 = tlv('29', maiBakong);

  // 62: Additional Data Field Template
  const addData = tlv('01', billNumber) + tlv('03', storeLabel) + tlv('07', terminalLabel);
  const tag62 = tlv('62', addData);

  // Payload without CRC
  let raw =
    tlv('00', '01') + // Format indicator
    tlv('01', '12') + // Dynamic QR
    tag29 +
    tlv('52', '5999') + // MCC
    tlv('53', ccyCode) + // Currency
    tlv('54', formattedAmount) + // Transaction amount
    tlv('58', 'KH') + // Country code
    tlv('59', merchantName.slice(0, 25)) + // Merchant name
    tlv('60', 'Phnom Penh') + // City
    tag62 +
    '6304'; // CRC placeholder

  // CRC-16/CCITT-FALSE
  let crc = 0xffff;
  for (let i = 0; i < raw.length; i++) {
    crc ^= raw.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return raw + crcHex;
}

/**
 * Custom Hook: 3-Second Real-Time Simulated Polling for Bakong Transaction Status
 */
export function useCheckPaymentStatus(billNumber: string, isPollingActive: boolean = true) {
  const [status, setStatus] = useState<'pending' | 'success' | 'expired'>('pending');
  const [pollCount, setPollCount] = useState<number>(0);

  useEffect(() => {
    if (!isPollingActive || status !== 'pending') return;

    const interval = setInterval(() => {
      setPollCount(prev => {
        const next = prev + 1;
        // Simulate webhook / backend settlement after 3 polling ticks (~9-10 seconds)
        if (next >= 3) {
          setStatus('success');
          clearInterval(interval);
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [billNumber, isPollingActive, status]);

  return { status, pollCount };
}

export interface BakongPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: 'USD' | 'KHR';
  borrowerName?: string;
  loanCode?: string;
  onSuccess: (paymentDetails: any) => void;
}

export const BakongPaymentModal: React.FC<BakongPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency = 'USD',
  borrowerName = 'Sokha Chan',
  loanCode = 'LN-BKK-0081',
  onSuccess
}) => {
  const billNumber = useRef(`BILL-${Date.now().toString().slice(-6)}`).current;
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [hasPlayedChime, setHasPlayedChime] = useState(false);

  // Real-time 3s polling
  const { status } = useCheckPaymentStatus(billNumber, isOpen);

  // Generate EMVCo KHQR string and QR Data URL
  useEffect(() => {
    if (!isOpen) return;

    const khqrString = generateBakongKHQRString({
      merchantId: 'khqr@aclb',
      merchantName: 'JAM SONG VICH',
      amount,
      currency,
      billNumber,
      storeLabel: 'Phnom Penh Main',
      terminalLabel: 'POS-01'
    });

    QRCode.toDataURL(khqrString, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.error('Failed to generate QR:', err);
    });
  }, [isOpen, amount, currency, billNumber]);

  // 5-minute countdown timer
  useEffect(() => {
    if (!isOpen || status === 'success') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, status]);

  // Play audio chime and trigger success callback on payment confirmation
  useEffect(() => {
    if (status === 'success' && !hasPlayedChime) {
      setHasPlayedChime(true);

      // Web Audio API Synth Chime (Clean high-frequency chime sound)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.7);
        }
      } catch (e) {
        console.warn('Audio chime unsupported:', e);
      }

      // Advance to receipt screen after 1.5s
      const timeout = setTimeout(() => {
        onSuccess({
          billNumber,
          amount,
          currency,
          loanCode,
          borrowerName,
          paidAt: new Date().toISOString(),
          paymentMethod: 'Bakong KHQR'
        });
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [status, hasPlayedChime, billNumber, amount, currency, loanCode, borrowerName, onSuccess]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'success' ? (
          /* SUCCESS SCREEN ANIMATION */
          <div className="py-8 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Payment Received!</h3>
              <p className="text-xs text-emerald-400 font-semibold mt-1">Bakong KHQR Transaction Settled</p>
              <p className="text-xs text-slate-400 mt-2">
                Amount: <strong className="text-white font-mono"><CurrencyDisplay amount={amount} currency={currency} /></strong>
              </p>
            </div>
            <div className="pt-2 text-xs text-slate-500">
              Advancing to receipt slip...
            </div>
          </div>
        ) : (
          /* ACTIVE KHQR DISPLAY */
          <div className="space-y-4">
            {/* Header: Official KHQR Banner & Merchant Name */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600/15 text-rose-400 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>BAKONG KHQR</span>
              </div>
              <h3 className="text-base font-black text-white tracking-wider">JAM SONG VICH</h3>
              <p className="text-xs text-slate-400">
                Borrower: <strong className="text-slate-200">{borrowerName}</strong> • {loanCode}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl shadow-xl inline-block mx-auto border-2 border-rose-600 relative">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Bakong KHQR Code"
                  className="w-52 h-52 mx-auto object-contain rounded"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              )}
              {/* KHQR Mini Ribbon Header */}
              <div className="mt-2 text-[10px] font-black tracking-tight text-rose-600 uppercase border-t border-slate-200 pt-1">
                KHQR UNIVERSAL CODE
              </div>
            </div>

            {/* Amount & Reference */}
            <div>
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                <CurrencyDisplay amount={amount} currency={currency} />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">Ref: {billNumber}</p>
            </div>

            {/* Status Badge & Countdown Timer */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              {/* Active pulsing badge */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-semibold">Waiting for scan...</span>
              </div>

              {/* Countdown timer */}
              <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span className={timeLeft < 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {minutes}:{seconds}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500">
              Open any Bakong mobile app (ABA, Acleda, Wing, Canadia, TrueMoney) and scan to settle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BakongPaymentModal;
