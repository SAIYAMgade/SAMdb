"use client";

import { PAGE_SIZE } from "@/engine";
import type { PageSnapshot } from "@/engine";
import type { PlaybackState } from "@/lib/playback";

// Terminal color palette for page kinds
const KIND_COLORS: Record<string, { stroke: string; fill: string; label: string; text: string }> = {
  table: { stroke: "#33ff00", fill: "#0a110a", label: "TABLE", text: "#8dcf7a" },
  index: { stroke: "#a78bfa", fill: "#0a0814", label: "INDEX", text: "#c4b5fd" },
  meta:  { stroke: "#4a7a40", fill: "#0a0a0a", label: "META",  text: "#4a7a40" },
  free:  { stroke: "#1f521f", fill: "#0a0a0a", label: "FREE",  text: "#2a4a25" },
};

export function PageGrid({
  pages,
  pb,
}: {
  pages: PageSnapshot[];
  pb: PlaybackState;
}) {
  if (pages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="font-mono text-xs text-[#33ff00] font-bold uppercase tracking-widest">
          NO PAGES ALLOCATED
        </div>
        <div className="font-mono text-xs text-[#8dcf7a] max-w-sm leading-relaxed">
          The pager hands out {PAGE_SIZE.toLocaleString()}-byte slotted pages on demand.
          Execute a statement to allocate pages.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Legend bar */}
      <div className="flex items-center gap-4 px-4 pt-2 pb-1.5 font-mono text-xs text-[#8dcf7a]">
        <span>
          <span className="text-[#33ff00] font-bold">{pages.length}</span> pages ×{" "}
          <span className="text-[#c8ffb0]">{PAGE_SIZE.toLocaleString()}B</span>
        </span>
        <span className="ml-auto flex gap-3">
          <Indicator color="#33ff00" label="READ" />
          <Indicator color="#ffb000" label="WRITE" />
          <Indicator color="#c8ffb0" label="ALLOC" />
        </span>
      </div>

      {/* Page tiles */}
      <div
        className="grid flex-1 content-start gap-2 overflow-auto p-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}
      >
        {pages.map((p) => {
          const reads = pb.pageReads.get(p.id) ?? 0;
          const writes = pb.pageWrites.get(p.id) ?? 0;
          const isNew = pb.pageAllocs.has(p.id);
          const active = pb.activePage === p.id;

          const kindColors = KIND_COLORS[p.kind] ?? KIND_COLORS.table;

          // Determine activity indicator
          let accentColor = "transparent";
          if (writes > 0) accentColor = "#ffb000";
          else if (reads > 0) accentColor = "#33ff00";
          if (isNew) accentColor = "#c8ffb0";

          return (
            <div
              key={p.id}
              className={`relative border p-2 font-mono transition-all duration-150 ${
                active && writes > 0 ? "animate-flip-page" : ""
              }`}
              style={{
                borderColor:
                  accentColor !== "transparent" ? accentColor : kindColors.stroke,
                backgroundColor: kindColors.fill,
                boxShadow:
                  accentColor !== "transparent"
                    ? `0 0 8px ${accentColor}60`
                    : "none",
              }}
              title={`page #${p.id} · ${p.kind} · ${reads}r/${writes}w${
                p.dirty ? " · dirty" : ""
              }`}
            >
              {/* Page number */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#33ff00]">#{p.id}</span>
                <span
                  className="h-2 w-2"
                  style={{ backgroundColor: kindColors.stroke }}
                />
              </div>

              {/* Page kind label */}
              <div
                className="mt-1 text-xs uppercase tracking-wider font-semibold"
                style={{ color: kindColors.text }}
              >
                {kindColors.label}
              </div>

              {/* Fill bar — square corners, terminal style */}
              <div className="mt-1.5 h-1 bg-[#1f521f]">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.round(p.fill * 100)}%`,
                    backgroundColor: kindColors.stroke,
                  }}
                />
              </div>

              {/* Access counts */}
              <div className="mt-1 text-xs text-[#8dcf7a] font-medium">
                {reads + writes > 0 ? `${reads}r · ${writes}w` : "idle"}
              </div>

              {/* Active flash indicator */}
              {active && (
                <div
                  className="absolute inset-0"
                  style={{
                    boxShadow: `inset 0 0 0 1.5px ${accentColor}`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Indicator({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold">
      <span className="inline-block h-2 w-2" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
