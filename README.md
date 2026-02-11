# Blend Risk Monitoring Dashboard

Real-time DeFi risk monitoring dashboard that visualizes vault health during simulated market downturns, generates actionable rebalancing plans, and provides operators with tools to manage risk under pressure.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Start Crash** to begin the simulation.

## Stack

Next.js 16, TypeScript, Tailwind CSS, Recharts, useReducer for state management.

## How It Works

### Health Factor Calculation

```
HF = (Collateral Amount × Collateral Price × Liquidation Threshold) / (Debt Amount × Debt Price)
```

Vault A (wstETH/bUSDC) starts at HF **1.98** — a cross-asset position where collateral is ETH-denominated and debt is USD-denominated. When ETH prices drop, HF drops proportionally.

Vault B (weETH/bETH) starts at HF **0.86**. This is expected and not an operational risk. Both sides of the position are ETH derivatives (weETH ≈ $3,600, WETH ≈ $3,550), so the 0.85 liquidation threshold produces `(3600/3550) × 0.85 ≈ 0.862`. This ratio holds regardless of absolute price levels — a $100k ETH or a $100 ETH yields the same HF.

### Debt Token Price Mapping

Blend's debt tokens (bUSDC, bETH) don't have market prices directly. They map to underlying assets:

- **bUSDC → USDC** ($1.00)
- **bETH → WETH** ($3,550)

This mapping is centralized in `DEBT_PRICE_MAP` and used everywhere via `getDebtPrice()`. Getting this wrong would break every downstream calculation.

### Simulation Engine

The spec says *"randomly decrease wstETH **or** weETH price by 5–15%"*. The "or" is deliberate — each tick crashes one asset while the other holds. WETH (the debt reference for bETH) stays stable throughout. This means:

- **Ticks that crash wstETH:** Vault A's HF drops (collateral loses value, USDC debt holds steady)
- **Ticks that crash weETH:** Vault B's HF drops (collateral loses value, WETH debt holds steady)

Both vaults are testable through the simulation. The simulation auto-stops when any vault's HF **crosses below** 1.15 (not just when it is below — Vault B starts below 1.15 but that's its natural state, not a breach).

### Rebalancing Algebra

When HF drops below 1.15, we need to sell `x` collateral to restore HF to 1.25. Starting from the HF formula after rebalancing:

```
targetHF = ((C - x) × Pc × LT) / ((D - repayment) × Pd)
```

Where repayment accounts for slippage: `repayment = (x × Pc × (1 - slippage)) / Pd`

Solving for x:

```
x = (targetHF × D × Pd  -  C × Pc × LT)
    ÷
    (Pc × (targetHF × (1 - slippage)  -  LT))
```

**Worked example** — Vault A with wstETH at $1,956.71:

```
Numerator:   1.25 × 15000 × 1.00  -  10 × 1956.71 × 0.85  =  2,117.96
Denominator: 1956.71 × (1.25 × 0.995  -  0.85)              =    770.46
x = 2,117.96 / 770.46 = 2.749 wstETH

New collateral: 10 - 2.749    = 7.251 wstETH
Swap proceeds:  2.749 × $1,956.71 × 0.995 = $5,352.16
New debt:       15,000 - 5,352.16  = $9,647.84
New HF:         (7.251 × 1,956.71 × 0.85) / 9,647.84 = 1.25 ✓
```

**Edge cases:**

- `x ≤ 0` → HF is already above target, no rebalancing needed
- `x ≥ C` → Position is underwater, sell everything. HF lands at 0. This is the Vault B scenario when weETH has crashed far below WETH — selling all collateral still can't cover the debt.

### Why Vault B Can't Be Rebalanced

Rebalancing works by changing the ratio between collateral and debt. For Vault A (wstETH vs USDC), selling ETH for stablecoins genuinely changes the ratio. For Vault B (weETH vs bETH), both sides are ETH — selling weETH for WETH to repay bETH just makes both sides smaller while the ratio stays the same. The 0.85 LT makes it permanently sub-1.0.

When Vault B's HF diverges during simulation (because weETH drops independently of WETH), the position becomes unrecoverable. The plan correctly reports: sell everything, HF = 0, remaining debt with zero collateral. This is the expected behavior for an underwater position.

## Architecture

### State Management

`useReducer` in a React context. Four actions: `START_SIMULATION`, `STOP_SIMULATION`, `PRICE_TICK`, `REBALANCE_TRIGGERED`, `RESET`. A `pricesRef` keeps interval callbacks from reading stale state.

### Project Structure

```
app/                      — Next.js 16 app router (layout + page)
components/
├── Dashboard.tsx         — Main layout: header, grid, conditional sections
├── SimulationControls.tsx — Start/Pause/Reset + status pill
├── PricePanel.tsx        — Live prices with change %
├── PriceChart.tsx        — Recharts time-series (excludes USDC)
├── VaultCard.tsx         — HF gauge + collateral/debt metrics
├── HealthFactorGauge.tsx — Segmented bar with animated marker
├── RebalancingPlan.tsx   — Before/after comparison + execution steps + raw JSON
└── EventLog.tsx          — Scrollable audit trail
lib/
├── calculations.ts       — Pure functions: HF, rebalancing math, plan generation
├── constants.ts          — Initial prices, vault data, protocol parameters
├── context.tsx           — useReducer + context provider, simulation engine
└── __tests__/            — 4 test files, 31 tests
types/
└── index.ts              — All TypeScript interfaces and discriminated unions
hooks/                    — Custom hooks (if any)
```

### Key Decisions

- **Crossing detection for breach:** The reducer checks if a vault's HF *crossed* below 1.15, not just whether it's below. This prevents Vault B (which starts at 0.86) from immediately stopping the simulation.
- **`showDanger` gated on simulation status:** Vault B shows "Liquidatable" on the gauge (informational) but no red border or "Action Required" badge until the simulation has actually stopped due to a breach. This avoids false alarms on the initial load.
- **`hasExistingPlan` prevents duplicate plans:** Once a rebalancing plan is generated for a vault, the button disappears. This prevents operators from spamming plans on an already-rebalanced or unrecoverable vault.
- **Discriminated unions for plan actions:** TypeScript enforces exhaustive handling of withdraw/swap/repay action types. Each action has a different shape — the swap has `from`/`to`/`slippage`, while withdraw and repay have `amount`/`reason`.

## Testing

```bash
npm test
```

31 tests across 4 files:

- **calculations.test.ts** — HF calculation, debt price mapping, collateral-to-sell formula with verification, plan generation and shape validation
- **reducer.test.ts** — Breach detection, moderate price safety, Vault B correlated stability, rebalance state updates, reset behavior
- **simulation.test.ts** — Full lifecycle: tick-by-tick crash with crossing detection, plan number verification through the entire chain (withdraw → swap → repay → projected HF), round-trip apply-and-verify
- **vault-b-edge-cases.test.ts** — Structural HF cap, price independence across magnitudes, underwater sell-all, unrecoverable HF=0, divergence when only weETH drops, stability when both assets drop, action chain consistency even when unrecoverable

## Assumptions

- bUSDC trades at exactly USDC price ($1.00)
- bETH trades at exactly WETH price
- WETH price stays stable during simulation (only wstETH or weETH crash per tick)
- All ETH derivatives would move together in a real correlated crash, but the spec's "wstETH **or** weETH" wording implies independent drops to test both vaults
- Slippage is a fixed 0.5%, not market-dependent
- No partial fills — swaps execute at the stated amounts

## Edge Cases Not Handled

- Prices going to exactly zero (division by zero guarded but UI may show NaN)
- Multiple simultaneous breaches in the same tick (first match wins)
- Rebalancing during an ongoing simulation (button only appears when stopped)
- Price recovery — simulation only goes down, never up
- Network latency or failed transactions in a real execution context