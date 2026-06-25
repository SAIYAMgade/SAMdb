/**
 * Hand-written tokenizer (no lexer-generator on purpose).
 *
 * Turns raw SQL text into a flat list of tokens with source positions, which
 * the parser then consumes. The positions flow into SqlError so the playground
 * can point at exactly where a query went wrong.
 */

import { SqlError } from "./types";

export type TokenType =
  | "keyword"
  | "identifier"
  | "number"
  | "string"
  | "operator"
  | "punct"
  | "eof";

export interface Token {
  type: TokenType;
  value: string;
  /** Uppercased value for keywords/operators — cheap case-insensitive matching. */
  upper: string;
  start: number;
  end: number;
}

const KEYWORDS = new Set([
  "CREATE", "TABLE", "INSERT", "INTO", "VALUES", "SELECT", "FROM", "WHERE",
  "AND", "ORDER", "BY", "ASC", "DESC", "LIMIT", "INT", "TEXT", "PRIMARY",
  "KEY", "INDEX", "NULL", "TRUE", "FALSE",
]);

const isDigit = (c: string) => c >= "0" && c <= "9";
const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = sql.length;

  const push = (type: TokenType, value: string, start: number) => {
    tokens.push({ type, value, upper: value.toUpperCase(), start, end: i });
  };

  while (i < n) {
    const c = sql[i];

    // whitespace
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }

    // line comments
    if (c === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }

    const start = i;

    // strings (single-quoted, '' escapes a quote)
    if (c === "'") {
      i++;
      let str = "";
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          str += "'";
          i += 2;
          continue;
        }
        if (sql[i] === "'") break;
        str += sql[i++];
      }
      if (i >= n) throw new SqlError("Unterminated string literal", start);
      i++; // closing quote
      push("string", str, start);
      continue;
    }

    // numbers (int or decimal)
    if (isDigit(c) || (c === "-" && isDigit(sql[i + 1] ?? ""))) {
      i++;
      while (i < n && (isDigit(sql[i]) || sql[i] === ".")) i++;
      push("number", sql.slice(start, i), start);
      continue;
    }

    // identifiers / keywords
    if (isIdentStart(c)) {
      i++;
      while (i < n && isIdentPart(sql[i])) i++;
      const word = sql.slice(start, i);
      push(KEYWORDS.has(word.toUpperCase()) ? "keyword" : "identifier", word, start);
      continue;
    }

    // multi-char operators
    const two = sql.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "!=" || two === "<>") {
      i += 2;
      push("operator", two === "<>" ? "!=" : two, start);
      continue;
    }

    // single-char operators / punctuation
    if (c === "=" || c === "<" || c === ">") {
      i++;
      push("operator", c, start);
      continue;
    }
    if (c === "(" || c === ")" || c === "," || c === "*" || c === ";" || c === ".") {
      i++;
      push("punct", c, start);
      continue;
    }

    throw new SqlError(`Unexpected character '${c}'`, start);
  }

  tokens.push({ type: "eof", value: "", upper: "", start: i, end: i });
  return tokens;
}
