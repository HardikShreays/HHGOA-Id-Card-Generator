import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

// Using system fonts for now (no network fetch at build time). Swap in the
// official HH Goa 2026 event font via next/font/local once assets exist
// (plan §5 / §11).

const title = "HH Goa 2026 — Frame Generator";
const description = "Make your HH Goa 2026 frame or builder ID card in seconds. No sign-up.";

export const metadata: Metadata = {
  // Lets relative image paths (e.g. og-default.png below, and the fallback
  // used by app/share/[id]) resolve to absolute URLs — required for OG/
  // Twitter crawlers, which don't run relative to any "current page".
  metadataBase: new URL(getSiteUrl()),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: "/assets/og-default.png", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/assets/og-default.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Both format templates are static, shared by every user, and are
            needed as soon as the canvas compositor runs — preload them so
            they're already in cache by the time Phase 3 draws them instead
            of waiting on a cold fetch (plan §8 perf checklist). */}
        <link rel="preload" as="image" href="/assets/frame-pfp.png" />
        <link rel="preload" as="image" href="/assets/card-bg.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
