import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "QueryForge — a SQL database engine, internals on screen",
    template: "%s · QueryForge",
  },
  description: site.description,
  authors: [{ name: site.author.name, url: site.author.portfolio }],
  creator: site.author.name,
  keywords: [
    "database engine",
    "B+tree",
    "write-ahead log",
    "SQL parser",
    "query planner",
    "storage engine",
    "TypeScript",
    "Charan Reddy",
  ],
  openGraph: {
    title: "QueryForge — a SQL database engine, internals on screen",
    description: site.description,
    url: site.url,
    siteName: "QueryForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "QueryForge — a SQL database engine, internals on screen",
    description:
      "I built a SQL database from scratch — storage, WAL, parser, planner, executor — and a playground that animates the B+tree and crash recovery as you type.",
    creator: "@charanreddy",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
