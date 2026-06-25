import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Database } from "./database";

function seedUsers(db: Database, n: number) {
  db.execute("CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT)");
  for (let i = 1; i <= n; i++) {
    db.execute(`INSERT INTO users (id, name, age) VALUES (${i}, 'user${i}', ${20 + (i % 50)})`);
  }
}

describe("Database end-to-end", () => {
  it("runs a full CREATE / INSERT / SELECT round-trip", () => {
    const db = new Database();
    db.execute("CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT)");
    db.execute("INSERT INTO users (id, name, age) VALUES (1, 'ada', 36), (2, 'grace', 45)");
    const res = db.execute("SELECT name, age FROM users WHERE age > 40");
    expect(res.rows).toEqual([{ name: "grace", age: 45 }]);
    expect(res.access).toBe("scan"); // age is not the indexed column
  });

  it("uses the index for a predicate on the indexed column", () => {
    const db = new Database();
    seedUsers(db, 50);
    const res = db.execute("SELECT name FROM users WHERE id = 7");
    expect(res.access).toBe("index");
    expect(res.rows).toEqual([{ name: "user7" }]);
    // An index point-lookup scans far fewer rows than the table size.
    expect(res.stats.rowsScanned).toBeLessThan(5);
  });

  it("index scan and forced full scan return identical rows", () => {
    const db = new Database();
    seedUsers(db, 80);
    const indexed = db.execute("SELECT id FROM users WHERE id > 60 ORDER BY id");
    const forced = db.execute("SELECT id FROM users WHERE id > 60 ORDER BY id", {
      forceSeqScan: true,
    });
    expect(indexed.access).toBe("index");
    expect(forced.access).toBe("scan");
    expect(indexed.rows).toEqual(forced.rows);
    // The index visits strictly fewer rows than the full scan.
    expect(indexed.stats.rowsScanned).toBeLessThan(forced.stats.rowsScanned);
  });

  it("honors ORDER BY and LIMIT", () => {
    const db = new Database();
    db.execute("CREATE TABLE t (id INT PRIMARY KEY, v INT)");
    db.execute("INSERT INTO t (id, v) VALUES (1, 30), (2, 10), (3, 20)");
    const res = db.execute("SELECT v FROM t ORDER BY v DESC LIMIT 2");
    expect(res.rows).toEqual([{ v: 30 }, { v: 20 }]);
  });

  it("property: SELECT WHERE matches a brute-force reference filter", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 500 }), { minLength: 1, maxLength: 120 }),
        fc.integer({ min: 1, max: 500 }),
        (ids, threshold) => {
          const db = new Database();
          db.execute("CREATE TABLE t (id INT PRIMARY KEY, v INT)");
          for (const id of ids) {
            db.execute(`INSERT INTO t (id, v) VALUES (${id}, ${id * 2})`);
          }
          const res = db.execute(`SELECT id FROM t WHERE id >= ${threshold} ORDER BY id`);
          const expected = ids
            .filter((id) => id >= threshold)
            .sort((a, b) => a - b)
            .map((id) => ({ id }));
          return JSON.stringify(res.rows) === JSON.stringify(expected);
        },
      ),
      { numRuns: 80 },
    );
  });

  it("emits a trace that the playground can replay", () => {
    const db = new Database();
    seedUsers(db, 20);
    const res = db.execute("SELECT name FROM users WHERE id = 5");
    const kinds = new Set(res.trace.map((t) => t.event.kind));
    expect(kinds.has("btree.visit")).toBe(true);
    expect(kinds.has("row.emit")).toBe(true);
    expect(res.trace.every((t, i) => t.step === i)).toBe(true);
  });
});
