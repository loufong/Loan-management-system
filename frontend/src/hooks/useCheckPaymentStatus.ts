/**
 * ============================================================================
 * Bakong KHQR Live Verification & Polling Hook
 * File: frontend/src/hooks/useCheckPaymentStatus.ts
 *
 * Checks payment completion every 3 seconds:
 * - Emits countdown timer (5 minutes = 300 seconds)
 * - Synthesizes banking success chime with Web Audio API upon confirmation
 * - Returns status: 'polling' | 'success' | 'expired' | 'error'
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { PaymentReceipt } from '../types';

export interface UseCheckPaymentStatusOptions {
  billNumber?: string;
  sessionId?: string;
  active?: boolean;
  onSuccess?: (receipt: PaymentReceipt) => void;
  onExpire?: () => void;
}

export function playSuccessChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Dual-tone chime: C5 (523.25 Hz) followed by G5 (783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch (err) {
    // Non-blocking if audio context is restricted by browser autoplay policy
    console.debug('Audio chime skipped:', err);
  }
}

export function useCheckPaymentStatus({
  billNumber,
  sessionId,
  active = true,
  onSuccess,
  onExpire
}: UseCheckPaymentStatusOptions) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300); // 5 minutes
  const [status, setStatus] = useState<'polling' | 'success' | 'expired' | 'error'>('polling');
  const [pollCount, setPollCount] = useState<number>(0);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  const isCompletedRef = useRef<boolean>(false);

  // 1. Countdown Timer (5 Minutes)
  useEffect(() => {
    if (!active || status !== 'polling') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [active, status, onExpire]);

  // 2. Active Verification Polling (Every 3 seconds)
  const pollStatus = useCallback(async () => {
    if (!active || isCompletedRef.current || status !== 'polling') return;

    setPollCount((prev) => prev + 1);

    try {
      if (sessionId) {
        const result = await api.checkKhqrStatus(sessionId);
        if (result?.status === 'SUCCESS' && !isCompletedRef.current) {
          isCompletedRef.current = true;
          setStatus('success');
          playSuccessChime();

          const newReceipt = result.receipt || {
            receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
            receiptNo: `REC-${Date.now().toString().slice(-8)}`,
            paymentMethod: 'KHQR',
            amountUSD: result.amount || 0,
            paymentDate: new Date().toISOString(),
            status: 'CONFIRMED'
          };

          setReceipt(newReceipt as PaymentReceipt);
          if (onSuccess) onSuccess(newReceipt as PaymentReceipt);
        }
      }
    } catch (err) {
      console.debug('Polling check notice:', err);
    }
  }, [active, sessionId, status, onSuccess]);

  useEffect(() => {
    if (!active || status !== 'polling') return;

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [active, status, pollStatus]);

  // Format MM:SS
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return {
    status,
    secondsRemaining,
    timeFormatted,
    pollCount,
    receipt,
    playSuccessChime
  };
}

export default useCheckPaymentStatus;
