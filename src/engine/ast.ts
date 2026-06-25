/**
 * AST shapes for the supported SQL subset.
 *
 * The grammar is deliberately small — CREATE TABLE / INSERT / SELECT with
 * WHERE (AND-chains of comparisons), ORDER BY, and LIMIT. A small grammar that
 * is fully correct beats a big one that is subtly wrong, and every node here is
 * something the planner and executor genuinely understand.
 */

import { ColumnType, Value } from "./types";

export type CompareOp = "=" | "!=" | "<" | "<=" | ">" | ">=";

export type Expr =
  | { type: "and"; left: Expr; right: Expr }
  | { type: "compare"; column: string; op: CompareOp; value: Value };

export interface ColumnSpec {
  name: string;
  dataType: ColumnType;
  primaryKey?: boolean;
  indexed?: boolean;
}

export interface CreateTableStmt {
  type: "create_table";
  table: string;
  columns: ColumnSpec[];
}

export interface InsertStmt {
  type: "insert";
  table: string;
  columns: string[] | null; // null = all columns, in schema order
  rows: Value[][];
}

export interface OrderBy {
  column: string;
  direction: "ASC" | "DESC";
}

export interface SelectStmt {
  type: "select";
  columns: "*" | string[];
  table: string;
  where?: Expr;
  orderBy?: OrderBy;
  limit?: number;
}

export type Statement = CreateTableStmt | InsertStmt | SelectStmt;
