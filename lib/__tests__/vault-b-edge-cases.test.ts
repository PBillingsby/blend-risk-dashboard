import {
  recalculateVault,
  calculateCollateralToSell,
  generateRebalancingPlan,
  getDebtPrice,
} from '../calculations';
import {
  INITIAL_VAULTS,
  INITIAL_PRICES,
  LIQUIDATION_THRESHOLD,
  SLIPPAGE,
} from '../constants';
import type { Vault, PriceableAsset } from '@/types';

const VAULT_B = INITIAL_VAULTS[1]; // weETH/bETH

describe('Vault B edge cases', () => {
  it('HF is structurally capped below 1.0 at initial prices', () => {
    const vault: Vault = recalculateVault(VAULT_B, INITIAL_PRICES);

    // (5 × 3600 × 0.85) / (5 × 3550) = 0.8620
    const expectedHF: number =
      (5 * 3600 * LIQUIDATION_THRESHOLD) / (5 * 3550);

    expect(vault.healthFactor).toBeCloseTo(expectedHF, 4);
    expect(vault.healthFactor).toBeLessThan(1.0);
  });

  it('HF stays below 1.0 regardless of absolute price level', () => {
    // Even if ETH goes to $100k, the ratio stays the same
    const priceLevels: number[] = [100, 1000, 10000, 100000];

    priceLevels.forEach((base: number) => {
      const prices: Record<PriceableAsset, number> = {
        wstETH: base,
        weETH: base * (3600 / 3500), // maintain initial ratio
        WETH: base * (3550 / 3500),
        USDC: 1.0,
      };

      const vault: Vault = recalculateVault(VAULT_B, prices);
      expect(vault.healthFactor).toBeLessThan(1.0);
      expect(vault.healthFactor).toBeCloseTo(0.862, 2);
    });
  });

  it('rebalancing sells all collateral when position is underwater', () => {
    const prices: Record<PriceableAsset, number> = {
      wstETH: 2000,
      weETH: 2000,
      WETH: 3550,
      USDC: 1.0,
    };

    const vault: Vault = recalculateVault(VAULT_B, prices);
    const cp: number = prices.weETH;
    const dp: number = getDebtPrice(vault.debt.asset, prices);

    const x: number = calculateCollateralToSell(
      vault.collateral.amount,
      cp,
      vault.debt.amount,
      dp
    );

    // Should cap at full collateral
    expect(x).toBe(vault.collateral.amount);
  });

  it('projected HF is 0 when position is unrecoverable', () => {
    const prices: Record<PriceableAsset, number> = {
      wstETH: 2000,
      weETH: 2000,
      WETH: 3550,
      USDC: 1.0,
    };

    const vault: Vault = recalculateVault(VAULT_B, prices);
    const plan = generateRebalancingPlan(vault, prices);

    expect(plan.executionPlan.projectedOutcome.newHealthFactor).toBe(0);
    expect(parseFloat(plan.executionPlan.projectedOutcome.newCollateral.amount)).toBe(0);

    // Debt should be reduced but not eliminated
    const remainingDebt: number = parseFloat(
      plan.executionPlan.projectedOutcome.newDebt.amount
    );
    expect(remainingDebt).toBeGreaterThan(0);
    expect(remainingDebt).toBeLessThan(vault.debt.amount);
  });

  it('HF diverges when only weETH drops (spec behavior)', () => {
    // This is what happens during simulation — weETH drops, WETH stays
    const initialVault: Vault = recalculateVault(VAULT_B, INITIAL_PRICES);
    const initialHF: number = initialVault.healthFactor;

    const crashedPrices: Record<PriceableAsset, number> = {
      ...INITIAL_PRICES,
      weETH: INITIAL_PRICES.weETH * 0.5, // 50% drop, WETH unchanged
    };

    const crashedVault: Vault = recalculateVault(VAULT_B, crashedPrices);

    // HF should drop significantly since only collateral lost value
    expect(crashedVault.healthFactor).toBeLessThan(initialHF);
    expect(crashedVault.healthFactor).toBeCloseTo(initialHF * 0.5, 2);
  });

  it('HF stays stable when weETH and WETH drop together', () => {
    const factor: number = 0.3; // 70% crash

    const crashedPrices: Record<PriceableAsset, number> = {
      wstETH: INITIAL_PRICES.wstETH * factor,
      weETH: INITIAL_PRICES.weETH * factor,
      WETH: INITIAL_PRICES.WETH * factor,
      USDC: 1.0,
    };

    const initialVault: Vault = recalculateVault(VAULT_B, INITIAL_PRICES);
    const crashedVault: Vault = recalculateVault(VAULT_B, crashedPrices);

    expect(Math.abs(initialVault.healthFactor - crashedVault.healthFactor)).toBeLessThan(0.001);
  });

  it('plan actions are valid even when unrecoverable', () => {
    const prices: Record<PriceableAsset, number> = {
      wstETH: 2000,
      weETH: 1500,
      WETH: 3550,
      USDC: 1.0,
    };

    const vault: Vault = recalculateVault(VAULT_B, prices);
    const plan = generateRebalancingPlan(vault, prices);

    // Still produces 3 valid steps
    expect(plan.executionPlan.actions).toHaveLength(3);
    expect(plan.executionPlan.actions[0].type).toBe('withdrawCollateral');
    expect(plan.executionPlan.actions[1].type).toBe('swap');
    expect(plan.executionPlan.actions[2].type).toBe('repayDebt');

    // Amounts are consistent through the chain
    const withdrawAction = plan.executionPlan.actions[0];
    const withdrawn: number = withdrawAction.type === 'withdrawCollateral'
      ? parseFloat(withdrawAction.amount)
      : 0;
    const swapAction = plan.executionPlan.actions[1];
    if (swapAction.type === 'swap') {
      expect(parseFloat(swapAction.from.amount)).toBeCloseTo(withdrawn, 4);
      const expectedSwap: number = (withdrawn * prices.weETH) / prices.WETH;
      expect(parseFloat(swapAction.to.expectedAmount)).toBeCloseTo(expectedSwap, 2);

      const minSwap: number = expectedSwap * (1 - SLIPPAGE);
      expect(parseFloat(swapAction.to.minAmount)).toBeCloseTo(minSwap, 2);
    }

    // Repay matches min received
    if (swapAction.type === 'swap') {
      const repayAction = plan.executionPlan.actions[2];
      if (repayAction.type === 'repayDebt') {
        expect(parseFloat(repayAction.amount)).toBeCloseTo(
          parseFloat(swapAction.to.minAmount),
          4
        );
      }
    }
  });
});