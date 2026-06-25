/**
 * Database — the orchestrator that ties every layer together.
 *
 * It owns the pager, the WAL, the in-memory catalog, and the per-table heaps and
 * indexes. A statement flows: parse → (DDL/DML mutate, logged to the WAL first)
 * or (SELECT → optimize → compile → run). Every call returns a fully traced
 * QueryResult the playground can replay frame by frame.
 *
 * Durability model: a *logical* write-ahead log. The WAL holds CREATE TABLE and
 * INSERT records; the heap/index pages are derived state. "Pull the plug" wipes
 * the derived state and "recover" rebuilds it by replaying the log — which is the
 * whole durability story in one button.
 */

import { Statement } from "./ast";
import { BTree } from "./btree";
import { compile, ExecEnv, run } from "./executor";
import { Heap, initHeapPage } from "./heap";
import { Pager } from "./pager";
import { Parser } from "./parser";
import { optimize, PlanNode } from "./planner";
import { Token } from "./tokenizer";
import { NULL_TRACER, TracedEvent, Tracer } from "./trace";
import { ColumnDef, PageKind, QueryStats, Row, SqlError, TableSchema, Value } from "./types";
import { Wal, WalRecord } from "./wal";

export interface PageSnapshot {
  id: number;
  kind: PageKind;
  dirty: boolean;
  fill: number; // 0..1 rough fullness, for the grid
  label: string;
}

export interface QueryResult {
  kind: "create" | "insert" | "select";
  table: string;
  columns: string[];
  rows: Row[];
  message: string;
  tokens: Token[];
  ast: Statement;
  logicalPlan?: PlanNode;
  physicalPlan?: PlanNode;
  access?: "index" | "scan";
  reason?: string;
  tree: { root: number; nodes: ReturnType<BTree["snapshot"]>["nodes"] } | null;
  pages: PageSnapshot[];
  trace: TracedEvent[];
  stats: QueryStats;
}

export interface DatabaseOptions {
  /** Max keys per B+tree node. Small = visible splits in the demo. */
  order?: number;
}

export class Database {
  private pager: Pager;
  private wal = new Wal();
  private catalog = new Map<string, TableSchema>();
  private order: number;

  constructor(opts: DatabaseOptions = {}) {
    this.order = opts.order ?? 4;
    this.pager = new Pager(NULL_TRACER);
  }

  // ---- public surface ------------------------------------------------------

  tables(): TableSchema[] {
    return [...this.catalog.values()];
  }

  getSchema(table: string): TableSchema | undefined {
    return this.catalog.get(table);
  }

  walRecords(): readonly WalRecord[] {
    return this.wal.all();
  }

  /** Parse + run a single statement, fully traced. */
  execute(sql: string, opts: { forceSeqScan?: boolean } = {}): QueryResult {
    const tracer = new Tracer();
    this.pager.setTracer(tracer);
    const t0 = now();

    tracer.phase("tokenize");
    const parser = new Parser(sql);
    const tokens = [...parser.tokenStream];

    tracer.phase("parse");
    const ast = parser.parseStatement();

    let result: QueryResult;
    if (ast.type === "create_table") result = this.runCreate(ast, tracer, tokens);
    else if (ast.type === "insert") result = this.runInsert(ast, tracer, tokens);
    else result = this.runSelect(ast, tracer, tokens, opts);

    result.stats.elapsedMs = round2(now() - t0);
    return result;
  }

  // ---- DDL -----------------------------------------------------------------

  private runCreate(
    ast: Extract<Statement, { type: "create_table" }>,
    tracer: Tracer,
    tokens: Token[],
  ): QueryResult {
    if (this.catalog.has(ast.table)) {
      throw new SqlError(`Table '${ast.table}' already exists`);
    }
    tracer.phase("execute", "CREATE TABLE");

    const columns: ColumnDef[] = ast.columns.map((c) => ({
      name: c.name,
      type: c.dataType,
      primaryKey: c.primaryKey,
      indexed: c.indexed,
    }));

    const schema = this.applyCreate(ast.table, columns, tracer);
    this.wal.append({ type: "create_table", table: ast.table, columns });
    tracer.emit({
      kind: "wal.append",
      lsn: this.wal.length,
      summary: `CREATE TABLE ${ast.table}`,
    });

    return this.finish(
      {
        kind: "create",
        table: ast.table,
        columns: [],
        rows: [],
        message: `Table '${ast.table}' created${schema.indexColumn ? ` with a B+tree index on '${schema.indexColumn}'` : ""}.`,
        tokens,
        ast,
        tree: schema.indexColumn ? this.treeSnapshot(schema) : null,
      },
      tracer,
    );
  }

  /** Allocate the physical structures for a new table. Shared by execute + replay. */
  private applyCreate(table: string, columns: ColumnDef[], tracer: Tracer): TableSchema {
    const heapRoot = this.pager.allocate("table");
    initHeapPage(this.pager, heapRoot);
    this.pager.write(heapRoot, "init heap root");

    const indexCol = columns.find((c) => c.primaryKey && c.type === "INT")?.name
      ?? columns.find((c) => c.indexed && c.type === "INT")?.name;

    let indexRoot: number | undefined;
    if (indexCol) indexRoot = BTree.createEmpty(this.pager, this.order);

    const schema: TableSchema = {
      name: table,
      columns,
      indexColumn: indexCol,
      heapRoot,
      indexRoot,
    };
    this.catalog.set(table, schema);
    return schema;
  }

  // ---- DML -----------------------------------------------------------------

  private runInsert(
    ast: Extract<Statement, { type: "insert" }>,
    tracer: Tracer,
    tokens: Token[],
  ): QueryResult {
    const schema = this.catalog.get(ast.table);
    if (!schema) throw new SqlError(`Unknown table '${ast.table}'`);
    tracer.phase("execute", "INSERT");

    const colNames = ast.columns ?? schema.columns.map((c) => c.name);
    let inserted = 0;
    for (const tuple of ast.rows) {
      if (tuple.length !== colNames.length) {
        throw new SqlError(
          `INSERT has ${tuple.length} values but ${colNames.length} columns were given`,
        );
      }
      const row = this.buildRow(schema, colNames, tuple);
      this.applyInsert(schema, row, tracer);
      this.wal.append({ type: "insert", table: ast.table, row });
      tracer.emit({
        kind: "wal.append",
        lsn: this.wal.length,
        summary: `INSERT INTO ${ast.table} ${shortRow(row)}`,
      });
      inserted++;
    }

    return this.finish(
      {
        kind: "insert",
        table: ast.table,
        columns: [],
        rows: [],
        message: `${inserted} row${inserted === 1 ? "" : "s"} inserted into '${ast.table}'.`,
        tokens,
        ast,
        tree: schema.indexColumn ? this.treeSnapshot(schema) : null,
      },
      tracer,
    );
  }

  private buildRow(schema: TableSchema, colNames: string[], values: Value[]): Row {
    const row: Row = {};
    for (const c of schema.columns) row[c.name] = null;
    colNames.forEach((name, i) => {
      const col = schema.columns.find((c) => c.name === name);
      if (!col) throw new SqlError(`Unknown column '${name}' on table '${schema.name}'`);
      let v = values[i];
      if (v !== null && col.type === "INT" && typeof v !== "number") {
        throw new SqlError(`Column '${name}' is INT but got '${v}'`);
      }
      if (v !== null && col.type === "TEXT" && typeof v !== "string") v = String(v);
      row[name] = v;
    });
    return row;
  }

  private applyInsert(schema: TableSchema, row: Row, tracer: Tracer) {
    const heap = new Heap(this.pager, tracer, schema);
    const rowId = heap.insert(row);
    if (schema.indexColumn && schema.indexRoot !== undefined) {
      const key = row[schema.indexColumn];
      if (typeof key === "number") {
        const tree = new BTree(this.pager, tracer, schema.indexRoot, this.order);
        tree.insert(key, rowId);
        schema.indexRoot = tree.rootPage; // root may have grown
      }
    }
  }

  // ---- SELECT --------------------------------------------------------------

  private runSelect(
    ast: Extract<Statement, { type: "select" }>,
    tracer: Tracer,
    tokens: Token[],
    opts: { forceSeqScan?: boolean },
  ): QueryResult {
    const schema = this.catalog.get(ast.table);
    if (!schema) throw new SqlError(`Unknown table '${ast.table}'`);

    tracer.phase("plan");
    const plan = optimize(ast, schema, opts);
    tracer.emit({ kind: "note", text: plan.reason });

    tracer.phase("execute", plan.access === "index" ? "IndexScan" : "SeqScan");
    const env: ExecEnv = {
      tracer,
      schema,
      heap: new Heap(this.pager, tracer, schema),
      index:
        schema.indexRoot !== undefined
          ? new BTree(this.pager, tracer, schema.indexRoot, this.order)
          : undefined,
    };
    const op = compile(plan.spec, env);
    const outColumns = ast.columns === "*" ? schema.columns.map((c) => c.name) : ast.columns;
    const rows = run(op, tracer, outColumns);

    return this.finish(
      {
        kind: "select",
        table: ast.table,
        columns: outColumns,
        rows,
        message: `${rows.length} row${rows.length === 1 ? "" : "s"} returned via ${plan.access === "index" ? "index scan" : "sequential scan"}.`,
        tokens,
        ast,
        logicalPlan: plan.logical,
        physicalPlan: plan.physical,
        access: plan.access,
        reason: plan.reason,
        tree: schema.indexColumn ? this.treeSnapshot(schema) : null,
      },
      tracer,
    );
  }

  // ---- durability: persist / recover / crash -------------------------------

  serialize(): string {
    return this.wal.serialize();
  }

  /** Rebuild a database purely from a serialized WAL (used on page reload). */
  static fromWal(json: string, opts: DatabaseOptions = {}): Database {
    const db = new Database(opts);
    db.wal = Wal.deserialize(json);
    db.rebuildFromWal(NULL_TRACER);
    return db;
  }

  /** Simulate power loss: throw away all derived state, keep only the WAL. */
  crash(): void {
    this.pager.wipe();
    this.catalog.clear();
  }

  /** Replay the WAL to reconstruct everything. Returns a traced result to animate. */
  recover(): QueryResult {
    const tracer = new Tracer();
    this.pager.setTracer(tracer);
    const t0 = now();
    tracer.phase("recover", "replaying write-ahead log");
    this.rebuildFromWal(tracer);
    const firstTable = this.catalog.values().next().value as TableSchema | undefined;
    const res = this.finish(
      {
        kind: "select",
        table: firstTable?.name ?? "",
        columns: [],
        rows: [],
        message: `Recovered ${this.catalog.size} table(s) and ${this.wal.length} log record(s) from the WAL.`,
        tokens: [],
        ast: { type: "select", columns: "*", table: firstTable?.name ?? "" },
        tree: firstTable?.indexColumn ? this.treeSnapshot(firstTable) : null,
      },
      tracer,
    );
    res.stats.elapsedMs = round2(now() - t0);
    return res;
  }

  private rebuildFromWal(tracer: Tracer) {
    this.pager.setTracer(tracer);
    this.pager.wipe();
    this.catalog.clear();
    for (const rec of this.wal.all()) {
      if (rec.type === "create_table") {
        this.applyCreate(rec.table, rec.columns, tracer);
        tracer.emit({ kind: "wal.replay", lsn: rec.lsn, summary: `CREATE TABLE ${rec.table}` });
      } else {
        const schema = this.catalog.get(rec.table);
        if (!schema) continue;
        this.applyInsert(schema, rec.row, tracer);
        tracer.emit({
          kind: "wal.replay",
          lsn: rec.lsn,
          summary: `INSERT INTO ${rec.table} ${shortRow(rec.row)}`,
        });
      }
    }
  }

  // ---- snapshots for the UI ------------------------------------------------

  private treeSnapshot(schema: TableSchema) {
    if (schema.indexRoot === undefined) return null;
    const tree = new BTree(this.pager, NULL_TRACER, schema.indexRoot, this.order);
    return tree.snapshot();
  }

  pageSnapshot(): PageSnapshot[] {
    return this.pager.snapshot().map((p) => {
      const fill = estimateFill(p.bytes, p.kind);
      return {
        id: p.id,
        kind: p.kind,
        dirty: p.dirty,
        fill,
        label: pageLabel(p.id, p.kind),
      };
    });
  }

  private finish(
    partial: Omit<QueryResult, "pages" | "trace" | "stats">,
    tracer: Tracer,
  ): QueryResult {
    return {
      ...partial,
      pages: this.pageSnapshot(),
      trace: tracer.events,
      stats: {
        rowsScanned: tracer.rowsScanned,
        rowsReturned: tracer.rowsReturned,
        pageReads: tracer.pageReads,
        pageWrites: tracer.pageWrites,
        nodeVisits: tracer.nodeVisits,
        elapsedMs: 0,
      },
    };
  }
}

// ---- helpers ---------------------------------------------------------------

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function shortRow(row: Row): string {
  const parts = Object.values(row).map((v) => (typeof v === "string" ? `'${v}'` : String(v)));
  return `(${parts.join(", ")})`;
}
function pageLabel(id: number, kind: PageKind): string {
  return `#${id} ${kind}`;
}
function estimateFill(bytes: Uint8Array, kind: PageKind): number {
  if (kind === "table") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const freeEnd = view.getUint16(4);
    return Math.min(1, Math.max(0, (bytes.length - freeEnd) / bytes.length));
  }
  if (kind === "index") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint16(2);
    return Math.min(1, count / 8);
  }
  return 0.1;
}
