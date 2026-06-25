<div align="center">

# QueryForge

### A SQL database engine built from scratch — with the internals on screen.

Storage engine · B+tree index · write-ahead log · hand-written parser · rule-based planner · iterator executor.
No ORM. No Postgres underneath. **You wrote the thing under the thing.**

[**▶ Live playground**](https://queryforge.charanreddy.dev) &nbsp;·&nbsp; [The build story](https://queryforge.charanreddy.dev/about-project) &nbsp;·&nbsp; [About](https://queryforge.charanreddy.dev/about)

![tests](https://img.shields.io/badge/tests-23%20passing-22c55e) ![property based](https://img.shields.io/badge/fast--check-property%20tested-a78bfa) ![engine](https://img.shields.io/badge/engine-0%20deps%2C%20DOM--free-22d3ee) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![license](https://img.shields.io/badge/license-MIT-64748b)

</div>

> _Screenshot / GIF goes here — drop `docs/playground.png` and a `docs/recovery.gif` in and update these paths._
>
> ![QueryForge playground](docs/playground.png)

---

## The wow moment

You type:

```sql
SELECT name, age FROM users WHERE id = 12
```

…and on screen, in real time:

1. the **tokenizer** turns it into tokens, the **parser** builds an AST,
2. the **planner** notices `id` is indexed and picks an **index scan**,
3. the **B+tree** lights up the exact nodes it visits as it descends to the key,
4. the **pages** flip as they're read,
5. and the matching **row streams out**.

Then flip one toggle — **force full scan** — and watch the row-visit counter jump from `3` to `18`. That's the cost of a missing index, made visible.

Every highlight is replayed from the engine's own event log. **If the engine didn't do it, you don't see it.** No mocks.

---

## What's actually in here

This is a real (small) database, built in honest layers — each one independently testable and independently visualizable.

| Layer | What it does |
|---|---|
| **Pager** | Hands out fixed-size **4 KB pages** over a backing buffer. Tracks reads/writes/allocs. |
| **Heap** | Stores rows in a chain of **slotted pages** (the same layout Postgres/SQLite use). |
| **B+tree** | A real B+tree where **every node is a page**. Insert, point lookup, range scan; splits propagate to the root; leaves are chained for fast ranges. |
| **WAL** | A logical **write-ahead log**. Crash recovery rebuilds every page by replaying it. |
| **Tokenizer + Parser** | Hand-written, recursive-descent. No parser generator. Source positions for friendly errors. |
| **Planner + Optimizer** | Logical → physical plan. Chooses **index scan vs. sequential scan**, eliminates a `Sort` when the index already provides order. |
| **Executor** | The **Volcano (iterator) model**: `SeqScan`, `IndexScan`, `Filter` (pushed into the scan), `Sort`, `Project`, `Limit`. |

### Supported SQL

```sql
CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT);
INSERT INTO users (id, name, age) VALUES (1, 'ada', 36), (2, 'grace', 45);
SELECT name, age FROM users WHERE id >= 8 AND age < 50 ORDER BY id LIMIT 10;
```

- Types: `INT`, `TEXT`
- `WHERE`: AND-chains of `=  !=  <  <=  >  >=`
- `ORDER BY … ASC|DESC`, `LIMIT n`
- A B+tree index on any `INT PRIMARY KEY` (or `INT … INDEX`) column

A small, **correct** subset on purpose — every node in the grammar is something the planner and executor genuinely understand.

### The party tricks

- **Index vs. scan toggle** — feel the difference in the row-visit counter.
- **Time-travel scrubber** — step through the real execution trace frame by frame.
- **Pull the plug** — wipe memory, then **Recover** to replay the WAL and watch every page rebuild. Durability you can press.

---

## Architecture

```
SQL text
   │  tokenizer → recursive-descent parser
   ▼
 AST  ──▶ Logical Plan ──▶ Optimizer (rule-based) ──▶ Physical Plan
                                                          │
                                                          ▼
                                              Execution engine (iterators:
                                              SeqScan / IndexScan / Filter /
                                              Project / Sort / Limit)
                                                          │
                              ┌───────────────────────────┼───────────────┐
                              ▼                            ▼               ▼
                         Heap (slotted pages)        B+tree index      WAL (redo log)
                              │                            │               │
                              └──────────── Pager (fixed 4 KB pages over a buffer) ─────┘
```

The whole engine lives in [`src/engine/`](src/engine) and is **pure TypeScript with zero DOM dependencies** — the exact same code runs in the Node test suite and in your browser tab. A deeper walkthrough is in [PROJECT_DEEP_DIVE.md](PROJECT_DEEP_DIVE.md).

---

## Tech stack

| Choice | Why |
|---|---|
| **TypeScript (strict)** | One engine, runs unchanged in Node tests and the browser. |
| **Next.js + React** | App-router pages, a fast client-rendered playground, zero-backend deploy. |
| **Tailwind CSS** | The blueprint / oscilloscope design system stays consistent. |
| **CodeMirror 6** | A real editor with a SQL mode and a `Cmd/Ctrl+Enter` run keymap. |
| **Vitest + fast-check** | Property-based tests are the correctness proof. |
| **Custom SVG (no D3)** | Full control over the tree layout and the aesthetic, fewer deps. |

The engine runs **entirely client-side** in the deployed playground → zero backend cost, instant interaction.

---

## Run it locally

```bash
git clone https://github.com/charanreddy-27/queryforge.git
cd queryforge
npm install
npm run dev      # → http://localhost:3000
```

Other scripts:

```bash
npm test         # run the property + unit tests (23 of them)
npm run build    # production build
npm run typecheck
```

---

## Correctness is the headline

The B+tree and the executor are **property-tested** with [fast-check](https://github.com/dubzzz/fast-check) — the tests generate thousands of random inputs and assert invariants hold:

- 10,000 random inserts → **every lookup correct, every leaf at the same depth** (the tree stays balanced).
- Range scans return **exactly** the keys in `[lo, hi]`, sorted, for any random key set and bounds.
- A `SELECT … WHERE` matches a brute-force reference filter for any random table.
- **State after crash + WAL replay equals state before the crash.**

```
✓ src/engine/btree.test.ts     (5 tests)
✓ src/engine/heap.test.ts      (3 tests)
✓ src/engine/parser.test.ts    (6 tests)
✓ src/engine/database.test.ts  (6 tests)
✓ src/engine/wal.test.ts       (3 tests)

Test Files  5 passed (5)
     Tests  23 passed (23)
```

---

## Things I learned writing a database

- **A balanced tree is an invariant, not a vibe.** I thought I understood B+trees until splits had to propagate correctly to a growing root. The property tests found the bugs my hand-picked examples never would.
- **Durability is just discipline about ordering** — log the intent before you touch the data. Building the "pull the plug" button turned the WAL from a paragraph in a textbook into something I could press.
- **The planner is where databases earn their reputation.** Parsing and execution are mechanical; the interesting decision is *walk the tree or scan the heap*, and making that toggle live is what makes the cost legible.
- **Keeping the core DOM-free paid for itself.** The same code is tested in Node and animated in the browser — the visualization literally can't drift from reality.

More, honestly told, in [the build story](https://queryforge.charanreddy.dev/about-project).

---

## About the developer

**Chanda Charan Reddy** (Charan) — AI & Automation Engineer, Bangalore.

I ship production LLM systems — a Springer-published model that reads chest X-rays well enough for a radiologist to take seriously, document pipelines that run themselves. Before that I wrote real-time control code for jet engines at DRDO, where a millisecond of lag isn't a bug — it's a flameout. QueryForge is me opening the most-used black box in software.

This is one project. There are 18 more (and a few jet engines) over at **[charanreddy.dev](https://www.charanreddy.dev)**.

[Portfolio](https://www.charanreddy.dev) · [GitHub](https://github.com/charanreddy-27) · [LinkedIn](https://www.linkedin.com/in/chandacharanreddy/) · [Book a call](https://cal.com/charanreddy-27/30min)

> **Want to build something — or break something interesting? [Let's talk.](https://cal.com/charanreddy-27/30min)**

---

<div align="center">
<sub>Built from scratch. Crafted with intent. · MIT licensed</sub>
</div>
