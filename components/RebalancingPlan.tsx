'use client';

import { useState } from 'react';
import type { RebalancingPlan as RebalancingPlanType, RebalanceAction } from '@/types';

interface RebalancingPlanProps {
  plans: RebalancingPlanType[];
}

// ——— Action step rendering ————————————————————————————

function StepIcon({ type }: { type: RebalanceAction['type'] }) {
  const icons: Record<RebalanceAction['type'], string> = {
    withdrawCollateral: '↑',
    swap: '⇄',
    repayDebt: '↓',
  };

  const colors: Record<RebalanceAction['type'], string> = {
    withdrawCollateral: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    swap: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    repayDebt: 'bg-[#009959]/10 text-[#009959] border-[#009959]/20',
  };

  return (
    <div
      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-medium ${colors[type]}`}
    >
      {icons[type]}
    </div>
  );
}

function ActionStep({ action }: { action: RebalanceAction }) {
  switch (action.type) {
    case 'withdrawCollateral':
      return (
        <div className="flex items-start gap-3">
          <StepIcon type={action.type} />
          <div>
            <p className="text-sm font-medium text-[#F5F5F5]">
              Withdraw {action.amount} {action.asset}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-0.5">{action.reason}</p>
          </div>
        </div>
      );

    case 'swap':
      return (
        <div className="flex items-start gap-3">
          <StepIcon type={action.type} />
          <div>
            <p className="text-sm font-medium text-[#F5F5F5]">
              Swap {action.from.amount} {action.from.asset} → {action.to.expectedAmount}{' '}
              {action.to.asset}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-0.5">
              Min received: {action.to.minAmount} {action.to.asset} ({action.slippage}{' '}
              slippage)
            </p>
          </div>
        </div>
      );

    case 'repayDebt':
      return (
        <div className="flex items-start gap-3">
          <StepIcon type={action.type} />
          <div>
            <p className="text-sm font-medium text-[#F5F5F5]">
              Repay {action.amount} {action.asset}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-0.5">{action.reason}</p>
          </div>
        </div>
      );
  }
}

// ——— Before/After metric ————————————————————————————

interface MetricProps {
  label: string;
  before: string;
  after: string;
  beforeSub?: string;
  afterSub?: string;
}

function Metric({ label, before, after, beforeSub, afterSub }: MetricProps) {
  return (
    <div>
      <span className="text-[11px] font-medium text-[#7A7A7A] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-3 mt-1.5">
        {/* Before */}
        <div className="flex-1 rounded-lg bg-[#0C0C0C] border border-[#2A2A2A] px-3 py-2">
          <p className="text-sm font-medium text-[#A0A0A0] tabular-nums">{before}</p>
          {beforeSub && (
            <p className="text-[10px] text-[#7A7A7A] tabular-nums mt-0.5">{beforeSub}</p>
          )}
        </div>

        {/* Arrow */}
        <span className="text-[#7A7A7A] text-xs shrink-0">→</span>

        {/* After */}
        <div className="flex-1 rounded-lg bg-[#009959]/5 border border-[#009959]/20 px-3 py-2">
          <p className="text-sm font-medium text-[#F5F5F5] tabular-nums">{after}</p>
          {afterSub && (
            <p className="text-[10px] text-[#009959]/70 tabular-nums mt-0.5">{afterSub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— HF badge ————————————————————————————————————

function HFBadge({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const color: string =
    value < 1.0
      ? 'text-red-500 bg-red-500/10 border-red-500/20'
      : value < 1.15
        ? 'text-red-400 bg-red-500/10 border-red-500/20'
        : value < 1.5
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          : 'text-[#009959] bg-[#009959]/10 border-[#009959]/20';

  const sizeClass: string =
    size === 'lg' ? 'text-2xl px-3 py-1.5' : 'text-sm px-2 py-0.5';

  return (
    <span
      className={`font-semibold tabular-nums rounded-lg border ${color} ${sizeClass}`}
    >
      {value.toFixed(4)}
    </span>
  );
}

// ——— Single plan display ————————————————————————————

function PlanCard({ plan }: { plan: RebalancingPlanType }) {
  const [showJSON, setShowJSON] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const { currentState, executionPlan } = plan;
  const { projectedOutcome } = executionPlan;

  const handleCopy = (): void => {
    navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">
            Rebalancing Plan
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-[#F5F5F5]">
              {plan.vaultId}
            </span>
            <span className="text-[10px] text-[#7A7A7A]">
              {new Date(plan.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#7A7A7A] uppercase tracking-wider block mb-1">
            Trigger HF
          </span>
          <HFBadge value={plan.trigger.healthFactor} />
        </div>
      </div>

      <div className="h-px bg-[#2A2A2A]" />

      {/* Before → After comparison */}
      <div className="flex flex-col gap-3">
        <Metric
          label="Health Factor"
          before={plan.trigger.healthFactor.toFixed(4)}
          after={projectedOutcome.newHealthFactor.toFixed(4)}
        />
        <Metric
          label="Collateral"
          before={`${currentState.collateral.amount} ${currentState.collateral.asset}`}
          beforeSub={`$${currentState.collateral.valueUSD.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          after={`${projectedOutcome.newCollateral.amount} ${projectedOutcome.newCollateral.asset}`}
        />
        <Metric
          label="Debt"
          before={`${currentState.debt.amount} ${currentState.debt.asset}`}
          beforeSub={`$${currentState.debt.valueUSD.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          after={`${projectedOutcome.newDebt.amount} ${projectedOutcome.newDebt.asset}`}
        />
      </div>

      <div className="h-px bg-[#2A2A2A]" />

      {/* Execution steps */}
      <div>
        <span className="text-[11px] font-medium text-[#7A7A7A] uppercase tracking-wider">
          Execution Steps
        </span>
        <div className="flex flex-col gap-3 mt-3">
          {executionPlan.actions.map((action: RebalanceAction) => (
            <ActionStep key={action.step} action={action} />
          ))}
        </div>
      </div>

      <div className="h-px bg-[#2A2A2A]" />

      {/* Projected outcome banner */}
      <div className="rounded-lg bg-[#009959]/5 border border-[#009959]/20 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium text-[#009959]/70 uppercase tracking-wider">
            Projected Health Factor
          </span>
          <div className="mt-0.5">
            <HFBadge value={projectedOutcome.newHealthFactor} size="lg" />
          </div>
        </div>
        <span className="text-xs text-[#009959]/70">
          Target: {executionPlan.targetHealthFactor.toFixed(2)}
        </span>
      </div>

      {/* Raw JSON toggle */}
      <div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJSON((prev: boolean) => !prev)}
            className="text-xs text-[#7A7A7A] hover:text-[#A0A0A0] transition-colors"
          >
            {showJSON ? '▾ Hide' : '▸ View'} Raw Data
          </button>
          <button
            onClick={handleCopy}
            className="text-xs text-[#7A7A7A] hover:text-[#A0A0A0] transition-colors"
          >
            {copied ? '✓ Copied' : '⎘ Copy JSON'}
          </button>
        </div>

        {showJSON && (
          <pre className="mt-2 p-3 rounded-lg bg-[#0C0C0C] border border-[#2A2A2A] text-[10px] text-[#A0A0A0] overflow-x-auto font-mono leading-relaxed">
            {JSON.stringify(plan, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ——— Main export ————————————————————————————————————

export default function RebalancingPlan({ plans }: RebalancingPlanProps) {
  return (
    <div className="flex flex-col gap-4">
      {plans.map((plan: RebalancingPlanType) => (
        <PlanCard key={`${plan.vaultId}-${plan.timestamp}`} plan={plan} />
      ))}
    </div>
  );
}