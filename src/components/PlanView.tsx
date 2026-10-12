"use client";

import type { PlanNode } from "@/engine";

const OP_TONE: Record<string, string> = {
  IndexScan:
    "border-[#3d2b7a] bg-[#0a0814] text-[#a78bfa]",
  SeqScan:
    "border-[#7a5500] bg-[#0a0800] text-[#ffb000]",
  Scan:
    "border-[#1f521f] bg-[#0d100d] text-[#8dcf7a]",
  Filter:
    "border-[#1f521f] bg-[#0d100d] text-[#c8ffb0]",
  Sort:
    "border-[#1f521f] bg-[#0d100d] text-[#c8ffb0]",
  Project:
    "border-[#1f521f] bg-[#0d100d] text-[#8dcf7a]",
  Limit:
    "border-[#1f521f] bg-[#0d100d] text-[#c8ffb0]",
};

export function PlanView({
  logical,
  physical,
  access,
  reason,
  forceSeqScan,
  onToggleForce,
}: {
  logical?: PlanNode;
  physical?: PlanNode;
  access?: "index" | "scan";
  reason?: string;
  forceSeqScan: boolean;
  onToggleForce: (v: boolean) => void;
}) {
  if (!physical) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="font-mono text-[#33ff00] text-xs font-bold uppercase tracking-widest mb-2">NO PLAN COMPILED</div>
        <div className="font-mono text-xs text-[#8dcf7a]">
          Execute a SELECT statement to inspect physical and logical plan trees.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 p-3.5">
      {/* Header: access type + force toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1f521f] pb-3">
        <span
          className={`chip text-xs font-bold px-2.5 py-1 ${
            access === "index"
              ? "border-[#3d2b7a] bg-[#0a0814] text-[#a78bfa]"
              : "border-[#7a5500] bg-[#0a0800] text-[#ffb000]"
          }`}
        >
          {access === "index" ? "→ INDEX SCAN PATH" : "→ SEQUENTIAL SCAN PATH"}
        </span>

        <label className="flex cursor-pointer items-center gap-2.5 font-mono text-xs font-semibold">
          <span className="text-[#8dcf7a] uppercase tracking-wider">
            FORCE FULL SCAN
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={forceSeqScan}
            aria-label="Force a full table scan"
            onClick={() => onToggleForce(!forceSeqScan)}
            className={`relative h-4.5 w-9 cursor-pointer border transition-colors duration-150 ${
              forceSeqScan
                ? "border-[#ffb000] bg-[#7a5500]/40"
                : "border-[#1f521f] bg-[#0a0a0a]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 transition-all duration-150 ${
                forceSeqScan
                  ? "left-5 bg-[#ffb000]"
                  : "left-0.5 bg-[#4a7a40]"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Optimizer reason */}
      {reason && (
        <div className="border border-[#1f521f] bg-[#0a0a0a] p-3 font-mono text-xs text-[#c8ffb0] leading-relaxed">
          <span className="text-[#33ff00] font-bold">-- OPTIMIZER RATIONALE: </span>
          {reason}
        </div>
      )}

      {/* Physical plan */}
      <section>
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#33ff00] font-bold mb-2.5">
          ┌─ PHYSICAL EXECUTION PLAN ─
        </div>
        <PlanTree node={physical} />
      </section>

      {/* Logical plan (collapsed/muted) */}
      {logical && (
        <section>
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#8dcf7a] font-bold mb-2.5">
            ┌─ LOGICAL PLAN ─
          </div>
          <PlanTree node={logical} muted />
        </section>
      )}
    </div>
  );
}

function PlanTree({
  node,
  muted,
  depth = 0,
}: {
  node: PlanNode;
  muted?: boolean;
  depth?: number;
}) {
  const tone = muted
    ? "border-[#1f521f] bg-[#0a0a0a] text-[#4a7a40]"
    : OP_TONE[node.op] ?? "border-[#1f521f] bg-[#0d100d] text-[#8dcf7a]";

  return (
    <div className={depth ? "ml-4 border-l border-[#1f521f] pl-4" : ""}>
      <div className={`mb-2 border px-3 py-2 ${tone}`}>
        <div className="flex items-center gap-2 font-mono text-sm font-bold">
          {node.title}
          {node.badge && (
            <span className="bg-black/40 px-1.5 py-0.5 text-xs uppercase tracking-wide border border-current">
              [{node.badge}]
            </span>
          )}
        </div>
        {node.detail && (
          <div className="mt-1 font-mono text-xs text-[#c8ffb0]">
            {node.detail}
          </div>
        )}
        {node.note && (
          <div className="mt-1 font-mono text-xs italic text-[#4a7a40]">
            -- {node.note}
          </div>
        )}
      </div>
      {node.children.map((c, i) => (
        <PlanTree key={i} node={c} muted={muted} depth={depth + 1} />
      ))}
    </div>
  );
}
