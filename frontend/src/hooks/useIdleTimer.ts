import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseIdleTimerOptions {
  /** Inactivity duration in ms before triggering the PIN lock overlay. Default: 5 minutes */
  lockTimeoutMs?: number;
  /** Inactivity duration in ms before triggering full session logout. Default: 15 minutes */
  logoutTimeoutMs?: number;
  /** Callback fired when user becomes idle for lockTimeoutMs */
  onLock?: () => void;
  /** Callback fired when user becomes idle for logoutTimeoutMs */
  onLogout?: () => void;
  /** Whether the idle timer is actively monitoring. Defaults to true */
  enabled?: boolean;
}

export interface UseIdleTimerReturn {
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: () => void;
  resetTimer: () => void;
  lastActive: number;
}

const DEFAULT_LOCK_TIMEOUT = 5 * 60 * 1000;    // 5 minutes
const DEFAULT_LOGOUT_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useIdleTimer({
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT,
  logoutTimeoutMs = DEFAULT_LOGOUT_TIMEOUT,
  onLock,
  onLogout,
  enabled = true,
}: UseIdleTimerOptions = {}): UseIdleTimerReturn {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    // Check if session was locked in local storage
    return localStorage.getItem('apex_session_locked') === 'true';
  });

  const lastActiveRef = useRef<number>(Date.now());
  const [lastActive, setLastActive] = useState<number>(Date.now());

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventThrottleRef = useRef<number>(0);

  const lockSession = useCallback(() => {
    setIsLocked(true);
    localStorage.setItem('apex_session_locked', 'true');
    if (onLock) onLock();
  }, [onLock]);

  const unlockSession = useCallback(() => {
    setIsLocked(false);
    localStorage.removeItem('apex_session_locked');
    lastActiveRef.current = Date.now();
    setLastActive(Date.now());
  }, []);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    setLastActive(now);

    // Clear existing timers
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    if (!enabled) return;

    // Schedule 5 min lock (if not already locked)
    if (!isLocked) {
      lockTimerRef.current = setTimeout(() => {
        lockSession();
      }, lockTimeoutMs);
    }

    // Schedule 15 min full logout
    logoutTimerRef.current = setTimeout(() => {
      if (onLogout) {
        onLogout();
      }
    }, logoutTimeoutMs);
  }, [enabled, isLocked, lockSession, lockTimeoutMs, logoutTimeoutMs, onLogout]);

  useEffect(() => {
    if (!enabled) {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      return;
    }

    // Handlers for user interactions
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle activity checks to every 1000ms to conserve performance
      if (now - lastEventThrottleRef.current < 1000) {
        return;
      }
      lastEventThrottleRef.current = now;

      // If already locked, interaction doesn't reset lock; it stays locked until PIN is entered
      if (!isLocked) {
        resetTimer();
      }
    };

    const monitoredEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    monitoredEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Start initial timers
    resetTimer();

    return () => {
      monitoredEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [enabled, isLocked, resetTimer]);

  return {
    isLocked,
    lockSession,
    unlockSession,
    resetTimer,
    lastActive,
  };
}

export default useIdleTimer;
