/**
 * Shared value & schema types for the QueryForge engine.
 *
 * The engine is intentionally DOM-free and dependency-free so the exact same
 * code runs in Vitest (Node), in a server, and in the browser playground.
 */

export type ColumnType = "INT" | "TEXT";

export type Value = number | string | null;

export interface ColumnDef {
  name: string;
  type: ColumnType;
  /** A primary-key column is unique, NOT NULL, and gets a B+tree index for free. */
  primaryKey?: boolean;
  /** A non-PK indexed column. (We index INT columns.) */
  indexed?: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnDef[];
  /** Name of the column that owns the primary B+tree index, if any. */
  indexColumn?: string;
  /** Page id of the heap directory (first heap page). */
  heapRoot: number;
  /** Page id of the B+tree root, if an index exists. */
  indexRoot?: number;
}

export type Row = Record<string, Value>;

/** A physical row address inside the heap: which page, which slot. */
export interface RowId {
  page: number;
  slot: number;
}

export const PAGE_SIZE = 4096;

export type PageKind = "meta" | "table" | "index" | "free";

export interface QueryStats {
  rowsScanned: number;
  rowsReturned: number;
  pageReads: number;
  pageWrites: number;
  nodeVisits: number;
  elapsedMs: number;
}

export class SqlError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message);
    this.name = "SqlError";
  }
}
