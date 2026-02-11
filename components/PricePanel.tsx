'use client';

import { useApp } from '@/lib/context';
import { INITIAL_PRICES } from '@/lib/constants';

export default function PricePanel() {
  const { state } = useApp();
  const { prices } = state;

  const assets = [
    { key: 'wstETH' as const, label: 'wstETH' },
    { key: 'weETH' as const, label: 'weETH' },
    { key: 'WETH' as const, label: 'WETH' },
    { key: 'USDC' as const, label: 'USDC' },
  ];

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 h-full">
      <span className="text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">
        Live Prices
      </span>

      <div className="flex flex-col gap-3 mt-4">
        {assets.map(({ key, label }) => {
          const current = prices[key];
          const initial = INITIAL_PRICES[key];
          const change = ((current - initial) / initial) * 100;
          const isDown = change < 0;
          const isStable = Math.abs(change) < 0.01;

          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isDown ? 'bg-red-400' : 'bg-[#009959]'}`} />

                <span className="text-sm font-medium text-[#F5F5F5]">
                  {label}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-[#F5F5F5] tabular-nums">
                  ${current.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {!isStable && (
                  <span
                    className={`text-xs ml-2 tabular-nums ${
                      isDown ? 'text-red-400' : 'text-[#009959]'
                    }`}
                  >
                    {change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}