"use client";

import { useMemo } from "react";
import type { BTreeNodeView } from "@/engine";
import type { PlaybackState } from "@/lib/playback";

interface TreeSnap {
  root: number;
  nodes: BTreeNodeView[];
}

// ── Layout constants ───────────────────────────────────────────────────────
const CELL_W = 38;
const CELL_H = 32;
const V_GAP = 68;
const SLOT_W = 4 * CELL_W + 28;
const PAD_X = 32;
const PAD_TOP = 24;

interface Laid {
  page: number;
  type: "leaf" | "internal";
  keys: number[];
  x: number;
  y: number;
  w: number;
}
interface Edge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  childPage: number;
}

function layout(tree: TreeSnap) {
  const byPage = new Map(tree.nodes.map((n) => [n.page, n]));
  const laid = new Map<number, Laid>();
  const edges: Edge[] = [];
  let slot = 0;
  let maxDepth = 0;

  const nodeWidth = (n: BTreeNodeView) => Math.max(1, n.keys.length) * CELL_W;

  const place = (page: number, d: number): number => {
    const n = byPage.get(page);
    if (!n) return 0;
    maxDepth = Math.max(maxDepth, d);
    const w = nodeWidth(n);
    let centerX: number;
    if (n.type === "leaf" || n.children.length === 0) {
      centerX = PAD_X + slot * SLOT_W + SLOT_W / 2;
      slot++;
    } else {
      const childCenters = n.children.map((c) => place(c, d + 1));
      centerX = childCenters.reduce((a, b) => a + b, 0) / childCenters.length;
    }
    laid.set(page, {
      page,
      type: n.type,
      keys: n.keys,
      x: centerX - w / 2,
      y: PAD_TOP + d * (CELL_H + V_GAP),
      w,
    });
    return centerX;
  };
  place(tree.root, 0);

  for (const n of tree.nodes) {
    if (n.type === "internal") {
      const p = laid.get(n.page)!;
      for (const c of n.children) {
        const cl = laid.get(c);
        if (!cl) continue;
        edges.push({
          key: `${n.page}-${c}`,
          x1: p.x + p.w / 2,
          y1: p.y + CELL_H,
          x2: cl.x + cl.w / 2,
          y2: cl.y,
          childPage: c,
        });
      }
    }
  }

  const width = PAD_X * 2 + Math.max(1, slot) * SLOT_W;
  const height = PAD_TOP * 2 + (maxDepth + 1) * (CELL_H + V_GAP) - V_GAP + 28;
  return { nodes: [...laid.values()], edges, width, height };
}

export function BTreeView({
  tree,
  pb,
  indexColumn,
}: {
  tree: TreeSnap | null;
  pb: PlaybackState;
  indexColumn?: string;
}) {
  const L = useMemo(() => (tree ? layout(tree) : null), [tree]);

  if (!tree || !L || tree.nodes.length === 0) {
    return (
      <EmptyTree
        title="NO B+TREE INDEX ALLOCATED"
        sub="Execute CREATE TABLE with INT PRIMARY KEY, then INSERT tuples to expand the B+tree index."
      />
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <svg
        viewBox={`0 0 ${L.width} ${L.height}`}
        width={L.width}
        height={L.height}
        className="mx-auto block min-w-full"
        role="img"
        aria-label="B+tree index structure with the current query's search path highlighted"
      >
        {/* ── Edges ─────────────────────────────────────────────── */}
        {L.edges.map((e) => {
          const onPath = pb.visitedTreePages.has(e.childPage);
          return (
            <line
              key={e.key}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={onPath ? "#33ff00" : "#1f521f"}
              strokeWidth={onPath ? 2 : 1.25}
              strokeOpacity={onPath ? 1 : 0.6}
              strokeDasharray={onPath ? undefined : "4 3"}
            />
          );
        })}

        {/* ── Nodes ─────────────────────────────────────────────── */}
        {L.nodes.map((n) => {
          const touch = pb.visitedTreePages.get(n.page);
          const visited = !!touch;
          const split = pb.splitPages.has(n.page);
          const active = pb.activeTreePage === n.page;

          const strokeColor = split
            ? "#ff3333"
            : active
            ? "#33ff00"
            : visited
            ? "#33ff00"
            : n.type === "leaf"
            ? "#2a4a25"
            : "#1f521f";

          const fillColor = split
            ? "rgba(255,51,51,0.12)"
            : visited
            ? "rgba(51,255,0,0.08)"
            : "#0d100d";

          return (
            <g
              key={n.page}
              className={active ? "animate-pulse-node" : ""}
              style={{
                transformOrigin: `${n.x + n.w / 2}px ${n.y + CELL_H / 2}px`,
              }}
            >
              {/* Node frame — sharp corners, no radius */}
              <rect
                x={n.x - 2}
                y={n.y - 2}
                width={n.w + 4}
                height={CELL_H + 4}
                rx={0}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={visited || split || active ? 2 : 1.2}
              />

              {/* Key dividers */}
              {n.keys.slice(0, -1).map((_, i) => {
                const cx = n.x + (i + 1) * CELL_W;
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={n.y}
                    x2={cx}
                    y2={n.y + CELL_H}
                    stroke={visited ? "#1f521f" : "#111411"}
                    strokeWidth={1}
                  />
                );
              })}

              {/* Key values */}
              {(n.keys.length ? n.keys : [NaN]).map((k, i) => {
                const cx = n.x + i * CELL_W;
                const isHit =
                  touch?.hitKey !== undefined && touch.hitKey === k;
                return (
                  <g key={i}>
                    {isHit && (
                      <rect
                        x={cx + 1}
                        y={n.y + 1}
                        width={CELL_W - 2}
                        height={CELL_H - 2}
                        rx={0}
                        fill="rgba(51,255,0,0.2)"
                        stroke="#33ff00"
                        strokeWidth={2}
                      />
                    )}
                    <text
                      x={cx + CELL_W / 2}
                      y={n.y + CELL_H / 2 + 5}
                      textAnchor="middle"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize={13}
                      fontWeight={isHit ? 700 : 600}
                      fill={
                        isHit
                          ? "#33ff00"
                          : split
                          ? "#ff3333"
                          : visited
                          ? "#c8ffb0"
                          : "#8dcf7a"
                      }
                    >
                      {Number.isNaN(k) ? "·" : k}
                    </text>
                  </g>
                );
              })}

              {/* Node type + page tag */}
              <text
                x={n.x + n.w / 2}
                y={n.y + CELL_H + 16}
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize={10}
                fontWeight={600}
                fill={visited ? "#33ff00" : split ? "#ff3333" : "#4a7a40"}
              >
                {n.type === "leaf" ? "LEAF" : "INTERNAL"} #{n.page}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="pointer-events-none sticky bottom-0 left-0 flex flex-wrap gap-4 border-t border-[#1f521f] bg-[#0d100d] px-4 py-2 font-mono text-xs text-[#8dcf7a]">
        <Legend swatch="#33ff00" label="SEARCH PATH" />
        <Legend swatch="#33ff00" label="KEY HIT" bright />
        <Legend swatch="#ff3333" label="NODE SPLIT" />
        {indexColumn && (
          <span className="ml-auto text-[#8dcf7a] font-semibold">
            INDEX COLUMN: <span className="text-[#33ff00] font-bold">{indexColumn}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  bright,
}: {
  swatch: string;
  label: string;
  bright?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold">
      <span
        className="inline-block h-2.5 w-2.5"
        style={{
          background: swatch,
          opacity: bright ? 1 : 0.6,
          boxShadow: bright ? `0 0 6px ${swatch}` : "none",
        }}
      />
      {label}
    </span>
  );
}

function EmptyTree({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="font-mono text-xs text-[#33ff00] font-bold uppercase tracking-widest">
        {title}
      </div>
      <div className="font-mono text-xs text-[#8dcf7a] max-w-sm leading-relaxed">
        {sub}
      </div>
      <div className="mt-1 font-mono text-xs text-[#33ff00] border border-[#1f521f] bg-[#0a0a0a] px-3.5 py-1.5 font-semibold">
        Try: CREATE TABLE users (id INT PRIMARY KEY, name TEXT)
      </div>
    </div>
  );
}
