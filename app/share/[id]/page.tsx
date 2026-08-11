import type { Metadata } from "next";
import Link from "next/link";
import { head } from "@vercel/blob";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

const ID_PATTERN = /^[a-zA-Z0-9-]{1,80}$/;

async function getShareImageUrl(id: string): Promise<string | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const result = await head(`shares/${id}.png`);
    return result.url;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const imageUrl = (await getShareImageUrl(id)) ?? `${getSiteUrl()}/assets/og-default.png`;

  const title = `${BRAND.eventName} — ${BRAND.hashtag}`;
  const description = `I just framed myself for ${BRAND.eventName}. Make yours in a few seconds — no sign-up.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const imageUrl = await getShareImageUrl(id);

  return (
    <div className="min-h-screen bg-forest-deep flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Shared HH Goa 2026 graphic"
          className="max-h-[55vh] w-auto rounded-2xl border border-paper/10 shadow-lg shadow-black/40"
        />
      ) : (
        <p className="text-sm text-paper/40 max-w-xs">
          This share link has expired, but you can still make your own below.
        </p>
      )}

      <div className="flex flex-col items-center gap-2">
        <p className="font-devanagari text-2xl text-gold">{BRAND.eventNameDevanagari}</p>
        <p className="font-mono text-[11px] tracking-widest text-gold uppercase">
          {BRAND.location} · {BRAND.dateRange}
        </p>
        <h1 className="font-display text-2xl font-black text-paper">Thanks for sharing!</h1>
        <p className="text-paper/60 text-sm max-w-sm">
          Make your own frame, builder pass, or team card — no sign-up.
        </p>
      </div>

      <Link
        href="/"
        className="min-h-[44px] inline-flex items-center px-8 rounded-xl bg-coral text-paper text-sm font-semibold hover:bg-coral/90"
      >
        Make your own {BRAND.hashtag}
      </Link>

      <p className="font-mono text-[11px] text-paper/35">{BRAND.studioCredit}</p>
    </div>
  );
}
