"use client";

import { useState } from "react";
import { site } from "@/lib/site";
import { ArrowUpRight, CalendarIcon, GitHubIcon, LinkedInIcon, MailIcon, PortfolioIcon } from "./Icons";

export function ContactCard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`QueryForge — hello from ${name || "someone"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);
    window.location.href = `mailto:${site.author.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-ink-400 bg-ink-700/60 px-5 py-4">
        <h2 className="text-xl font-semibold text-slatey-100">Have an idea? Let&apos;s talk.</h2>
        <p className="mt-1 text-sm text-slatey-400">
          Want to build something — or break something interesting? I&apos;m around.
        </p>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        {/* actions */}
        <div className="flex flex-col gap-2">
          <ContactLink href={site.author.cal} icon={<CalendarIcon />} label="Book a call" primary />
          <ContactLink href={`mailto:${site.author.email}`} icon={<MailIcon />} label="Email" />
          <ContactLink href={site.author.github} icon={<GitHubIcon />} label="GitHub" />
          <ContactLink href={site.author.linkedin} icon={<LinkedInIcon />} label="LinkedIn" />
          <ContactLink href={site.author.portfolio} icon={<PortfolioIcon />} label="Portfolio" />
        </div>

        {/* form */}
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Field id="c-name" label="Name">
            <input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
              placeholder="Your name"
            />
          </Field>
          <Field id="c-email" label="Email">
            <input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@company.com"
            />
          </Field>
          <Field id="c-message" label="Message">
            <textarea
              id="c-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="input resize-none"
              placeholder="What are we building?"
            />
          </Field>
          <button type="submit" className="btn btn-run mt-1 justify-center py-2">
            Send <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
          {sent && (
            <p className="text-2xs text-run">Opening your mail client… if nothing happens, email {site.author.email}.</p>
          )}
        </form>
      </div>

      <div className="flex items-center justify-between border-t border-ink-400 px-5 py-3 text-2xs text-slatey-500">
        <span>Crafted with intent.</span>
        <span className="text-run">Available for new projects.</span>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #27313f;
          background: #0a0e14;
          padding: 0.5rem 0.65rem;
          font-size: 0.8rem;
          color: #e6edf3;
          font-family: var(--font-mono);
          transition: border-color 0.2s;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgba(34, 211, 238, 0.6);
        }
        :global(.input::placeholder) {
          color: #52606f;
        }
      `}</style>
    </div>
  );
}

function ContactLink({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors duration-200 ${
        primary
          ? "border-run-dim bg-run/15 text-run hover:bg-run/25"
          : "border-ink-400 bg-ink-700 text-slatey-200 hover:border-slatey-500 hover:bg-ink-600"
      }`}
    >
      <span className="opacity-90">{icon}</span>
      {label}
      <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-90" />
    </a>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-mono text-2xs uppercase tracking-wide text-slatey-500">{label}</span>
      {children}
    </label>
  );
}
