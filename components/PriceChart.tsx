'use client';

import { useApp } from '@/lib/context';
import type { PriceableAsset } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const ASSET_COLORS: Record<PriceableAsset, string> = {
  wstETH: '#009959',
  weETH: '#6FBF6B',
  WETH: '#F59E0B',
  USDC: '#7A7A7A',
};

interface ChartDataPoint {
  time: string;
  wstETH: number;
  weETH: number;
  WETH: number;
  USDC: number;
}

export default function PriceChart() {
  const { state } = useApp();
  const { priceHistory } = state;

  const data: ChartDataPoint[] = priceHistory.map((snapshot) => ({
    time: new Date(snapshot.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    wstETH: parseFloat(snapshot.prices.wstETH.toFixed(2)),
    weETH: parseFloat(snapshot.prices.weETH.toFixed(2)),
    WETH: parseFloat(snapshot.prices.WETH.toFixed(2)),
    USDC: snapshot.prices.USDC,
  }));

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 h-full">
      <span className="text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">
        Price History
      </span>

      <div className="mt-4 h-55">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full text-sm text-[#7A7A7A]">
            Start simulation to see price data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A2A"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: '#7A7A7A', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2A2A' }}
              />
              <YAxis
                tick={{ fill: '#7A7A7A', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                width={70}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F5F5F5',
                }}
                formatter={((value: number | undefined, name: string | undefined) => [
                  `$${(value ?? 0).toLocaleString()}`,
                  name ?? '',
                ]) as any}
              />
              {(['wstETH', 'weETH', 'WETH'] as const).map((asset) => (
                <Line
                  key={asset}
                  type="monotone"
                  dataKey={asset}
                  stroke={ASSET_COLORS[asset]}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={300}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {(['wstETH', 'weETH', 'WETH'] as const).map((asset) => (
          <div key={asset} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-0.5 rounded-full"
              style={{ background: ASSET_COLORS[asset] }}
            />
            <span className="text-[10px] text-[#7A7A7A]">{asset}</span>
          </div>
        ))}
      </div>
    </div>
  );
}