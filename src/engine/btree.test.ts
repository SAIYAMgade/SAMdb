import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { BTree } from "./btree";
import { Pager } from "./pager";
import { NULL_TRACER } from "./trace";
import { RowId } from "./types";

function newTree(order = 4): BTree {
  const pager = new Pager(NULL_TRACER);
  const root = BTree.createEmpty(pager, order);
  return new BTree(pager, NULL_TRACER, root, order);
}

/** Every leaf must sit at the same depth — the definition of a balanced B+tree. */
function leafDepths(tree: BTree): number[] {
  const { root, nodes } = tree.snapshot();
  const byPage = new Map(nodes.map((n) => [n.page, n]));
  const depths: number[] = [];
  const walk = (page: number, d: number) => {
    const n = byPage.get(page)!;
    if (n.type === "leaf") depths.push(d);
    else n.children.forEach((c) => walk(c, d + 1));
  };
  walk(root, 0);
  return depths;
}

// Page ids are unsigned in the real engine, so map keys into a non-negative
// space for these sentinels. The point is only that lookup returns the exact
// RowId that was inserted.
const KEY_OFFSET = 1_000_000;
const rid = (k: number): RowId => ({ page: k + KEY_OFFSET, slot: 0 });

describe("BTree", () => {
  it("inserts and looks up a handful of keys", () => {
    const t = newTree();
    for (const k of [5, 3, 9, 1, 7, 2, 8, 4, 6]) t.insert(k, rid(k));
    for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(t.lookup(k)).toEqual(rid(k));
    }
    expect(t.lookup(42)).toBeNull();
  });

  it("stays balanced and correct under 10k random unique inserts", () => {
    const t = newTree(4);
    const keys = Array.from({ length: 10_000 }, (_, i) => i);
    // Fisher–Yates with a fixed seed so the test is deterministic.
    let seed = 1234567;
    const rng = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    for (const k of keys) t.insert(k, rid(k));

    // every lookup is correct
    for (let k = 0; k < 10_000; k++) expect(t.lookup(k)).toEqual(rid(k));
    // tree is balanced
    expect(new Set(leafDepths(t)).size).toBe(1);
  });

  it("property: lookups are correct regardless of insertion order", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: -5000, max: 5000 }), { minLength: 1, maxLength: 400 }),
        fc.integer({ min: 3, max: 8 }),
        (keys, order) => {
          const t = newTree(order);
          for (const k of keys) t.insert(k, rid(k));
          for (const k of keys) {
            const got = t.lookup(k);
            if (!got || got.page !== k + KEY_OFFSET) return false;
          }
          return new Set(leafDepths(t)).size === 1;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("property: range scan returns exactly the keys in [lo,hi], sorted", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 300 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (keys, a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const t = newTree(4);
          for (const k of keys) t.insert(k, rid(k));

          const got = [...t.range(lo, hi)].map((e) => e.key);
          const expected = keys.filter((k) => k >= lo && k <= hi).sort((x, y) => x - y);

          if (got.length !== expected.length) return false;
          return got.every((k, i) => k === expected[i]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("updates the value for an existing key instead of duplicating it", () => {
    const t = newTree();
    t.insert(10, { page: 1, slot: 0 });
    t.insert(10, { page: 2, slot: 5 });
    expect(t.lookup(10)).toEqual({ page: 2, slot: 5 });
    expect([...t.range(null, null)].filter((e) => e.key === 10)).toHaveLength(1);
  });
});
