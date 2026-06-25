import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Heap, initHeapPage } from "./heap";
import { Pager } from "./pager";
import { NULL_TRACER } from "./trace";
import { Row, TableSchema } from "./types";

const schema: TableSchema = {
  name: "t",
  columns: [
    { name: "id", type: "INT", primaryKey: true },
    { name: "name", type: "TEXT" },
  ],
  indexColumn: "id",
  heapRoot: 0,
};

function newHeap() {
  const pager = new Pager(NULL_TRACER);
  const root = pager.allocate("table");
  initHeapPage(pager, root);
  return new Heap(pager, NULL_TRACER, { ...schema, heapRoot: root });
}

describe("Heap", () => {
  it("round-trips a row through real bytes", () => {
    const heap = newHeap();
    const rid = heap.insert({ id: 1, name: "ada" });
    expect(heap.get(rid)).toEqual({ id: 1, name: "ada" });
  });

  it("spills onto new pages and scans every row back", () => {
    const heap = newHeap();
    const rows: Row[] = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      name: `user-${i}-${"x".repeat(i % 40)}`,
    }));
    for (const r of rows) heap.insert(r);
    const scanned = [...heap.scan()].map((s) => s.row);
    expect(scanned).toHaveLength(rows.length);
    expect(scanned).toEqual(rows);
  });

  it("property: any row inserted can be read back by its RowId", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: -1e6, max: 1e6 }),
            name: fc.string({ maxLength: 60 }),
          }),
          { maxLength: 200 },
        ),
        (rows) => {
          const heap = newHeap();
          const ids = rows.map((r) => heap.insert(r));
          return rows.every((r, i) => {
            const got = heap.get(ids[i]);
            return got.id === r.id && got.name === r.name;
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
