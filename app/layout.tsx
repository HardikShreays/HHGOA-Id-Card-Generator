import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

// Fonts are self-hosted via @font-face in app/globals.css (see the note at
// the top of that file + lib/constants.ts for why we didn't use
// next/font/local here — canvas ctx.font needs a stable, known family name).

const title = "HH Goa 2026 — Frame, ID & Team Generator";
const description =
  "Make your HH Goa 2026 profile frame, Builder ID Card, or Team Frame in one live editor. No sign-up.";

export const metadata: Metadata = {
  // Lets relative image paths and the fallback used by app/share/[id]
  // resolve to absolute URLs — required for OG/
  // Twitter crawlers, which don't run relative to any "current page".
  metadataBase: new URL(getSiteUrl()),
  title,
  description,
  icons: {
    icon: [{ url: "/brand/favicon.webp?v=2", type: "image/webp" }],
    shortcut: "/brand/favicon.webp?v=2",
    apple: "/brand/favicon.webp?v=2",
  },
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: "/brand/brand-mark.webp", width: 1440, height: 1440, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/brand-mark.webp"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preload" as="image" href="/brand/sunrise.png" />
        <link rel="preload" as="image" href="/brand/hacker-house.png" />
        <link rel="preload" as="image" href="/brand/goa-hindi.svg" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/VictorMono-Variable.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href="/fonts/Imbue-Bold.ttf" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
