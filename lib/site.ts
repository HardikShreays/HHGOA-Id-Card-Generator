// lib/site.ts
// Resolves the app's absolute base URL server-side. Needed because the
// share-intent link (plan §6.2) and OG/Twitter meta tags must be absolute
// URLs, and there's no `window.location` available in a server context
// (API routes, generateMetadata).

/**
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL — set this explicitly in Vercel project settings
 *    once the production domain is known, so share links are stable even
 *    across preview deploys.
 * 2. VERCEL_URL — auto-set by Vercel on every deploy (preview + prod),
 *    e.g. "hh-goa-2026-generator.vercel.app" (no protocol).
 * 3. localhost fallback for local dev.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
