import React from 'react';

export type CurrencyCode = 'USD' | 'KHR';

interface CurrencyDisplayProps {
  amount: number;
  currency?: CurrencyCode;
  className?: string;
  fractionDigits?: number;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'USD',
  className = '',
  fractionDigits
}) => {
  const isUSD = currency === 'USD';

  const formattedNumber = isUSD
    ? amount.toLocaleString('en-US', {
        minimumFractionDigits: fractionDigits !== undefined ? fractionDigits : 2,
        maximumFractionDigits: fractionDigits !== undefined ? fractionDigits : 2,
      })
    : Math.round(amount).toLocaleString('en-US');

  return (
    <span className={`font-mono font-medium tracking-tight ${className}`}>
      {isUSD ? (
        <>
          <span className="text-emerald-400 mr-0.5">$</span>
          <span>{formattedNumber}</span>
        </>
      ) : (
        <>
          <span className="text-amber-400 mr-0.5">៛</span>
          <span>{formattedNumber}</span>
        </>
      )}
    </span>
  );
};

export default CurrencyDisplay;
