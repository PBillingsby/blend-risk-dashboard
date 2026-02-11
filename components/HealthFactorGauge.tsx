'use client';

import type { Vault } from '@/types';

interface HealthFactorGaugeProps {
  vault: Vault;
}

function getHFZone(hf: number) {
  if (hf < 1.0) return { label: 'Liquidatable', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' };
  if (hf < 1.15) return { label: 'Rebalance', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
  if (hf < 1.5) return { label: 'Warning', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
  return { label: 'Safe', color: '#009959', bg: 'rgba(0,153,89,0.1)' };
}

export default function HealthFactorGauge({ vault }: HealthFactorGaugeProps) {
  const zone = getHFZone(vault.healthFactor);

  const clampedHF: number = Math.max(0.5, Math.min(vault.healthFactor, 2.5));
  const pct: number = ((clampedHF - 0.5) / 2.0) * 100;

  const liquidationPct: number = ((1.0 - 0.5) / 2.0) * 100;
  const rebalancePct: number = ((1.15 - 0.5) / 2.0) * 100;
  const warningPct: number = ((1.5 - 0.5) / 2.0) * 100;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span
          className="text-3xl font-semibold tabular-nums tracking-tight"
          style={{ color: zone.color }}
        >
          {vault.healthFactor.toFixed(2)}
        </span>
        <span className="text-sm text-[#7A7A7A]">
          {vault.collateral.asset}/{vault.debt.asset}
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ color: zone.color, background: zone.bg }}
        >
          {zone.label}
        </span>
      </div>

      <div className="relative h-2 rounded-full overflow-hidden bg-[#2A2A2A]">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${liquidationPct}%`, background: 'rgba(220,38,38,0.4)' }}
        />
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${liquidationPct}%`,
            width: `${rebalancePct - liquidationPct}%`,
            background: 'rgba(239,68,68,0.3)',
          }}
        />
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${rebalancePct}%`,
            width: `${warningPct - rebalancePct}%`,
            background: 'rgba(245,158,11,0.25)',
          }}
        />
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${warningPct}%`,
            width: `${100 - warningPct}%`,
            background: 'rgba(0,153,89,0.25)',
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0C0C0C] transition-all duration-500 ease-out"
          style={{
            left: `${pct}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            background: zone.color,
            boxShadow: `0 0 8px ${zone.color}80`,
          }}
        />
      </div>

      <div className="relative mt-1.5 h-4">
        <span className="absolute left-0 text-[9px] text-[#7A7A7A] tabular-nums">0.5</span>
        <span className="absolute text-[9px] text-red-400/60 tabular-nums" style={{ left: `${liquidationPct}%`, transform: 'translateX(-50%)' }}>1.0</span>
        <span className="absolute text-[9px] text-red-400/60 tabular-nums" style={{ left: `${rebalancePct}%`, transform: 'translateX(-50%)' }}>1.15</span>
        <span className="absolute text-[9px] text-amber-400/60 tabular-nums" style={{ left: `${warningPct}%`, transform: 'translateX(-50%)' }}>1.5</span>
        <span className="absolute right-0 text-[9px] text-[#7A7A7A] tabular-nums">2.5</span>
      </div>
    </div>
  );
}