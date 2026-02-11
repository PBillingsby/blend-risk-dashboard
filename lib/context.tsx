'use client';

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import {
  AppState,
  AppAction,
  PriceableAsset,
  EventLogEntry,
} from '@/types';
import { recalculateVault, generateRebalancingPlan } from './calculations';
import { INITIAL_STATE, INITIAL_PRICES, INITIAL_VAULTS, REBALANCE_TRIGGER } from './constants';

// ─── Reducer ─────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'START_SIMULATION':
      return { ...state, simulationStatus: 'running' };

    case 'STOP_SIMULATION':
      return { ...state, simulationStatus: 'stopped' };

    case 'RESET': {
      const vaults = INITIAL_VAULTS.map((v) => recalculateVault(v, INITIAL_PRICES));
      return {
        ...INITIAL_STATE,
        vaults,
        simulationStatus: 'idle',
        priceHistory: [{ timestamp: Date.now(), prices: INITIAL_PRICES }],
      };
    }

    case 'PRICE_TICK': {
      const newPrices = action.payload;

      const updatedVaults = state.vaults.map((v) =>
        recalculateVault(v, newPrices)
      );

      const breached: boolean = updatedVaults.some((updatedVault) => {
        const previousVault = state.vaults.find((v) => v.id === updatedVault.id);
        if (!previousVault) return false;
        return (
          previousVault.healthFactor >= REBALANCE_TRIGGER &&
          updatedVault.healthFactor < REBALANCE_TRIGGER
        );
      });

      return {
        ...state,
        prices: newPrices,
        priceHistory: [
          ...state.priceHistory,
          { timestamp: Date.now(), prices: newPrices },
        ],
        vaults: updatedVaults,
        simulationStatus: breached ? 'stopped' : state.simulationStatus,
      };
    }

    case 'REBALANCE_TRIGGERED': {
      const { plan, event } = action.payload;

      const updatedVaults = state.vaults.map((v) => {
        if (v.id !== plan.vaultId) return v;
        const outcome = plan.executionPlan.projectedOutcome;
        return {
          ...v,
          collateral: {
            ...v.collateral,
            amount: parseFloat(outcome.newCollateral.amount),
          },
          debt: {
            ...v.debt,
            amount: parseFloat(outcome.newDebt.amount),
          },
          healthFactor: outcome.newHealthFactor,
        };
      });

      return {
        ...state,
        vaults: updatedVaults,
        rebalancingPlans: [...state.rebalancingPlans, plan],
        eventLog: [...state.eventLog, event],
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  triggerRebalance: (vaultId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const initialVaults = INITIAL_VAULTS.map((v) => recalculateVault(v, INITIAL_PRICES));

  const initialState: AppState = {
    ...INITIAL_STATE,
    vaults: initialVaults,
    priceHistory: [{ timestamp: Date.now(), prices: INITIAL_PRICES }],
  };

  const [state, dispatch] = useReducer(appReducer, initialState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pricesRef = useRef(state.prices);

  pricesRef.current = state.prices;

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch({ type: 'STOP_SIMULATION' });
  }, []);

  useEffect(() => {
    if (state.simulationStatus === 'stopped' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [state.simulationStatus]);

  const startSimulation = useCallback(() => {
    dispatch({ type: 'START_SIMULATION' });

    intervalRef.current = setInterval(() => {
      const current = pricesRef.current;
      const drop: number = 1 - (0.05 + Math.random() * 0.1);
      const crashWstETH: boolean = Math.random() < 0.5;

      const newPrices: Record<PriceableAsset, number> = {
        wstETH: crashWstETH ? current.wstETH * drop : current.wstETH,
        weETH: !crashWstETH ? current.weETH * drop : current.weETH,
        WETH: current.WETH,
        USDC: 1.0,
      };

      dispatch({ type: 'PRICE_TICK', payload: newPrices });
    }, 2500);
  }, []);

  const resetSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  const triggerRebalance = useCallback(
    (vaultId: string) => {
      const vault = state.vaults.find((v) => v.id === vaultId);
      if (!vault) return;

      const plan = generateRebalancingPlan(vault, state.prices);

      const x: number = parseFloat(
        plan.executionPlan.actions[0].type === 'withdrawCollateral'
          ? plan.executionPlan.actions[0].amount
          : '0'
      );

      const event: EventLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        vaultId: vault.id,
        healthFactorBefore: vault.healthFactor,
        healthFactorAfter: plan.executionPlan.projectedOutcome.newHealthFactor,
        summary: `Rebalanced: sold ${x.toFixed(4)} ${vault.collateral.asset} to restore HF from ${vault.healthFactor.toFixed(2)} → ${plan.executionPlan.projectedOutcome.newHealthFactor.toFixed(2)}`,
      };

      dispatch({ type: 'REBALANCE_TRIGGERED', payload: { plan, event } });
    },
    [state.vaults, state.prices]
  );

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        startSimulation,
        stopSimulation,
        resetSimulation,
        triggerRebalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}