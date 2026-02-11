import {
  calculateHealthFactor,
  calculateCollateralToSell,
  recalculateVault,
  generateRebalancingPlan,
} from '../calculations';
import {
  INITIAL_VAULTS,
  INITIAL_PRICES,
  REBALANCE_TRIGGER,
  LIQUIDATION_THRESHOLD,
  TARGET_HF,
  SLIPPAGE,
} from '../constants';
import type { Vault, PriceableAsset } from '@/types';

describe('full simulation lifecycle', () => {
  // Reproduce exactly what the reducer does on each tick
  function simulateTick(
    vaults: Vault[],
    prices: Record<PriceableAsset, number>
  ): { vaults: Vault[]; breached: boolean; crossedVaultId: string | null } {
    const updated: Vault[] = vaults.map((v) => recalculateVault(v, prices));

    let crossedVaultId: string | null = null;

    const breached: boolean = updated.some((updatedVault) => {
      const previous: Vault | undefined = vaults.find(
        (v) => v.id === updatedVault.id
      );
      if (!previous) return false;
      const crossed: boolean =
        previous.healthFactor >= REBALANCE_TRIGGER &&
        updatedVault.healthFactor < REBALANCE_TRIGGER;
      if (crossed) crossedVaultId = updatedVault.id;
      return crossed;
    });

    return { vaults: updated, breached, crossedVaultId };
  }

  it('Vault A breaches while Vault B stays stable across a crash', () => {
    // Simulate 5 ticks of 10% correlated drops
    const dropFactors: number[] = [0.9, 0.9, 0.85, 0.88, 0.85];

    let vaults: Vault[] = INITIAL_VAULTS.map((v) =>
      recalculateVault(v, INITIAL_PRICES)
    );
    let prices: Record<PriceableAsset, number> = { ...INITIAL_PRICES };
    let breached: boolean = false;
    let crossedVaultId: string | null = null;
    const vaultBHFs: number[] = [];

    for (const factor of dropFactors) {
      prices = {
        wstETH: prices.wstETH * factor,
        weETH: prices.weETH * factor,
        WETH: prices.WETH * factor,
        USDC: 1.0,
      };

      const result = simulateTick(vaults, prices);
      vaults = result.vaults;

      const vaultB: Vault = vaults.find(
        (v) => v.id === 'VAULT-B-WEETH-BETH'
      )!;
      vaultBHFs.push(vaultB.healthFactor);

      if (result.breached) {
        breached = true;
        crossedVaultId = result.crossedVaultId;
        break;
      }
    }

    // Vault A should be the one that breached
    expect(breached).toBe(true);
    expect(crossedVaultId).toBe('VAULT-A-WSTETH-BUSDC');

    // Vault B HF should barely move (< 0.001 variance)
    const maxBHF: number = Math.max(...vaultBHFs);
    const minBHF: number = Math.min(...vaultBHFs);
    expect(maxBHF - minBHF).toBeLessThan(0.001);
  });

  it('rebalancing plan restores Vault A to target HF', () => {
    // Crash prices to where Vault A breaches
    const crashedPrices: Record<PriceableAsset, number> = {
      wstETH: 2020,
      weETH: 2080,
      WETH: 2050,
      USDC: 1.0,
    };

    const distressedVault: Vault = recalculateVault(
      INITIAL_VAULTS[0],
      crashedPrices
    );

    // Confirm it actually breached
    expect(distressedVault.healthFactor).toBeLessThan(REBALANCE_TRIGGER);

    // Generate the plan
    const plan = generateRebalancingPlan(distressedVault, crashedPrices);

    // Manually verify every number in the plan
    const cp: number = crashedPrices.wstETH;
    const dp: number = crashedPrices.USDC;
    const x: number = calculateCollateralToSell(
      distressedVault.collateral.amount,
      cp,
      distressedVault.debt.amount,
      dp
    );

    // Step 1: withdraw amount matches calculated x
    expect(plan.executionPlan.actions[0].type).toBe('withdrawCollateral');
    const withdrawAction = plan.executionPlan.actions[0];
    if (withdrawAction.type === 'withdrawCollateral') {
      expect(parseFloat(withdrawAction.amount)).toBeCloseTo(x, 3);
    }
    // Step 2: swap accounts for slippage
    const swapAction = plan.executionPlan.actions[1];
    expect(swapAction.type).toBe('swap');
    if (swapAction.type === 'swap') {
      const expected: number = (x * cp) / dp;
      const min: number = (x * cp * (1 - SLIPPAGE)) / dp;
      expect(parseFloat(swapAction.to.expectedAmount)).toBeCloseTo(expected, 0);
      expect(parseFloat(swapAction.to.minAmount)).toBeCloseTo(min, 0);
    }

    // Step 3: repay matches slippage-adjusted amount
    const repayAction = plan.executionPlan.actions[2];
    expect(repayAction.type).toBe('repayDebt');
    const swapProceeds: number = x * cp * (1 - SLIPPAGE);
    if (repayAction.type === 'repayDebt') {
      expect(parseFloat(repayAction.amount)).toBeCloseTo(swapProceeds / dp, 1);
    }

    // Projected outcome: verify HF by recomputing from scratch
    const newC: number = parseFloat(
      plan.executionPlan.projectedOutcome.newCollateral.amount
    );
    const newD: number = parseFloat(
      plan.executionPlan.projectedOutcome.newDebt.amount
    );
    const recomputedHF: number =
      (newC * cp * LIQUIDATION_THRESHOLD) / (newD * dp);

    expect(plan.executionPlan.projectedOutcome.newHealthFactor).toBeCloseTo(
      recomputedHF,
      3
    );
    expect(recomputedHF).toBeCloseTo(TARGET_HF, 1);

    // Collateral decreased, debt decreased
    expect(newC).toBeLessThan(distressedVault.collateral.amount);
    expect(newD).toBeLessThan(distressedVault.debt.amount);
  });

  it('applying the plan produces a vault above the trigger', () => {
    const crashedPrices: Record<PriceableAsset, number> = {
      wstETH: 2020,
      weETH: 2080,
      WETH: 2050,
      USDC: 1.0,
    };

    const distressedVault: Vault = recalculateVault(
      INITIAL_VAULTS[0],
      crashedPrices
    );
    const plan = generateRebalancingPlan(distressedVault, crashedPrices);

    // Simulate what the reducer does: apply the plan to the vault
    const rebalancedVault: Vault = {
      ...distressedVault,
      collateral: {
        ...distressedVault.collateral,
        amount: parseFloat(
          plan.executionPlan.projectedOutcome.newCollateral.amount
        ),
      },
      debt: {
        ...distressedVault.debt,
        amount: parseFloat(
          plan.executionPlan.projectedOutcome.newDebt.amount
        ),
      },
      healthFactor: plan.executionPlan.projectedOutcome.newHealthFactor,
    };

    // Recalculate HF independently to confirm
    const verified: Vault = recalculateVault(rebalancedVault, crashedPrices);

    expect(verified.healthFactor).toBeCloseTo(
      plan.executionPlan.projectedOutcome.newHealthFactor,
      3
    );
    expect(verified.healthFactor).toBeGreaterThan(REBALANCE_TRIGGER);
    expect(verified.healthFactor).toBeCloseTo(TARGET_HF, 1);
  });
});