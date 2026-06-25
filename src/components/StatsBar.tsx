"use client";

import type { QueryStats } from "@/engine";

function Stat({ label, value, tone = "text-slatey-200" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-ink-400 bg-ink-700 px-2.5 py-1.5">
      <span className="font-mono text-2xs uppercase tracking-wide text-slatey-500">{label}</span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export function StatsBar({ stats, access }: { stats?: QueryStats; access?: "index" | "scan" }) {
  if (!stats) return null;
  const efficiency =
    stats.rowsScanned > 0 ? Math.round((stats.rowsReturned / stats.rowsScanned) * 100) : 100;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      <Stat
        label="rows scanned"
        value={stats.rowsScanned}
        tone={access === "scan" ? "text-dirty" : "text-slatey-200"}
      />
      <Stat label="rows returned" value={stats.rowsReturned} tone="text-run" />
      <Stat label="node visits" value={stats.nodeVisits} tone="text-active" />
      <Stat label="page reads" value={stats.pageReads} />
      <Stat label="page writes" value={stats.pageWrites} tone={stats.pageWrites ? "text-dirty" : "text-slatey-200"} />
      <Stat label="elapsed" value={`${stats.elapsedMs} ms`} />
    </div>
  );
}
