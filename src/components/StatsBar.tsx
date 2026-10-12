"use client";

import type { QueryStats } from "@/engine";

function StatCell({
  label,
  value,
  color = "text-[#33ff00]",
  unit = "",
}: {
  label: string;
  value: number | string;
  color?: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col border-r border-[#1f521f] px-3.5 py-2.5 last:border-0">
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-[#8dcf7a] font-semibold">
        {label}
      </div>
      <div className={`font-mono text-base font-bold mt-0.5 ${color}`}>
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-[#8dcf7a]">{unit}</span>
        )}
      </div>
    </div>
  );
}

function BarGauge({
  label,
  scanned,
  returned,
}: {
  label: string;
  scanned: number;
  returned: number;
}) {
  const efficiency =
    scanned > 0 ? Math.round((returned / scanned) * 100) : 0;
  const filled = Math.round(efficiency / 10);
  const bar =
    "[" +
    "█".repeat(filled) +
    "·".repeat(10 - filled) +
    "]";

  return (
    <div className="border-r border-[#1f521f] px-3.5 py-2.5 last:border-0">
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-[#8dcf7a] font-semibold mb-1">
        {label}
      </div>
      <div className="font-mono text-xs text-[#8dcf7a] mt-0.5">
        <span className={efficiency > 50 ? "text-[#33ff00] font-bold" : efficiency > 20 ? "text-[#ffb000] font-bold" : "text-[#ff3333] font-bold"}>
          {bar}
        </span>
        <span className="ml-1.5 text-[#33ff00] font-bold">{efficiency}%</span>
      </div>
    </div>
  );
}

export function StatsBar({
  stats,
  access,
}: {
  stats: QueryStats | undefined;
  access?: "index" | "scan";
}) {
  return (
    <div className="panel shrink-0">
      <div className="panel-head">
        <span className="panel-title">┌─ EXECUTION STATS ─</span>
        {access && (
          <span
            className={`chip font-bold ${
              access === "index"
                ? "border-[#3d2b7a] bg-[#0a0814] text-[#a78bfa]"
                : "border-[#7a5500] bg-[#0a0800] text-[#ffb000]"
            }`}
          >
            {access === "index" ? "INDEX SCAN" : "SEQ SCAN"}
          </span>
        )}
      </div>
      <div className="flex flex-wrap divide-x divide-[#1f521f]">
        <StatCell
          label="ELAPSED"
          value={stats?.elapsedMs ?? 0}
          unit="ms"
          color={
            !stats
              ? "text-[#4a7a40]"
              : stats.elapsedMs < 1
              ? "text-[#33ff00]"
              : stats.elapsedMs < 10
              ? "text-[#ffb000]"
              : "text-[#ff3333]"
          }
        />
        <StatCell
          label="ROWS SCANNED"
          value={stats?.rowsScanned ?? 0}
          color="text-[#ffb000]"
        />
        <StatCell
          label="ROWS RETURNED"
          value={stats?.rowsReturned ?? 0}
          color="text-[#33ff00]"
        />
        <StatCell
          label="PAGE READS"
          value={stats?.pageReads ?? 0}
          color="text-[#c8ffb0]"
        />
        <StatCell
          label="PAGE WRITES"
          value={stats?.pageWrites ?? 0}
          color="text-[#ffb000]"
        />
        <StatCell
          label="NODE VISITS"
          value={stats?.nodeVisits ?? 0}
          color="text-[#a78bfa]"
        />
        {stats && (
          <BarGauge
            label="SELECTIVITY"
            scanned={stats.rowsScanned}
            returned={stats.rowsReturned}
          />
        )}
      </div>
    </div>
  );
}
