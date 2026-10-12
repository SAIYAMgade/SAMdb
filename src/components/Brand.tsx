import Link from "next/link";

/**
 * SAMDB Brand component.
 *
 * ASCII-art inspired wordmark that reads "SAMDB" in a phosphor-green
 * terminal style. Replaces the QueryForge wordmark on user-facing surfaces.
 * Required legal attribution for the original QueryForge code is preserved
 * in LICENSE and package.json (author field).
 */

export function SamdbLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer shell — terminal window frame */}
      <rect width="64" height="64" fill="#0d100d" />
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        stroke="#1f521f"
        strokeWidth="1"
      />

      {/* Cylindrical storage stack — represents the database storage layers */}
      {/* Top cap */}
      <ellipse cx="32" cy="16" rx="14" ry="4" fill="none" stroke="#33ff00" strokeWidth="1.5" />
      {/* Left/right walls */}
      <line x1="18" y1="16" x2="18" y2="36" stroke="#33ff00" strokeWidth="1.5" />
      <line x1="46" y1="16" x2="46" y2="36" stroke="#1f521f" strokeWidth="1.5" />
      {/* Middle separator (second layer) */}
      <ellipse cx="32" cy="26" rx="14" ry="4" fill="none" stroke="#1f521f" strokeWidth="1" />
      {/* Bottom cap */}
      <ellipse cx="32" cy="36" rx="14" ry="4" fill="none" stroke="#33ff00" strokeWidth="1.5" />

      {/* "SAM" text rendered as data lines — B-tree leaf chain metaphor */}
      <line x1="20" y1="46" x2="28" y2="46" stroke="#33ff00" strokeWidth="1.5" />
      <line x1="24" y1="43" x2="24" y2="49" stroke="#4a7a40" strokeWidth="1" />
      <line x1="32" y1="43" x2="32" y2="49" stroke="#33ff00" strokeWidth="1.5" />
      <line x1="36" y1="46" x2="44" y2="46" stroke="#1f521f" strokeWidth="1.5" />

      {/* Active cursor flash */}
      <rect x="48" y="44" width="2" height="6" fill="#33ff00" opacity="0.9" />
    </svg>
  );
}

export function Brand({
  href = "/",
  subtitle,
}: {
  href?: string;
  subtitle?: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="SAMDB home">
      <SamdbLogo />
      <div className="leading-tight select-none">
        <div
          className="font-mono text-base font-bold tracking-tight text-[#33ff00]"
          style={{ textShadow: "0 0 8px rgba(51,255,0,0.4)" }}
        >
          SAM<span className="text-[#ffb000]">DB</span>
        </div>
        {subtitle && (
          <div className="font-mono text-xs font-semibold text-[#4a7a40] uppercase tracking-[0.16em]">
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  );
}
