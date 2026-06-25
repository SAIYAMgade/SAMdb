/**
 * Derives "what should be lit up right now" from the trace at a given step.
 *
 * The playground holds a single `step` value (driven by the timeline scrubber /
 * autoplay). Everything visual — which B+tree nodes glow, which pages flipped,
 * which rows have streamed out — is computed from the real event list up to that
 * step. Nothing here invents state; it only replays what the engine recorded.
 */

import type { TracedEvent } from "@/engine";
import type { Value } from "@/engine";

export interface TreeTouch {
  role: string;
  reason: string;
  hitKey?: number;
}

export interface WalLine {
  lsn: number;
  summary: string;
  kind: "append" | "replay";
}

export interface PlaybackState {
  phase: string;
  phaseDetail?: string;
  visitedTreePages: Map<number, TreeTouch>;
  splitPages: Set<number>;
  pageReads: Map<number, number>;
  pageWrites: Map<number, number>;
  pageAllocs: Set<number>;
  /** the single most-recently-touched targets, for the pulse animation */
  activeTreePage: number | null;
  activePage: number | null;
  activePageOp: "read" | "write" | "alloc" | null;
  splitJustHappened: { from: number; to: number } | null;
  rowsScanned: number;
  rowsPassed: number;
  emittedRows: Value[][];
  scanCursor: { page: number; slot: number; passed: boolean } | null;
  walLines: WalLine[];
  notes: string[];
}

export function derive(events: TracedEvent[], step: number): PlaybackState {
  const s: PlaybackState = {
    phase: "idle",
    visitedTreePages: new Map(),
    splitPages: new Set(),
    pageReads: new Map(),
    pageWrites: new Map(),
    pageAllocs: new Set(),
    activeTreePage: null,
    activePage: null,
    activePageOp: null,
    splitJustHappened: null,
    rowsScanned: 0,
    rowsPassed: 0,
    emittedRows: [],
    scanCursor: null,
    walLines: [],
    notes: [],
  };

  const upto = Math.min(step, events.length);
  for (let i = 0; i < upto; i++) {
    const e = events[i].event;
    const isLast = i === upto - 1;
    switch (e.kind) {
      case "phase":
        s.phase = e.phase;
        s.phaseDetail = e.detail;
        break;
      case "btree.visit":
        s.visitedTreePages.set(e.page, { role: e.role, reason: e.reason, hitKey: e.hitKey });
        if (isLast) s.activeTreePage = e.page;
        break;
      case "btree.split":
        s.splitPages.add(e.page);
        s.splitPages.add(e.newPage);
        if (isLast) s.splitJustHappened = { from: e.page, to: e.newPage };
        break;
      case "page.alloc":
        s.pageAllocs.add(e.page);
        if (isLast) {
          s.activePage = e.page;
          s.activePageOp = "alloc";
        }
        break;
      case "page.read":
        s.pageReads.set(e.page, (s.pageReads.get(e.page) ?? 0) + 1);
        if (isLast) {
          s.activePage = e.page;
          s.activePageOp = "read";
        }
        break;
      case "page.write":
        s.pageWrites.set(e.page, (s.pageWrites.get(e.page) ?? 0) + 1);
        if (isLast) {
          s.activePage = e.page;
          s.activePageOp = "write";
        }
        break;
      case "row.scan":
        s.rowsScanned++;
        if (e.passed) s.rowsPassed++;
        if (isLast) s.scanCursor = { page: e.rowId.page, slot: e.rowId.slot, passed: e.passed };
        break;
      case "row.emit":
        s.emittedRows.push(e.values);
        break;
      case "wal.append":
        s.walLines.push({ lsn: e.lsn, summary: e.summary, kind: "append" });
        break;
      case "wal.replay":
        s.walLines.push({ lsn: e.lsn, summary: e.summary, kind: "replay" });
        break;
      case "note":
        s.notes.push(e.text);
        break;
    }
  }
  return s;
}

/** A short, human label for the current phase, shown on the canvas. */
export function phaseLabel(phase: string): string {
  switch (phase) {
    case "tokenize":
      return "Tokenizing";
    case "parse":
      return "Parsing → AST";
    case "plan":
      return "Planning";
    case "execute":
      return "Executing";
    case "recover":
      return "Recovering from WAL";
    default:
      return phase;
  }
}
