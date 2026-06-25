/**
 * The Tracer is the bridge between the engine and the visualization.
 *
 * Every layer (pager, B+tree, executor) writes structured events here as it
 * runs. The playground replays these events to animate exactly what happened —
 * no mock, no re-creation. If the engine didn't touch a page, no event exists
 * for it, so the UI literally cannot lie about the internals.
 */

import type { PageKind, RowId, Value } from "./types";

export type TraceEvent =
  | { kind: "phase"; phase: string; detail?: string }
  | { kind: "page.alloc"; page: number; pageKind: PageKind }
  | { kind: "page.read"; page: number; pageKind: PageKind; note?: string }
  | { kind: "page.write"; page: number; pageKind: PageKind; note?: string }
  | {
      kind: "btree.visit";
      page: number;
      role: "root" | "internal" | "leaf";
      keys: number[];
      reason: string;
      hitKey?: number;
    }
  | {
      kind: "btree.split";
      page: number;
      newPage: number;
      promotedKey: number;
      role: "internal" | "leaf";
    }
  | { kind: "row.scan"; rowId: RowId; passed: boolean }
  | { kind: "row.emit"; values: Value[] }
  | { kind: "wal.append"; lsn: number; summary: string }
  | { kind: "wal.replay"; lsn: number; summary: string }
  | { kind: "note"; text: string };

export interface TracedEvent {
  id: number;
  /** Monotonic step index for the time-travel scrubber. */
  step: number;
  event: TraceEvent;
}

export class Tracer {
  private seq = 0;
  readonly events: TracedEvent[] = [];

  // Live counters the executor surfaces in QueryStats.
  pageReads = 0;
  pageWrites = 0;
  nodeVisits = 0;
  rowsScanned = 0;
  rowsReturned = 0;

  private enabled = true;

  /** Disable tracing during bulk seeding so we don't record millions of events. */
  pause() {
    this.enabled = false;
  }
  resume() {
    this.enabled = true;
  }

  emit(event: TraceEvent) {
    switch (event.kind) {
      case "page.read":
        this.pageReads++;
        break;
      case "page.write":
        this.pageWrites++;
        break;
      case "btree.visit":
        this.nodeVisits++;
        break;
      case "row.scan":
        this.rowsScanned++;
        break;
      case "row.emit":
        this.rowsReturned++;
        break;
    }
    if (!this.enabled) return;
    this.events.push({ id: this.seq, step: this.seq, event });
    this.seq++;
  }

  phase(phase: string, detail?: string) {
    this.emit({ kind: "phase", phase, detail });
  }
}

/** A no-op tracer for hot paths / property tests where we don't care about events. */
export const NULL_TRACER = new (class extends Tracer {
  emit() {
    /* swallow */
  }
})();
