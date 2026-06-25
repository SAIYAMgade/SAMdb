"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Brand } from "@/components/Brand";
import { BTreeView } from "@/components/BTreeView";
import { PageGrid } from "@/components/PageGrid";
import { AstView } from "@/components/AstView";
import { PlanView } from "@/components/PlanView";
import { ResultsTable } from "@/components/ResultsTable";
import { StatsBar } from "@/components/StatsBar";
import { Timeline } from "@/components/Timeline";
import { WalPanel } from "@/components/WalPanel";
import { HelpOverlay } from "@/components/HelpOverlay";
import {
  AlertIcon,
  ArrowUpRight,
  GitHubIcon,
  HelpIcon,
  RotateIcon,
  ZapIcon,
} from "@/components/Icons";
import { useQueryForge } from "@/lib/useQueryForge";
import { derive } from "@/lib/playback";
import { EXAMPLES, STARTER_QUERY } from "@/lib/sample";

const SqlEditor = dynamic(() => import("@/components/SqlEditor").then((m) => m.SqlEditor), {
  ssr: false,
  loading: () => <div className="p-4 font-mono text-xs text-slatey-500">loading editor…</div>,
});

type Tab = "results" | "plan" | "ast";

export default function Playground() {
  const forge = useQueryForge(STARTER_QUERY);
  const [sql, setSql] = useState(STARTER_QUERY);
  const [forceSeqScan, setForceSeqScan] = useState(false);
  const [tab, setTab] = useState<Tab>("results");
  const [helpOpen, setHelpOpen] = useState(false);

  // playback
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();

  const result = forge.result;
  const total = result?.trace.length ?? 0;

  // Reset the scrubber whenever a new query lands.
  const traceRef = useRef<unknown>(null);
  useEffect(() => {
    if (!result) return;
    if (traceRef.current === result.trace) return;
    traceRef.current = result.trace;
    if (reduced) {
      setStep(result.trace.length);
      setPlaying(false);
    } else {
      setStep(0);
      setPlaying(true);
    }
  }, [result, reduced]);

  // Advance the timeline while playing.
  useEffect(() => {
    if (!playing || !result) return;
    const t = result.trace.length;
    const perTick = Math.max(1, Math.ceil(t / 200));
    const id = setInterval(() => setStep((s) => Math.min(t, s + perTick)), 24);
    return () => clearInterval(id);
  }, [playing, result]);

  useEffect(() => {
    if (result && step >= result.trace.length) setPlaying(false);
  }, [step, result]);

  const pb = useMemo(() => derive(result?.trace ?? [], step), [result, step]);

  const runNow = (overrideForce?: boolean) =>
    forge.run(sql, { forceSeqScan: overrideForce ?? forceSeqScan });

  const setForce = (v: boolean) => {
    setForceSeqScan(v);
    forge.run(sql, { forceSeqScan: v });
  };

  const loadExample = (q: string) => {
    setSql(q);
    forge.run(q, { forceSeqScan });
  };

  const togglePlay = () => {
    if (step >= total) setStep(0);
    setPlaying((p) => !p);
  };

  const revealed =
    result?.kind === "select" ? (step >= total ? null : pb.emittedRows.length) : null;

  return (
    <div className="flex h-screen min-h-0 flex-col bg-ink-800">
      {/* ── top bar ───────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-ink-400 bg-ink-700/70 px-3 py-2 backdrop-blur">
        <Brand subtitle="storage · WAL · planner · executor" />
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink href="/about-project">The build</NavLink>
          <NavLink href="/about">About</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <button className="btn" onClick={() => setHelpOpen(true)} title="What am I looking at?">
            <HelpIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">What is this?</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              forge.crash();
              setPlaying(false);
            }}
            title="Pull the plug — wipe memory, keep the WAL"
          >
            <AlertIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pull the plug</span>
          </button>
          <button
            className="btn"
            onClick={() => forge.recover()}
            title="Replay the WAL to rebuild every page"
          >
            <RotateIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Recover</span>
          </button>
          <a className="btn" href={"https://github.com/charanreddy-27/queryforge"} target="_blank" rel="noreferrer" aria-label="GitHub repository">
            <GitHubIcon className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ── workspace ─────────────────────────────────────────── */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[300px_minmax(0,1fr)_390px] lg:overflow-hidden">
        {/* left: editor + examples + schema */}
        <section className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
          <div className="panel flex min-h-[200px] flex-col lg:flex-[1.1]">
            <div className="panel-head">
              <span className="panel-title">Query</span>
              <button className="btn btn-run" onClick={() => runNow()}>
                <ZapIcon className="h-3.5 w-3.5" /> Run
                <span className="kbd ml-1">⌘⏎</span>
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SqlEditor value={sql} onChange={setSql} onRun={() => runNow()} />
            </div>
            {forge.error && (
              <div className="border-t border-split-dim bg-split/10 px-3 py-2 font-mono text-2xs text-split">
                {forge.error.message}
                {forge.error.position !== undefined && ` (at char ${forge.error.position})`}
              </div>
            )}
          </div>

          <div className="panel flex min-h-0 flex-col lg:flex-1 lg:overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Examples</span>
              <button className="text-2xs text-slatey-500 hover:text-slatey-300" onClick={() => forge.reset()}>
                reset demo
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => loadExample(ex.sql)}
                  className="group mb-2 w-full cursor-pointer rounded-md border border-ink-400 bg-ink-800/50 p-2 text-left transition-colors duration-200 hover:border-active/50 hover:bg-ink-600"
                >
                  <div className="font-mono text-2xs font-semibold text-slatey-200 group-hover:text-active">
                    {ex.label}
                  </div>
                  <div className="mt-0.5 text-2xs leading-snug text-slatey-500">{ex.hint}</div>
                </button>
              ))}
              <SchemaSummary tables={forge.tables} />
            </div>
          </div>
        </section>

        {/* center: the canvas */}
        <section className="panel scanlines relative flex min-h-[460px] flex-col overflow-hidden lg:min-h-0">
          <div className="flex items-center justify-between border-b border-ink-400 px-3 py-2">
            <span className="panel-title">Engine canvas</span>
            <StatsStrip phase={pb.phase} scanned={pb.rowsScanned} passed={pb.rowsPassed} />
          </div>

          {/* B+tree */}
          <div className="relative min-h-0 flex-[1.4] border-b border-ink-400">
            <div className="absolute left-3 top-2 z-10 panel-title">B+tree index</div>
            <div className="h-full pt-7">
              <BTreeView tree={result?.tree ?? null} pb={pb} indexColumn={firstIndexCol(forge.tables)} />
            </div>
          </div>

          {/* page grid */}
          <div className="relative min-h-0 flex-1">
            <div className="absolute left-3 top-2 z-10 panel-title">Pages</div>
            <div className="h-full pt-7">
              <PageGrid pages={forge.pages} pb={pb} />
            </div>
          </div>

          <Timeline
            total={total}
            step={step}
            playing={playing}
            phase={pb.phase}
            onStep={(s) => {
              setPlaying(false);
              setStep(s);
            }}
            onTogglePlay={togglePlay}
          />
        </section>

        {/* right: stats + tabs + wal */}
        <section className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
          <StatsBar stats={result?.stats} access={result?.access} />

          <div className="panel flex min-h-[280px] flex-col lg:flex-1 lg:overflow-hidden">
            <div className="panel-head gap-1">
              <div className="flex gap-1">
                {(["results", "plan", "ast"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`cursor-pointer rounded px-2 py-1 font-mono text-2xs uppercase tracking-wide transition-colors duration-200 ${
                      tab === t ? "bg-active/15 text-active" : "text-slatey-500 hover:text-slatey-300"
                    }`}
                  >
                    {t === "ast" ? "AST" : t}
                  </button>
                ))}
              </div>
              {result?.access && tab === "results" && (
                <span className={`chip ${result.access === "index" ? "text-index" : "text-dirty"}`}>
                  {result.access === "index" ? "index" : "seq"}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {tab === "results" && <ResultsTable result={result} revealed={revealed} />}
              {tab === "plan" && (
                <PlanView
                  logical={result?.logicalPlan}
                  physical={result?.physicalPlan}
                  access={result?.access}
                  reason={result?.reason}
                  forceSeqScan={forceSeqScan}
                  onToggleForce={setForce}
                />
              )}
              {tab === "ast" && (
                <AstView tokens={result?.tokens ?? []} ast={result?.ast ?? null} />
              )}
            </div>
          </div>

          <div className="panel lg:max-h-[42%] lg:overflow-auto">
            <WalPanel
              lines={pb.walLines}
              totalRecords={forge.walCount}
              crashed={forge.crashed}
            />
          </div>
        </section>
      </main>

      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// ── small pieces ───────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-2 py-1 font-mono text-2xs uppercase tracking-wide text-slatey-400 transition-colors duration-200 hover:bg-ink-600 hover:text-slatey-200"
    >
      {children}
    </Link>
  );
}

function StatsStrip({ phase, scanned, passed }: { phase: string; scanned: number; passed: number }) {
  return (
    <div className="flex items-center gap-3 font-mono text-2xs text-slatey-500">
      <span>
        scanned <span className="text-slatey-300">{scanned}</span>
      </span>
      <span>
        matched <span className="text-run">{passed}</span>
      </span>
    </div>
  );
}

function SchemaSummary({ tables }: { tables: { name: string; columns: { name: string; type: string; primaryKey?: boolean }[]; indexColumn?: string }[] }) {
  if (tables.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border border-ink-400 bg-ink-800/50 p-2">
      <div className="panel-title mb-1.5">Schema</div>
      {tables.map((t) => (
        <div key={t.name} className="mb-2 last:mb-0">
          <div className="font-mono text-2xs text-slatey-200">{t.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {t.columns.map((c) => (
              <span key={c.name} className="chip text-slatey-400">
                {c.name}
                <span className="text-slatey-600">{c.type}</span>
                {c.primaryKey && <span className="text-active">PK</span>}
                {t.indexColumn === c.name && !c.primaryKey && <span className="text-index">idx</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function firstIndexCol(tables: { indexColumn?: string }[]): string | undefined {
  return tables.find((t) => t.indexColumn)?.indexColumn;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const h = () => setReduced(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return reduced;
}
