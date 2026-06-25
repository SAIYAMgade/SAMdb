/**
 * Execution engine — the Volcano (iterator) model.
 *
 * Every operator exposes the same tiny interface: `next()` returns the next
 * tuple or null when exhausted. Operators are wired into a pipeline and the top
 * one pulls from its child, which pulls from its child, and so on down to the
 * scan at the bottom. This is how real databases execute plans, and it's why a
 * LIMIT can stop early without the scan ever reading the rest of the table.
 *
 * The WHERE predicate is pushed down into the scan operator (filter pushdown),
 * so a row is tested the moment it's read — and that test is what feeds the
 * row-visit counter in the playground.
 */

import { CompareOp, Expr, OrderBy } from "./ast";
import { BTree } from "./btree";
import { Heap } from "./heap";
import { ExecSpec } from "./planner";
import { Tracer } from "./trace";
import { Row, RowId, SqlError, TableSchema, Value } from "./types";

export interface Tuple {
  row: Row;
  rowId: RowId | null;
}

export interface ExecEnv {
  tracer: Tracer;
  schema: TableSchema;
  heap: Heap;
  index?: BTree;
}

export interface Operator {
  next(): Tuple | null;
}

// ---- predicate evaluation --------------------------------------------------

function applyOp(op: CompareOp, a: Value, b: Value): boolean {
  if (a === null || b === null) return false; // NULL compares as unknown → not matched
  let cmp: number;
  if (typeof a === "number" && typeof b === "number") cmp = a - b;
  else cmp = String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  switch (op) {
    case "=":
      return cmp === 0;
    case "!=":
      return cmp !== 0;
    case "<":
      return cmp < 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case ">=":
      return cmp >= 0;
  }
}

export function evalPredicate(expr: Expr, row: Row): boolean {
  if (expr.type === "and") return evalPredicate(expr.left, row) && evalPredicate(expr.right, row);
  return applyOp(expr.op, row[expr.column] ?? null, expr.value);
}

// ---- access-path operators -------------------------------------------------

class SeqScanExec implements Operator {
  private it: Generator<{ rowId: RowId; row: Row }>;
  constructor(private env: ExecEnv, private predicate?: Expr) {
    this.it = env.heap.scan();
  }
  next(): Tuple | null {
    for (;;) {
      const n = this.it.next();
      if (n.done) return null;
      const { row, rowId } = n.value;
      const passed = this.predicate ? evalPredicate(this.predicate, row) : true;
      this.env.tracer.emit({ kind: "row.scan", rowId, passed });
      if (passed) return { row, rowId };
    }
  }
}

class IndexScanExec implements Operator {
  private it: Generator<{ key: number; rowId: RowId }>;
  constructor(
    private env: ExecEnv,
    lo: number | null,
    hi: number | null,
    private predicate?: Expr,
  ) {
    if (!env.index) throw new Error("IndexScanExec without an index");
    this.it = env.index.range(lo, hi);
  }
  next(): Tuple | null {
    for (;;) {
      const n = this.it.next();
      if (n.done) return null;
      const { rowId } = n.value;
      const row = this.env.heap.get(rowId);
      const passed = this.predicate ? evalPredicate(this.predicate, row) : true;
      this.env.tracer.emit({ kind: "row.scan", rowId, passed });
      if (passed) return { row, rowId };
    }
  }
}

// ---- shaping operators -----------------------------------------------------

class SortExec implements Operator {
  private buffer: Tuple[] | null = null;
  private idx = 0;
  constructor(private child: Operator, private orderBy: OrderBy, private schema: TableSchema) {}
  private materialize() {
    const rows: Tuple[] = [];
    let t: Tuple | null;
    while ((t = this.child.next())) rows.push(t);
    const { column, direction } = this.orderBy;
    const dir = direction === "DESC" ? -1 : 1;
    rows.sort((a, b) => {
      const av = a.row[column] ?? null;
      const bv = b.row[column] ?? null;
      if (av === null && bv === null) return 0;
      if (av === null) return -1 * dir;
      if (bv === null) return 1 * dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * dir;
    });
    this.buffer = rows;
  }
  next(): Tuple | null {
    if (this.buffer === null) this.materialize();
    if (this.idx >= this.buffer!.length) return null;
    return this.buffer![this.idx++];
  }
}

class ProjectExec implements Operator {
  constructor(private child: Operator, private columns: "*" | string[]) {}
  next(): Tuple | null {
    const t = this.child.next();
    if (!t) return null;
    if (this.columns === "*") return t;
    const projected: Row = {};
    for (const c of this.columns) projected[c] = t.row[c] ?? null;
    return { row: projected, rowId: t.rowId };
  }
}

class LimitExec implements Operator {
  private produced = 0;
  constructor(private child: Operator, private n: number) {}
  next(): Tuple | null {
    if (this.produced >= this.n) return null;
    const t = this.child.next();
    if (!t) return null;
    this.produced++;
    return t;
  }
}

// ---- compilation -----------------------------------------------------------

function ensureColumn(schema: TableSchema, name: string) {
  if (!schema.columns.some((c) => c.name === name)) {
    throw new SqlError(`Unknown column '${name}' on table '${schema.name}'`);
  }
}

export function compile(spec: ExecSpec, env: ExecEnv): Operator {
  // validate referenced columns early for friendly errors
  if (spec.columns !== "*") spec.columns.forEach((c) => ensureColumn(env.schema, c));
  if (spec.orderBy) ensureColumn(env.schema, spec.orderBy.column);

  let op: Operator =
    spec.access.kind === "index"
      ? new IndexScanExec(env, spec.access.lo, spec.access.hi, spec.predicate)
      : new SeqScanExec(env, spec.predicate);

  if (spec.orderBy && !spec.sortAvoided) {
    op = new SortExec(op, spec.orderBy, env.schema);
  }
  op = new ProjectExec(op, spec.columns);
  if (spec.limit !== undefined) op = new LimitExec(op, spec.limit);
  return op;
}

/** Drain an operator pipeline into result rows, emitting one row.emit per output. */
export function run(op: Operator, tracer: Tracer, columns: string[]): Row[] {
  const out: Row[] = [];
  let t: Tuple | null;
  while ((t = op.next())) {
    out.push(t.row);
    tracer.emit({ kind: "row.emit", values: columns.map((c) => t!.row[c] ?? null) });
  }
  return out;
}
