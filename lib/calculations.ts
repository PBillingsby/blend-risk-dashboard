import {
  Vault,
  PriceableAsset,
  RebalancingPlan,
  RebalanceAction,
} from '@/types';
import {
  LIQUIDATION_THRESHOLD,
  TARGET_HF,
  SLIPPAGE,
  DEBT_PRICE_MAP,
  COLLATERAL_SWAP_TARGET,
} from './constants';

// ─── Health Factor ───────────────────────────────────────────────

export function calculateHealthFactor(
  collateralAmount: number,
  collateralPrice: number,
  debtAmount: number,
  debtPrice: number
): number {
  if (debtAmount === 0 || debtPrice === 0) return Infinity;
  return (
    (collateralAmount * collateralPrice * LIQUIDATION_THRESHOLD) /
    (debtAmount * debtPrice)
  );
}

// Helper: get USD price of a debt token
export function getDebtPrice(
  debtAsset: string,
  prices: Record<PriceableAsset, number>
): number {
  const underlying = DEBT_PRICE_MAP[debtAsset];
  if (!underlying) throw new Error(`Unknown debt asset: ${debtAsset}`);
  return prices[underlying];
}

// Recalculate a vault's HF with current prices
export function recalculateVault(
  vault: Vault,
  prices: Record<PriceableAsset, number>
): Vault {
  const collateralPrice = prices[vault.collateral.asset];
  const debtPrice = getDebtPrice(vault.debt.asset, prices);

  return {
    ...vault,
    healthFactor: calculateHealthFactor(
      vault.collateral.amount,
      collateralPrice,
      vault.debt.amount,
      debtPrice
    ),
  };
}

// ─── Rebalancing Math ────────────────────────────────────────────
//
// We sell x collateral to repay debt and restore HF to target.
//
// Target HF = ((C - x) × Pc × LT) / (D × Pd - x × Pc × (1 - slippage))
//
// Solving for x:
//
//   x = (C × Pc × LT - targetHF × D × Pd)
//       ÷ (Pc × (LT - targetHF × (1 - slippage)))
//

export function calculateCollateralToSell(
  collateralAmount: number,
  collateralPrice: number,
  debtAmount: number,
  debtPrice: number,
  targetHF: number = TARGET_HF,
  slippage: number = SLIPPAGE
): number {
  const numerator =
    collateralAmount * collateralPrice * LIQUIDATION_THRESHOLD -
    targetHF * debtAmount * debtPrice;

  const denominator =
    collateralPrice * (LIQUIDATION_THRESHOLD - targetHF * (1 - slippage));

  if (denominator === 0) throw new Error('Cannot solve: denominator is zero');

  const x = numerator / denominator;

  if (x < 0) return 0; // HF is already above target
  if (x > collateralAmount) return collateralAmount; // can't sell more than we have

  return x;
}

// ─── Rebalancing Plan Generation ─────────────────────────────────

export function generateRebalancingPlan(
  vault: Vault,
  prices: Record<PriceableAsset, number>
): RebalancingPlan {
  const collateralPrice = prices[vault.collateral.asset];
  const debtPrice = getDebtPrice(vault.debt.asset, prices);
  const swapTarget = COLLATERAL_SWAP_TARGET[vault.collateral.asset];

  const collateralToSell = calculateCollateralToSell(
    vault.collateral.amount,
    collateralPrice,
    vault.debt.amount,
    debtPrice
  );

  // What we receive after swap (accounting for slippage)
  const swapOutputUSD = collateralToSell * collateralPrice * (1 - SLIPPAGE);
  // Convert to debt token units
  const debtRepayment = swapOutputUSD / debtPrice;

  // Projected new state
  const newCollateralAmount = vault.collateral.amount - collateralToSell;
  const newDebtAmount = vault.debt.amount - debtRepayment;
  const newHF = calculateHealthFactor(
    newCollateralAmount,
    collateralPrice,
    newDebtAmount,
    debtPrice
  );

  // Build the 3-step action plan
  const actions: RebalanceAction[] = [
    {
      step: 1,
      type: 'withdrawCollateral',
      asset: vault.collateral.asset,
      amount: collateralToSell.toFixed(4),
      reason: 'Withdraw collateral to swap for debt repayment',
    },
    {
      step: 2,
      type: 'swap',
      from: {
        asset: vault.collateral.asset,
        amount: collateralToSell.toFixed(4),
      },
      to: {
        asset: swapTarget,
        expectedAmount: (collateralToSell * collateralPrice / debtPrice).toFixed(4),
        minAmount: (swapOutputUSD / debtPrice).toFixed(4),
      },
      slippage: `${SLIPPAGE * 100}%`,
    },
    {
      step: 3,
      type: 'repayDebt',
      asset: vault.debt.asset,
      amount: debtRepayment.toFixed(4),
      reason: 'Reduce debt to restore health factor',
    },
  ];

  return {
    vaultId: vault.id,
    timestamp: new Date().toISOString(),
    trigger: {
      healthFactor: parseFloat(vault.healthFactor.toFixed(4)),
      reason: 'Below rebalance threshold of 1.15',
    },
    currentState: {
      collateral: {
        asset: vault.collateral.asset,
        amount: vault.collateral.amount.toFixed(4),
        valueUSD: vault.collateral.amount * collateralPrice,
      },
      debt: {
        asset: vault.debt.asset,
        amount: vault.debt.amount.toFixed(4),
        valueUSD: vault.debt.amount * debtPrice,
      },
    },
    executionPlan: {
      targetHealthFactor: TARGET_HF,
      actions,
      projectedOutcome: {
        newCollateral: {
          asset: vault.collateral.asset,
          amount: newCollateralAmount.toFixed(4),
        },
        newDebt: {
          asset: vault.debt.asset,
          amount: newDebtAmount.toFixed(4),
        },
        newHealthFactor: parseFloat(newHF.toFixed(4)),
      },
    },
  };
}