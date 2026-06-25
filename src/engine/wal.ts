/**
 * Write-Ahead Log.
 *
 * Before any mutation is applied to pages, it is appended here as a logical redo
 * record. That ordering is the whole point of a WAL: if the process dies after
 * the log entry is durable but before the pages settle, recovery replays the log
 * and the database lands in a consistent state. The "pull the plug" demo in the
 * playground throws away the in-memory pages and rebuilds purely from this log.
 *
 * We use logical (operation-level) redo records — the simplest correct WAL — and
 * serialize them to JSON so the whole log survives a browser reload via
 * localStorage.
 */

import { Row } from "./types";

export type WalRecord =
  | {
      lsn: number;
      type: "create_table";
      table: string;
      columns: { name: string; type: "INT" | "TEXT"; primaryKey?: boolean; indexed?: boolean }[];
    }
  | { lsn: number; type: "insert"; table: string; row: Row };

/** Omit that distributes over a union, so each variant keeps its own fields. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export class Wal {
  private records: WalRecord[] = [];
  private nextLsn = 1;

  get length(): number {
    return this.records.length;
  }

  all(): readonly WalRecord[] {
    return this.records;
  }

  /** Append a record and return it with its assigned LSN. */
  append(rec: DistributiveOmit<WalRecord, "lsn">): WalRecord {
    const full = { ...rec, lsn: this.nextLsn++ } as WalRecord;
    this.records.push(full);
    return full;
  }

  serialize(): string {
    return JSON.stringify({ nextLsn: this.nextLsn, records: this.records });
  }

  static deserialize(json: string): Wal {
    const wal = new Wal();
    try {
      const parsed = JSON.parse(json) as { nextLsn: number; records: WalRecord[] };
      wal.records = parsed.records ?? [];
      wal.nextLsn = parsed.nextLsn ?? wal.records.length + 1;
    } catch {
      /* corrupt log — start empty */
    }
    return wal;
  }

  clear() {
    this.records = [];
    this.nextLsn = 1;
  }
}
