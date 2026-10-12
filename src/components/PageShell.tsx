import Link from "next/link";
import { Brand } from "./Brand";
import { GitHubIcon } from "./Icons";
import { SiteFooter } from "./SiteFooter";
import { site } from "@/lib/site";

export function PageShell({
  active,
  children,
}: {
  active: "about" | "about-project";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-[#33ff00] font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#1f521f] bg-[#0d100d]/90 px-4 py-2.5 backdrop-blur">
        <Brand subtitle="SYSTEMS · ARCHITECTURE · MEMORY" />
        <nav className="ml-auto flex items-center gap-1">
          <Tab href="/" current={false}>
            [ workbench ]
          </Tab>
          <Tab href="/about-project" current={active === "about-project"}>
            [ the build ]
          </Tab>
          <Tab href="/about" current={active === "about"}>
            [ about ]
          </Tab>
          <a
            className="ml-1 border border-[#1f521f] bg-[#0a0a0a] p-1.5 text-[#4a7a40] transition-colors hover:border-[#33ff00] hover:text-[#33ff00]"
            href={site.author.githubRepo}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

function Tab({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-2.5 py-1 font-mono text-2xs uppercase tracking-widest transition-colors duration-150 ${
        current
          ? "border border-[#33ff00] bg-[#33ff00] text-[#0a0a0a]"
          : "border border-transparent text-[#2a4a25] hover:border-[#1f521f] hover:text-[#4a7a40]"
      }`}
    >
      {children}
    </Link>
  );
}
