import { site } from "@/lib/site";
import { GitHubIcon, LinkedInIcon, MailIcon, CalendarIcon, PortfolioIcon } from "./Icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-400 bg-ink-700/40">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="text-2xs text-slatey-500">
          <span className="font-mono text-slatey-300">QueryForge</span> — built from scratch by{" "}
          <a href={site.author.portfolio} target="_blank" rel="noreferrer" className="text-slatey-300 underline-offset-2 hover:text-active hover:underline">
            {site.author.name}
          </a>
          . Crafted with intent.
        </div>
        <div className="flex items-center gap-2 text-slatey-400">
          <FooterIcon href={site.author.portfolio} label="Portfolio">
            <PortfolioIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href={site.author.github} label="GitHub">
            <GitHubIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href={site.author.linkedin} label="LinkedIn">
            <LinkedInIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href={site.author.cal} label="Book a call">
            <CalendarIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href={`mailto:${site.author.email}`} label="Email">
            <MailIcon className="h-4 w-4" />
          </FooterIcon>
        </div>
      </div>
    </footer>
  );
}

function FooterIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="rounded-md border border-ink-400 bg-ink-700 p-2 transition-colors duration-200 hover:border-slatey-500 hover:text-slatey-100"
    >
      {children}
    </a>
  );
}
