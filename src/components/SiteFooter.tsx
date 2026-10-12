import { site } from "@/lib/site";
import { GitHubIcon, LinkedInIcon, MailIcon, CalendarIcon, PortfolioIcon } from "./Icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1f521f] bg-[#0d100d]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-6 font-mono sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="text-2xs text-[#4a7a40]">
          <span className="font-bold text-[#33ff00]">SAMDB</span> (Systems, Architecture & Memory Database) — built by{" "}
          <a
            href={site.author.portfolio}
            target="_blank"
            rel="noreferrer"
            className="text-[#c8ffb0] underline-offset-2 hover:text-[#33ff00] hover:underline"
          >
            {site.author.name}
          </a>
          .
        </div>
        <div className="flex items-center gap-2 text-[#4a7a40]">
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

function FooterIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="border border-[#1f521f] bg-[#0a0a0a] p-2 text-[#4a7a40] transition-colors duration-150 hover:border-[#33ff00] hover:text-[#33ff00]"
    >
      {children}
    </a>
  );
}
