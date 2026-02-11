import {
  calculateHealthFactor,
  calculateCollateralToSell,
  getDebtPrice,
  generateRebalancingPlan,
} from '../calculations';
import {
  INITIAL_PRICES,
  LIQUIDATION_THRESHOLD,
  TARGET_HF,
  SLIPPAGE,
} from '../constants';
import type { Vault, PriceableAsset } from '@/types';

// ——— Fixtures ————————————————————————————————————

const VAULT_A: Vault = {
  id: 'VAULT-A-WSTETH-BUSDC',
  collateral: { asset: 'wstETH', amount: 10 },
  debt: { asset: 'bUSDC', amount: 15000 },
  healthFactor: 0,
};

const VAULT_B: Vault = {
  id: 'VAULT-B-WEETH-BETH',
  collateral: { asset: 'weETH', amount: 5 },
  debt: { asset: 'bETH', amount: 5 },
  healthFactor: 0,
};

// ——— calculateHealthFactor ——————————————————————

describe('calculateHealthFactor', () => {
  it('calculates Vault A at initial prices', () => {
    // (10 × 3500 × 0.85) / (15000 × 1.00) = 29750 / 15000
    const hf: number = calculateHealthFactor(10, 3500, 15000, 1.0);
    expect(hf).toBeCloseTo(1.9833, 3);
  });

  it('calculates Vault B at initial prices', () => {
    // (5 × 3600 × 0.85) / (5 × 3550) = 15300 / 17750
    const hf: number = calculateHealthFactor(5, 3600, 5, 3550);
    expect(hf).toBeCloseTo(0.8620, 3);
  });

  it('returns Infinity when debt is zero', () => {
    const hf: number = calculateHealthFactor(10, 3500, 0, 1.0);
    expect(hf).toBe(Infinity);
  });

  it('decreases when collateral price drops for Vault A', () => {
    const before: number = calculateHealthFactor(10, 3500, 15000, 1.0);
    const after: number = calculateHealthFactor(10, 2000, 15000, 1.0);
    expect(after).toBeLessThan(before);
  });

  it('stays stable for Vault B when ETH drops proportionally', () => {
    const before: number = calculateHealthFactor(5, 3600, 5, 3550);
    const after: number = calculateHealthFactor(5, 3600 * 0.7, 5, 3550 * 0.7);
    expect(after).toBeCloseTo(before, 4);
  });
});

// ——— getDebtPrice ———————————————————————————————

describe('getDebtPrice', () => {
  it('maps bUSDC to USDC price', () => {
    const price: number = getDebtPrice('bUSDC', INITIAL_PRICES);
    expect(price).toBe(1.0);
  });

  it('maps bETH to WETH price', () => {
    const price: number = getDebtPrice('bETH', INITIAL_PRICES);
    expect(price).toBe(3550);
  });

  it('throws for unknown debt asset', () => {
    expect(() => getDebtPrice('bFOO', INITIAL_PRICES)).toThrow();
  });
});

// ——— calculateCollateralToSell ——————————————————

describe('calculateCollateralToSell', () => {
  it('returns 0 when HF is already above target', () => {
    // Vault A at initial prices: HF ≈ 1.98, well above 1.25
    const x: number = calculateCollateralToSell(10, 3500, 15000, 1.0);
    expect(x).toBe(0);
  });

  it('calculates correct amount for Vault A in distress', () => {
    // Price crashed to $2020 → HF ≈ 1.145
    const collateralPrice: number = 2020;
    const x: number = calculateCollateralToSell(10, collateralPrice, 15000, 1.0);

    // Verify: apply the rebalance and check new HF ≈ 1.25
    const newCollateral: number = 10 - x;
    const swapProceeds: number = x * collateralPrice * (1 - SLIPPAGE);
    const newDebt: number = 15000 - swapProceeds;
    const newHF: number =
      (newCollateral * collateralPrice * LIQUIDATION_THRESHOLD) / (newDebt * 1.0);

    expect(newHF).toBeCloseTo(TARGET_HF, 2);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(10);
  });

  it('calculates correct amount at deep crash prices', () => {
    // wstETH at $1800 — severe but recoverable
    const collateralPrice: number = 1800;
    const x: number = calculateCollateralToSell(10, collateralPrice, 15000, 1.0);

    const newCollateral: number = 10 - x;
    const swapProceeds: number = x * collateralPrice * (1 - SLIPPAGE);
    const newDebt: number = 15000 - swapProceeds;
    const newHF: number =
      (newCollateral * collateralPrice * LIQUIDATION_THRESHOLD) / (newDebt * 1.0);

    expect(newHF).toBeCloseTo(TARGET_HF, 2);
  });

  it('caps at full collateral when position is underwater', () => {
    // Price so low that selling everything isn't enough
    const x: number = calculateCollateralToSell(10, 100, 15000, 1.0);
    expect(x).toBe(10);
  });

  it('accounts for slippage in the result', () => {
    const collateralPrice: number = 2020;
    const withSlippage: number = calculateCollateralToSell(
      10, collateralPrice, 15000, 1.0, TARGET_HF, 0.005
    );
    const withoutSlippage: number = calculateCollateralToSell(
      10, collateralPrice, 15000, 1.0, TARGET_HF, 0
    );

    // More slippage → need to sell more collateral
    expect(withSlippage).toBeGreaterThan(withoutSlippage);
  });
});

// ——— generateRebalancingPlan ————————————————————

describe('generateRebalancingPlan', () => {
  const crashedPrices: Record<PriceableAsset, number> = {
    wstETH: 2020,
    weETH: 2080,
    WETH: 2050,
    USDC: 1.0,
  };

  const distressedVaultA: Vault = {
    ...VAULT_A,
    healthFactor: calculateHealthFactor(10, 2020, 15000, 1.0),
  };

  it('produces a plan with 3 execution steps', () => {
    const plan = generateRebalancingPlan(distressedVaultA, crashedPrices);
    expect(plan.executionPlan.actions).toHaveLength(3);
    expect(plan.executionPlan.actions[0].type).toBe('withdrawCollateral');
    expect(plan.executionPlan.actions[1].type).toBe('swap');
    expect(plan.executionPlan.actions[2].type).toBe('repayDebt');
  });

  it('projected HF lands near target of 1.25', () => {
    const plan = generateRebalancingPlan(distressedVaultA, crashedPrices);
    expect(plan.executionPlan.projectedOutcome.newHealthFactor).toBeCloseTo(
      TARGET_HF,
      1
    );
  });

  it('matches the expected data shape from the spec', () => {
    const plan = generateRebalancingPlan(distressedVaultA, crashedPrices);

    // Top-level fields
    expect(plan).toHaveProperty('vaultId');
    expect(plan).toHaveProperty('timestamp');
    expect(plan).toHaveProperty('trigger');
    expect(plan).toHaveProperty('currentState');
    expect(plan).toHaveProperty('executionPlan');

    // Nested shape
    expect(plan.trigger).toHaveProperty('healthFactor');
    expect(plan.trigger).toHaveProperty('reason');
    expect(plan.executionPlan).toHaveProperty('targetHealthFactor');
    expect(plan.executionPlan).toHaveProperty('actions');
    expect(plan.executionPlan).toHaveProperty('projectedOutcome');
  });

  it('produces an unrecoverable plan for underwater Vault B', () => {
    const crashedPrices: Record<PriceableAsset, number> = {
      wstETH: 2020,
      weETH: 2000,
      WETH: 3550,
      USDC: 1.0,
    };

    const distressedVaultB: Vault = {
      ...VAULT_B,
      healthFactor: calculateHealthFactor(5, 2000, 5, 3550),
    };

    const plan = generateRebalancingPlan(distressedVaultB, crashedPrices);

    expect(plan.executionPlan.projectedOutcome.newHealthFactor).toBe(0);
    expect(parseFloat(plan.executionPlan.projectedOutcome.newCollateral.amount)).toBe(0);
  });
});