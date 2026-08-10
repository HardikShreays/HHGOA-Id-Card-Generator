// lib/heicConvert.ts
// Wraps heic2any with error handling. heic2any is imported dynamically so it
// is only pulled into the bundle when a HEIC/HEIF file is actually detected
// (see plan §4 Phase 1 + §8 performance checklist).

export class HeicConversionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "HeicConversionError";
  }
}

/**
 * Converts a HEIC/HEIF File/Blob into a JPEG Blob that <canvas> can draw.
 * Throws HeicConversionError on failure so callers can show an inline error
 * instead of a blocking alert.
 */
export async function convertHeicToJpeg(file: Blob): Promise<Blob> {
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });

    // heic2any can return a single Blob or an array of Blobs (multi-image
    // HEIC containers, e.g. Live Photos) — we only care about the first.
    const converted = Array.isArray(result) ? result[0] : result;

    if (!converted) {
      throw new Error("HEIC conversion produced no output");
    }

    return converted;
  } catch (err) {
    throw new HeicConversionError(
      "We couldn't convert that HEIC photo. Try a JPG/PNG, or a screenshot of the photo instead.",
      err
    );
  }
}

/** Quick check for whether a file looks like a HEIC/HEIF image, by MIME or extension
 *  (iOS sometimes reports an empty/generic MIME type for HEIC files). */
export function isHeicFile(file: File): boolean {
  const nameLower = file.name.toLowerCase();
  const mimeLower = file.type.toLowerCase();

  const heicMimeTypes = ["image/heic", "image/heif"];
  const heicExtensions = [".heic", ".heif"];

  return (
    heicMimeTypes.includes(mimeLower) ||
    heicExtensions.some((ext) => nameLower.endsWith(ext))
  );
}
