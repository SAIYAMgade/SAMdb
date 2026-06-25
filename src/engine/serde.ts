/**
 * Tiny binary (de)serialization helpers.
 *
 * Rows and keys are stored as real bytes inside pages — the playground shows
 * the actual byte sizes, so the encoding has to be honest, not a JSON.stringify
 * shortcut.
 *
 * Number encoding uses float64 so integers up to 2^53 round-trip exactly; that
 * keeps the property tests happy when they throw large random ids at us.
 */

import { Row, TableSchema, Value } from "./types";

const TAG_NULL = 0;
const TAG_NUM = 1;
const TAG_TEXT = 2;

export class ByteWriter {
  private buf: number[] = [];

  u8(v: number) {
    this.buf.push(v & 0xff);
    return this;
  }
  u16(v: number) {
    this.buf.push((v >>> 8) & 0xff, v & 0xff);
    return this;
  }
  u32(v: number) {
    this.buf.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    return this;
  }
  f64(v: number) {
    const tmp = new DataView(new ArrayBuffer(8));
    tmp.setFloat64(0, v);
    for (let i = 0; i < 8; i++) this.buf.push(tmp.getUint8(i));
    return this;
  }
  bytes(b: Uint8Array) {
    for (let i = 0; i < b.length; i++) this.buf.push(b[i]);
    return this;
  }
  value(v: Value) {
    if (v === null || v === undefined) {
      this.u8(TAG_NULL);
    } else if (typeof v === "number") {
      this.u8(TAG_NUM).f64(v);
    } else {
      const enc = new TextEncoder().encode(v);
      this.u8(TAG_TEXT).u16(enc.length).bytes(enc);
    }
    return this;
  }
  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.buf);
  }
  get length(): number {
    return this.buf.length;
  }
}

export class ByteReader {
  pos = 0;
  constructor(private view: DataView, start = 0) {
    this.pos = start;
  }
  u8(): number {
    return this.view.getUint8(this.pos++);
  }
  u16(): number {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }
  f64(): number {
    const v = this.view.getFloat64(this.pos);
    this.pos += 8;
    return v;
  }
  value(): Value {
    const tag = this.u8();
    if (tag === TAG_NULL) return null;
    if (tag === TAG_NUM) return this.f64();
    const len = this.u16();
    const slice = new Uint8Array(len);
    for (let i = 0; i < len; i++) slice[i] = this.view.getUint8(this.pos + i);
    this.pos += len;
    return new TextDecoder().decode(slice);
  }
}

export function encodeRow(schema: TableSchema, row: Row): Uint8Array {
  const w = new ByteWriter();
  for (const col of schema.columns) {
    w.value(row[col.name] ?? null);
  }
  return w.toUint8Array();
}

export function decodeRow(schema: TableSchema, view: DataView, offset: number): Row {
  const r = new ByteReader(view, offset);
  const row: Row = {};
  for (const col of schema.columns) {
    row[col.name] = r.value();
  }
  return row;
}
