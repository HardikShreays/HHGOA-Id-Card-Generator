import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

// Fonts are self-hosted via @font-face in app/globals.css (see the note at
// the top of that file + lib/constants.ts for why we didn't use
// next/font/local here — canvas ctx.font needs a stable, known family name).

const title = "HH Goa 2026 — Frame / Builder Pass Generator";
const description =
  "Make your HH Goa 2026 profile frame, Builder Pass, Boarding Pass, or Team Frame in seconds. No sign-up.";

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
        {/* All 4 format templates are static, shared by every user, and are
            needed as soon as the canvas compositor runs — preload them so
            they're already in cache by the time the compositor draws them
            instead of waiting on a cold fetch. */}
        <link rel="preload" as="image" href="/assets/frame-pfp.png" />
        <link rel="preload" as="image" href="/assets/card-bg.png" />
        <link rel="preload" as="image" href="/assets/boarding-bg.png" />
        <link rel="preload" as="image" href="/assets/team-bg.png" />
        {/* Brand fonts — preload the two used above the fold (display +
            body); the rest load on demand when their format is opened. */}
        <link rel="preload" as="font" type="font/ttf" href="/fonts/Fraunces-Variable.ttf" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href="/fonts/Poppins-Regular.ttf" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
