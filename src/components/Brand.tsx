import Link from "next/link";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0f1620" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="13.5" stroke="#27313f" />
      <path d="M32 22 L18 40 M32 22 L46 40" stroke="#0e7490" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="24" y="14" width="16" height="11" rx="3" fill="#0a0e14" stroke="#22d3ee" strokeWidth="2" />
      <rect x="10" y="39" width="16" height="11" rx="3" fill="#0a0e14" stroke="#22d3ee" strokeWidth="2" />
      <rect x="38" y="39" width="16" height="11" rx="3" fill="#0a0e14" stroke="#67e8f9" strokeWidth="2" />
    </svg>
  );
}

export function Brand({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <Logo />
      <div className="leading-tight">
        <div className="font-mono text-sm font-semibold tracking-tight text-slatey-100">
          Query<span className="text-active">Forge</span>
        </div>
        {subtitle && <div className="text-2xs text-slatey-500">{subtitle}</div>}
      </div>
    </Link>
  );
}
