/**
 * Planner + rule-based optimizer.
 *
 * SELECT → logical plan (what to compute) → physical plan (how to compute it).
 * The one interesting decision is the access path: full table scan vs. index
 * scan. The optimizer looks for a usable predicate on the indexed column and,
 * if it finds one, replaces "scan every row then filter" with "jump into the
 * B+tree and walk only the matching range". The playground's "force full scan"
 * toggle flips this so you can feel the difference in the row-visit counter.
 */

import { Expr, OrderBy, SelectStmt } from "./ast";
import { TableSchema, Value } from "./types";

export interface PlanNode {
  op: string;
  title: string;
  detail?: string;
  badge?: "index" | "scan";
  note?: string;
  children: PlanNode[];
}

export interface IndexAccess {
  kind: "index";
  column: string;
  lo: number | null;
  hi: number | null;
}
export interface SeqAccess {
  kind: "seq";
}

export interface ExecSpec {
  table: string;
  access: IndexAccess | SeqAccess;
  predicate?: Expr; // full WHERE, re-checked after the access path (filter pushdown)
  orderBy?: OrderBy;
  sortAvoided: boolean;
  columns: "*" | string[];
  limit?: number;
}

export interface OptimizeResult {
  logical: PlanNode;
  physical: PlanNode;
  access: "index" | "scan";
  reason: string;
  spec: ExecSpec;
}

function flattenAnd(expr: Expr | undefined): Extract<Expr, { type: "compare" }>[] {
  if (!expr) return [];
  if (expr.type === "compare") return [expr];
  return [...flattenAnd(expr.left), ...flattenAnd(expr.right)];
}

function predicateText(expr: Expr): string {
  if (expr.type === "compare") {
    const v = typeof expr.value === "string" ? `'${expr.value}'` : String(expr.value);
    return `${expr.column} ${expr.op} ${v}`;
  }
  return `${predicateText(expr.left)} AND ${predicateText(expr.right)}`;
}

// ---- logical plan ----------------------------------------------------------

export function buildLogicalPlan(stmt: SelectStmt): PlanNode {
  let node: PlanNode = {
    op: "Scan",
    title: `Scan ${stmt.table}`,
    detail: "all rows",
    children: [],
  };
  if (stmt.where) {
    node = { op: "Filter", title: "Filter", detail: predicateText(stmt.where), children: [node] };
  }
  if (stmt.orderBy) {
    node = {
      op: "Sort",
      title: "Sort",
      detail: `${stmt.orderBy.column} ${stmt.orderBy.direction}`,
      children: [node],
    };
  }
  node = {
    op: "Project",
    title: "Project",
    detail: stmt.columns === "*" ? "*" : stmt.columns.join(", "),
    children: [node],
  };
  if (stmt.limit !== undefined) {
    node = { op: "Limit", title: `Limit ${stmt.limit}`, children: [node] };
  }
  return node;
}

// ---- physical plan / optimization -----------------------------------------

export function optimize(
  stmt: SelectStmt,
  schema: TableSchema,
  opts: { forceSeqScan?: boolean } = {},
): OptimizeResult {
  const comparisons = flattenAnd(stmt.where);
  const indexCol = schema.indexColumn;

  // Find usable predicates on the indexed column.
  let lo: number | null = null;
  let hi: number | null = null;
  let usable = false;
  let usableText = "";

  if (indexCol && !opts.forceSeqScan) {
    for (const c of comparisons) {
      if (c.column !== indexCol) continue;
      if (typeof c.value !== "number") continue;
      const val = c.value as number;
      switch (c.op) {
        case "=":
          lo = val;
          hi = val;
          usable = true;
          usableText = `${indexCol} = ${val}`;
          break;
        case ">":
        case ">=":
          lo = lo === null ? val : Math.max(lo, val);
          usable = true;
          break;
        case "<":
        case "<=":
          hi = hi === null ? val : Math.min(hi, val);
          usable = true;
          break;
        // '!=' is not range-usable; leave to the residual filter.
      }
    }
    if (usable && !usableText) {
      usableText = [
        lo !== null ? `${indexCol} >= ${lo}` : null,
        hi !== null ? `${indexCol} <= ${hi}` : null,
      ]
        .filter(Boolean)
        .join(" AND ");
    }
  }

  const useIndex = usable;
  const access: "index" | "scan" = useIndex ? "index" : "scan";

  let reason: string;
  if (opts.forceSeqScan && indexCol) {
    reason = `Full scan forced. An index on '${indexCol}' exists and could be used, but you asked to feel the cost of scanning every row.`;
  } else if (useIndex) {
    reason = `Predicate '${usableText}' hits the B+tree on '${indexCol}', so we descend the tree once and walk only the matching leaf range instead of reading every row.`;
  } else if (indexCol) {
    reason = `No range predicate on the indexed column '${indexCol}', so the index can't narrow the search — falling back to a sequential scan.`;
  } else {
    reason = `Table '${schema.name}' has no index, so a sequential scan over the heap is the only option.`;
  }

  // ORDER BY can be served for free if the index already returns sorted order.
  const sortAvoided =
    useIndex &&
    !!stmt.orderBy &&
    stmt.orderBy.column === indexCol &&
    stmt.orderBy.direction === "ASC";

  // Build the physical plan tree (for display).
  let node: PlanNode = useIndex
    ? {
        op: "IndexScan",
        title: `IndexScan ${schema.name}.${indexCol}`,
        detail: usableText,
        badge: "index",
        note: "B+tree range scan",
        children: [],
      }
    : {
        op: "SeqScan",
        title: `SeqScan ${schema.name}`,
        detail: "heap pages, front to back",
        badge: "scan",
        children: [],
      };

  if (stmt.where) {
    node = {
      op: "Filter",
      title: "Filter",
      detail: predicateText(stmt.where),
      note: "pushed into the scan (filter pushdown)",
      children: [node],
    };
  }
  if (stmt.orderBy && !sortAvoided) {
    node = {
      op: "Sort",
      title: "Sort",
      detail: `${stmt.orderBy.column} ${stmt.orderBy.direction}`,
      children: [node],
    };
  } else if (stmt.orderBy && sortAvoided) {
    node = {
      op: "Sort",
      title: "Sort (skipped)",
      detail: `${stmt.orderBy.column} ${stmt.orderBy.direction}`,
      note: "ordering already provided by the index",
      children: [node],
    };
  }
  node = {
    op: "Project",
    title: "Project",
    detail: stmt.columns === "*" ? "*" : stmt.columns.join(", "),
    children: [node],
  };
  if (stmt.limit !== undefined) {
    node = { op: "Limit", title: `Limit ${stmt.limit}`, children: [node] };
  }

  const spec: ExecSpec = {
    table: stmt.table,
    access: useIndex ? { kind: "index", column: indexCol!, lo, hi } : { kind: "seq" },
    predicate: stmt.where,
    orderBy: stmt.orderBy,
    sortAvoided,
    columns: stmt.columns,
    limit: stmt.limit,
  };

  return { logical: buildLogicalPlan(stmt), physical: node, access, reason, spec };
}
