/**
 * The preloaded demo. Deterministic on purpose: the showcased run always looks
 * the same, and the row count is tuned so an order-4 B+tree grows to three
 * levels and splits visibly while you watch.
 */

const NAMES = [
  "ada", "linus", "grace", "dennis", "barbara", "alan", "margaret", "ken",
  "radia", "tim", "katherine", "guido", "leslie", "donald", "frances", "edsger",
  "shafi", "vint", "carmela", "bjarne", "anita", "john",
];

export function seedScript(rowCount = 18): string[] {
  const stmts: string[] = [
    "CREATE TABLE users (id INT PRIMARY KEY, name TEXT, age INT)",
  ];
  // Insert in a shuffled-but-fixed key order so the tree splits in interesting
  // places rather than appending neatly to the right.
  const order = [11, 4, 17, 8, 1, 14, 6, 20, 3, 9, 16, 2, 13, 7, 18, 5, 12, 10, 15, 19, 21, 22];
  let inserted = 0;
  for (const id of order) {
    if (inserted >= rowCount) break;
    const name = NAMES[(id - 1) % NAMES.length];
    const age = 24 + ((id * 7) % 41); // 24..64, deterministic
    stmts.push(`INSERT INTO users (id, name, age) VALUES (${id}, '${name}', ${age})`);
    inserted++;
  }
  return stmts;
}

export interface Example {
  label: string;
  hint: string;
  sql: string;
}

export const EXAMPLES: Example[] = [
  {
    label: "Index point lookup",
    hint: "Descends the B+tree once — watch the search path light up.",
    sql: "SELECT name, age FROM users WHERE id = 12",
  },
  {
    label: "Index range + free ordering",
    hint: "Range scan over the leaf chain. The Sort is skipped — the index is already ordered.",
    sql: "SELECT id, name FROM users WHERE id >= 8 AND id <= 16 ORDER BY id",
  },
  {
    label: "Sequential scan",
    hint: "age isn't indexed, so every heap row is read and filtered.",
    sql: "SELECT name, age FROM users WHERE age > 45 ORDER BY age DESC",
  },
  {
    label: "Insert (splits the tree)",
    hint: "Run this a few times with new ids to force a node split.",
    sql: "INSERT INTO users (id, name, age) VALUES (23, 'newcomer', 29)",
  },
  {
    label: "Full table",
    hint: "No predicate — the simplest plan: scan and project.",
    sql: "SELECT id, name, age FROM users ORDER BY id",
  },
];

export const STARTER_QUERY = "SELECT name, age FROM users WHERE id = 12";
