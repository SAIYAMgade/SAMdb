"use client";

import { phaseLabel } from "@/lib/playback";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
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
  const phaseLbl = phaseLabel(phase);

  const phaseColor =
    phase === "execute"
      ? "text-[#33ff00] border-[#1f521f] bg-[#0a110a]"
      : phase === "plan"
      ? "text-[#ffb000] border-[#7a5500] bg-[#0a0800]"
      : phase === "recover"
      ? "text-[#ff3333] border-[#6b1414] bg-[#0a0505]"
      : atEnd
      ? "text-[#c8ffb0] border-[#1f521f] bg-[#0a0a0a]"
      : "text-[#8dcf7a] border-[#1f521f] bg-[#0a0a0a]";

  return (
    <div className="flex items-center gap-3 border-t border-[#1f521f] bg-[#0d100d] px-4 py-2.5">
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button className="btn px-2 py-1.5" aria-label="Jump to start" onClick={() => onStep(0)}>
          <Icon d={ICONS.start} />
        </button>
        <button className="btn px-2 py-1.5" aria-label="Step back" onClick={() => onStep(Math.max(0, step - 1))}>
          <Icon d={ICONS.prev} />
        </button>
        <button
          className="btn btn-run px-2.5 py-1.5"
          aria-label={playing ? "Pause" : "Play"}
          onClick={onTogglePlay}
        >
          <Icon d={playing ? ICONS.pause : ICONS.play} />
        </button>
        <button className="btn px-2 py-1.5" aria-label="Step forward" onClick={() => onStep(Math.min(total, step + 1))}>
          <Icon d={ICONS.next} />
        </button>
        <button className="btn px-2 py-1.5" aria-label="Jump to end" onClick={() => onStep(total)}>
          <Icon d={ICONS.end} />
        </button>
      </div>

      {/* Scrubber */}
      <div className="relative flex-1 flex items-center h-6">
        {/* Track */}
        <div className="w-full h-1 bg-[#1f521f]" />
        {/* Progress fill */}
        <div
          className="absolute left-0 h-1 bg-[#33ff00] transition-none"
          style={{ width: total > 0 ? `${(Math.min(step, total) / total) * 100}%` : "0%" }}
        />
        {/* Range input (invisible but accessible) */}
        <input
          type="range"
          min={0}
          max={total}
          value={Math.min(step, total)}
          onChange={(e) => onStep(Number(e.target.value))}
          aria-label="Scrub through the query's execution trace"
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>

      {/* Phase label + counter */}
      <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
        <span className={`border px-2 py-1 uppercase tracking-wider text-xs font-bold ${phaseColor}`}>
          {phaseLbl}
        </span>
        <span className="tabular-nums text-xs">
          <span className="text-[#33ff00] font-bold">{Math.min(step, total)}</span>
          <span className="text-[#8dcf7a]"> / {total}</span>
        </span>
      </div>
    </div>
  );
}
