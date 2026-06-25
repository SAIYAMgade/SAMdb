/**
 * Recursive-descent parser.
 *
 * One method per grammar rule, each consuming tokens top-down. This is the
 * boring-on-purpose way to write a parser and it's exactly why it's easy to
 * reason about: you can read the grammar straight off the call stack.
 *
 *   statement   := createTable | insert | select
 *   createTable := CREATE TABLE ident '(' colDef (',' colDef)* ')'
 *   insert      := INSERT INTO ident ['(' ident (',' ident)* ')'] VALUES tuple (',' tuple)*
 *   select      := SELECT (star | ident (',' ident)*) FROM ident
 *                  [WHERE expr] [ORDER BY ident [ASC|DESC]] [LIMIT number]
 *   expr        := comparison (AND comparison)*
 *   comparison  := ident op literal
 */

import {
  ColumnSpec,
  CompareOp,
  CreateTableStmt,
  Expr,
  InsertStmt,
  SelectStmt,
  Statement,
} from "./ast";
import { Token, tokenize } from "./tokenizer";
import { ColumnType, SqlError, Value } from "./types";

export class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(sql: string) {
    this.tokens = tokenize(sql);
  }

  /** The token stream, exposed for the playground's "Tokens" view. */
  get tokenStream(): readonly Token[] {
    return this.tokens;
  }

  static parse(sql: string): Statement {
    return new Parser(sql).parseStatement();
  }

  // ---- token helpers -------------------------------------------------------

  private peek(): Token {
    return this.tokens[this.pos];
  }
  private next(): Token {
    return this.tokens[this.pos++];
  }
  private atEnd(): boolean {
    return this.peek().type === "eof";
  }
  private isKeyword(word: string): boolean {
    const t = this.peek();
    return t.type === "keyword" && t.upper === word;
  }
  private eatKeyword(word: string): boolean {
    if (this.isKeyword(word)) {
      this.pos++;
      return true;
    }
    return false;
  }
  private expectKeyword(word: string) {
    if (!this.eatKeyword(word)) {
      throw new SqlError(`Expected '${word}' but found '${this.peek().value || "<eof>"}'`, this.peek().start);
    }
  }
  private expectPunct(p: string) {
    const t = this.peek();
    if (t.type === "punct" && t.value === p) {
      this.pos++;
      return;
    }
    throw new SqlError(`Expected '${p}' but found '${t.value || "<eof>"}'`, t.start);
  }
  private eatPunct(p: string): boolean {
    const t = this.peek();
    if (t.type === "punct" && t.value === p) {
      this.pos++;
      return true;
    }
    return false;
  }
  private expectIdentifier(): string {
    const t = this.peek();
    if (t.type === "identifier") {
      this.pos++;
      return t.value;
    }
    throw new SqlError(`Expected an identifier but found '${t.value || "<eof>"}'`, t.start);
  }

  // ---- statements ----------------------------------------------------------

  parseStatement(): Statement {
    let stmt: Statement;
    if (this.isKeyword("CREATE")) stmt = this.parseCreateTable();
    else if (this.isKeyword("INSERT")) stmt = this.parseInsert();
    else if (this.isKeyword("SELECT")) stmt = this.parseSelect();
    else
      throw new SqlError(
        `Expected CREATE, INSERT or SELECT but found '${this.peek().value || "<eof>"}'`,
        this.peek().start,
      );

    this.eatPunct(";");
    if (!this.atEnd()) {
      throw new SqlError(
        `Unexpected trailing input '${this.peek().value}'. One statement at a time.`,
        this.peek().start,
      );
    }
    return stmt;
  }

  private parseType(): ColumnType {
    if (this.eatKeyword("INT")) return "INT";
    if (this.eatKeyword("TEXT")) return "TEXT";
    throw new SqlError(`Expected a column type (INT or TEXT) but found '${this.peek().value}'`, this.peek().start);
  }

  private parseCreateTable(): CreateTableStmt {
    this.expectKeyword("CREATE");
    this.expectKeyword("TABLE");
    const table = this.expectIdentifier();
    this.expectPunct("(");
    const columns: ColumnSpec[] = [];
    do {
      const name = this.expectIdentifier();
      const dataType = this.parseType();
      const col: ColumnSpec = { name, dataType };
      if (this.eatKeyword("PRIMARY")) {
        this.expectKeyword("KEY");
        col.primaryKey = true;
      }
      if (this.eatKeyword("INDEX")) col.indexed = true;
      columns.push(col);
    } while (this.eatPunct(","));
    this.expectPunct(")");
    if (columns.length === 0) throw new SqlError("A table needs at least one column", this.peek().start);
    return { type: "create_table", table, columns };
  }

  private parseLiteral(): Value {
    const t = this.peek();
    if (t.type === "number") {
      this.pos++;
      return Number(t.value);
    }
    if (t.type === "string") {
      this.pos++;
      return t.value;
    }
    if (t.type === "keyword" && t.upper === "NULL") {
      this.pos++;
      return null;
    }
    throw new SqlError(`Expected a literal value but found '${t.value || "<eof>"}'`, t.start);
  }

  private parseTuple(): Value[] {
    this.expectPunct("(");
    const vals: Value[] = [];
    do {
      vals.push(this.parseLiteral());
    } while (this.eatPunct(","));
    this.expectPunct(")");
    return vals;
  }

  private parseInsert(): InsertStmt {
    this.expectKeyword("INSERT");
    this.expectKeyword("INTO");
    const table = this.expectIdentifier();

    let columns: string[] | null = null;
    if (this.peek().type === "punct" && this.peek().value === "(") {
      this.expectPunct("(");
      columns = [];
      do {
        columns.push(this.expectIdentifier());
      } while (this.eatPunct(","));
      this.expectPunct(")");
    }

    this.expectKeyword("VALUES");
    const rows: Value[][] = [];
    do {
      rows.push(this.parseTuple());
    } while (this.eatPunct(","));

    return { type: "insert", table, columns, rows };
  }

  private parseComparison(): Expr {
    const column = this.expectIdentifier();
    const t = this.peek();
    if (t.type !== "operator") {
      throw new SqlError(`Expected a comparison operator but found '${t.value || "<eof>"}'`, t.start);
    }
    this.pos++;
    const op = t.value as CompareOp;
    const value = this.parseLiteral();
    return { type: "compare", column, op, value };
  }

  private parseExpr(): Expr {
    let left = this.parseComparison();
    while (this.eatKeyword("AND")) {
      const right = this.parseComparison();
      left = { type: "and", left, right };
    }
    return left;
  }

  private parseSelect(): SelectStmt {
    this.expectKeyword("SELECT");

    let columns: "*" | string[];
    if (this.peek().type === "punct" && this.peek().value === "*") {
      this.pos++;
      columns = "*";
    } else {
      const cols: string[] = [];
      do {
        cols.push(this.expectIdentifier());
      } while (this.eatPunct(","));
      columns = cols;
    }

    this.expectKeyword("FROM");
    const table = this.expectIdentifier();

    const stmt: SelectStmt = { type: "select", columns, table };

    if (this.eatKeyword("WHERE")) {
      stmt.where = this.parseExpr();
    }

    if (this.eatKeyword("ORDER")) {
      this.expectKeyword("BY");
      const column = this.expectIdentifier();
      let direction: "ASC" | "DESC" = "ASC";
      if (this.eatKeyword("DESC")) direction = "DESC";
      else this.eatKeyword("ASC");
      stmt.orderBy = { column, direction };
    }

    if (this.eatKeyword("LIMIT")) {
      const t = this.peek();
      if (t.type !== "number") throw new SqlError(`LIMIT expects a number, found '${t.value}'`, t.start);
      this.pos++;
      stmt.limit = Number(t.value);
    }

    return stmt;
  }
}
