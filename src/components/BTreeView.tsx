"use client";

import { useMemo } from "react";
import type { BTreeNodeView } from "@/engine";
import type { PlaybackState } from "@/lib/playback";

interface TreeSnap {
  root: number;
  nodes: BTreeNodeView[];
}

const CELL_W = 30;
const CELL_H = 26;
const V_GAP = 62;
const SLOT_W = 4 * CELL_W + 22;
const PAD_X = 24;
const PAD_TOP = 20;

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
  const depth = new Map<number, number>();
  const laid = new Map<number, Laid>();
  const edges: Edge[] = [];
  let slot = 0;
  let maxDepth = 0;

  const nodeWidth = (n: BTreeNodeView) => Math.max(1, n.keys.length) * CELL_W;

  const place = (page: number, d: number): number => {
    const n = byPage.get(page);
    if (!n) return 0;
    depth.set(page, d);
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

  // build edges parent → child
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
  const height = PAD_TOP * 2 + (maxDepth + 1) * (CELL_H + V_GAP) - V_GAP + 22;
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
      <Empty
        title="No index allocated"
        sub="Create a table with an INT PRIMARY KEY, then insert rows to grow a B+tree."
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
        {/* edges */}
        {L.edges.map((e) => {
          const onPath = pb.visitedTreePages.has(e.childPage);
          return (
            <line
              key={e.key}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={onPath ? "#22d3ee" : "#27313f"}
              strokeWidth={onPath ? 2 : 1.25}
              strokeOpacity={onPath ? 0.9 : 0.7}
            />
          );
        })}

        {/* nodes */}
        {L.nodes.map((n) => {
          const touch = pb.visitedTreePages.get(n.page);
          const visited = !!touch;
          const split = pb.splitPages.has(n.page);
          const active = pb.activeTreePage === n.page;
          const stroke = split ? "#fb7185" : visited ? "#22d3ee" : n.type === "leaf" ? "#3a4658" : "#475569";
          return (
            <g key={n.page} className={active ? "animate-pulse-node" : ""} style={{ transformOrigin: `${n.x + n.w / 2}px ${n.y + CELL_H / 2}px` }}>
              {/* node frame */}
              <rect
                x={n.x - 3}
                y={n.y - 3}
                width={n.w + 6}
                height={CELL_H + 6}
                rx={5}
                fill={visited ? "rgba(34,211,238,0.08)" : "#0f1620"}
                stroke={stroke}
                strokeWidth={visited || split ? 1.8 : 1.2}
              />
              {/* key cells */}
              {(n.keys.length ? n.keys : [NaN]).map((k, i) => {
                const cx = n.x + i * CELL_W;
                const isHit = touch?.hitKey !== undefined && touch.hitKey === k;
                return (
                  <g key={i}>
                    {i > 0 && (
                      <line x1={cx} y1={n.y} x2={cx} y2={n.y + CELL_H} stroke="#1b2433" strokeWidth={1} />
                    )}
                    <text
                      x={cx + CELL_W / 2}
                      y={n.y + CELL_H / 2 + 4}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize={12}
                      fill={isHit ? "#22c55e" : visited ? "#e6edf3" : "#9aa8b8"}
                      fontWeight={isHit ? 700 : 500}
                    >
                      {Number.isNaN(k) ? "·" : k}
                    </text>
                    {isHit && (
                      <rect
                        x={cx + 1}
                        y={n.y + 1}
                        width={CELL_W - 2}
                        height={CELL_H - 2}
                        rx={3}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                      />
                    )}
                  </g>
                );
              })}
              {/* page tag */}
              <text
                x={n.x + n.w / 2}
                y={n.y + CELL_H + 13}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={9}
                fill={visited ? "#67e8f9" : "#52606f"}
              >
                {n.type === "leaf" ? "leaf" : "node"} #{n.page}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="pointer-events-none sticky bottom-0 left-0 flex flex-wrap gap-3 px-3 py-2 text-2xs text-slatey-400">
        <Legend swatch="#22d3ee" label="search path" />
        <Legend swatch="#22c55e" label="key match" />
        <Legend swatch="#fb7185" label="split" />
        {indexColumn && <span className="font-mono">index on {indexColumn}</span>}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  );
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="font-mono text-sm text-slatey-300">{title}</div>
      <div className="max-w-xs text-xs text-slatey-500">{sub}</div>
    </div>
  );
}
