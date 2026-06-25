import { describe, expect, it } from "vitest";
import { Parser } from "./parser";
import { SqlError } from "./types";

describe("Parser", () => {
  it("parses CREATE TABLE with a primary key and an index", () => {
    const ast = Parser.parse(
      "CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT INDEX)",
    );
    expect(ast).toEqual({
      type: "create_table",
      table: "users",
      columns: [
        { name: "id", dataType: "INT", primaryKey: true },
        { name: "name", dataType: "TEXT" },
        { name: "age", dataType: "INT", indexed: true },
      ],
    });
  });

  it("parses a multi-row INSERT", () => {
    const ast = Parser.parse(
      "INSERT INTO users (id, name) VALUES (1, 'ada'), (2, 'grace')",
    );
    expect(ast).toEqual({
      type: "insert",
      table: "users",
      columns: ["id", "name"],
      rows: [
        [1, "ada"],
        [2, "grace"],
      ],
    });
  });

  it("folds a WHERE AND-chain into a left-leaning tree", () => {
    const ast = Parser.parse(
      "SELECT name FROM users WHERE age > 30 AND age < 60 ORDER BY age DESC LIMIT 5",
    );
    expect(ast).toMatchObject({
      type: "select",
      columns: ["name"],
      table: "users",
      orderBy: { column: "age", direction: "DESC" },
      limit: 5,
      where: {
        type: "and",
        left: { type: "compare", column: "age", op: ">", value: 30 },
        right: { type: "compare", column: "age", op: "<", value: 60 },
      },
    });
  });

  it("supports SELECT * and escaped quotes in strings", () => {
    const ast = Parser.parse("SELECT * FROM t WHERE name = 'O''Brien'");
    expect(ast).toMatchObject({
      columns: "*",
      where: { type: "compare", column: "name", op: "=", value: "O'Brien" },
    });
  });

  it("reports a friendly error with a source position", () => {
    expect(() => Parser.parse("SELECT FROM users")).toThrow(SqlError);
    try {
      Parser.parse("SELECT name FROM");
    } catch (e) {
      expect(e).toBeInstanceOf(SqlError);
      expect((e as SqlError).position).toBeGreaterThan(0);
    }
  });

  it("rejects two statements at once", () => {
    expect(() => Parser.parse("SELECT * FROM a; SELECT * FROM b")).toThrow(/one statement/i);
  });
});
