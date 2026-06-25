/**
 * B+tree index — the structure the playground animates.
 *
 * Keys are numbers; leaf values are RowIds pointing into the heap. Every node
 * is exactly one page, so the B+tree and the page-grid are the same bytes shown
 * two ways. Leaves are chained left-to-right so a range scan is "descend once,
 * then walk the bottom".
 *
 * `order` (max keys per node) is configurable. Real databases derive it from
 * page capacity (~hundreds), which makes a tree only 2 levels deep and visually
 * dull. We default to a small order so inserts actually split nodes in front of
 * you — same algorithm, more legible. The split logic is the real thing and is
 * property-tested to stay balanced.
 */

import { Pager } from "./pager";
import { Tracer } from "./trace";
import { PAGE_SIZE, RowId } from "./types";

const TYPE_INTERNAL = 2;
const TYPE_LEAF = 3;
const NONE = 0xffffffff;

const OFF_TYPE = 0;
const OFF_COUNT = 2;
const OFF_NEXT = 4; // leaf-chain pointer (internal nodes ignore it)
const OFF_BODY = 8;

interface LeafNode {
  type: "leaf";
  keys: number[];
  values: RowId[];
  next: number;
}
interface InternalNode {
  type: "internal";
  keys: number[];
  children: number[];
}
type Node = LeafNode | InternalNode;

type SplitResult = { promotedKey: number; rightPage: number } | null;

export interface BTreeNodeView {
  page: number;
  type: "leaf" | "internal";
  keys: number[];
  children: number[]; // empty for leaves
}

export class BTree {
  rootPage: number;

  constructor(
    private pager: Pager,
    private tracer: Tracer,
    rootPage: number,
    private order = 4,
  ) {
    this.rootPage = rootPage;
  }

  static createEmpty(pager: Pager, order = 4): number {
    const root = pager.allocate("index");
    const v = pager.view(root);
    v.setUint8(OFF_TYPE, TYPE_LEAF);
    v.setUint16(OFF_COUNT, 0);
    v.setUint32(OFF_NEXT, NONE);
    pager.write(root, "create empty leaf root");
    return root;
  }

  // ---- (de)serialization ---------------------------------------------------

  private load(pageId: number, trace = true, reason = ""): Node {
    if (trace) this.pager.read(pageId, reason || "btree node");
    const v = this.pager.view(pageId);
    const type = v.getUint8(OFF_TYPE);
    const count = v.getUint16(OFF_COUNT);
    const keys: number[] = [];
    let p = OFF_BODY;
    for (let i = 0; i < count; i++) {
      keys.push(v.getFloat64(p));
      p += 8;
    }
    if (type === TYPE_LEAF) {
      const values: RowId[] = [];
      for (let i = 0; i < count; i++) {
        const page = v.getUint32(p);
        const slot = v.getUint16(p + 4);
        values.push({ page, slot });
        p += 6;
      }
      return { type: "leaf", keys, values, next: v.getUint32(OFF_NEXT) };
    }
    const children: number[] = [];
    for (let i = 0; i < count + 1; i++) {
      children.push(v.getUint32(p));
      p += 4;
    }
    return { type: "internal", keys, children };
  }

  private save(pageId: number, node: Node, reason: string) {
    const v = this.pager.view(pageId);
    // zero the body so stale bytes never leak into a decode
    const raw = this.pager.read(pageId);
    raw.fill(0, OFF_BODY);
    v.setUint8(OFF_TYPE, node.type === "leaf" ? TYPE_LEAF : TYPE_INTERNAL);
    v.setUint16(OFF_COUNT, node.keys.length);
    let p = OFF_BODY;
    for (const k of node.keys) {
      v.setFloat64(p, k);
      p += 8;
    }
    if (node.type === "leaf") {
      v.setUint32(OFF_NEXT, node.next);
      for (const val of node.values) {
        v.setUint32(p, val.page);
        v.setUint16(p + 4, val.slot);
        p += 6;
      }
    } else {
      for (const c of node.children) {
        v.setUint32(p, c);
        p += 4;
      }
    }
    if (p > PAGE_SIZE) throw new Error("btree node overflowed its page");
    this.pager.write(pageId, reason);
  }

  // ---- insert --------------------------------------------------------------

  insert(key: number, value: RowId) {
    const split = this.insertInto(this.rootPage, key, value, true);
    if (split) {
      // Root split: grow the tree one level taller.
      const newRoot = this.pager.allocate("index");
      this.save(
        newRoot,
        { type: "internal", keys: [split.promotedKey], children: [this.rootPage, split.rightPage] },
        "new root after split",
      );
      this.rootPage = newRoot;
    }
  }

  private insertInto(pageId: number, key: number, value: RowId, isRoot: boolean): SplitResult {
    const node = this.load(pageId, true, "descend to insert");
    const role = isRoot ? "root" : node.type === "leaf" ? "leaf" : "internal";
    this.tracer.emit({
      kind: "btree.visit",
      page: pageId,
      role,
      keys: node.keys.slice(),
      reason: "insert path",
    });

    if (node.type === "leaf") {
      let i = 0;
      while (i < node.keys.length && node.keys[i] < key) i++;
      if (node.keys[i] === key) {
        node.values[i] = value; // unique key — replace
        this.save(pageId, node, "update leaf value");
        return null;
      }
      node.keys.splice(i, 0, key);
      node.values.splice(i, 0, value);
      if (node.keys.length <= this.order) {
        this.save(pageId, node, "insert into leaf");
        return null;
      }
      return this.splitLeaf(pageId, node);
    }

    // internal
    let i = 0;
    while (i < node.keys.length && key >= node.keys[i]) i++;
    const childSplit = this.insertInto(node.children[i], key, value, false);
    if (!childSplit) return null;

    node.keys.splice(i, 0, childSplit.promotedKey);
    node.children.splice(i + 1, 0, childSplit.rightPage);
    if (node.keys.length <= this.order) {
      this.save(pageId, node, "insert separator into internal");
      return null;
    }
    return this.splitInternal(pageId, node);
  }

  private splitLeaf(pageId: number, node: LeafNode): SplitResult {
    const total = node.keys.length;
    const leftCount = Math.ceil(total / 2);
    const rightPage = this.pager.allocate("index");
    const right: LeafNode = {
      type: "leaf",
      keys: node.keys.slice(leftCount),
      values: node.values.slice(leftCount),
      next: node.next,
    };
    const left: LeafNode = {
      type: "leaf",
      keys: node.keys.slice(0, leftCount),
      values: node.values.slice(0, leftCount),
      next: rightPage,
    };
    this.save(rightPage, right, "write right leaf after split");
    this.save(pageId, left, "shrink left leaf after split");
    const promotedKey = right.keys[0];
    this.tracer.emit({
      kind: "btree.split",
      page: pageId,
      newPage: rightPage,
      promotedKey,
      role: "leaf",
    });
    return { promotedKey, rightPage };
  }

  private splitInternal(pageId: number, node: InternalNode): SplitResult {
    const mid = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[mid];
    const rightPage = this.pager.allocate("index");
    const right: InternalNode = {
      type: "internal",
      keys: node.keys.slice(mid + 1),
      children: node.children.slice(mid + 1),
    };
    const left: InternalNode = {
      type: "internal",
      keys: node.keys.slice(0, mid),
      children: node.children.slice(0, mid + 1),
    };
    this.save(rightPage, right, "write right internal after split");
    this.save(pageId, left, "shrink left internal after split");
    this.tracer.emit({
      kind: "btree.split",
      page: pageId,
      newPage: rightPage,
      promotedKey,
      role: "internal",
    });
    return { promotedKey, rightPage };
  }

  // ---- read paths ----------------------------------------------------------

  /** Point lookup. Emits a visit per node on the search path. */
  lookup(key: number): RowId | null {
    let pageId = this.rootPage;
    let isRoot = true;
    for (;;) {
      const node = this.load(pageId, true, "descend to lookup");
      if (node.type === "leaf") {
        const idx = node.keys.indexOf(key);
        this.tracer.emit({
          kind: "btree.visit",
          page: pageId,
          role: isRoot ? "root" : "leaf",
          keys: node.keys.slice(),
          reason: idx >= 0 ? "key found" : "key absent",
          hitKey: idx >= 0 ? key : undefined,
        });
        return idx >= 0 ? node.values[idx] : null;
      }
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      this.tracer.emit({
        kind: "btree.visit",
        page: pageId,
        role: isRoot ? "root" : "internal",
        keys: node.keys.slice(),
        reason: `follow child ${i}`,
      });
      pageId = node.children[i];
      isRoot = false;
    }
  }

  /**
   * Range scan over [lo, hi] (inclusive bounds; null = unbounded).
   * Descends to the leaf holding `lo`, then walks the leaf chain.
   */
  *range(lo: number | null, hi: number | null): Generator<{ key: number; rowId: RowId }> {
    // descend to the starting leaf
    let pageId = this.rootPage;
    let isRoot = true;
    for (;;) {
      const node = this.load(pageId, true, "descend for range");
      if (node.type === "leaf") {
        this.tracer.emit({
          kind: "btree.visit",
          page: pageId,
          role: isRoot ? "root" : "leaf",
          keys: node.keys.slice(),
          reason: "range start leaf",
        });
        break;
      }
      let i = 0;
      const target = lo ?? -Infinity;
      while (i < node.keys.length && target >= node.keys[i]) i++;
      this.tracer.emit({
        kind: "btree.visit",
        page: pageId,
        role: isRoot ? "root" : "internal",
        keys: node.keys.slice(),
        reason: `follow child ${i}`,
      });
      pageId = node.children[i];
      isRoot = false;
    }

    // walk the leaf chain
    let leafId: number = pageId;
    while (leafId !== NONE) {
      const leaf = this.load(leafId, true, "scan leaf chain") as LeafNode;
      for (let i = 0; i < leaf.keys.length; i++) {
        const k = leaf.keys[i];
        if (lo !== null && k < lo) continue;
        if (hi !== null && k > hi) return;
        yield { key: k, rowId: leaf.values[i] };
      }
      leafId = leaf.next;
      if (leafId !== NONE) {
        this.tracer.emit({
          kind: "btree.visit",
          page: leafId,
          role: "leaf",
          keys: [],
          reason: "next leaf via sibling pointer",
        });
      }
    }
  }

  // ---- introspection for the visualizer & tests ----------------------------

  /** Snapshot the whole tree structure (no tracing) for rendering. */
  snapshot(): { root: number; nodes: BTreeNodeView[] } {
    const nodes: BTreeNodeView[] = [];
    const visit = (pageId: number) => {
      const node = this.load(pageId, false);
      if (node.type === "leaf") {
        nodes.push({ page: pageId, type: "leaf", keys: node.keys.slice(), children: [] });
      } else {
        nodes.push({
          page: pageId,
          type: "internal",
          keys: node.keys.slice(),
          children: node.children.slice(),
        });
        for (const c of node.children) visit(c);
      }
    };
    visit(this.rootPage);
    return { root: this.rootPage, nodes };
  }

  /** Used by property tests: returns true if all leaves are at the same depth. */
  height(): number {
    let h = 1;
    let node = this.load(this.rootPage, false);
    while (node.type === "internal") {
      h++;
      node = this.load(node.children[0], false);
    }
    return h;
  }
}
