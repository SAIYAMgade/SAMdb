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
import { SamLandingHero } from "@/components/SamLandingHero";
import {
  AlertIcon,
  GitHubIcon,
  HelpIcon,
  RotateIcon,
  ZapIcon,
} from "@/components/Icons";
import { useQueryForge } from "@/lib/useQueryForge";
import { derive } from "@/lib/playback";
import { EXAMPLES, STARTER_QUERY } from "@/lib/sample";

const SqlEditor = dynamic(
  () => import("@/components/SqlEditor").then((m) => m.SqlEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 p-4 font-mono text-sm text-[#4a7a40]">
        <span className="animate-blink">█</span>
        <span>loading editor…</span>
      </div>
    ),
  }
);

type Tab = "results" | "plan" | "ast";

export default function Playground() {
  const forge = useQueryForge(STARTER_QUERY);
  const [sql, setSql] = useState(STARTER_QUERY);
  const [forceSeqScan, setForceSeqScan] = useState(false);
  const [tab, setTab] = useState<Tab>("results");
  const [helpOpen, setHelpOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // playback
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();

  const result = forge.result;
  const total = result?.trace.length ?? 0;

  // Boot sequence on first mount
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), reduced ? 0 : 800);
    return () => clearTimeout(t);
  }, [reduced]);

  // Reset scrubber whenever a new query lands.
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

  if (showLanding) {
    return <SamLandingHero onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#0a0a0a] text-sm">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#1f521f] bg-[#0d100d] px-4 py-2.5">
        <Brand subtitle="STORAGE · WAL · PLANNER · EXECUTOR" />

        {/* Animated boot greeting */}
        {booted && (
          <div className="ml-3 hidden font-mono text-xs text-[#4a7a40] md:flex items-center gap-1">
            <span className="text-[#33ff00] font-semibold">samdb@workspace</span>
            <span>:</span>
            <span className="text-[#8dcf7a]">~$</span>
            <span className="ml-1 text-[#33ff00] cursor-blink" />
          </div>
        )}

        <nav className="ml-auto hidden items-center gap-2 md:flex">
          <button
            onClick={() => setShowLanding(true)}
            className="border border-transparent px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-[#4a7a40]
                       transition-all duration-150 hover:border-[#1f521f] hover:text-[#33ff00]"
          >
            [ INTRO / HOME ]
          </button>
          <NavLink href="/about-project">[ the build ]</NavLink>
          <NavLink href="/about">[ about ]</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="btn"
            onClick={() => setShowLanding(true)}
            title="Return to the introduction landing page"
          >
            <span className="inline sm:hidden">[ INTRO ]</span>
          </button>
          <button
            className="btn"
            onClick={() => setHelpOpen(true)}
            title="What am I looking at?"
          >
            <HelpIcon className="h-4 w-4" />
            <span className="hidden sm:inline">[ HELP ]</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              forge.crash();
              setPlaying(false);
            }}
            title="Pull the plug — wipe memory, keep the WAL"
          >
            <AlertIcon className="h-4 w-4" />
            <span className="hidden sm:inline">[ CRASH ]</span>
          </button>
          <button
            className="btn btn-amber"
            onClick={() => forge.recover()}
            title="Replay the WAL to rebuild every page"
          >
            <RotateIcon className="h-4 w-4" />
            <span className="hidden sm:inline">[ RECOVER ]</span>
          </button>
          <a
            className="btn"
            href="https://github.com/charanreddy-27/queryforge"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[#1f521f] bg-[#0a0a0a] px-4 py-1.5 font-mono text-xs text-[#8dcf7a]">
        <StatusDot active={forge.ready} label={forge.ready ? "RUNTIME READY" : "BOOTING"} />
        <span className="text-[#1f521f]">|</span>
        <span>
          TABLES:{" "}
          <span className="text-[#33ff00] font-bold">{forge.tables.length}</span>
        </span>
        <span className="text-[#1f521f]">|</span>
        <span>
          WAL:{" "}
          <span className="text-[#33ff00] font-bold">{forge.walCount} records</span>
        </span>
        {result && (
          <>
            <span className="text-[#1f521f]">|</span>
            <span>
              LAST QUERY:{" "}
              <span className="text-[#33ff00] font-bold">{result.stats.elapsedMs}ms</span>
            </span>
          </>
        )}
        {forge.crashed && (
          <>
            <span className="text-[#1f521f]">|</span>
            <span className="text-[#ff3333] font-bold animate-pulse">CRASHED — WAL INTACT</span>
          </>
        )}
        <span className="ml-auto text-[#4a7a40] hidden sm:inline">
          SAMDB v1.0.0 | IN-MEMORY ENGINE + WAL DURABILITY
        </span>
      </div>

      {/* ── Workspace ───────────────────────────────────────────────────── */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-auto p-2.5 lg:grid-cols-[320px_minmax(0,1fr)_410px] lg:overflow-hidden">

        {/* ── LEFT: Editor + Examples + Schema ──────────────────────────── */}
        <section className="flex min-h-0 flex-col gap-2.5 lg:overflow-hidden">

          {/* Query editor panel */}
          <div className="panel flex min-h-[220px] flex-col lg:flex-[1.1]">
            <div className="panel-head">
              <span className="panel-title">┌─ QUERY ─</span>
              <button className="btn btn-run font-bold text-xs" onClick={() => runNow()}>
                <ZapIcon className="h-4 w-4" />
                [ EXECUTE ]
                <span className="kbd ml-1 text-xs">⌘⏎</span>
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SqlEditor value={sql} onChange={setSql} onRun={() => runNow()} />
            </div>
            {forge.error && (
              <div className="border-t border-[#6b1414] bg-[#0a0505] px-3.5 py-2 font-mono text-xs text-[#ff3333]">
                <span className="text-[#ff3333] font-bold">[ERR] </span>
                {forge.error.message}
                {forge.error.position !== undefined &&
                  ` (at char ${forge.error.position})`}
              </div>
            )}
          </div>

          {/* Examples + Schema panel */}
          <div className="panel flex min-h-0 flex-col lg:flex-1 lg:overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">┌─ EXAMPLES ─</span>
              <button
                className="font-mono text-xs text-[#4a7a40] hover:text-[#33ff00] font-semibold transition-colors"
                onClick={() => forge.reset()}
                title="Reset to demo dataset"
              >
                [ RESET WORKSPACE ]
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => loadExample(ex.sql)}
                  className="group mb-2 w-full cursor-pointer border border-[#1f521f] bg-[#0a0a0a] p-2.5 text-left
                             transition-all duration-150
                             hover:border-[#33ff00] hover:bg-[#0a110a]"
                >
                  <div className="font-mono text-xs font-bold text-[#c8ffb0] group-hover:text-[#33ff00] transition-colors">
                    &gt; {ex.label}
                  </div>
                  <div className="mt-1 font-mono text-xs leading-normal text-[#4a7a40] group-hover:text-[#8dcf7a] transition-colors">
                    {ex.hint}
                  </div>
                </button>
              ))}
              <SchemaSummary tables={forge.tables} onQueryTable={loadExample} />
            </div>
          </div>
        </section>

        {/* ── CENTER: Engine canvas ──────────────────────────────────────── */}
        <section className="panel scanlines relative flex min-h-[460px] flex-col overflow-hidden lg:min-h-0">
          <div className="panel-head">
            <span className="panel-title">┌─ ENGINE CANVAS ─</span>
            <StatsStrip
              phase={pb.phase}
              scanned={pb.rowsScanned}
              passed={pb.rowsPassed}
              phaseDetail={pb.phaseDetail}
            />
          </div>

          {/* B+tree section */}
          <div className="relative min-h-0 flex-[1.4] border-b border-[#1f521f]">
            <div className="absolute left-3.5 top-2 z-10 font-mono text-xs font-bold text-[#33ff00] uppercase tracking-[0.16em]">
              B+TREE INDEX
            </div>
            <div className="h-full pt-8">
              <BTreeView
                tree={result?.tree ?? null}
                pb={pb}
                indexColumn={firstIndexCol(forge.tables)}
              />
            </div>
          </div>

          {/* Page grid section */}
          <div className="relative min-h-0 flex-1">
            <div className="absolute left-3.5 top-2 z-10 font-mono text-xs font-bold text-[#33ff00] uppercase tracking-[0.16em]">
              STORAGE PAGES
            </div>
            <div className="h-full pt-8">
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

        {/* ── RIGHT: Stats + Tabs + WAL ──────────────────────────────────── */}
        <section className="flex min-h-0 flex-col gap-2.5 lg:overflow-hidden">
          <StatsBar stats={result?.stats} access={result?.access} />

          {/* Results / Plan / AST tabs */}
          <div className="panel flex min-h-[280px] flex-col lg:flex-1 lg:overflow-hidden">
            <div className="panel-head gap-1.5">
              <div className="flex gap-1.5">
                {(["results", "plan", "ast"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={tab === t ? "tab-btn-active" : "tab-btn"}
                  >
                    {t === "ast" ? "AST" : t}
                  </button>
                ))}
              </div>
              {result?.access && tab === "results" && (
                <span
                  className={`chip ${
                    result.access === "index"
                      ? "border-[#3d2b7a] bg-[#0a0814] text-[#a78bfa] font-bold"
                      : "border-[#7a5500] bg-[#0a0800] text-[#ffb000] font-bold"
                  }`}
                >
                  {result.access === "index" ? "[IDX SCAN]" : "[SEQ SCAN]"}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {tab === "results" && (
                <ResultsTable result={result} revealed={revealed} />
              )}
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
                <AstView
                  tokens={result?.tokens ?? []}
                  ast={result?.ast ?? null}
                />
              )}
            </div>
          </div>

          {/* WAL panel */}
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

// ── Small helper components ─────────────────────────────────────────────────

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 ${active ? "bg-[#33ff00] shadow-[0_0_6px_rgba(51,255,0,0.9)]" : "bg-[#ff3333] animate-pulse"}`}
      />
      <span className={active ? "text-[#33ff00] font-bold" : "text-[#ff3333] font-bold"}>{label}</span>
    </span>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border border-transparent px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-[#4a7a40]
                 transition-all duration-150
                 hover:border-[#1f521f] hover:text-[#33ff00]"
    >
      {children}
    </Link>
  );
}

function StatsStrip({
  phase,
  scanned,
  passed,
  phaseDetail,
}: {
  phase: string;
  scanned: number;
  passed: number;
  phaseDetail?: string;
}) {
  const phaseColor =
    phase === "execute"
      ? "text-[#33ff00] font-bold"
      : phase === "plan"
      ? "text-[#ffb000] font-bold"
      : phase === "recover"
      ? "text-[#ff3333] font-bold"
      : "text-[#8dcf7a]";

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-[#8dcf7a]">
      <span className={`uppercase ${phaseColor}`}>{phase || "idle"}</span>
      {phaseDetail && (
        <span className="text-[#4a7a40]">→ {phaseDetail}</span>
      )}
      <span>
        scanned: <span className="text-[#33ff00] font-bold">{scanned}</span>
      </span>
      <span>
        matched: <span className="text-[#33ff00] font-bold">{passed}</span>
      </span>
    </div>
  );
}

function SchemaSummary({
  tables,
  onQueryTable,
}: {
  tables: {
    name: string;
    columns: { name: string; type: string; primaryKey?: boolean }[];
    indexColumn?: string;
  }[];
  onQueryTable: (sql: string) => void;
}) {
  if (tables.length === 0) return null;
  return (
    <div className="mt-2.5 border border-[#1f521f] bg-[#0a0a0a] p-2.5">
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#33ff00] font-bold mb-2">
        ┌─ DATABASE SCHEMA ─
      </div>
      {tables.map((t) => (
        <div key={t.name} className="mb-2.5 last:mb-0">
          <button
            onClick={() => onQueryTable(`SELECT * FROM ${t.name} LIMIT 20`)}
            className="font-mono text-xs font-bold text-[#33ff00] hover:text-[#ffb000] transition-colors cursor-pointer"
            title={`SELECT * FROM ${t.name} LIMIT 20`}
          >
            &gt; {t.name}
          </button>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {t.columns.map((c) => (
              <span
                key={c.name}
                className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-xs
                  ${
                    c.primaryKey
                      ? "border-[#33ff00] bg-[#0a110a] text-[#33ff00] font-semibold"
                      : t.indexColumn === c.name
                      ? "border-[#3d2b7a] bg-[#0a0814] text-[#a78bfa] font-semibold"
                      : "border-[#1f521f] bg-[#0a0a0a] text-[#8dcf7a]"
                  }`}
              >
                {c.name}
                <span className="text-[#4a7a40]">:{c.type}</span>
                {c.primaryKey && <span className="text-[#33ff00] font-bold">PK</span>}
                {t.indexColumn === c.name && !c.primaryKey && (
                  <span className="text-[#a78bfa] font-bold">IDX</span>
                )}
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
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const h = () => setReduced(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return reduced;
}
