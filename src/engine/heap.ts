/**
 * Heap file — where the table rows actually live.
 *
 * A table is a singly-linked chain of "slotted pages". Each page has a header,
 * a slot directory that grows downward from the header, and variable-length
 * records that grow upward from the end of the page. This is the same layout
 * PostgreSQL and SQLite use, just smaller.
 *
 *   ┌───────── header ─────────┬── slot dir →─────────── ← records ──────────┐
 *   │ type | count | freeEnd | next │ s0 s1 s2 ...    ...    rec2 rec1 rec0   │
 *   └──────────────────────────────────────────────────────────────────────-┘
 */

import { Pager } from "./pager";
import { decodeRow, encodeRow } from "./serde";
import { Tracer } from "./trace";
import { PAGE_SIZE, Row, RowId, TableSchema } from "./types";

const HEADER_SIZE = 10;
const SLOT_SIZE = 4;
const NONE = 0xffffffff;

// header offsets
const OFF_TYPE = 0;
const OFF_COUNT = 2;
const OFF_FREE_END = 4;
const OFF_NEXT = 6;

export function initHeapPage(pager: Pager, pageId: number) {
  const v = pager.view(pageId);
  v.setUint8(OFF_TYPE, 1);
  v.setUint16(OFF_COUNT, 0);
  v.setUint16(OFF_FREE_END, PAGE_SIZE);
  v.setUint32(OFF_NEXT, NONE);
}

export class Heap {
  /** Cached tail of the chain so inserts are O(1) amortized, not O(pages). */
  private tail: number;

  constructor(
    private pager: Pager,
    private tracer: Tracer,
    private schema: TableSchema,
  ) {
    this.tail = schema.heapRoot;
    // Fast-forward to the real tail (after a reload the cache is cold).
    let cur = schema.heapRoot;
    let guard = 0;
    while (guard++ < 1_000_000) {
      const v = this.pager.view(cur);
      const next = v.getUint32(OFF_NEXT);
      if (next === NONE) break;
      cur = next;
    }
    this.tail = cur;
  }

  private freeSpace(v: DataView): number {
    const count = v.getUint16(OFF_COUNT);
    const freeEnd = v.getUint16(OFF_FREE_END);
    const dirEnd = HEADER_SIZE + count * SLOT_SIZE;
    return freeEnd - dirEnd;
  }

  insert(row: Row): RowId {
    const rec = encodeRow(this.schema, row);
    const need = rec.length + SLOT_SIZE;

    let pageId = this.tail;
    this.pager.read(pageId, "heap insert");
    let v = this.pager.view(pageId);

    if (this.freeSpace(v) < need) {
      // No room on the tail page — link a fresh one.
      const fresh = this.pager.allocate("table");
      initHeapPage(this.pager, fresh);
      v.setUint32(OFF_NEXT, fresh);
      this.pager.write(pageId, "link next heap page");
      pageId = fresh;
      this.tail = fresh;
      v = this.pager.view(pageId);
    }

    if (rec.length + SLOT_SIZE > PAGE_SIZE - HEADER_SIZE) {
      throw new Error("row too large for a single page");
    }

    const count = v.getUint16(OFF_COUNT);
    const freeEnd = v.getUint16(OFF_FREE_END);
    const recOffset = freeEnd - rec.length;

    // write the record bytes
    const page = this.pager.read(pageId);
    page.set(rec, recOffset);

    // write the slot
    const slotPos = HEADER_SIZE + count * SLOT_SIZE;
    v.setUint16(slotPos, recOffset);
    v.setUint16(slotPos + 2, rec.length);

    // bump header
    v.setUint16(OFF_COUNT, count + 1);
    v.setUint16(OFF_FREE_END, recOffset);

    this.pager.write(pageId, `insert row (${rec.length}B)`);
    return { page: pageId, slot: count };
  }

  get(rowId: RowId): Row {
    this.pager.read(rowId.page, "heap get");
    const v = this.pager.view(rowId.page);
    const slotPos = HEADER_SIZE + rowId.slot * SLOT_SIZE;
    const offset = v.getUint16(slotPos);
    return decodeRow(this.schema, v, offset);
  }

  /** Sequential scan over the whole chain (the SeqScan access path). */
  *scan(): Generator<{ rowId: RowId; row: Row }> {
    let pageId: number = this.schema.heapRoot;
    let guard = 0;
    while (pageId !== NONE && guard++ < 1_000_000) {
      this.pager.read(pageId, "seq scan");
      const v = this.pager.view(pageId);
      const count = v.getUint16(OFF_COUNT);
      for (let slot = 0; slot < count; slot++) {
        const slotPos = HEADER_SIZE + slot * SLOT_SIZE;
        const offset = v.getUint16(slotPos);
        const row = decodeRow(this.schema, v, offset);
        yield { rowId: { page: pageId, slot }, row };
      }
      pageId = v.getUint32(OFF_NEXT);
    }
  }
}
