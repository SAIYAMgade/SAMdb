"use client";

import { phaseLabel } from "@/lib/playback";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  start: "M6 6h2v12H6zm3.5 6l8.5 6V6z",
  prev: "M7 6h2v12H7zm10 0l-7 6 7 6z",
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zm8 0h4v14h-4z",
  next: "M15 6h2v12h-2zM7 6l7 6-7 6z",
  end: "M16 6h2v12h-2zM6 6l8.5 6L6 18z",
};

export function Timeline({
  total,
  step,
  playing,
  phase,
  onStep,
  onTogglePlay,
}: {
  total: number;
  step: number;
  playing: boolean;
  phase: string;
  onStep: (s: number) => void;
  onTogglePlay: () => void;
}) {
  const atEnd = step >= total;
  return (
    <div className="flex items-center gap-2 border-t border-ink-400 bg-ink-700/80 px-3 py-2">
      <div className="flex items-center gap-1">
        <button className="btn px-1.5 py-1" aria-label="Jump to start" onClick={() => onStep(0)}>
          <Icon d={ICONS.start} />
        </button>
        <button className="btn px-1.5 py-1" aria-label="Step back" onClick={() => onStep(Math.max(0, step - 1))}>
          <Icon d={ICONS.prev} />
        </button>
        <button
          className="btn btn-run px-2 py-1"
          aria-label={playing ? "Pause" : "Play"}
          onClick={onTogglePlay}
        >
          <Icon d={playing ? ICONS.pause : ICONS.play} />
        </button>
        <button className="btn px-1.5 py-1" aria-label="Step forward" onClick={() => onStep(Math.min(total, step + 1))}>
          <Icon d={ICONS.next} />
        </button>
        <button className="btn px-1.5 py-1" aria-label="Jump to end" onClick={() => onStep(total)}>
          <Icon d={ICONS.end} />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={total}
        value={Math.min(step, total)}
        onChange={(e) => onStep(Number(e.target.value))}
        aria-label="Scrub through the query's execution trace"
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-ink-500 accent-active"
      />

      <div className="flex w-40 items-center justify-end gap-2 font-mono text-2xs text-slatey-400">
        <span className={`rounded px-1.5 py-0.5 ${atEnd ? "bg-ink-600 text-slatey-400" : "bg-active/15 text-active"}`}>
          {phaseLabel(phase)}
        </span>
        <span className="tabular-nums">
          {Math.min(step, total)}/{total}
        </span>
      </div>
    </div>
  );
}
