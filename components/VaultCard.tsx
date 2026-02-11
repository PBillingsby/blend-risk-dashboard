'use client';

import { useApp } from '@/lib/context';
import { getDebtPrice } from '@/lib/calculations';
import HealthFactorGauge from './HealthFactorGauge';
import type { Vault } from '@/types';
import { REBALANCE_TRIGGER } from '@/lib/constants';

interface VaultCardProps {
  vault: Vault;
}

export default function VaultCard({ vault }: VaultCardProps) {
  const { state, triggerRebalance } = useApp();
  const { prices } = state;

  const collateralPrice: number = prices[vault.collateral.asset];
  const debtPrice: number = getDebtPrice(vault.debt.asset, prices);

  const collateralUSD: number = vault.collateral.amount * collateralPrice;
  const debtUSD: number = vault.debt.amount * debtPrice;

  const needsRebalance: boolean = vault.healthFactor < REBALANCE_TRIGGER;
  const hasExistingPlan: boolean = state.rebalancingPlans.some(
    (p) => p.vaultId === vault.id
  );
  const showDanger: boolean =
    needsRebalance &&
    state.simulationStatus === 'stopped' &&
    !hasExistingPlan;
  return (
    <div
      className={`rounded-2xl border bg-[#1A1A1A] p-5 flex flex-col gap-4 transition-colors duration-300 ${
        showDanger
          ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.08)]'
          : 'border-[#2A2A2A]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#F5F5F5]">{vault.id}</span>
          {showDanger && (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 animate-pulse">
              Action Required
            </span>
          )}
        </div>
      </div>

      {/* Health Factor Gauge */}
      <HealthFactorGauge vault={vault} />

      {/* Collateral & Debt */}
      <div className="h-px bg-[#2A2A2A]" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[11px] font-medium text-[#7A7A7A] uppercase tracking-wider">
              Collateral
            </span>
          </div>
          <p className="text-base font-medium text-[#F5F5F5] tabular-nums">
            {vault.collateral.amount.toFixed(4)} {vault.collateral.asset}
          </p>
          <p className="text-xs text-[#7A7A7A] tabular-nums mt-0.5">
            ${collateralUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[11px] font-medium text-[#7A7A7A] uppercase tracking-wider">
              Debt
            </span>
          </div>
          <p className="text-base font-medium text-[#F5F5F5] tabular-nums">
            {vault.debt.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{' '}
            {vault.debt.asset}
          </p>
          <p className="text-xs text-[#7A7A7A] tabular-nums mt-0.5">
            ${debtUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Rebalance button */}
      {showDanger && (
        <>
          <div className="h-px bg-[#2A2A2A]" />
          <button
            onClick={() => triggerRebalance(vault.id)}
            className="w-full py-2.5 text-sm font-medium cursor-pointer rounded-lg bg-[#009959] hover:bg-[#009959]/90 text-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            Generate Rebalancing Plan
          </button>
        </>
      )}
    </div>
  );
}