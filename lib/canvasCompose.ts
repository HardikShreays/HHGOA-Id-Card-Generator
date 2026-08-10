// lib/canvasCompose.ts
// Pure, framework-agnostic canvas compositing engine (plan §4 Phase 3 — the
// core of the app). Takes an already-cropped user photo (from Phase 2's
// getCroppedImage) and composites it against the brand template PNGs to
// produce the final downloadable/shareable PNG for each format.
//
// Deliberately has zero React/DOM-framework dependencies beyond the browser
// canvas + Image APIs, so it's easy to unit-test and reuse between formats.

import { BRAND, CARD_TEXT_LAYOUT } from "./constants";

export type BuilderFields = {
  name: string;
  role: string;
};

/** Loads an image (from an object URL, blob URL, or static asset path). */
export function loadImage(src: string, timeoutMs = 10000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Only set crossOrigin for same-origin static template assets (future-
    // proofing in case they move behind a CDN). Crucially, do NOT set it on
    // blob:/data: URLs (e.g. the user's cropped photo) — several browsers
    // (Safari in particular) silently hang on blob: images with crossOrigin
    // set: neither onload nor onerror ever fires, which is what was causing
    // the compositor to get stuck on "Compositing your frame…" indefinitely.
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error(`Timed out loading image: ${src}`));
    }, timeoutMs);

    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

/**
 * Draws `img` into the given rect using "cover" fit math: fills the whole
 * rect, cropping overflow, never letterboxing/stretching. The Phase 2 crop
 * stage already produces an image at (approximately) the target aspect
 * ratio, so in practice this mostly guards against rounding drift rather
 * than doing heavy lifting — but it keeps this function safe to reuse even
 * if a caller passes in an image with a slightly different aspect.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const srcW = img.width;
  const srcH = img.height;
  const srcAspect = srcW / srcH;
  const destAspect = w / h;

  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;

  if (srcAspect > destAspect) {
    // Source is wider than dest — crop left/right.
    sw = srcH * destAspect;
    sx = (srcW - sw) / 2;
  } else if (srcAspect < destAspect) {
    // Source is taller than dest — crop top/bottom.
    sh = srcW / destAspect;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed."))),
      "image/png"
    );
  });
}

/**
 * Picks the largest font size (within [min, max]) at which `text` fits
 * within `maxWidth` on the given context, via binary search — used so long
 * names/roles shrink to fit instead of overflowing the card (plan §4 Phase
 * 3 step 4).
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontWeight: string,
  fontFamily: string,
  maxWidth: number,
  minSize: number,
  maxSize: number
): number {
  let lo = minSize;
  let hi = maxSize;
  let best = minSize;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = `${fontWeight} ${mid}px ${fontFamily}`;
    const width = ctx.measureText(text).width;
    if (width <= maxWidth) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/** Draws horizontally-centered text at (cx, y), with auto-shrink-to-fit. */
function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  minSize: number,
  maxSize: number,
  color: string,
  fontWeight: string,
  fontFamily: string
) {
  if (!text) return;
  const size = fitFontSize(ctx, text, fontWeight, fontFamily, maxWidth, minSize, maxSize);
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(text, cx, y, maxWidth);
}

// ---------------------------------------------------------------------------
// Format A — PFP frame
// ---------------------------------------------------------------------------

/**
 * Composites the user's (already-square-cropped) photo with the branded
 * frame overlay into a single 1200x1200 PNG. The frame PNG has a punched-out
 * transparent center (see public/assets/frame-pfp.png), so drawing it on top
 * of the photo lets the photo show through exactly where intended.
 */
export async function drawFrame(userImageSrc: string): Promise<Blob> {
  const size = BRAND.canvas.pfpSize;

  const [userImg, frameImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/frame-pfp.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  // 1. User photo, cover-fit across the full canvas.
  drawImageCover(ctx, userImg, 0, 0, size, size);

  // 2. Branded frame overlay on top (transparent center lets the photo show).
  ctx.drawImage(frameImg, 0, 0, size, size);

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format B — Builder ID card
// ---------------------------------------------------------------------------

/**
 * Composites the user's (already 3:4-cropped) photo, the card template, and
 * text fields (name / role / generated builder title / footer) into a
 * single 1080x1350 PNG.
 */
export async function drawIdCard(userImageSrc: string, fields: BuilderFields): Promise<Blob> {
  const { cardWidth: w, cardHeight: h, photoSlot } = BRAND.canvas;

  const [userImg, cardBgImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/card-bg.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  // 1. Card background/badge template as the base layer (branding, photo
  //    slot outline, decorative chrome all live in this PNG).
  ctx.drawImage(cardBgImg, 0, 0, w, h);

  // 2. User photo into the exact photo-slot rect, clipped to its rounded
  //    corners so it sits flush with the template's border artwork.
  ctx.save();
  roundedRectPath(ctx, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height, photoSlot.cornerRadius);
  ctx.clip();
  drawImageCover(ctx, userImg, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height);
  ctx.restore();

  // 3. Text layers on top: name, role, generated builder title, footer.
  const fontFamily = BRAND.fontFamily;
  const name = fields.name.trim();
  const role = fields.role.trim();

  if (name) {
    const layout = CARD_TEXT_LAYOUT.name;
    drawFittedText(
      ctx,
      name,
      layout.cx,
      layout.y,
      layout.maxWidth,
      layout.minFontSize,
      layout.maxFontSize,
      layout.color,
      "700",
      fontFamily
    );
  }

  if (role) {
    const layout = CARD_TEXT_LAYOUT.role;
    drawFittedText(
      ctx,
      role,
      layout.cx,
      layout.y,
      layout.maxWidth,
      layout.minFontSize,
      layout.maxFontSize,
      layout.color,
      "600",
      fontFamily
    );
  }

  // Generated "builder title" — the fun, personalized element (lib/builderTitle.ts).
  const { generateBuilderTitle } = await import("./builderTitle");
  const builderTitle = generateBuilderTitle(role || name);
  {
    const layout = CARD_TEXT_LAYOUT.builderTitle;
    drawFittedText(
      ctx,
      `“${builderTitle}”`,
      layout.cx,
      layout.y,
      layout.maxWidth,
      layout.minFontSize,
      layout.maxFontSize,
      layout.color,
      "italic 500",
      fontFamily
    );
  }

  // Small footer baked into the image itself — redundant with the template's
  // own branding, but survives even if the export gets screenshotted/cropped
  // oddly downstream (plan §4 Phase 3 step 4).
  {
    const layout = CARD_TEXT_LAYOUT.footer;
    ctx.font = `600 ${layout.fontSize}px ${fontFamily}`;
    ctx.fillStyle = layout.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(layout.text, layout.cx, layout.y);
  }

  return canvasToBlob(canvas);
}
