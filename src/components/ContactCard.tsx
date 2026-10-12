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
    const subject = encodeURIComponent(`SAMDB — Message from ${name || "engineer"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);
    window.location.href = `mailto:${site.author.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="border border-[#1f521f] bg-[#0d100d] font-mono">
      <div className="border-b border-[#1f521f] bg-[#111411] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#33ff00]">┌─ INITIATE CONTACT ─</h2>
        <p className="mt-1 text-xs text-[#4a7a40]">
          Database internals, system architecture, or production engineering.
        </p>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        {/* actions */}
        <div className="flex flex-col gap-2">
          <ContactLink href={site.author.cal} icon={<CalendarIcon />} label="Book a technical sync" primary />
          <ContactLink href={`mailto:${site.author.email}`} icon={<MailIcon />} label="Direct email" />
          <ContactLink href={site.author.github} icon={<GitHubIcon />} label="GitHub profile" />
          <ContactLink href={site.author.linkedin} icon={<LinkedInIcon />} label="LinkedIn connection" />
          <ContactLink href={site.author.portfolio} icon={<PortfolioIcon />} label="Engineering portfolio" />
        </div>

        {/* form */}
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <Field id="c-name" label="OPERATOR / NAME">
            <input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-[#1f521f] bg-[#0a0a0a] px-3 py-1.5 font-mono text-xs text-[#33ff00] placeholder-[#1f521f] focus:border-[#33ff00] focus:outline-none"
              placeholder="Your name or handle"
            />
          </Field>
          <Field id="c-email" label="COMM CHANNEL / EMAIL">
            <input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#1f521f] bg-[#0a0a0a] px-3 py-1.5 font-mono text-xs text-[#33ff00] placeholder-[#1f521f] focus:border-[#33ff00] focus:outline-none"
              placeholder="you@domain.com"
            />
          </Field>
          <Field id="c-message" label="PAYLOAD / MESSAGE">
            <textarea
              id="c-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="w-full resize-none border border-[#1f521f] bg-[#0a0a0a] px-3 py-1.5 font-mono text-xs text-[#33ff00] placeholder-[#1f521f] focus:border-[#33ff00] focus:outline-none"
              placeholder="State your technical inquiry..."
            />
          </Field>
          <button type="submit" className="btn btn-run mt-1 justify-center py-2">
            [ DISPATCH MESSAGE ] <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </button>
          {sent && (
            <p className="font-mono text-2xs text-[#33ff00]">Opening default mail handler…</p>
          )}
        </form>
      </div>

      <div className="flex items-center justify-between border-t border-[#1f521f] bg-[#0a0a0a] px-5 py-2.5 text-2xs text-[#1f521f]">
        <span>SAMDB COMM SUBSYSTEM</span>
        <span className="text-[#33ff00]">[ STATUS: ONLINE ]</span>
      </div>
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
      className={`group flex items-center gap-2.5 border px-3 py-2 text-xs transition-colors duration-150 ${
        primary
          ? "border-[#1f521f] bg-[#0a110a] text-[#33ff00] hover:bg-[#33ff00] hover:text-[#0a0a0a]"
          : "border-[#1f521f] bg-[#0a0a0a] text-[#4a7a40] hover:border-[#33ff00] hover:text-[#33ff00]"
      }`}
    >
      <span className="opacity-90">{icon}</span>
      {label}
      <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#2a4a25]">{label}</span>
      {children}
    </label>
  );
}
