import {
  recalculateVault,
  generateRebalancingPlan,
} from '../calculations';
import {
  INITIAL_PRICES,
  INITIAL_VAULTS,
  REBALANCE_TRIGGER,
} from '../constants';
import type { PriceableAsset, Vault } from '@/types';

// We can't import the reducer directly since it's inside context.tsx,
// so we test the same functions it calls.

// ——— Simulation auto-stop logic ——————————————————

describe('simulation stop condition', () => {
  it('detects breach when any vault HF drops below 1.15', () => {
    const crashedPrices: Record<PriceableAsset, number> = {
      wstETH: 2020,
      weETH: 2080,
      WETH: 2050,
      USDC: 1.0,
    };

    const updatedVaults: Vault[] = INITIAL_VAULTS.map((v: Vault) =>
      recalculateVault(v, crashedPrices)
    );

    const breached: boolean = updatedVaults.some(
      (v: Vault) => v.healthFactor < REBALANCE_TRIGGER
    );

    expect(breached).toBe(true);
    // Vault A should be the one that breached
    const vaultA: Vault | undefined = updatedVaults.find(
      (v: Vault) => v.id === 'VAULT-A-WSTETH-BUSDC'
    );
    expect(vaultA!.healthFactor).toBeLessThan(REBALANCE_TRIGGER);
  });

  it('does not trigger breach for Vault A at moderate prices', () => {
    const moderatePrices: Record<PriceableAsset, number> = {
      wstETH: 3000,
      weETH: 3100,
      WETH: 3050,
      USDC: 1.0,
    };

    const vaultA: Vault = recalculateVault(INITIAL_VAULTS[0], moderatePrices);

    // Vault A at $3000: (10 × 3000 × 0.85) / 15000 = 1.70
    expect(vaultA.healthFactor).toBeGreaterThan(REBALANCE_TRIGGER);
  });
});

// ——— Vault B stability ———————————————————————————

describe('Vault B ETH-denominated hedge', () => {
  it('maintains stable HF across a range of ETH prices', () => {
    const drops: number[] = [0.9, 0.7, 0.5, 0.3];

    const hfs: number[] = drops.map((factor: number) => {
      const prices: Record<PriceableAsset, number> = {
        wstETH: 3500 * factor,
        weETH: 3600 * factor,
        WETH: 3550 * factor,
        USDC: 1.0,
      };
      const vault: Vault = recalculateVault(INITIAL_VAULTS[1], prices);
      return vault.healthFactor;
    });

    // All HFs should be nearly identical since both sides move together
    const maxDiff: number = Math.max(...hfs) - Math.min(...hfs);
    expect(maxDiff).toBeLessThan(0.001);
  });
});

// ——— Rebalance application ———————————————————————

describe('rebalance state update', () => {
  it('vault state reflects projected outcome after rebalance', () => {
    const crashedPrices: Record<PriceableAsset, number> = {
      wstETH: 2020,
      weETH: 2080,
      WETH: 2050,
      USDC: 1.0,
    };

    const distressedVault: Vault = recalculateVault(INITIAL_VAULTS[0], crashedPrices);
    const plan = generateRebalancingPlan(distressedVault, crashedPrices);

    // Simulate what the reducer does
    const newCollateralAmount: number = parseFloat(
      plan.executionPlan.projectedOutcome.newCollateral.amount
    );
    const newDebtAmount: number = parseFloat(
      plan.executionPlan.projectedOutcome.newDebt.amount
    );
    const newHF: number = plan.executionPlan.projectedOutcome.newHealthFactor;

    // Collateral decreased
    expect(newCollateralAmount).toBeLessThan(distressedVault.collateral.amount);
    // Debt decreased
    expect(newDebtAmount).toBeLessThan(distressedVault.debt.amount);
    // HF restored above trigger
    expect(newHF).toBeGreaterThan(REBALANCE_TRIGGER);
    // HF near target
    expect(newHF).toBeCloseTo(1.25, 1);
  });

  it('reset restores initial HFs', () => {
    const vaults: Vault[] = INITIAL_VAULTS.map((v: Vault) =>
      recalculateVault(v, INITIAL_PRICES)
    );

    const vaultA: Vault | undefined = vaults.find(
      (v: Vault) => v.id === 'VAULT-A-WSTETH-BUSDC'
    );
    expect(vaultA!.healthFactor).toBeCloseTo(1.9833, 3);
  });
});