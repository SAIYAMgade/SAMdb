import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://samdb.dev"),
  title: {
    default: "SAMDB — Systems, Architecture & Memory Database",
    template: "%s · SAMDB",
  },
  description:
    "SAMDB: an educational SQL database engine with a terminal-grade workbench. Inspect tokenization, parsing, query planning, B+tree indexing, and WAL recovery — live.",
  authors: [{ name: "Chanda Charan Reddy" }],
  creator: "Chanda Charan Reddy",
  keywords: [
    "SAMDB",
    "database engine",
    "SQL workbench",
    "B+tree",
    "write-ahead log",
    "SQL parser",
    "query planner",
    "storage engine",
    "TypeScript",
    "educational",
  ],
  openGraph: {
    title: "SAMDB — Systems, Architecture & Memory Database",
    description:
      "Understand what happens between a SQL statement and the data it returns.",
    siteName: "SAMDB",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAMDB — Systems, Architecture & Memory Database",
    description:
      "Understand what happens between a SQL statement and the data it returns.",
    creator: "@charanreddy",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
