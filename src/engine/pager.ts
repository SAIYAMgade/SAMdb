/**
 * Pager — the lowest honest layer.
 *
 * The whole database is a sequence of fixed-size pages (PAGE_SIZE bytes each).
 * Nothing above this layer is allowed to touch the backing store directly; it
 * asks the pager for a page and the pager hands back a real, byte-addressable
 * Uint8Array. In the browser the backing store is just memory; in Node it could
 * be a file. Either way the layer above never knows the difference.
 *
 * Every read/write/allocate is reported to the Tracer so the page-grid in the
 * playground shows exactly which pages a query touched.
 */

import { Tracer } from "./trace";
import { PAGE_SIZE, PageKind } from "./types";

interface PageMeta {
  kind: PageKind;
  dirty: boolean;
}

export class Pager {
  private pages: Uint8Array[] = [];
  private meta: PageMeta[] = [];

  constructor(private tracer: Tracer) {}

  /** Swap the trace scope. The Database does this once per query so each
   *  execution records its own clean event stream. */
  setTracer(tracer: Tracer) {
    this.tracer = tracer;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  kindOf(pageId: number): PageKind {
    return this.meta[pageId]?.kind ?? "free";
  }

  isDirty(pageId: number): boolean {
    return this.meta[pageId]?.dirty ?? false;
  }

  /** Allocate a fresh, zero-filled page and return its id. */
  allocate(kind: PageKind): number {
    const id = this.pages.length;
    this.pages.push(new Uint8Array(PAGE_SIZE));
    this.meta.push({ kind, dirty: true });
    this.tracer.emit({ kind: "page.alloc", page: id, pageKind: kind });
    return id;
  }

  /** Read a page. Returns the live buffer — callers must not grow it. */
  read(pageId: number, note?: string): Uint8Array {
    const page = this.pages[pageId];
    if (!page) throw new Error(`Pager.read: page ${pageId} does not exist`);
    this.tracer.emit({
      kind: "page.read",
      page: pageId,
      pageKind: this.meta[pageId].kind,
      note,
    });
    return page;
  }

  /** A DataView over a page for structured reads/writes. */
  view(pageId: number): DataView {
    const page = this.pages[pageId];
    if (!page) throw new Error(`Pager.view: page ${pageId} does not exist`);
    return new DataView(page.buffer, page.byteOffset, page.byteLength);
  }

  /** Mark a page dirty and record the write. */
  write(pageId: number, note?: string): void {
    const m = this.meta[pageId];
    if (!m) throw new Error(`Pager.write: page ${pageId} does not exist`);
    m.dirty = true;
    this.tracer.emit({
      kind: "page.write",
      page: pageId,
      pageKind: m.kind,
      note,
    });
  }

  /** Pretend everything reached disk. (We have no real disk; this just clears dirty bits.) */
  flush(): void {
    for (const m of this.meta) m.dirty = false;
  }

  /** Snapshot used by the playground page-grid. */
  snapshot(): { id: number; kind: PageKind; dirty: boolean; bytes: Uint8Array }[] {
    return this.pages.map((bytes, id) => ({
      id,
      kind: this.meta[id].kind,
      dirty: this.meta[id].dirty,
      bytes,
    }));
  }

  /** Deep copy — used to checkpoint state for the time-travel scrubber. */
  clone(tracer: Tracer): Pager {
    const p = new Pager(tracer);
    p.pages = this.pages.map((b) => b.slice());
    p.meta = this.meta.map((m) => ({ ...m }));
    return p;
  }

  /** Wipe everything — simulates a power loss (used by the crash demo). */
  wipe(): void {
    this.pages = [];
    this.meta = [];
  }
}
