import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Database } from "./database";

describe("WAL durability", () => {
  it("recovers full state after a simulated crash", () => {
    const db = new Database();
    db.execute("CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT)");
    for (let i = 1; i <= 30; i++) {
      db.execute(`INSERT INTO users (id, name, age) VALUES (${i}, 'u${i}', ${i})`);
    }
    const before = db.execute("SELECT id, name FROM users WHERE id = 17").rows;

    // Pull the plug: derived pages are gone, only the WAL survives.
    db.crash();
    expect(db.tables()).toHaveLength(0);

    // Replay the log.
    const recovery = db.recover();
    expect(recovery.message).toMatch(/Recovered/);

    const after = db.execute("SELECT id, name FROM users WHERE id = 17").rows;
    expect(after).toEqual(before);
    expect(db.execute("SELECT id FROM users").rows).toHaveLength(30);
  });

  it("survives serialize → reload from WAL", () => {
    const db = new Database();
    db.execute("CREATE TABLE t (id INT PRIMARY KEY, v TEXT)");
    db.execute("INSERT INTO t (id, v) VALUES (1, 'a'), (2, 'b'), (3, 'c')");
    const json = db.serialize();

    const reloaded = Database.fromWal(json);
    expect(reloaded.execute("SELECT v FROM t WHERE id = 2").rows).toEqual([{ v: "b" }]);
  });

  it("property: state after replay equals state before crash", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 60 }),
        (ids) => {
          const db = new Database();
          db.execute("CREATE TABLE t (id INT PRIMARY KEY, v INT)");
          for (const id of ids) db.execute(`INSERT INTO t (id, v) VALUES (${id}, ${id})`);

          const before = db.execute("SELECT id FROM t ORDER BY id").rows;
          db.crash();
          db.recover();
          const after = db.execute("SELECT id FROM t ORDER BY id").rows;
          return JSON.stringify(before) === JSON.stringify(after);
        },
      ),
      { numRuns: 60 },
    );
  });
});
