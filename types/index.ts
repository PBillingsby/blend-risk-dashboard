// Asset identifiers
export type CollateralAsset = 'wstETH' | 'weETH';
export type DebtAsset = 'bUSDC' | 'bETH';
export type PriceableAsset = 'wstETH' | 'weETH' | 'WETH' | 'USDC';

// Core vault structure
export interface Vault {
  id: string;
  collateral: {
    asset: CollateralAsset;
    amount: number;
  };
  debt: {
    asset: DebtAsset;
    amount: number;
  };
  healthFactor: number;
}

// Price snapshot for chart history
export interface PriceSnapshot {
  timestamp: number;
  prices: Record<PriceableAsset, number>;
}

// Rebalancing plan (matches the spec's expected shape)
export interface RebalancingPlan {
  vaultId: string;
  timestamp: string;
  trigger: {
    healthFactor: number;
    reason: string;
  };
  currentState: {
    collateral: { asset: string; amount: string; valueUSD: number };
    debt: { asset: string; amount: string; valueUSD: number };
  };
  executionPlan: {
    targetHealthFactor: number;
    actions: RebalanceAction[];
    projectedOutcome: {
      newCollateral: { asset: string; amount: string };
      newDebt: { asset: string; amount: string };
      newHealthFactor: number;
    };
  };
}

export type RebalanceAction =
  | {
      step: number;
      type: 'withdrawCollateral';
      asset: string;
      amount: string;
      reason: string;
    }
  | {
      step: number;
      type: 'swap';
      from: { asset: string; amount: string };
      to: { asset: string; expectedAmount: string; minAmount: string };
      slippage: string;
    }
  | {
      step: number;
      type: 'repayDebt';
      asset: string;
      amount: string;
      reason: string;
    };

// Event log entry
export interface EventLogEntry {
  id: string;
  timestamp: string;
  vaultId: string;
  healthFactorBefore: number;
  healthFactorAfter: number;
  summary: string;
}

// App state for the reducer
export interface AppState {
  simulationStatus: 'idle' | 'running' | 'stopped';
  prices: Record<PriceableAsset, number>;
  priceHistory: PriceSnapshot[];
  vaults: Vault[];
  rebalancingPlans: RebalancingPlan[];
  eventLog: EventLogEntry[];
}

// Reducer actions
export type AppAction =
  | { type: 'START_SIMULATION' }
  | { type: 'STOP_SIMULATION' }
  | { type: 'RESET' }
  | { type: 'PRICE_TICK'; payload: Record<PriceableAsset, number> }
  | { type: 'REBALANCE_TRIGGERED'; payload: { plan: RebalancingPlan; event: EventLogEntry } };