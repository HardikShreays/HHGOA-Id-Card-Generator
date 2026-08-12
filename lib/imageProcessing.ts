// lib/imageProcessing.ts
// File validation + downscale-on-load, shared by UploadDropzone (Phase 1)
// and later reused by the crop/render stages.

import { canvasToBlob } from "./canvasCompose";
import { UPLOAD_LIMITS } from "./constants";

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Validates a raw File before we attempt any HEIC conversion or decoding. */
export function validateUploadFile(file: File): ValidationResult {
  const nameLower = file.name.toLowerCase();
  const mimeLower = file.type.toLowerCase();

  const looksLikeImage =
    UPLOAD_LIMITS.acceptedMimePrefixes.some((p) => mimeLower.startsWith(p)) ||
    UPLOAD_LIMITS.acceptedExtensions.some((ext) => nameLower.endsWith(ext));

  if (!looksLikeImage) {
    return {
      ok: false,
      reason: "That doesn't look like an image. Please upload a JPG, PNG, or HEIC photo.",
    };
  }

  if (file.size > UPLOAD_LIMITS.maxFileSizeBytes) {
    const capMb = Math.round(UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024));
    return {
      ok: false,
      reason: `That photo is too large (max ${capMb}MB). Try a smaller photo or a screenshot.`,
    };
  }

  return { ok: true };
}

/** Loads a Blob into an HTMLImageElement via an object URL. Caller owns the returned URL. */
function loadHtmlImage(objectUrl: string, timeoutMs = 15000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(
      () => reject(new Error("Timed out decoding image.")),
      timeoutMs
    );
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Failed to decode image."));
    };
    img.src = objectUrl;
  });
}

/**
 * Loads a blob, and if its longest edge exceeds UPLOAD_LIMITS.maxLongEdgePx,
 * downscales it via an offscreen canvas so later canvas ops stay fast
 * (plan §4 Phase 1 step 2 + §8 performance checklist).
 *
 * Returns a new object URL (JPEG) plus final dimensions. Caller is
 * responsible for revoking the returned URL when no longer needed.
 */
export async function loadAndDownscale(
  blob: Blob
): Promise<{ objectUrl: string; width: number; height: number }> {
  const sourceUrl = URL.createObjectURL(blob);

  try {
    const img = await loadHtmlImage(sourceUrl);
    const { naturalWidth: w, naturalHeight: h } = img;
    const longestEdge = Math.max(w, h);

    if (longestEdge <= UPLOAD_LIMITS.maxLongEdgePx) {
      // No downscale needed — keep the original blob's object URL.
      return { objectUrl: sourceUrl, width: w, height: h };
    }

    const scale = UPLOAD_LIMITS.maxLongEdgePx / longestEdge;
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const resizedBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);

    // Original source URL is no longer needed once we've drawn from it.
    URL.revokeObjectURL(sourceUrl);

    return {
      objectUrl: URL.createObjectURL(resizedBlob),
      width: targetW,
      height: targetH,
    };
  } catch (err) {
    URL.revokeObjectURL(sourceUrl);
    throw err;
  }
}
