// app/share/[id]/page.tsx
// Its only real job (plan §6.2 step 2) is to carry correct OG/Twitter meta
// tags pointing at the stored image, so that when the tweet-intent link is
// pasted/posted, X's crawler (which does NOT execute JS — hence
// generateMetadata running server-side, not a client useEffect) renders a
// big image card instead of a blank/default preview.

import type { Metadata } from "next";
import Link from "next/link";
import { head } from "@vercel/blob";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
// Share images are immutable once stored — no need to re-check on every
// request.
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

const ID_PATTERN = /^[a-zA-Z0-9-]{1,80}$/;

async function getShareImageUrl(id: string): Promise<string | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const result = await head(`shares/${id}.png`);
    return result.url;
  } catch {
    // Not found / expired / blob store not configured — caller falls back
    // to the default OG image rather than erroring the page out.
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const imageUrl = (await getShareImageUrl(id)) ?? `${getSiteUrl()}/brand/brand-mark.webp`;

  const title = `${BRAND.eventName} — Builder Frame`;
  const description = `I just built mine at ${BRAND.eventName}. Make your Profile Frame, Builder ID Card, or Team Frame in one place — no sign-up.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      // Stored images use one of the two generator aspect ratios.
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
    <div className="min-h-screen bg-forest flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Shared HH Goa 2026 graphic"
          className="max-h-[55vh] w-auto rounded-2xl border-[3px] border-black shadow-[8px_8px_0_#000]"
        />
      ) : (
        <p className="text-sm text-paper/40 max-w-xs font-[family-name:var(--font-body)]">
          This share link has expired, but you can still make your own below.
        </p>
      )}

      <div className="flex flex-col items-center gap-2">
        <p className="text-gold text-sm font-semibold uppercase tracking-wide font-[family-name:var(--font-mono-brand)]">
          {BRAND.eventName}
        </p>
        <h1 className="text-2xl font-bold text-paper font-[family-name:var(--font-display)]">
          Thanks for sharing!
        </h1>
        <p className="text-paper/60 text-sm max-w-sm font-[family-name:var(--font-body)]">
          Make your own Profile Frame, Builder ID Card, or Team Frame in one place — no sign-up.
        </p>
      </div>

      <Link
        href="/"
        className="brutal-button min-h-[44px] inline-flex items-center px-8 rounded-xl bg-gold text-ink text-sm font-bold"
      >
        Make your own {BRAND.hashtag}
      </Link>
    </div>
  );
}
