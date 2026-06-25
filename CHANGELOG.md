# Changelog

All notable changes to QueryForge. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-06

The first complete release: a working SQL engine plus the playground that animates it.

### Engine
- **Pager** over fixed 4 KB pages with read/write/alloc tracing and snapshot/clone.
- **Heap** storage in slotted pages with an O(1)-amortized append and sequential scan.
- **B+tree** index where every node is a page: insert, point lookup, range scan, root-growing splits, chained leaves. Property-tested to stay balanced under 10k random inserts.
- **Write-ahead log** (logical redo) with crash + replay recovery and `localStorage` persistence.
- **Tokenizer + recursive-descent parser** for `CREATE TABLE`, `INSERT`, and `SELECT … WHERE … ORDER BY … LIMIT`, with source-position errors.
- **Planner + rule-based optimizer**: index-scan vs. sequential-scan selection and `ORDER BY` elimination via the index.
- **Volcano iterator executor**: `SeqScan`, `IndexScan`, filter pushdown, `Sort`, `Project`, `Limit`.
- **Tracer** event bridge threaded through every layer so the UI reflects real engine state.

### Playground
- Three-pane workspace: CodeMirror SQL editor, the engine canvas, and results/plan/AST.
- Animated **B+tree** view with the live search path, key matches, and splits.
- **Page grid** showing real page reads/writes/allocations and byte fill.
- **Timeline scrubber** to replay the execution trace frame by frame (time travel).
- **Logical vs. physical plan** view with a "force full scan" toggle.
- **Pull the plug / Recover** crash-recovery demo.
- "What am I looking at?" overlay, keyboard run (`Cmd/Ctrl+Enter`), `prefers-reduced-motion` support.

### Tests
- 23 unit + property tests across the B+tree, heap, parser, end-to-end database, and WAL.

### Docs
- README, deep dive, interview prep, deployment guide, contributing guide.
- `/about` and `/about-project` pages with a contact card.
