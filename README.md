<div align="center">

# SAMDB
### Systems, Architecture & Memory Database

```text
======================================================================
  [ SAMDB ]  EDUCATIONAL SQL ENGINE & DATABASE ENGINEERING WORKBENCH
  "Understand what happens between a SQL statement and the data it returns"
======================================================================
```

Storage Engine · B+Tree Index · Write-Ahead Log (WAL) · Handwritten Parser · Rule-Based Optimizer · Volcano Iterator Executor

![tests](https://img.shields.io/badge/tests-23%20passing-33ff00) ![fast-check](https://img.shields.io/badge/property--tested-fast--check-a78bfa) ![engine](https://img.shields.io/badge/engine-0%20deps%2C%20DOM--free-33ff00) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![license](https://img.shields.io/badge/license-MIT-64748b)

</div>

---

## 1. Overview & Purpose

**SAMDB** is an educational, developer-grade database engine and interactive SQL workbench designed to reveal what happens between a SQL query and the disk/memory structures that serve it.

Built with a **Cyber-Industrial Terminal CLI Aesthetic** (phosphor-green `#33ff00`, deep `#0a0a0a` background, `JetBrains Mono` monospace typography, and zero-radius geometry), SAMDB turns abstract database internals into inspectable, interactive engineering primitives.

Every highlight, timeline frame, tree node visitation, and page read/write is instrumented directly from the engine's event tracer (`Tracer`). **No simulated traces or fake metrics.**

---

## 2. Architecture & Pipeline

```
SQL Query
   │
   ▼
[ 1. Tokenizer & Parser ] (src/engine/tokenizer.ts, parser.ts)
   │  - Handwritten recursive-descent parser (no generator)
   │  - Produces typed AST (Statement) with exact character error offsets
   ▼
[ 2. Query Planner & Optimizer ] (src/engine/planner.ts)
   │  - Logical Plan: Scan -> Filter -> Sort -> Project -> Limit
   │  - Rule-Based Optimizer: Detects range/equality predicates on indexed columns
   │  - Selects IndexScan vs SeqScan access paths
   │  - Filter pushdown into scan operators
   │  - Sort elimination when index ordering matches query
   ▼
[ 3. Volcano Iterator Executor ] (src/engine/executor.ts)
   │  - Pipelined operators implementing next(): Tuple | null
   │  - Short-circuiting execution (Limit stops upstream scans early)
   ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│ 4. Storage & Index Engine       │   │ 5. Durability: Write-Ahead Log  │
│   - Pager: 4 KB slotted pages   │   │   - Append-only redo log        │
│   - Heap: Linked slotted pages  │   │   - LSN ordering                │
│   - B+Tree: Slotted-page nodes, │   │   - "Crash" & "Recover" replay  │
│     leaf chaining, splits       │   │   - LocalStorage persistence    │
└─────────────────────────────────┘   └─────────────────────────────────┘
   │                                     │
   └──────────────────┬──────────────────┘
                      ▼
[ 6. Instrumentation Tracer ] (src/engine/trace.ts)
   - Emits structured events: btree.visit, page.read/write, row.scan, wal.append/replay
   - Feeds the live playback scrubber & interactive terminal visualizations
```

---

## 3. Supported SQL Grammar

SAMDB enforces a strict, honest subset of SQL without pretending to support unparsed syntax:

* **DDL**:
  ```sql
  CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT);
  CREATE TABLE products (sku INT INDEX, title TEXT, price INT);
  ```
* **DML**:
  ```sql
  INSERT INTO users (id, name, age) VALUES (1, 'ada', 32), (2, 'linus', 45);
  ```
* **Querying & Filtering**:
  ```sql
  SELECT name, age FROM users WHERE id = 12;
  SELECT id, name FROM users WHERE id >= 8 AND id <= 16 ORDER BY id ASC;
  SELECT name, age FROM users WHERE age > 45 ORDER BY age DESC LIMIT 5;
  ```

---

## 4. Key Workbench Features

* **Terminal Workbench**: High-contrast green-screen aesthetic with resizable/stacking terminal windows.
* **B+Tree Visualizer**: Live tree topology rendered with actual page IDs, key matches highlighted in neon green, node splits in red, and active search paths traced in real-time.
* **Storage Pages Grid**: Real 4 KB slotted pages reflecting dirty status, access counts (`r`/`w`), and allocation events.
* **Time-Travel Scrubber**: Step forwards or backwards through the execution trace frame-by-frame.
* **WAL Recovery Lab**:
  * `[ CRASH ]`: Purges derived memory/heap state to simulate power failure.
  * `[ RECOVER ]`: Replays the logical write-ahead log to reconstruct all tables and indexes.
* **Optimizer Comparison**: Toggle `FORCE FULL SCAN` to directly observe the difference in row-visit and page-read counters between an index scan and a sequential scan.

---

## 5. Development & Testing

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SAMdb

# Install dependencies
npm install
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000 (or http://localhost:3001) in your browser
```

### Automated Test Suite

```bash
# Run unit and property-based tests via Vitest
npm test

# Type checking
npm run typecheck

# Production build
npm run build
```

---

## 6. Project History & Attribution

SAMDB was evolved from the open-source [QueryForge](https://github.com/charanreddy-27/QueryForge) project by Chanda Charan Reddy.

* **Original Implementation**: QueryForge database core (MIT License).
* **SAMDB Evolution**: Redesigned developer-grade terminal UI/UX, enlarged legible typography, enhanced schema exploration, updated color token system, and extended workbench observability.
* **License**: MIT License (see [LICENSE](./LICENSE)).
