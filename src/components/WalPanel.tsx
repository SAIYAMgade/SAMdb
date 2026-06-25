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
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="panel-title">Write-ahead log</h3>
        <span className="chip">{totalRecords} records durable</span>
      </div>

      {crashed && (
        <div className="rounded-md border border-split-dim bg-split/10 p-2.5 text-xs text-split">
          Power lost. In-memory pages are gone — but the WAL survived. Hit <strong>Recover</strong> to
          replay it.
        </div>
      )}

      {lines.length === 0 ? (
        <p className="text-2xs text-slatey-500">
          Every CREATE and INSERT is appended here before the pages change. That ordering is what makes
          recovery possible.
        </p>
      ) : (
        <ol className="flex flex-col gap-1 font-mono text-2xs">
          {lines.slice(-12).map((l, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 rounded border px-2 py-1 ${
                l.kind === "replay"
                  ? "border-run-dim bg-run/10 text-run"
                  : "border-ink-400 bg-ink-800 text-slatey-300"
              }`}
            >
              <span className="text-slatey-500">LSN {l.lsn}</span>
              <span className="truncate">{l.summary}</span>
              {l.kind === "replay" && <span className="ml-auto text-2xs">replayed</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
