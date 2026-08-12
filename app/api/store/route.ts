// app/api/store/route.ts
// Tiny storage endpoint for the "Share to X" link-intent fallback (plan
// §4 Phase 5 / §6.2). This is the ONLY server round trip in the whole app —
// everything else (upload, crop, composite, download) stays 100% client-side.
//
// Accepts a raw PNG body, stores it via Vercel Blob at a deterministic
// `shares/<id>.png` path, and returns:
//   - shareUrl: the /share/[id] landing page (carries OG/Twitter meta tags
//     pointing at the image — this is what the tweet intent links to)
//   - imageUrl: the direct, public, always-fetchable PNG URL
//
// Requires a Vercel Blob store attached to the project (sets
// BLOB_READ_WRITE_TOKEN automatically) — see README "Deploy" section.

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

// Keep well under X's crawler size limits and this route's own sanity cap
// (plan §6.2 point 4 — "keep exports under ~5MB").
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function isAllowedFormat(value: string | null): value is "pfp" | "card" | "team" {
  return value === "pfp" || value === "card" || value === "team";
}

/** Deterministic Builder ID codes look like "HH-GOA-7F3A" — validate shape
 *  before trusting a client-supplied id as a blob storage key. */
function isValidShareId(value: string | null): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9-]{3,40}$/.test(value);
}

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Share storage isn't configured on this deployment yet (missing Vercel Blob store). Download the image and post it manually for now.",
      },
      { status: 503 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/png")) {
    return NextResponse.json({ error: "Expected an image/png body." }, { status: 400 });
  }

  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large to share." }, { status: 413 });
  }

  const formatHeader = req.headers.get("x-format");
  const format = isAllowedFormat(formatHeader) ? formatHeader : "pfp";

  let bytes: ArrayBuffer;
  try {
    bytes = await req.arrayBuffer();
  } catch (err) {
    return NextResponse.json({ error: "Couldn't read the uploaded image." }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty upload." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large to share." }, { status: 413 });
  }

  const requestedId = req.headers.get("x-share-id");
  const id = isValidShareId(requestedId)
    ? requestedId
    : typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const blob = await put(`shares/${id}.png`, bytes, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      // Ephemeral share images — fine to let these expire; not critical
      // long-term storage. (plan §6.2 — "don't worry about cleanup")
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });

    const siteUrl = getSiteUrl();
    return NextResponse.json({
      id,
      format,
      imageUrl: blob.url,
      shareUrl: `${siteUrl}/share/${id}`,
    });
  } catch (err) {
    console.error("Blob upload failed:", err);
    return NextResponse.json(
      { error: "Couldn't store the image for sharing. Please try again in a moment." },
      { status: 500 }
    );
  }
}
