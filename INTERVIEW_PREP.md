# QueryForge — Interview Prep

Rehearse from this. It's written to be said out loud, not just read.

---

## 30-second elevator pitch

> "I built a SQL database from scratch in TypeScript — the storage engine, a B+tree index, a write-ahead log, a hand-written parser, a query planner, and an iterator-model executor. No ORM, no Postgres underneath. Then I wrapped it in a playground that animates the internals as you type: the B+tree lighting up the nodes it visits, pages flipping as they're written, and crash recovery replaying the log. The whole thing is property-tested with fast-check — 10,000 random inserts, every lookup correct, the tree stays balanced. It's the project where I stopped treating the database as a magic box."

---

## The 2-minute walkthrough

Say this while sharing the screen.

> "Let me start from the bytes and work up.
>
> **Storage.** The lowest layer is a pager that hands out fixed 4 KB pages over a buffer. Above it, a heap stores rows in slotted pages — slot directory growing down from the header, variable-length records growing up from the end, exactly like Postgres. Rows are encoded as real tagged bytes, not JSON, so the sizes you see in the page grid are real.
>
> **The index** is a B+tree where every node *is* a page. Insert, point lookup, range scan. Splits propagate up to a growing root, which is what keeps every leaf at the same depth. Leaves are chained left to right, so a range query is 'descend once, then walk the bottom.'
>
> **The front end** is a hand-written tokenizer and a recursive-descent parser — one method per grammar rule — producing an AST for a small but correct SQL subset: CREATE, INSERT, SELECT with WHERE, ORDER BY, LIMIT.
>
> **The planner** turns that into a logical plan, then a physical plan. The one interesting decision is the access path: if there's a usable predicate on the indexed column, it does an index scan over a key range; otherwise a full scan. It'll even skip a Sort if the index already returns rows in order.
>
> **Execution** is the Volcano iterator model — every operator has a `next()`, the top pulls from the bottom. The WHERE clause is pushed into the scan, so rows are filtered the instant they're read. That's what drives the live 'scanned vs. matched' counter.
>
> **Durability** is a write-ahead log. I log every operation before touching pages, so 'pull the plug' wipes memory and 'recover' rebuilds every page by replaying the log.
>
> And the visualization isn't a mock — it's replaying the engine's own event trace. If the engine didn't do it, you don't see it. The same engine code runs in my Node test suite and in the browser, unchanged."

---

## STAR stories

### STAR 1 — The B+tree split bug that property testing caught

- **Situation.** Hand-picked test cases for the B+tree all passed, but I didn't trust it — splits are where B+trees go wrong.
- **Task.** Prove the tree stays correct and balanced under arbitrary input, not just my examples.
- **Action.** I wrote fast-check property tests: generate any unique key set in any order, insert them, then assert every lookup returns the right RowId *and* every leaf sits at the same depth. It failed almost immediately and **shrank the counterexample to four keys**. Two bugs: an internal split promoted the wrong separator under a specific fan-out, and — the nasty one — when a node shrank and was re-serialized, stale bytes from the old larger node leaked into the next decode, so a leaf "remembered" keys it no longer had.
- **Result.** The promotion fix plus one line — zeroing the node body before each write — made the invariant hold across 200+ randomized runs and orders 3 through 8. The lesson stuck: for anything with a tricky invariant, generate the inputs; don't hand-pick them.

### STAR 2 — Making durability something you can press

- **Situation.** A WAL is the kind of thing everyone can define and few have built. I wanted it to be undeniable, not a paragraph.
- **Task.** Demonstrate real crash recovery in a browser, end to end.
- **Action.** I implemented a logical redo log — append the operation record *before* mutating pages — and made the heap/index pages pure derived state. Then a "pull the plug" button that wipes the pager and catalog but keeps the log, and a "recover" that replays it, emitting events so the UI animates each page being rebuilt. I property-tested it: for any random insert sequence, state after crash-and-replay equals state before the crash.
- **Result.** You can now wipe the database and watch it reconstruct itself from the log, live. It's the demo that makes people lean in — and it forced a clean separation between *logged truth* and *derived state* that made the whole engine simpler.

### STAR 3 — Keeping the engine honest: one source of truth for the visuals

- **Situation.** The selling point is that the animation reflects the *real* engine. The easy, dishonest version is to re-create plausible-looking state in the UI.
- **Task.** Guarantee the visualization can't lie.
- **Action.** I threaded a single `Tracer` through every layer — pager, B+tree, executor — so each one appends structured events as it runs. The UI holds one number (the timeline step) and a pure `derive(events, step)` function computes what's lit up. The engine stays completely DOM-free; the UI never computes engine state itself.
- **Result.** If the engine didn't read a page, no event exists, so the grid literally can't highlight it. Changing engine behavior updates the visuals for free. As a bonus, the same constraint gave me the time-travel scrubber almost for nothing.

---

## Likely technical Q&A

**Q: Why a B+tree instead of a hash index or a plain BST?**
A B+tree keeps keys sorted, so it serves both point lookups *and* range scans (`id > 8`) and provides `ORDER BY` for free. A hash index can't do ranges. A plain BST isn't balanced and isn't page-aligned — B-trees are shallow and map naturally onto fixed-size pages, which is the whole point when nodes are disk pages.

**Q: B-tree vs B+tree — which did you build and why?**
A B+tree. Values live only in the leaves and the leaves are linked, so range scans are a single descent plus a linear walk along the bottom, and internal nodes pack more keys (they store only separators). It's what real databases use.

**Q: Walk me through a node split.**
On overflow, a leaf keeps the lower half, a new right leaf takes the upper half, the right's first key is *copied* up to the parent, and the leaf chain is re-linked. An internal node *moves* its middle key up instead of copying. If the promotion reaches the root, a new root is created — that's the only way the tree gets taller, which is what keeps it balanced.

**Q: What exactly does your WAL guarantee, and what doesn't it?**
It guarantees durability of committed operations via redo: replay reconstructs the state. It's logical, single-writer, redo-only. It does *not* do undo, concurrency, or checkpointing — recovery replays from the beginning. Those are the honest next steps.

**Q: How does the optimizer decide index vs. scan?**
It flattens the WHERE AND-chain and checks for comparisons on the indexed column. `=` is a point range; `<`/`>` set bounds. If a usable predicate exists it does an index scan over that range plus a recheck; otherwise a sequential scan. There's no cost model with statistics yet — it's rule-based — and I can show the difference live by forcing a full scan and watching the row-visit count jump.

**Q: Why the iterator model? What are its limits?**
Volcano iterators compose cleanly and support early termination — `LIMIT` stops the pipeline without reading the rest. The classic downside is per-row `next()` call overhead; production engines move to vectorized or compiled execution for throughput. For correctness and clarity, iterators are the right teaching choice.

**Q: How do you store a row in a page?**
Slotted page. A header tracks the slot count and the free-space boundary; the slot directory grows down, records grow up. Each value is tagged and length-prefixed — null, float64 number, or UTF-8 text. A RowId is `(page, slot)`. The index maps a key to that RowId.

**Q: float64 for integers — isn't that lossy?**
Integers up to 2⁵³ are exact in float64, which covers every realistic key, and it sidesteps int32 overflow. The property tests throw large random ids at it specifically to confirm the round-trip. A production engine would use varints; this was a deliberate simplicity-for-correctness trade.

**Q: How is the visualization not just a fake animation?**
Every layer emits events to a shared tracer as it runs. The UI replays `trace[0..step]`. There's no separate "render the state" path — the components are pure functions of the recorded events. If a page wasn't read, there's no event, so it can't light up.

**Q: How did you keep one codebase running in Node and the browser?**
The engine has zero DOM and zero Node-only dependencies — just `ArrayBuffer`, `DataView`, `TextEncoder`. So `src/engine` imports identically into Vitest and into a React client component. That constraint is also what made it testable.

**Q: What's the performance story?**
For the demo, tiny — it runs instantly client-side. Structurally: point lookups and range scans are `O(log n)` descents plus the result size; sequential scans are `O(rows)`. The small B+tree order is a *visualization* choice, not a performance ceiling; the order is a constructor parameter, and I run the tests with a realistic mix.

---

## What I'd improve next

- **DELETE / UPDATE** with tombstones and page compaction.
- **WAL checkpointing** so recovery doesn't replay from the start of history.
- **JOINs** — nested-loop first, then a hash join (the iterator model is ready for it).
- **A real cost-based optimizer** with table statistics instead of fixed rules.
- **Secondary, non-unique indexes** (value lists in leaf nodes).
- **Stretch:** port the storage + index core to **Rust → WASM** and run it in the same playground — same UI, a serious systems flex.

Naming these unprompted signals self-awareness and that I know what "done" would actually mean.

---

## Smart questions to ask the interviewer

- "Where does your team sit on the build-vs-buy line for infrastructure — when do you reach for the thing under the abstraction?"
- "What does the path from 'works on my machine' to 'in production' look like here — testing, review, rollout?"
- "When something breaks at 2 a.m., what's the debugging experience like? How much observability do engineers actually have into the systems they own?"
- "What's a piece of internal tooling the team is proud of — something built because the off-the-shelf option wasn't good enough?"
- "How do you balance shipping fast against getting the fundamentals right on the systems that have to be correct?"
