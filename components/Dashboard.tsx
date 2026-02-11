'use client';

import { useApp } from '@/lib/context';
import SimulationControls from './SimulationControls';
import PricePanel from './PricePanel';
import PriceChart from './PriceChart';
import VaultCard from './VaultCard';
import RebalancingPlan from './RebalancingPlan';
import EventLog from './EventLog';

export default function Dashboard() {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#F5F5F5] font-sans">
      <div className="h-16 lg:h-20 sticky top-0 z-50 bg-[#0C0C0C] border-b border-[#2A2A2A]">
        <div className="flex justify-between items-center w-full h-full max-w-6xl mx-auto px-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#6FBF6B] to-[#009959] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 154 154" fill="none">
                <path d="M42.5411 152.931C42.5465 153.012 42.5821 153.085 42.6366 153.14L103.028 105.45L150.659 45.1178C150.659 45.1178 34.6156 32.7864 42.5411 152.931Z" fill="white" fillOpacity="0.9"/>
                <path d="M150.661 45.1218L42.6392 153.144C42.6936 153.199 42.7673 153.234 42.8487 153.24C162.993 161.165 150.661 45.1218 150.661 45.1218Z" fill="white" fillOpacity="0.6"/>
                <path d="M42.4221 153.061C42.4835 153.114 42.5604 153.141 42.6377 153.141L51.619 76.7165L42.6377 0.375C42.6377 0.375 -48.1368 73.7101 42.4221 153.061Z" fill="white" fillOpacity="0.9"/>
                <path d="M42.6372 0.375V153.141C42.7144 153.141 42.7914 153.115 42.8528 153.061C133.412 73.7101 42.6372 0.375 42.6372 0.375Z" fill="white" fillOpacity="0.6"/>
              </svg>
            </div>
            <div>
              <span className="text-[#F5F5F5] text-lg font-medium tracking-tight">Risk Monitor</span>
              <span className="text-[#7A7A7A] text-sm ml-2">Vault Health Dashboard</span>
            </div>
          </div>
          <SimulationControls />
        </div>
      </div>

      <main className="max-w-6xl mx-auto py-6 lg:py-8 px-4 lg:px-10">
        <div className="flex flex-col gap-4 lg:gap-6">

          {/* Price + Chart row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3">
              <PricePanel />
            </div>
            <div className="lg:col-span-9">
              <PriceChart />
            </div>
          </div>

          {/* Vault cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {state.vaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>

          {/* Rebalancing plan — conditionally shown */}
          {state.rebalancingPlans.length > 0 && (
            <RebalancingPlan plans={state.rebalancingPlans} />
          )}

          {/* Event log */}
          {state.eventLog.length > 0 && (
            <EventLog entries={state.eventLog} />
          )}
        </div>
      </main>
    </div>
  );
}