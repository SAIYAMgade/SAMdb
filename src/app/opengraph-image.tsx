import { ImageResponse } from "next/og";

// Rendered on demand via @vercel/og (the canonical Next.js Open Graph route).
// Renders on Vercel and any Linux host; a known @vercel/og bug breaks it only on
// Windows self-hosted `next start`, which never affects the deployed card.
export const dynamic = "force-dynamic";
export const alt = "QueryForge — a SQL database engine built from scratch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Auto-generated social card. Blueprint base, phosphor accent — matches the app. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0a0e14",
          backgroundImage:
            "linear-gradient(rgba(39,49,63,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(39,49,63,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              border: "2px solid #22d3ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#22d3ee",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            QF
          </div>
          <div style={{ color: "#9aa8b8", fontSize: 28, letterSpacing: 4 }}>QUERYFORGE</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#e6edf3", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            A SQL database engine,
          </div>
          <div style={{ color: "#22d3ee", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            built from scratch.
          </div>
          <div style={{ color: "#6f7e90", fontSize: 28, marginTop: 20 }}>
            Storage · B+tree · WAL · parser · planner · executor — animated as you type.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#52606f", fontSize: 24 }}>
          <span>Chanda Charan Reddy</span>
          <span>charanreddy.dev</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
