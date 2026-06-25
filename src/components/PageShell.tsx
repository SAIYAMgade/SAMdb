import Link from "next/link";
import { Brand } from "./Brand";
import { GitHubIcon } from "./Icons";
import { SiteFooter } from "./SiteFooter";
import { site } from "@/lib/site";

export function PageShell({ active, children }: { active: "about" | "about-project"; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-400 bg-ink-800/85 px-4 py-2.5 backdrop-blur">
        <Brand />
        <nav className="ml-auto flex items-center gap-1">
          <Tab href="/" current={false}>
            Playground
          </Tab>
          <Tab href="/about-project" current={active === "about-project"}>
            The build
          </Tab>
          <Tab href="/about" current={active === "about"}>
            About
          </Tab>
          <a
            className="ml-1 rounded-md border border-ink-400 bg-ink-700 p-2 text-slatey-300 transition-colors hover:border-slatey-500 hover:text-slatey-100"
            href={site.author.githubRepo}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

function Tab({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 font-mono text-2xs uppercase tracking-wide transition-colors duration-200 ${
        current ? "bg-active/15 text-active" : "text-slatey-400 hover:bg-ink-600 hover:text-slatey-200"
      }`}
    >
      {children}
    </Link>
  );
}
