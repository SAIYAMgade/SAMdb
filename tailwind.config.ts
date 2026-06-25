import type { Config } from "tailwindcss";

/**
 * QueryForge design tokens.
 * Identity: a technical instrument / oscilloscope — gridded, blueprint-y, precise.
 * Near-monochrome cool base, ONE accent for the active path (cyan/phosphor),
 * a muted amber for "dirty / written" state.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#070a0f", // deepest background
          800: "#0a0e14", // app background
          700: "#0f1620", // panel background
          600: "#141c28", // raised panel
          500: "#1b2433", // borders / grid lines (strong)
          400: "#27313f", // borders (subtle)
        },
        slatey: {
          100: "#e6edf3", // primary text
          200: "#c4cfdb",
          300: "#9aa8b8",
          400: "#6f7e90", // muted text
          500: "#52606f",
        },
        // The single accent: the "active path" being touched right now.
        active: {
          DEFAULT: "#22d3ee", // cyan phosphor
          dim: "#0e7490",
          glow: "#67e8f9",
        },
        // Run / success / committed.
        run: {
          DEFAULT: "#22c55e",
          dim: "#15803d",
        },
        // Dirty / written pages.
        dirty: {
          DEFAULT: "#f59e0b",
          dim: "#b45309",
        },
        // Splits / structural change.
        split: {
          DEFAULT: "#fb7185",
          dim: "#9f1239",
        },
        index: {
          DEFAULT: "#a78bfa", // index-scan / index pages
          dim: "#6d28d9",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      backgroundImage: {
        "blueprint-grid":
          "linear-gradient(to right, rgba(39,49,63,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,49,63,0.45) 1px, transparent 1px)",
        "blueprint-fine":
          "linear-gradient(to right, rgba(39,49,63,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,49,63,0.25) 1px, transparent 1px)",
      },
      keyframes: {
        "pulse-node": {
          "0%": { filter: "brightness(1)", transform: "scale(1)" },
          "40%": { filter: "brightness(1.6)", transform: "scale(1.06)" },
          "100%": { filter: "brightness(1)", transform: "scale(1)" },
        },
        "flip-page": {
          "0%": { transform: "rotateX(0deg)" },
          "50%": { transform: "rotateX(90deg)" },
          "100%": { transform: "rotateX(0deg)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        "sweep": {
          "0%": { strokeDashoffset: "120" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "pulse-node": "pulse-node 320ms ease-out",
        "flip-page": "flip-page 280ms ease-in-out",
        "fade-up": "fade-up 220ms ease-out both",
        "scan-line": "scan-line 3.2s linear infinite",
        sweep: "sweep 600ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
