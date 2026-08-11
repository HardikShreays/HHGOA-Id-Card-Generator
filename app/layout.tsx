import type { Metadata } from "next";
import "./globals.css";
import { fraunces, jetbrains, notoDevanagari, poppins } from "./fonts";
import { getSiteUrl } from "@/lib/site";
import { BRAND } from "@/lib/constants";

const title = "HH Goa 2026 — Frame Generator";
const description = "Frame yourself for HH Goa 2026. Profile, builder pass, boarding pass, or team frame. No sign-up.";

export const metadata: Metadata = {
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
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${poppins.variable} ${jetbrains.variable} ${notoDevanagari.variable}`}
    >
      <head>
        <meta name="theme-color" content={BRAND.colors.forestDeep} />
        <link rel="preload" as="image" href="/assets/frame-pfp.png" />
        <link rel="preload" as="image" href="/assets/card-bg.png" />
        <link rel="preload" as="image" href="/assets/boarding-bg.png" />
        <link rel="preload" as="image" href="/assets/team-bg.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-forest-deep text-paper">{children}</body>
    </html>
  );
}
