"use client";

import type { PlanNode } from "@/engine";

const OP_TONE: Record<string, string> = {
  IndexScan: "border-index/60 bg-index/10 text-index",
  SeqScan: "border-dirty/50 bg-dirty/10 text-dirty",
  Scan: "border-ink-400 bg-ink-600 text-slatey-300",
  Filter: "border-ink-400 bg-ink-600 text-slatey-200",
  Sort: "border-ink-400 bg-ink-600 text-slatey-200",
  Project: "border-ink-400 bg-ink-600 text-slatey-200",
  Limit: "border-ink-400 bg-ink-600 text-slatey-200",
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
    return <div className="p-4 text-xs text-slatey-500">Run a SELECT to see its plan.</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`chip ${access === "index" ? "border-index/60 text-index" : "border-dirty/60 text-dirty"}`}
        >
          {access === "index" ? "INDEX SCAN" : "SEQ SCAN"}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-2xs text-slatey-300">
          <span className="font-mono">force full scan</span>
          <button
            type="button"
            role="switch"
            aria-checked={forceSeqScan}
            aria-label="Force a full table scan"
            onClick={() => onToggleForce(!forceSeqScan)}
            className={`relative h-4 w-8 cursor-pointer rounded-full border transition-colors duration-200 ${forceSeqScan ? "border-dirty bg-dirty/30" : "border-ink-400 bg-ink-600"}`}
          >
            <span
              className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all duration-200 ${forceSeqScan ? "left-4 bg-dirty" : "left-0.5 bg-slatey-400"}`}
            />
          </button>
        </label>
      </div>

      {reason && (
        <p className="rounded-md border border-ink-400 bg-ink-800/60 p-2.5 text-xs leading-relaxed text-slatey-300">
          {reason}
        </p>
      )}

      <section>
        <h3 className="panel-title mb-2">Physical plan</h3>
        <PlanTree node={physical} />
      </section>

      {logical && (
        <section>
          <h3 className="panel-title mb-2">Logical plan</h3>
          <PlanTree node={logical} muted />
        </section>
      )}
    </div>
  );
}

function PlanTree({ node, muted, depth = 0 }: { node: PlanNode; muted?: boolean; depth?: number }) {
  const tone = muted ? "border-ink-400 bg-ink-700 text-slatey-300" : OP_TONE[node.op] ?? "border-ink-400 bg-ink-600 text-slatey-200";
  return (
    <div className={depth ? "ml-3 border-l border-ink-400/60 pl-3" : ""}>
      <div className={`mb-1.5 rounded-md border px-2.5 py-1.5 ${tone}`}>
        <div className="flex items-center gap-2 font-mono text-xs font-semibold">
          {node.title}
          {node.badge && (
            <span className="rounded bg-black/30 px-1 py-px text-[9px] uppercase tracking-wide">
              {node.badge}
            </span>
          )}
        </div>
        {node.detail && <div className="mt-0.5 font-mono text-2xs text-slatey-400">{node.detail}</div>}
        {node.note && <div className="mt-0.5 text-2xs italic text-slatey-500">{node.note}</div>}
      </div>
      {node.children.map((c, i) => (
        <PlanTree key={i} node={c} muted={muted} depth={depth + 1} />
      ))}
    </div>
  );
}
