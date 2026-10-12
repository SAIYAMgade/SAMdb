"use client";

import type { WalLine } from "@/lib/playback";

export function WalPanel({
  lines,
  totalRecords,
  crashed,
}: {
  lines: WalLine[];
  totalRecords: number;
  crashed: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center justify-between">
        <h3 className="panel-title">┌─ WRITE-AHEAD LOG ─</h3>
        <span className="chip font-semibold">
          {totalRecords} <span className="text-[#33ff00] font-bold ml-1">DURABLE RECORDS</span>
        </span>
      </div>

      {crashed && (
        <div className="border border-[#6b1414] bg-[#0a0505] p-3 font-mono text-xs text-[#ff3333]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#ff3333] mb-1">
            [CRASH] POWER LOSS SIMULATION
          </div>
          In-memory pages are purged — WAL records survived.
          <br />
          <span className="text-[#ffb000]">Execute</span>{" "}
          <span className="font-bold text-[#33ff00]">[ RECOVER ]</span>{" "}
          to replay the log and reconstruct tables.
        </div>
      )}

      {lines.length === 0 ? (
        <div className="font-mono text-xs text-[#8dcf7a] leading-relaxed">
          <div className="text-[#8dcf7a] mb-1">
            -- Every CREATE TABLE and INSERT operation is logged here
          </div>
          <div className="text-[#8dcf7a]">
            -- before physical pages mutate. Strict ordering guarantees
          </div>
          <div className="text-[#8dcf7a]">
            -- that crash recovery can rebuild derived state cleanly.
          </div>
          <div className="mt-2 text-[#4a7a40]">
            0 records in active filter window
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-1 font-mono text-xs">
          {lines.slice(-14).map((l, i) => (
            <li
              key={i}
              className={`flex items-center gap-2.5 border px-2.5 py-1.5 ${
                l.kind === "replay"
                  ? "border-[#1f521f] bg-[#0a110a] text-[#33ff00]"
                  : "border-[#1f521f] bg-[#0a0a0a] text-[#c8ffb0]"
              }`}
            >
              <span className="text-[#33ff00] font-bold shrink-0">LSN #{l.lsn}</span>
              <span className="text-[#4a7a40]">|</span>
              <span className="truncate">{l.summary}</span>
              {l.kind === "replay" && (
                <span className="ml-auto text-[#33ff00] font-bold shrink-0">↺ REPLAYED</span>
              )}
            </li>
          ))}
          {lines.length > 14 && (
            <li className="text-[#4a7a40] text-xs px-2.5 py-0.5">
              … {lines.length - 14} earlier records
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
