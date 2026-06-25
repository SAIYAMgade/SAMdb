import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ContactCard } from "@/components/ContactCard";
import { ArrowUpRight } from "@/components/Icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "The build",
  description:
    "How QueryForge was built — the why, the timeline, the technical decisions, and the part that broke everything.",
};

const TIMELINE: { date: string; title: string; body: string; hard?: boolean }[] = [
  {
    date: "Feb 2026",
    title: "The itch",
    body: "Caught myself, for the hundredth time, describing the database as 'and then it stores it somewhere'. Decided to find out where 'somewhere' actually is.",
  },
  {
    date: "Feb 2026",
    title: "Design & scoping",
    body: "Drew the layers on paper — pager, B+tree, WAL, parser, planner, executor — and ruthlessly cut the SQL grammar. A small correct subset beats a big buggy one.",
  },
  {
    date: "Mar 2026",
    title: "P0 — pager + B+tree",
    body: "Fixed-size pages over an ArrayBuffer, then a B+tree whose nodes are pages. First property test: 10k random inserts, every lookup correct, tree stays balanced.",
  },
  {
    date: "Apr 2026",
    title: "The week the splits broke everything",
    body: "Internal-node splits promoted the wrong separator key under a specific fan-out, and stale bytes from a previous node decode leaked into the next read. fast-check shrank it to a four-key counterexample in seconds. Two evenings, one zero-the-page-body fix, and the invariant finally held.",
    hard: true,
  },
  {
    date: "Apr 2026",
    title: "SQL front-end → execution",
    body: "Hand-written tokenizer and recursive-descent parser, a logical plan, a rule-based optimizer, and a Volcano iterator executor. End-to-end SELECTs returning real rows.",
  },
  {
    date: "May 2026",
    title: "Durability",
    body: "Added the write-ahead log and the 'pull the plug' button. Watching recovery rebuild every page from the log was the moment the whole thing felt like a real database.",
  },
  {
    date: "Jun 2026",
    title: "Making it legible — and shipping",
    body: "Wired every engine event into the playground so the B+tree search path, page writes, and streaming rows animate from the real trace. Polished, deployed, launched.",
  },
];

const DECISIONS: { q: string; a: string }[] = [
  {
    q: "Nodes are pages, not objects",
    a: "Each B+tree node serializes into exactly one 4 KB page through the pager. That's more work than an in-memory tree, but it means the B+tree view and the page grid are the same bytes shown two ways — and the byte offsets on screen are real.",
  },
  {
    q: "A logical write-ahead log",
    a: "The WAL stores operation-level redo records (CREATE TABLE, INSERT). Heap and index pages are derived state. Recovery is just 'replay the log', which makes the crash demo honest and the durability story fit in one button.",
  },
  {
    q: "Filter pushdown into the scan",
    a: "The physical plan shows a separate Filter node for clarity, but the predicate is evaluated the moment a row is read. That fusion is a real optimization and it's what powers the live row-visit counter.",
  },
  {
    q: "Small B+tree order on purpose",
    a: "Real engines pack hundreds of keys per page, which makes a tree two levels deep and visually dull. QueryForge uses a small node order so inserts split nodes in front of you — same algorithm, far more legible.",
  },
  {
    q: "The engine has zero DOM dependencies",
    a: "Pure TypeScript core means the identical code runs in the Vitest property suite and in the browser. The visualization can't drift from reality because there's only one reality.",
  },
];

const STACK: { name: string; why: string }[] = [
  { name: "TypeScript (strict)", why: "One engine that runs in Node tests and the browser, unchanged." },
  { name: "Next.js + React", why: "App-router pages, a fast client-rendered playground, zero-backend deploy." },
  { name: "Tailwind CSS", why: "The blueprint/oscilloscope system stays consistent without a CSS sprawl." },
  { name: "CodeMirror 6", why: "A real editor with a SQL mode and a Cmd+Enter run keymap." },
  { name: "Vitest + fast-check", why: "Property-based tests are the correctness proof for the B+tree and executor." },
  { name: "Custom SVG (no D3)", why: "Full control over the tree layout and the blueprint aesthetic, fewer deps." },
];

export default function AboutProjectPage() {
  return (
    <PageShell active="about-project">
      <div className="flex flex-col gap-12">
        {/* why */}
        <section>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-active">About the project</p>
          <h1 className="mt-3 text-3xl font-semibold text-slatey-100 sm:text-4xl">
            A database is the most-used black box in software. I wanted to open it.
          </h1>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-slatey-300">
            <p>
              Every backend engineer leans on a database every single day, and most of us — myself
              included — can wave our hands at B-trees and WALs without ever having built one. That
              gap bugged me. So QueryForge is the box, opened: a working SQL database written from
              zero, with the internals on screen.
            </p>
            <p>
              You type <code className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[13px] text-active">SELECT name FROM users WHERE id = 12</code>, and the
              parser builds an AST, the planner picks an index scan, the B+tree lights up the exact
              nodes it visits, pages flip as they&apos;re read, and rows stream out. It&apos;s a working
              engine and a teaching instrument in the same browser tab.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill href={site.author.githubRepo} label="GitHub repo" />
            <Pill href={site.linkedinPost || site.author.linkedin} label={site.linkedinPost ? "LinkedIn post" : "LinkedIn"} />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-run-dim bg-run/15 px-3 py-1.5 font-mono text-2xs text-run transition-colors hover:bg-run/25"
            >
              Open the playground <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* timeline */}
        <section>
          <h2 className="text-xl font-semibold text-slatey-100">How it came together</h2>
          <div className="mt-5 border-l border-ink-400 pl-5">
            {TIMELINE.map((m, i) => (
              <div key={i} className="relative pb-6 last:pb-0">
                <span
                  className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 ${
                    m.hard ? "border-split bg-split/30" : "border-active bg-ink-800"
                  }`}
                />
                <div className="font-mono text-2xs uppercase tracking-wide text-slatey-500">{m.date}</div>
                <h3 className={`mt-0.5 text-sm font-semibold ${m.hard ? "text-split" : "text-slatey-100"}`}>
                  {m.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slatey-400">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* features / decisions */}
        <section>
          <h2 className="text-xl font-semibold text-slatey-100">Decisions &amp; challenges</h2>
          <p className="mt-1 text-sm text-slatey-400">The interesting forks in the road, and which way I went.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {DECISIONS.map((d, i) => (
              <div key={i} className="panel p-4">
                <h3 className="font-mono text-sm font-semibold text-active">{d.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slatey-400">{d.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* stack */}
        <section>
          <h2 className="text-xl font-semibold text-slatey-100">Tech stack</h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-ink-400">
            {STACK.map((s, i) => (
              <div
                key={i}
                className="flex flex-col gap-0.5 border-b border-ink-400 bg-ink-700/50 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="font-mono text-sm font-semibold text-slatey-100 sm:w-56 sm:shrink-0">{s.name}</span>
                <span className="text-sm text-slatey-400">{s.why}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <h2 className="mb-2 text-xl font-semibold text-slatey-100">
            Want to build something or collaborate?
          </h2>
          <p className="mb-5 text-sm text-slatey-400">
            If this is the kind of thing you wish more engineers shipped — let&apos;s talk.
          </p>
          <ContactCard />
        </section>
      </div>
    </PageShell>
  );
}

function Pill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-ink-400 bg-ink-700 px-3 py-1.5 font-mono text-2xs text-slatey-200 transition-colors duration-200 hover:border-active/50 hover:text-active"
    >
      {label}
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}
