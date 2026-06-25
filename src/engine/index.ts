/**
 * Public surface of the QueryForge engine.
 *
 * Pure TypeScript, zero DOM dependencies — the same code that the playground
 * imports is what the Vitest property tests hammer. Import from "@/engine".
 */

export { Database } from "./database";
export type { QueryResult, PageSnapshot, DatabaseOptions } from "./database";
export { Pager } from "./pager";
export { Heap } from "./heap";
export { BTree } from "./btree";
export type { BTreeNodeView } from "./btree";
export { Wal } from "./wal";
export type { WalRecord } from "./wal";
export { Parser } from "./parser";
export { tokenize } from "./tokenizer";
export type { Token, TokenType } from "./tokenizer";
export { Tracer } from "./trace";
export type { TraceEvent, TracedEvent } from "./trace";
export { optimize, buildLogicalPlan } from "./planner";
export type { PlanNode, OptimizeResult } from "./planner";
export type {
  Statement,
  SelectStmt,
  InsertStmt,
  CreateTableStmt,
  Expr,
  CompareOp,
} from "./ast";
export type {
  Value,
  Row,
  ColumnType,
  ColumnDef,
  TableSchema,
  QueryStats,
  RowId,
} from "./types";
export { SqlError, PAGE_SIZE } from "./types";
