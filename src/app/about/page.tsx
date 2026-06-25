import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ContactCard } from "@/components/ContactCard";
import { ArrowUpRight } from "@/components/Icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Charan Reddy — AI & Automation Engineer. Why I built a SQL database from scratch, and what it taught me.",
};

const LEARNINGS: [string, string][] = [
  [
    "A balanced tree is an invariant, not a vibe",
    "I thought I understood B+trees until I had to make splits propagate correctly to the root. The property tests — 10,000 random inserts, every leaf must end at the same depth — found bugs my hand-written examples never would.",
  ],
  [
    "Durability is just discipline about ordering",
    "The whole magic of a write-ahead log is one rule: log the intent before you touch the data. Once I built the 'pull the plug' button and watched recovery rebuild every page from the log, the concept stopped being a paragraph in a textbook.",
  ],
  [
    "The planner is where databases get their reputation",
    "Parsing and execution are mechanical. The interesting decision is whether to walk a B+tree or scan the whole heap — and being able to toggle that live, and watch the row-visit counter jump, made the cost of a missing index something you can feel.",
  ],
  [
    "Keeping the core DOM-free paid for itself",
    "The exact same engine code runs in the Node test suite and in your browser tab. No mocks in the playground — the animation is literally replaying the engine's own event log. That constraint forced cleaner seams everywhere.",
  ],
  [
    "Explaining it well is half the work",
    "I could have shipped a correct engine in a black box. Making the internals legible — the search path lighting up, pages flipping as they're written — took as long as the engine itself, and it's the part people actually remember.",
  ],
];

export default function AboutPage() {
  return (
    <PageShell active="about">
      <div className="flex flex-col gap-12">
        {/* intro */}
        <section>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-active">About the builder</p>
          <h1 className="mt-3 text-3xl font-semibold text-slatey-100 sm:text-4xl">
            I&apos;m Charan. I build intelligent systems — and occasionally the unglamorous
            machinery underneath them.
          </h1>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-slatey-300">
            <p>
              I&apos;m an AI &amp; Automation Engineer in Bangalore. Most days I ship production LLM
              systems — a Springer-published model that reads chest X-rays well enough for a
              radiologist to take seriously, document pipelines that run themselves. Before all
              that, I wrote real-time control code for jet engines at DRDO, where a millisecond of
              lag isn&apos;t a bug — it&apos;s a flameout.
            </p>
            <p>
              So why spend nights building a database from scratch? Because I got tired of treating
              the thing under the ORM as a magic box. QueryForge is me opening the box: a real
              storage engine, a real write-ahead log, a real query planner — and a playground that
              shows you the B+tree splitting and the crash recovery as they happen. No Postgres
              underneath. No mocks. If the engine didn&apos;t do it, you don&apos;t see it.
            </p>
            <p className="text-slatey-400">
              This is one project. There are 18 more (and a few jet engines) over at{" "}
              <a
                href={site.author.portfolio}
                target="_blank"
                rel="noreferrer"
                className="text-active underline-offset-4 hover:underline"
              >
                charanreddy.dev
              </a>
              .
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Pill href={site.author.githubRepo} label="GitHub repo" />
            <Pill href={site.author.linkedin} label="LinkedIn" />
            <Pill href={site.author.cal} label="Book a call" />
            <Pill href={site.author.portfolio} label="Portfolio" />
          </div>
        </section>

        {/* learnings */}
        <section>
          <h2 className="text-xl font-semibold text-slatey-100">What I learned building this</h2>
          <p className="mt-1 text-sm text-slatey-400">Five things, honestly. No filler.</p>
          <div className="mt-5 flex flex-col gap-3">
            {LEARNINGS.map(([title, body], i) => (
              <div key={i} className="panel flex gap-4 p-4">
                <div className="font-mono text-sm font-semibold text-active">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <h3 className="text-sm font-semibold text-slatey-100">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slatey-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* project nav tease */}
        <section className="panel flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slatey-100">Curious how it was built?</h2>
            <p className="mt-0.5 text-sm text-slatey-400">The timeline, the hard parts, the tradeoffs.</p>
          </div>
          <Link href="/about-project" className="btn btn-run px-4 py-2">
            Read the build story <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* contact */}
        <section>
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
