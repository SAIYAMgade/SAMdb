"use client";

import { useEffect } from "react";
import { CloseIcon } from "./Icons";

const ITEMS = [
  ["[01] SQL EDITOR", "Write one SQL statement. Cmd/Ctrl + Enter runs it. Supported grammar: CREATE TABLE, INSERT, SELECT … WHERE … ORDER BY … LIMIT. Strict typing, no unsupported statements allowed."],
  ["[02] B+TREE INDEX", "The physical index structure. Each node is one 4 KB slotted page. Neon green paths show the traversal; bright cells indicate key matches; red nodes mark splits."],
  ["[03] STORAGE PAGES", "Visualizes real 4 KB pages allocated by the pager. Status indicators display read (green), write (amber), and allocation (light green) activity in real time."],
  ["[04] TRACE TIMELINE", "Step through or scrub the execution trace recorded by the engine's Tracer. Every frame maps to a real internal event: tokenization, parse, plan, tree traversal, row scan, emit."],
  ["[05] PLAN & AST", "Inspect the generated Abstract Syntax Tree, logical plan, and optimized physical plan. Toggle 'force seq scan' to see the difference between index range scan vs full table scan."],
  ["[06] WAL & RECOVERY", "Logical Write-Ahead Log. Append-only redo records guarantee crash durability. Click [ CRASH ] to simulate power loss, then [ RECOVER ] to rebuild derived state from the log."],
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="SAMDB Manual"
      onClick={onClose}
    >
      <div
        className="border border-[#1f521f] bg-[#0d100d] max-h-[85vh] w-full max-w-2xl overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1f521f] bg-[#111411] px-4 py-2">
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-[#33ff00]">
            ┌─ SAMDB ARCHITECTURE MANUAL ─
          </span>
          <button
            className="border border-[#1f521f] bg-[#0a0a0a] p-1 text-[#4a7a40] hover:border-[#ff3333] hover:text-[#ff3333]"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {ITEMS.map(([title, body]) => (
            <div key={title} className="border border-[#1f521f] bg-[#0a0a0a] p-3">
              <div className="mb-1 font-mono text-xs font-semibold text-[#33ff00]">{title}</div>
              <p className="text-2xs leading-relaxed text-[#c8ffb0]">{body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[#1f521f] bg-[#0a0a0a] px-4 py-2.5 text-2xs text-[#1f521f]">
          -- All visualizations are backed by real engine instrumentation events. Zero simulated traces.
        </div>
      </div>
    </div>
  );
}
