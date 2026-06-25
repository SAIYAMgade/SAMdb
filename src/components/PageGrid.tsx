"use client";

import { PAGE_SIZE } from "@/engine";
import type { PageSnapshot } from "@/engine";
import type { PlaybackState } from "@/lib/playback";

const KIND_COLOR: Record<string, string> = {
  table: "#3a4658",
  index: "#a78bfa",
  meta: "#52606f",
  free: "#1b2433",
};

export function PageGrid({ pages, pb }: { pages: PageSnapshot[]; pb: PlaybackState }) {
  if (pages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <div className="font-mono text-sm text-slatey-300">No pages allocated yet</div>
        <div className="text-xs text-slatey-500">
          The pager hands out {PAGE_SIZE.toLocaleString()}-byte pages on demand. Run a query.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-3 pt-2 text-2xs text-slatey-400">
        <span className="font-mono">{pages.length} pages</span>
        <span className="font-mono">{PAGE_SIZE.toLocaleString()} B each</span>
        <span className="ml-auto inline-flex gap-2.5">
          <Dot c="#22d3ee" l="read" />
          <Dot c="#f59e0b" l="write" />
          <Dot c="#22c55e" l="new" />
        </span>
      </div>
      <div className="grid flex-1 content-start gap-2 overflow-auto p-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))" }}>
        {pages.map((p) => {
          const reads = pb.pageReads.get(p.id) ?? 0;
          const writes = pb.pageWrites.get(p.id) ?? 0;
          const isNew = pb.pageAllocs.has(p.id);
          const active = pb.activePage === p.id;
          let ring = "transparent";
          if (writes > 0) ring = "#f59e0b";
          else if (reads > 0) ring = "#22d3ee";
          if (isNew) ring = "#22c55e";

          const base = KIND_COLOR[p.kind] ?? "#3a4658";
          return (
            <div
              key={p.id}
              className={`group relative rounded-md border bg-ink-700 p-1.5 transition-colors duration-200 ${active && writes > 0 ? "animate-flip-page" : ""}`}
              style={{ borderColor: ring === "transparent" ? "#27313f" : ring, boxShadow: ring === "transparent" ? "none" : `0 0 0 1px ${ring}, 0 0 12px -4px ${ring}` }}
              title={`page #${p.id} · ${p.kind} · ${reads} reads · ${writes} writes${p.dirty ? " · dirty" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xs text-slatey-300">#{p.id}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: base }} />
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-slatey-500">{p.kind}</div>
              {/* fill bar */}
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-500">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(p.fill * 100)}%`, background: p.kind === "index" ? "#a78bfa" : "#22d3ee" }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-slatey-500">
                <span className="font-mono">{reads + writes > 0 ? `${reads}r/${writes}w` : "—"}</span>
                {p.dirty && <span className="font-mono text-dirty">dirty</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dot({ c, l }: { c: string; l: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
      {l}
    </span>
  );
}
