// lib/uploadToShareStore.ts
// POSTs the final rendered PNG to /api/store for temporary share hosting
// (plan §4 Phase 5 / §6.2). Only touches the network on the "Share to X"
// link-intent fallback path — download and preview never call this.

import type { Format } from "./constants";

export class ShareUploadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ShareUploadError";
  }
}

export type ShareStoreResult = {
  id: string;
  /** Public URL of the shareable landing page (has the OG/Twitter meta tags). */
  shareUrl: string;
  /** Public, directly-fetchable URL of the stored PNG itself. */
  imageUrl: string;
};

/**
 * Uploads `blob` (the composited PNG) to the storage endpoint and returns
 * the shareable landing page URL to point the tweet intent at. Throws
 * ShareUploadError on any failure so callers can show an inline message and
 * fall back to "download + post manually" instead of a blocking alert.
 */
export async function uploadToShareStore(blob: Blob, format: Format): Promise<ShareStoreResult> {
  let res: Response;
  try {
    res = await fetch("/api/store", {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        "X-Format": format,
      },
      body: blob,
    });
  } catch (err) {
    throw new ShareUploadError("Couldn't reach the share service. Check your connection and try again.", err);
  }

  if (!res.ok) {
    let reason = `Upload failed (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") reason = body.error;
    } catch {
      // ignore — use default reason
    }
    throw new ShareUploadError(reason);
  }

  const data = (await res.json()) as Partial<ShareStoreResult>;
  if (!data.id || !data.shareUrl || !data.imageUrl) {
    throw new ShareUploadError("Share service returned an unexpected response.");
  }

  return { id: data.id, shareUrl: data.shareUrl, imageUrl: data.imageUrl };
}
