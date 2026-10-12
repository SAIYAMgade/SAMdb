import type { Config } from "tailwindcss";

/**
 * SAMDB — Systems, Architecture & Memory Database
 * Design token system: Terminal / Cyber-Industrial aesthetic.
 *
 * Palette: phosphor-green primary on deep black.
 * Typography: JetBrains Mono everywhere, no exceptions.
 * Geometry: 0px border radius, sharp corners, deliberate grid lines.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Terminal surfaces ──────────────────────────────────────────
        surface: {
          bg: "#0a0a0a",    // deepest: app background
          panel: "#0d100d", // panel background — near-black, green-tinted
          raised: "#111411", // slightly raised panels
          border: "#1f521f", // muted green border
          dim: "#0f1a0f",   // very dark panel variant
        },
        // ── Primary accent: phosphor green ───────────────────────────
        term: {
          green: "#33ff00",     // bright terminal green (primary)
          "green-dim": "#1f521f", // muted green for borders/inactive
          "green-glow": "rgba(51,255,0,0.35)", // glow value
          amber: "#ffb000",    // secondary accent, warnings
          "amber-dim": "#7a5500", // muted amber
          red: "#ff3333",      // errors
          "red-dim": "#6b1414", // muted red for borders
        },
        // ── Text ──────────────────────────────────────────────────────
        fg: {
          primary: "#33ff00",   // primary terminal text
          secondary: "#c8ffb0", // readable secondary
          muted: "#4a7a40",     // muted / inactive
          dim: "#2a4a25",       // very dim
          inverse: "#0a0a0a",   // inverted (on bright background)
        },
        // ── Semantic states ───────────────────────────────────────────
        // index scan path: kept purple-ish for contrast
        index: {
          DEFAULT: "#a78bfa",
          dim: "#3d2b7a",
        },
        // sequential scan / dirty writes
        dirty: {
          DEFAULT: "#ffb000",
          dim: "#7a5500",
        },
        // structural events (splits)
        split: {
          DEFAULT: "#ff3333",
          dim: "#6b1414",
        },
        // committed / success
        ok: {
          DEFAULT: "#33ff00",
          dim: "#1f521f",
        },

        // ── Legacy aliases kept for engine components ─────────────────
        ink: {
          900: "#050805",
          800: "#0a0a0a",
          700: "#0d100d",
          600: "#111411",
          500: "#1a2218",
          400: "#1f521f",
        },
        slatey: {
          100: "#33ff00",
          200: "#c8ffb0",
          300: "#8dcf7a",
          400: "#4a7a40",
          500: "#2a4a25",
          600: "#1a2e17",
        },
        active: {
          DEFAULT: "#33ff00",
          dim: "#1f521f",
          glow: "rgba(51,255,0,0.5)",
        },
        run: {
          DEFAULT: "#33ff00",
          dim: "#1f521f",
        },
      },

      // ── Typography: monospace everywhere ──────────────────────────────
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
        // No sans — everything is mono in SAMDB
        sans: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "monospace",
        ],
      },

      fontSize: {
        "2xs": ["0.75rem", { lineHeight: "1.125rem" }], // 12px
        "3xs": ["0.6875rem", { lineHeight: "1rem" }],    // 11px
      },

      // ── Border radius: 0 by default ───────────────────────────────────
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        full: "9999px", // kept for single use (spinners)
      },

      // ── Keyframes & animations ────────────────────────────────────────
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "pulse-node": {
          "0%": { filter: "brightness(1)", transform: "scale(1)" },
          "40%": { filter: "brightness(2)", transform: "scale(1.06)" },
          "100%": { filter: "brightness(1)", transform: "scale(1)" },
        },
        "flip-page": {
          "0%": { transform: "rotateX(0deg)" },
          "50%": { transform: "rotateX(90deg)" },
          "100%": { transform: "rotateX(0deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        sweep: {
          "0%": { strokeDashoffset: "120" },
          "100%": { strokeDashoffset: "0" },
        },
        "type-in": {
          from: { width: "0" },
          to: { width: "100%" },
        },
        "green-glow": {
          "0%, 100%": { textShadow: "0 0 5px rgba(51,255,0,0.4)" },
          "50%": { textShadow: "0 0 12px rgba(51,255,0,0.8), 0 0 24px rgba(51,255,0,0.3)" },
        },
      },

      animation: {
        blink: "blink 1.2s step-end infinite",
        "pulse-node": "pulse-node 320ms ease-out",
        "flip-page": "flip-page 280ms ease-in-out",
        "fade-in": "fade-in 200ms ease-out both",
        "fade-up": "fade-up 220ms ease-out both",
        "scan-line": "scan-line 4s linear infinite",
        sweep: "sweep 600ms ease-out forwards",
        "green-glow": "green-glow 2s ease-in-out infinite",
      },

      // ── Background patterns ────────────────────────────────────────────
      backgroundImage: {
        "terminal-grid":
          "linear-gradient(to right, rgba(31,82,31,0.08) 1px, transparent 1px), " +
          "linear-gradient(to bottom, rgba(31,82,31,0.08) 1px, transparent 1px)",
        "terminal-scanlines":
          "repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(51,255,0,0.015) 3px, rgba(51,255,0,0.015) 4px)",
      },

      // ── Box shadow: no drop shadows, only glow ──────────────────────────
      boxShadow: {
        none: "none",
        "green-sm": "0 0 6px rgba(51,255,0,0.25)",
        "green-md": "0 0 12px rgba(51,255,0,0.35)",
        "green-lg": "0 0 24px rgba(51,255,0,0.4)",
        "amber-sm": "0 0 6px rgba(255,176,0,0.3)",
        "red-sm": "0 0 6px rgba(255,51,51,0.4)",
        inset: "inset 0 0 0 1px #1f521f",
      },

      // ── Spacing ────────────────────────────────────────────────────────
      spacing: {
        "px": "1px",
      },
    },
  },
  plugins: [],
};

export default config;
