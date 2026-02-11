'use client';

import type { EventLogEntry } from '@/types';

interface EventLogProps {
  entries: EventLogEntry[];
}

function HFInline({ value }: { value: number }) {
  const color: string =
    value < 1.0
      ? 'text-red-500'
      : value < 1.15
        ? 'text-red-400'
        : value < 1.5
          ? 'text-amber-400'
          : 'text-[#009959]';

  return (
    <span className={`font-medium tabular-nums ${color}`}>
      {value.toFixed(2)}
    </span>
  );
}

export default function EventLog({ entries }: EventLogProps) {
  // Most recent first
  const sorted: EventLogEntry[] = [...entries].sort(
    (a: EventLogEntry, b: EventLogEntry) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <span className="text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">
        Event Log
      </span>

      <div className="mt-4 max-h-[280px] overflow-y-auto flex flex-col gap-2">
        {sorted.map((entry: EventLogEntry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#0C0C0C] border border-[#2A2A2A]"
          >
            {/* Timestamp */}
            <span className="text-[10px] text-[#7A7A7A] tabular-nums whitespace-nowrap mt-0.5">
              {new Date(entry.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>

            {/* Icon */}
            <div className="w-6 h-6 rounded-md bg-[#009959]/10 border border-[#009959]/20 flex items-center justify-center shrink-0">
              <span className="text-[#009959] text-xs">↻</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#F5F5F5]">
                  {entry.vaultId}
                </span>
                <span className="text-[10px] text-[#7A7A7A]">Rebalance</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-[#7A7A7A]">HF</span>
                <HFInline value={entry.healthFactorBefore} />
                <span className="text-xs text-[#7A7A7A]">→</span>
                <HFInline value={entry.healthFactorAfter} />
              </div>
              <p className="text-[10px] text-[#7A7A7A] mt-1 truncate">
                {entry.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}