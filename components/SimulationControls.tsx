'use client';

import { useApp } from '@/lib/context';

export default function SimulationControls() {
  const { state, startSimulation, stopSimulation, resetSimulation } = useApp();
  const { simulationStatus } = state;

  const secondaryBtn = "px-4 py-2 text-sm font-medium cursor-pointer rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#333] text-[#F5F5F5] transition-all duration-200";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1A]">
        <span
          className={`h-2 w-2 rounded-full ${
            simulationStatus === 'running'
              ? 'bg-red-500 animate-pulse'
              : simulationStatus === 'stopped'
              ? 'bg-amber-500'
              : 'bg-[#009959]'
          }`}
        />
        <span className="text-xs font-medium text-[#A0A0A0]">
          {simulationStatus === 'running'
            ? 'Crash in progress'
            : simulationStatus === 'stopped'
            ? 'Rebalance needed'
            : 'Markets stable'}
        </span>
      </div>

      {simulationStatus === 'idle' && (
        <button
          onClick={startSimulation}
          className="px-4 py-2 text-sm font-medium cursor-pointer rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          Start Crash
        </button>
      )}

      {simulationStatus === 'running' && (
        <button onClick={stopSimulation} className={secondaryBtn}>
          Pause
        </button>
      )}

      {simulationStatus === 'stopped' && (
        <button onClick={resetSimulation} className={secondaryBtn}>
          Reset
        </button>
      )}
    </div>
  );
}