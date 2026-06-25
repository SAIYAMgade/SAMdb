"use client";

import { useEffect } from "react";
import { CloseIcon } from "./Icons";

const ITEMS = [
  ["Editor", "Write one SQL statement. Cmd/Ctrl + Enter runs it. The grammar is a real subset: CREATE TABLE, INSERT, SELECT … WHERE … ORDER BY … LIMIT."],
  ["B+tree", "The index. Each node is one 4 KB page. The cyan path is the exact set of nodes this query visited; a green cell is a key match; a rose node just split."],
  ["Page grid", "Every page the engine has allocated. Borders light up as pages are read (cyan), written (amber), or freshly allocated (green) during the run."],
  ["Timeline", "Scrub or play back the real event trace. Every frame is something the engine actually did — tokenize, plan, descend the tree, read a page, emit a row."],
  ["AST / Plan", "The parsed syntax tree, then the logical plan and the physical plan. Flip 'force full scan' to watch the optimizer's choice change the row-visit count."],
  ["WAL", "The write-ahead log. Pull the plug to wipe memory; Recover replays the log to rebuild every page from scratch."],
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="What am I looking at?"
      onClick={onClose}
    >
      <div
        className="panel max-h-[85vh] w-full max-w-2xl overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head sticky top-0 bg-ink-700">
          <span className="panel-title">What am I looking at?</span>
          <button className="btn px-1.5 py-1" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {ITEMS.map(([title, body]) => (
            <div key={title} className="rounded-md border border-ink-400 bg-ink-800/60 p-3">
              <div className="mb-1 font-mono text-xs font-semibold text-active">{title}</div>
              <p className="text-xs leading-relaxed text-slatey-300">{body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-ink-400 px-4 py-3 text-2xs text-slatey-500">
          Nothing here is mocked. Every highlight is replayed from the engine&apos;s own event log — if it
          didn&apos;t happen, you won&apos;t see it.
        </div>
      </div>
    </div>
  );
}
