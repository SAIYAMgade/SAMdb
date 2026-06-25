# QueryForge — Deep Dive

A tour of how QueryForge actually works, from the bytes up. If the README is the trailer, this is the director's commentary.

---

## 1. Design goals (and the constraints they imposed)

1. **It must be a real engine, not a simulation.** No third-party database for storage. Rows live in pages; the index is a real B+tree; durability comes from a real WAL.
2. **The visualization must reflect real engine state.** This is the headline feature, so it's also a hard constraint: the playground may only render events the engine actually emitted. That forced a clean event-tracing seam through every layer.
3. **The core must be DOM-free.** The same engine code runs in Vitest (Node) and in the browser. No `window`, no React, no I/O assumptions in `src/engine/`.
4. **Correctness over surface area.** A small SQL grammar that is fully correct beats a large one that is subtly wrong. Property tests are the proof.

---

## 2. Folder structure

```
src/
├── engine/                  # the database — pure TypeScript, zero DOM deps
│   ├── types.ts             # Value/Row/Schema/RowId, PAGE_SIZE, SqlError
│   ├── trace.ts             # Tracer — the event bridge to the UI
│   ├── pager.ts             # fixed-size pages over a buffer
│   ├── serde.ts             # binary (de)serialization of rows & values
│   ├── heap.ts              # slotted-page row storage
│   ├── btree.ts             # B+tree index (nodes are pages)
│   ├── wal.ts               # write-ahead log (logical redo)
│   ├── tokenizer.ts         # hand-written lexer
│   ├── ast.ts               # AST node shapes
│   ├── parser.ts            # recursive-descent parser
│   ├── planner.ts           # logical + physical plans, optimizer
│   ├── executor.ts          # Volcano iterator operators
│   ├── database.ts          # orchestrator: catalog, WAL, execute(), crash/recover
│   ├── index.ts             # public API barrel
│   └── *.test.ts            # Vitest + fast-check
├── lib/
│   ├── site.ts              # identity + links (single source of truth)
│   ├── sample.ts            # deterministic demo seed + example queries
│   ├── playback.ts          # derive visual state from a trace at step N
│   └── useQueryForge.ts     # React hook: owns the Database, persists WAL
├── components/              # the playground UI (B+tree view, page grid, …)
└── app/                     # Next.js routes: playground, /about, /about-project
```

---

## 3. The life of a query

`Database.execute(sql)` is the front door. Here's `SELECT name FROM users WHERE id = 12`:

```
execute(sql)
  ├─ new Tracer()                      ← a fresh event stream for this query
  ├─ pager.setTracer(tracer)           ← scope page events to this run
  ├─ tokenize  → [SELECT, name, FROM, users, WHERE, id, =, 12]
  ├─ parse     → SelectStmt { columns:['name'], table:'users', where:{…} }
  ├─ optimize(stmt, schema)
  │     predicate on indexed column `id` → IndexScan, lo=hi=12
  │     reason: "Predicate 'id = 12' hits the B+tree…"
  ├─ compile(spec, env)  → Project( IndexScan(lo=12, hi=12, predicate) )
  └─ run(op)
        IndexScan.next():
          btree.range(12,12)  → emits btree.visit per node on the path
          heap.get(rowId)     → emits page.read
          evalPredicate       → emits row.scan { passed }
        Project.next() strips to {name}
        run() emits row.emit per output row
```

The returned `QueryResult` carries: the rows, the token list, the AST, both plans, a **snapshot of the B+tree**, a **snapshot of every page**, the full **trace** (ordered events), and **stats** (rows scanned/returned, page reads/writes, node visits, elapsed ms).

The playground holds one number — the timeline `step` — and `lib/playback.ts` replays `trace[0..step]` to compute exactly what's lit up. Nothing is invented; the animation is a function of the real event log.

---

## 4. Storage: pages all the way down

### The pager (`pager.ts`)

The backing store is an array of `Uint8Array`, each `PAGE_SIZE = 4096` bytes. Nothing above the pager touches the array directly — callers `allocate(kind)`, `read(id)`, get a `view(id)` (a `DataView`), and `write(id)`. Every operation emits a trace event, which is why the page grid can show precisely which pages a query touched. `clone()` deep-copies for snapshots; `wipe()` simulates power loss.

### Heap: slotted pages (`heap.ts`)

A table is a singly-linked chain of slotted pages:

```
┌──────── header (10B) ────────┬── slot dir →──────────  ← records ──────────┐
│ type | count | freeEnd | next │ s0 s1 s2 …        …    rec2 rec1 rec0       │
└──────────────────────────────────────────────────────────────────────────-┘
```

- The **slot directory** grows downward from the header; **records** grow upward from the end of the page. Free space is the gap between them.
- Each slot is `(offset: u16, length: u16)`. A `RowId` is `{ page, slot }`.
- `insert` caches the chain **tail** so appends are O(1) amortized; when the tail is full it links a fresh page.
- `scan()` walks the chain yielding `{ rowId, row }` — that's the `SeqScan` access path.

### Rows as real bytes (`serde.ts`)

Values are length-prefixed and tagged: `0` = null, `1` = number (`float64`, so integers up to 2⁵³ round-trip exactly), `2` = text (`u16` length + UTF-8). The byte sizes you see in the page grid are the real encoded sizes — not `JSON.stringify`.

---

## 5. The B+tree (`btree.ts`) — the hard part

Every node is exactly one page:

```
internal:  [ type | count | (unused) ] key0 key1 …  child0 child1 child2 …
leaf:      [ type | count | nextLeaf ] key0 key1 …  (page,slot) (page,slot) …
```

Keys are `float64`; leaf values are `RowId`s; leaves carry a `nextLeaf` pointer so a range scan is **descend once, then walk the bottom**.

### Insert & split

`insertInto` recurses to the correct leaf and inserts in sorted order. If a node exceeds `order` keys it **splits**, returning a `(promotedKey, rightPage)` pair to its parent:

- **Leaf split:** left keeps `ceil((order+1)/2)` keys, right gets the rest, the right's first key is **copied up**, and the leaf chain is re-linked.
- **Internal split:** the middle key is **moved up** (not copied), children are partitioned around it.
- If the split bubbles all the way to the root, the tree **grows a new root** — the only way a B+tree gets taller, which keeps every leaf at the same depth.

### The bug that cost two evenings

Two issues hid in the split path:

1. An internal split promoted the wrong separator under a specific fan-out.
2. When a node was re-serialized after shrinking, **stale bytes from the previous, larger node leaked into the next decode** — a leaf would "remember" keys it no longer had.

The fix for (2) is one line in `save()`: zero the node body before writing. fast-check shrank the failure to a four-key counterexample in seconds; without property testing it would have been a heisenbug for weeks. See [`btree.ts`](src/engine/btree.ts) `save()` and `splitInternal()`.

### Why a small node order?

Real engines pack hundreds of keys per page, making a tree only two levels deep — correct but visually dull. QueryForge defaults to **order 4** so inserts split nodes in front of you. The *algorithm* is unchanged; only the fan-out differs. The property tests run across orders 3–8 to make sure that choice doesn't hide bugs.

---

## 6. Durability: the write-ahead log (`wal.ts`)

QueryForge uses a **logical (operation-level) redo log** — the simplest correct WAL. Records are `CREATE TABLE` and `INSERT`; heap and index pages are *derived state*.

The rule that makes it work: **append the log record before applying the change.** Recovery is then trivial — `rebuildFromWal()` wipes the pager and replays every record in order, re-allocating pages deterministically.

- **Pull the plug** (`crash()`): wipe the pager and catalog, keep the WAL. The page grid empties; the data structures are gone.
- **Recover** (`recover()`): replay the log, emitting `wal.replay` events so the UI animates the rebuild.
- **Across reloads:** the hook serializes the WAL to `localStorage`, so the database survives a browser refresh and is reconstructed by replay on boot.

Tradeoff: logical logging means recovery re-does all work from the beginning of time (no checkpoints). For a teaching engine that's a feature — the whole story fits in one button. Checkpointing is listed under "what I'd improve next."

---

## 7. Planning & optimization (`planner.ts`)

The logical plan is the textbook shape: `Scan → Filter → Sort → Project → Limit`.

The optimizer applies two rules:

1. **Access-path selection.** It flattens the `WHERE` AND-chain and looks for comparisons on the **indexed column**. `=` becomes a point range `[v, v]`; `>`/`>=` set the low bound; `<`/`<=` set the high bound. If a usable predicate exists (and "force full scan" is off), it emits an `IndexScan` over that range; otherwise a `SeqScan`. The `reason` string explains the choice in English.
2. **Sort elimination.** If the access path is an index scan and `ORDER BY` is the index column ascending, the index *already* returns sorted rows — the `Sort` node is marked "skipped".

The physical plan is returned as a display tree **and** an `ExecSpec` the executor compiles. They're built together so they can never disagree.

---

## 8. Execution: the Volcano model (`executor.ts`)

Every operator implements one method: `next(): Tuple | null`. The top operator pulls from its child, which pulls from its child, down to the scan. This is why `LIMIT 10` can stop early without the scan ever reading row 11.

Operators: `SeqScanExec`, `IndexScanExec`, `SortExec` (buffers then sorts), `ProjectExec`, `LimitExec`.

**Filter pushdown:** the physical plan *shows* a separate `Filter` node for clarity, but the predicate is evaluated inside the scan operator the instant a row is read. Rows that fail still emit a `row.scan { passed: false }` event — which is exactly what powers the live "scanned vs. matched" counter. The index narrows *which* rows are read; the pushed-down predicate re-checks the exact condition (an index range can be loose, e.g. `<` is served as an inclusive range then rechecked), so correctness never depends on the optimizer being clever.

---

## 9. The trace bridge (`trace.ts` + `lib/playback.ts`)

`Tracer` is a tiny append-only event recorder threaded through the pager, B+tree, and executor. Event kinds: `phase`, `page.alloc/read/write`, `btree.visit/split`, `row.scan/emit`, `wal.append/replay`, `note`. It also keeps live counters for the stats panel.

`derive(events, step)` folds the first `step` events into a `PlaybackState`: which tree pages were visited (and the matched key), which pages were read/written/allocated, how many rows scanned vs. matched, the rows emitted so far, and the WAL lines. The components are pure renderers of that state. Swap the engine's behavior and the visualization follows automatically — there's only one source of truth.

---

## 10. What's intentionally simplified

Being honest about the edges (and ready to discuss them in an interview):

- **No DELETE/UPDATE.** Inserts only. Slotted pages support tombstones; it's scoped out, not impossible.
- **No transactions / MVCC.** Single-threaded, one statement at a time. The WAL is redo-only with no undo or checkpoints.
- **Indexes are unique and on INT columns.** The PK index assumes unique keys; duplicates replace. Secondary non-unique indexes would need value lists in leaves.
- **No JOINs yet.** The iterator model is built for them — nested-loop then hash join is the natural next step.
- **Logical WAL, no checkpointing.** Recovery replays from the start of history.

None of these compromise the parts that are built; they're the roadmap.

---

## 11. Testing strategy

- **Property tests (fast-check)** for the two places correctness is subtle: the B+tree (balance + lookup + range invariants across random inputs and orders) and the end-to-end executor (results match a brute-force reference; post-crash state equals pre-crash state).
- **Example/unit tests** for the parser (AST shape, escaped quotes, error positions) and the heap (byte round-trips, multi-page spill).
- A **deterministic seed** for the demo so the showcased run always looks the same.

Run them with `npm test`. The passing count lives in the README because correctness is the headline.
