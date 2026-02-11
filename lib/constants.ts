import { AppState, PriceableAsset, Vault } from '@/types';

// Initial asset prices
export const INITIAL_PRICES: Record<PriceableAsset, number> = {
  wstETH: 3500,
  weETH: 3600,
  WETH: 3550,
  USDC: 1.0,
};

// Maps debt tokens to their underlying price asset
export const DEBT_PRICE_MAP: Record<string, PriceableAsset> = {
  bUSDC: 'USDC',
  bETH: 'WETH',
};

// Maps collateral tokens to their swap target for rebalancing
export const COLLATERAL_SWAP_TARGET: Record<string, string> = {
  wstETH: 'USDC',
  weETH: 'WETH',
};

// Protocol parameters
export const LIQUIDATION_THRESHOLD = 0.85;
export const REBALANCE_TRIGGER = 1.15;
export const TARGET_HF = 1.25;
export const SLIPPAGE = 0.005;

// Initial vault states
export const INITIAL_VAULTS: Vault[] = [
  {
    id: 'VAULT-A-WSTETH-BUSDC',
    collateral: { asset: 'wstETH', amount: 10 },
    debt: { asset: 'bUSDC', amount: 15000 },
    healthFactor: 0,
  },
  {
    id: 'VAULT-B-WEETH-BETH',
    collateral: { asset: 'weETH', amount: 5 },
    debt: { asset: 'bETH', amount: 5 },
    healthFactor: 0,
  },
];

export const INITIAL_STATE: AppState = {
  simulationStatus: 'idle',
  prices: INITIAL_PRICES,
  priceHistory: [],
  vaults: INITIAL_VAULTS,
  rebalancingPlans: [],
  eventLog: [],
};