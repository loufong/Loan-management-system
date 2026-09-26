import React from 'react';
import { Currency } from '../../types';

interface MoneyTextProps {
  amount: number;
  currency?: Currency;
  className?: string;
  prefix?: string;
  decimals?: number;
  showDual?: boolean;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  currency = 'USD',
  className = '',
  prefix = '',
  decimals,
  showDual = false
}) => {
  const isKHR = currency === 'KHR';
  const effectiveDecimals = decimals !== undefined ? decimals : isKHR ? 0 : 2;

  let formatted = '';
  if (showDual) {
    const usdStr = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    const khrVal = Math.round(amount * 4100);
    const khrStr = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(khrVal);
    formatted = `${usdStr} (៛ ${khrStr})`;
  } else if (isKHR) {
    const khrValue = Math.round(amount * 4100);
    formatted = `${new Intl.NumberFormat('km-KH', { maximumFractionDigits: 0 }).format(khrValue)} ៛`;
  } else {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: effectiveDecimals,
      maximumFractionDigits: effectiveDecimals
    }).format(amount);
  }

  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {prefix}
      {formatted}
    </span>
  );
};
