# Contributing to QueryForge

QueryForge is primarily a portfolio and teaching project, but issues and PRs are welcome — especially ones that make the engine more correct or the visualization clearer.

## Ground rules

1. **The engine stays DOM-free.** Nothing in `src/engine/` may import React, touch `window`, or depend on Node-only APIs. The same code must run in Vitest and in the browser. If you need browser state, it goes in `src/lib` or `src/components`.
2. **Correctness is proven, not asserted.** Anything touching the B+tree, heap, or executor needs a test. For invariants (balance, ordering, round-trips), prefer a fast-check property test over hand-picked cases.
3. **The visualization may only show real events.** If you add a feature the UI should animate, emit a `TraceEvent` from the engine for it — never reconstruct engine state in the UI.

## Getting set up

```bash
npm install
npm run dev        # playground at http://localhost:3000
npm test           # watch correctness
npm run typecheck  # strict TypeScript
```

## Before you open a PR

```bash
npm test
npm run build      # must compile clean
```

- Keep the SQL grammar small and correct. A new clause should be parsed, planned, executed, *and* tested before it ships.
- Match the surrounding code style — strict TypeScript, descriptive names, comments that explain *why*.
- If you add an engine event, update `lib/playback.ts` and the relevant component so the trace stays the single source of truth.

## Good first issues

- Add `!=` handling to the index optimizer (currently falls back to a scan).
- Support `DELETE` with tombstones in the heap.
- Add a secondary (non-unique) index with value lists in leaf nodes.
- A nested-loop `JOIN` operator (the iterator model is ready for it).

Thanks for poking at the internals.
