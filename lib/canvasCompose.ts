// lib/canvasCompose.ts
// Pure, framework-agnostic canvas compositing engine. Takes already-cropped
// user photo(s) (from CropStage's getCroppedImage) and composites them
// against the brand template PNGs to produce the final downloadable/
// shareable PNG for each of the 4 formats (plan §3–§5).
//
// Deliberately has zero React/DOM-framework dependencies beyond the browser
// canvas + Image APIs, so it's easy to unit-test and reuse between formats.

import { BRAND, CARD_TEXT_LAYOUT, BOARDING_TEXT_LAYOUT, TEAM_TEXT_LAYOUT, PFP_TEXT_LAYOUT } from "./constants";

export type BuilderFields = {
  name: string;
  role: string;
  /** Optional — small pill under the name. Omit the pill entirely if blank. */
  teamName?: string;
  /** Optional — only rendered fields present. */
  socials?: {
    x?: string;
    github?: string;
  };
};

export type TeamMember = {
  name: string;
  role?: string;
  /** Already-cropped photo, same contract as the single-photo formats. */
  imageSrc: string;
};

export type TeamFields = {
  teamName: string;
  /** 2–4 members. */
  members: TeamMember[];
};

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Font loading fix (plan §5, bottom) — call before the first ctx.fillText in
// every draw* export below, or exports will silently fall back to a system
// serif/sans the first time someone renders on a cold cache.
// ---------------------------------------------------------------------------

const FONT_STACK: Array<{ family: string; weight: string; style?: string }> = [
  { family: "Fraunces", weight: "700" },
  { family: "Fraunces", weight: "900" },
  { family: "Poppins", weight: "400" },
  { family: "Poppins", weight: "500" },
  { family: "Poppins", weight: "600" },
  { family: "Poppins", weight: "700" },
  { family: "Noto Sans Devanagari", weight: "400" },
  { family: "Noto Sans Devanagari", weight: "700" },
  { family: "JetBrains Mono", weight: "400" },
  { family: "JetBrains Mono", weight: "500" },
];

let fontsReadyPromise: Promise<void> | null = null;

/**
 * Loads every custom font family/weight the compositor uses and awaits
 * `document.fonts.ready`. Idempotent + memoized (safe to call from every
 * draw* export without re-triggering a network/parse pass each time).
 */
export function ensureFontsLoaded(): Promise<void> {
  if (fontsReadyPromise) return fontsReadyPromise;

  fontsReadyPromise = (async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    try {
      await Promise.all(
        FONT_STACK.map(({ family, weight, style }) =>
          document.fonts.load(`${style ?? "normal"} ${weight} 32px "${family}"`)
        )
      );
      await document.fonts.ready;
    } catch {
      // If a font fails to load we still proceed — the canvas will fall
      // back to a system font rather than hang the whole render.
    }
  })();

  return fontsReadyPromise;
}

// ---------------------------------------------------------------------------
// Shared drawing primitives
// ---------------------------------------------------------------------------

/**
 * Draws `img` into the given rect using "cover" fit math: fills the whole
 * rect, cropping overflow, never letterboxing/stretching.
 */
export function drawImageCover(
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
    sw = srcH * destAspect;
    sx = (srcW - sw) / 2;
  } else if (srcAspect < destAspect) {
    sh = srcW / destAspect;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function roundedRectPath(
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
 * within `maxWidth`, via binary search — long names/roles shrink to fit
 * instead of overflowing the card.
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
  fontFamily: string,
  align: CanvasTextAlign = "center"
) {
  if (!text) return;
  const size = fitFontSize(ctx, text, fontWeight, fontFamily, maxWidth, minSize, maxSize);
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, cx, y, maxWidth);
}

/**
 * 1. dottedBorderPath — the scalloped/dotted ring reused across PFP, the
 * Builder ID / Boarding Pass photo slot, and Team Frame mini-frames.
 * Draws a ring of small filled dots evenly spaced along the perimeter of a
 * rounded rect (pass width === height and r === width/2 for a circle).
 */
export function dottedBorderPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  dotSpacing = 16,
  dotRadius = 3,
  color = BRAND.colors.gold
) {
  const radius = Math.min(r, w / 2, h / 2);
  const straightTop = w - radius * 2;
  const straightSide = h - radius * 2;
  const cornerArc = (Math.PI / 2) * radius;
  const perimeter = 2 * straightTop + 2 * straightSide + 4 * cornerArc;
  const dotCount = Math.max(8, Math.round(perimeter / dotSpacing));

  // Walk the rounded-rect perimeter as a sequence of segments (top, corner,
  // right, corner, bottom, corner, left, corner), placing a dot every
  // `perimeter / dotCount` units of arc length.
  type Segment = { length: number; point: (t: number) => { px: number; py: number } };
  const segments: Segment[] = [
    {
      length: straightTop,
      point: (t) => ({ px: x + radius + t * straightTop, py: y }),
    },
    {
      length: cornerArc,
      point: (t) => {
        const a = -Math.PI / 2 + t * (Math.PI / 2);
        return { px: x + w - radius + radius * Math.cos(a), py: y + radius + radius * Math.sin(a) };
      },
    },
    {
      length: straightSide,
      point: (t) => ({ px: x + w, py: y + radius + t * straightSide }),
    },
    {
      length: cornerArc,
      point: (t) => {
        const a = 0 + t * (Math.PI / 2);
        return { px: x + w - radius + radius * Math.cos(a), py: y + h - radius + radius * Math.sin(a) };
      },
    },
    {
      length: straightTop,
      point: (t) => ({ px: x + w - radius - t * straightTop, py: y + h }),
    },
    {
      length: cornerArc,
      point: (t) => {
        const a = Math.PI / 2 + t * (Math.PI / 2);
        return { px: x + radius + radius * Math.cos(a), py: y + h - radius + radius * Math.sin(a) };
      },
    },
    {
      length: straightSide,
      point: (t) => ({ px: x, py: y + h - radius - t * straightSide }),
    },
    {
      length: cornerArc,
      point: (t) => {
        const a = Math.PI + t * (Math.PI / 2);
        return { px: x + radius + radius * Math.cos(a), py: y + radius + radius * Math.sin(a) };
      },
    },
  ];

  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < dotCount; i++) {
    let dist = (i / dotCount) * perimeter;
    for (const seg of segments) {
      if (dist <= seg.length) {
        const { px, py } = seg.point(seg.length === 0 ? 0 : dist / seg.length);
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      dist -= seg.length;
    }
  }
  ctx.restore();
}

/**
 * 2. drawPerforation — dashed vertical line + notch semicircles, for the
 * Boarding Pass ticket-stub edge.
 */
export function drawPerforation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  color = "rgba(18,36,28,0.35)",
  notchRadius = 14,
  notchFill = BRAND.colors.parchment
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(x, y1 + notchRadius);
  ctx.lineTo(x, y2 - notchRadius);
  ctx.stroke();
  ctx.setLineDash([]);

  // Notch semicircles cut into the top and bottom edges, like a real
  // perforated ticket stub.
  ctx.fillStyle = notchFill;
  ctx.beginPath();
  ctx.arc(x, y1, notchRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y2, notchRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 5. hashSeed — small deterministic hash (FNV-1a) backing the Builder ID
 * code, boarding-pass seat, and barcode pattern. Same seed function, three
 * consumers — keeps "same name+role always produces the same ID" behavior.
 */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic 4-hex-char Builder ID code, e.g. "HH-GOA-7F3A". */
export function computeBuilderIdCode(fields: Pick<BuilderFields, "name" | "role">): string {
  const seed = hashSeed(`${fields.name.trim().toLowerCase()}|${fields.role.trim().toLowerCase()}`);
  const code = (seed % 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `HH-GOA-${code}`;
}

/** Deterministic 2-char-row + number boarding seat, e.g. "14C". */
function computeSeat(seed: number): string {
  const row = 1 + (seed % 32);
  const letter = String.fromCharCode(65 + ((seed >> 5) % 6)); // A–F
  return `${row}${letter}`;
}

/**
 * 3. drawBarcode — deterministic pseudo-barcode from a string seed (bar
 * widths derived from a simple hash, not a real encodable barcode — purely
 * decorative). Reuse the seed for the Builder ID code text so they visually
 * correspond.
 */
export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  color = BRAND.colors.ink
) {
  ctx.save();
  ctx.fillStyle = color;
  let cursor = x;
  let s = seed || 1;
  const next = () => {
    // xorshift32 — cheap deterministic PRNG seeded from hashSeed's output.
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
  while (cursor < x + w) {
    const barW = 2 + (next() % 5); // 2–6px bars
    const gapW = 2 + (next() % 5); // 2–6px gaps
    if (cursor + barW > x + w) break;
    ctx.fillRect(cursor, y, barW, h);
    cursor += barW + gapW;
  }
  ctx.restore();
}

/**
 * 4. drawQRCode — wraps the `qrcode` package's canvas renderer, composites
 * onto the main canvas via an offscreen canvas → drawImage.
 */
export async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  data: string
) {
  const QRCode = (await import("qrcode")).default;
  const offscreen = document.createElement("canvas");
  await QRCode.toCanvas(offscreen, data, {
    width: size,
    margin: 0,
    color: { dark: BRAND.colors.ink, light: "#00000000" },
  });
  ctx.drawImage(offscreen, x, y, size, size);
}

/** Small pill badge — used for "HH GOA 2026", team-name pills, class tags. */
function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  bg: string,
  fg: string,
  paddingX = 18,
  paddingY = 8
) {
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  const textW = ctx.measureText(text).width;
  const w = textW + paddingX * 2;
  const h = fontSize + paddingY * 2;
  const x = cx - w / 2;
  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, y + h / 2 + 1);
}

// ---------------------------------------------------------------------------
// Format: Profile Frame (PFP) — 1200x1200, circular
// ---------------------------------------------------------------------------

export async function drawFrame(userImageSrc: string, fields?: BuilderFields): Promise<Blob> {
  const size = BRAND.canvas.pfpSize;

  await ensureFontsLoaded();
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

  // 2. Branded frame overlay on top (transparent center lets the photo show
  //    — ring, top pill badge, corner postage-stamp motif all live here).
  ctx.drawImage(frameImg, 0, 0, size, size);

  // 3. Dotted border ring, reused primitive, just inside the frame's ring.
  const innerR = 430;
  dottedBorderPath(ctx, size / 2 - innerR, size / 2 - innerR, innerR * 2, innerR * 2, innerR, 18, 3.5, BRAND.colors.gold);

  // 4. Name + generated builder title, inside the photo circle near the
  //    bottom — with a dark gradient scrim behind so it stays legible over
  //    any photo. Must stay inside the inner circle (see PFP_TEXT_LAYOUT's
  //    comment) or it collides with the ring's circular text.
  if (fields?.name.trim()) {
    const scrim = PFP_TEXT_LAYOUT.scrim;
    const gradient = ctx.createLinearGradient(0, scrim.y, 0, scrim.y + scrim.height);
    gradient.addColorStop(0, "rgba(6,42,32,0)");
    gradient.addColorStop(1, "rgba(6,42,32,0.75)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, innerR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, scrim.y, size, scrim.height);
    ctx.restore();

    const layout = PFP_TEXT_LAYOUT.name;
    drawFittedText(ctx, fields.name.trim(), layout.cx, layout.y, layout.maxWidth, layout.minFontSize, layout.maxFontSize, layout.color, "700", BRAND.fonts.display);

    const { generateBuilderTitle } = await import("./builderTitle");
    const title = generateBuilderTitle(fields.role || fields.name);
    const tLayout = PFP_TEXT_LAYOUT.builderTitle;
    drawFittedText(ctx, `“${title}”`, tLayout.cx, tLayout.y, tLayout.maxWidth, tLayout.minFontSize, tLayout.maxFontSize, tLayout.color, "italic 500", BRAND.fonts.body);
  }

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format: Builder ID / VIP Pass — 1080x1350
// ---------------------------------------------------------------------------

export async function drawIdCard(userImageSrc: string, fields: BuilderFields): Promise<Blob> {
  const { cardWidth: w, cardHeight: h, photoSlot } = BRAND.canvas;

  await ensureFontsLoaded();
  const [userImg, cardBgImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/card-bg.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  // 1. Card background/badge template (header ribbon, गोवा wordmark,
  //    decorative chrome, footer ribbon all live in this PNG).
  ctx.drawImage(cardBgImg, 0, 0, w, h);

  // 2. User photo into the photo-slot rect, clipped to rounded corners.
  ctx.save();
  roundedRectPath(ctx, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height, photoSlot.cornerRadius);
  ctx.clip();
  drawImageCover(ctx, userImg, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height);
  ctx.restore();

  // 3. Dotted frame border around the photo slot (replaces a flat outline).
  dottedBorderPath(ctx, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height, photoSlot.cornerRadius, 16, 3, BRAND.colors.gold);

  const name = fields.name.trim();
  const role = fields.role.trim();
  const fontFamily = BRAND.fonts.body;

  if (name) {
    const layout = CARD_TEXT_LAYOUT.name;
    drawFittedText(ctx, name, layout.cx, layout.y, layout.maxWidth, layout.minFontSize, layout.maxFontSize, layout.color, "700", BRAND.fonts.display);
  }

  // Team name pill — omit entirely if blank.
  if (fields.teamName?.trim()) {
    const layout = CARD_TEXT_LAYOUT.teamPill;
    drawPillBadge(ctx, `TEAM ${fields.teamName.trim().toUpperCase()}`, layout.cx, layout.y, layout.fontSize, fontFamily, BRAND.colors.gold, BRAND.colors.ink);
  }

  if (role) {
    const layout = CARD_TEXT_LAYOUT.role;
    drawFittedText(ctx, role, layout.cx, layout.y, layout.maxWidth, layout.minFontSize, layout.maxFontSize, layout.color, "600", fontFamily);
  }

  // Generated "builder title" — existing engine, unchanged (plan §4 — no
  // change needed, it's already a strength).
  const { generateBuilderTitle } = await import("./builderTitle");
  const builderTitle = generateBuilderTitle(role || name);
  {
    const layout = CARD_TEXT_LAYOUT.builderTitle;
    drawFittedText(ctx, `“${builderTitle}”`, layout.cx, layout.y, layout.maxWidth, layout.minFontSize, layout.maxFontSize, layout.color, "italic 500", fontFamily);
  }

  // Builder ID code + decorative barcode, sharing one hash seed so they
  // visually correspond.
  const idCode = computeBuilderIdCode(fields);
  const seed = hashSeed(`${name.toLowerCase()}|${role.toLowerCase()}`);
  {
    const layout = CARD_TEXT_LAYOUT.idCode;
    ctx.font = `500 ${layout.fontSize}px ${BRAND.fonts.mono}`;
    ctx.fillStyle = layout.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`#${idCode}`, layout.x, layout.y);
    drawBarcode(ctx, layout.x, layout.y + layout.fontSize + 10, 280, 28, seed, "rgba(255,249,238,0.85)");
  }

  // Socials — only rendered if present.
  const socialParts: string[] = [];
  if (fields.socials?.x) socialParts.push(`X @${fields.socials.x}`);
  if (fields.socials?.github) socialParts.push(`GH @${fields.socials.github}`);
  if (socialParts.length) {
    ctx.font = `500 16px ${BRAND.fonts.mono}`;
    ctx.fillStyle = "rgba(255,249,238,0.6)";
    ctx.textAlign = "right";
    ctx.fillText(socialParts.join("   ·   "), w - 90, CARD_TEXT_LAYOUT.idCode.y + 4);
    ctx.textAlign = "left";
  }

  // QR code — encodes the link to this builder's /share/[id] page, keyed by
  // the SAME deterministic idCode the "Share to X" flow uploads under, so
  // the QR resolves once the card has actually been shared once. Drawn
  // into CARD_TEXT_LAYOUT.qr — a column deliberately kept clear of the
  // text block above (see that constant's comment).
  try {
    const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const qr = CARD_TEXT_LAYOUT.qr;
    await drawQRCode(ctx, qr.x, qr.y, qr.size, `${siteOrigin}/share/${idCode}`);
  } catch {
    // QR generation is decorative — never fail the whole card render over it.
  }

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format: Boarding Pass — 1080x620
// ---------------------------------------------------------------------------

export async function drawBoardingPass(userImageSrc: string, fields: BuilderFields): Promise<Blob> {
  const { boardingWidth: w, boardingHeight: h, boardingPhotoSlot: slot } = BRAND.canvas;

  await ensureFontsLoaded();
  const [userImg, bgImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/boarding-bg.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  // 1. Ticket template (stub panel, parchment body, corner stamp, गोवा mark).
  ctx.drawImage(bgImg, 0, 0, w, h);

  // 2. User photo into the stub's rounded-square slot.
  ctx.save();
  roundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, slot.cornerRadius);
  ctx.clip();
  drawImageCover(ctx, userImg, slot.x, slot.y, slot.width, slot.height);
  ctx.restore();
  dottedBorderPath(ctx, slot.x, slot.y, slot.width, slot.height, slot.cornerRadius, 14, 3, BRAND.colors.gold);

  // 3. Perforation between stub and main body (also present as static art
  //    in boarding-bg.png — drawing it again here keeps the notch crisp at
  //    full canvas resolution regardless of template compression).
  drawPerforation(ctx, 400, 20, h - 20);

  const name = fields.name.trim();
  const role = fields.role.trim();
  const seed = hashSeed(`${name.toLowerCase()}|${role.toLowerCase()}`);
  const seat = computeSeat(seed);
  const gate = fields.teamName?.trim() || role || "GENERAL";

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  {
    const l = BOARDING_TEXT_LAYOUT.flightLine;
    ctx.font = `600 ${l.fontSize}px ${BRAND.fonts.mono}`;
    ctx.fillStyle = l.color;
    ctx.fillText(`FLIGHT HH2026 · GOA (GOI) · ${BRAND.dateRange}`, l.x, l.y);
  }

  {
    const l = BOARDING_TEXT_LAYOUT.passengerLabel;
    ctx.font = `600 ${l.fontSize}px ${BRAND.fonts.mono}`;
    ctx.fillStyle = l.color;
    ctx.fillText("PASSENGER", l.x, l.y);
  }
  if (name) {
    const l = BOARDING_TEXT_LAYOUT.passengerValue;
    drawFittedText(ctx, name, l.x, l.y, l.maxWidth, l.minFontSize, l.maxFontSize, l.color, "700", BRAND.fonts.display, "left");
  }

  // Socials — only rendered if present (plan §3.3/§11: "socials as
  // boarding-pass fields", part of the passenger-manifest look).
  const socialParts: string[] = [];
  if (fields.socials?.x) socialParts.push(`X @${fields.socials.x}`);
  if (fields.socials?.github) socialParts.push(`GH @${fields.socials.github}`);
  if (socialParts.length) {
    ctx.font = `500 15px ${BRAND.fonts.mono}`;
    ctx.fillStyle = "rgba(18,36,28,0.6)";
    ctx.fillText(socialParts.join("   ·   "), BOARDING_TEXT_LAYOUT.passengerValue.x, BOARDING_TEXT_LAYOUT.passengerValue.y + 46);
  }

  // SEAT / GATE / CLASS row. CLASS values (generated builder titles) can run
  // long ("The Nocturnal Shipper") — shrink-to-fit per column instead of
  // letting them overflow the canvas edge.
  const { generateBuilderTitle } = await import("./builderTitle");
  const classTitle = generateBuilderTitle(role || name);
  const fieldsRow: Array<[string, string]> = [
    ["SEAT", seat],
    ["GATE", gate.toUpperCase().slice(0, 14)],
    ["CLASS", classTitle],
  ];
  {
    const l = BOARDING_TEXT_LAYOUT.fieldsRow;
    const rightMargin = 40;
    fieldsRow.forEach(([label, value], i) => {
      const x = l.x + i * l.gap;
      const colMaxWidth = i === fieldsRow.length - 1 ? w - rightMargin - x : l.gap - 20;
      ctx.font = `600 ${l.fontSize}px ${BRAND.fonts.mono}`;
      ctx.fillStyle = l.color;
      ctx.textAlign = "left";
      ctx.fillText(label, x, l.y);
      drawFittedText(ctx, value, x, l.y + l.fontSize + 6, colMaxWidth, 13, l.valueFontSize, l.valueColor, "700", BRAND.fonts.mono, "left");
    });
  }

  // Barcode + Pass ID along the bottom.
  const idCode = computeBuilderIdCode(fields);
  {
    const l = BOARDING_TEXT_LAYOUT.barcodeCaption;
    drawBarcode(ctx, l.x, l.y - 34, 400, 26, seed, BRAND.colors.ink);
    ctx.font = `500 ${l.fontSize}px ${BRAND.fonts.mono}`;
    ctx.fillStyle = l.color;
    ctx.fillText(`PASS ID #${idCode}  ·  BOARDING ${BRAND.dateRange.split("–")[0].trim()} OCT`, l.x, l.y);
  }

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format: Team Frame — 1200x630 (plan §3.4 — P0, task-required)
// ---------------------------------------------------------------------------

/**
 * 6. drawTeamFrame — mirrors drawFrame/drawIdCard's shape: load images in
 * parallel, composite, return blob. Lays out 2–4 photos in a row using the
 * same drawImageCover + dottedBorderPath primitives already established.
 */
export async function drawTeamFrame(fields: TeamFields): Promise<Blob> {
  const { teamWidth: w, teamHeight: h } = BRAND.canvas;
  const members = fields.members.slice(0, 4);
  if (members.length < 2) {
    throw new Error("Team Frame needs at least 2 teammates.");
  }

  await ensureFontsLoaded();
  const [bgImg, ...memberImgs] = await Promise.all([
    loadImage("/assets/team-bg.png"),
    ...members.map((m) => loadImage(m.imageSrc)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  // 1. Team Frame template background (forest base, गोवा accent, footer
  //    hashtag ribbon, corner motifs).
  ctx.drawImage(bgImg, 0, 0, w, h);

  // 2. Team name headline.
  {
    const l = TEAM_TEXT_LAYOUT.teamName;
    drawFittedText(ctx, fields.teamName.trim().toUpperCase() || "TEAM", l.cx, l.y, l.maxWidth, l.minFontSize, l.maxFontSize, l.color, "800", BRAND.fonts.display);
  }

  // 3. Row of circular mini-frames, evenly spaced and centered.
  const n = members.length;
  const showCaptions = n <= 3;
  const slotDiameter = n <= 2 ? 300 : n === 3 ? 260 : 220;
  const gap = 48;
  const totalWidth = n * slotDiameter + (n - 1) * gap;
  const startX = (w - totalWidth) / 2;
  const rowY = TEAM_TEXT_LAYOUT.memberRowY;

  members.forEach((member, i) => {
    const img = memberImgs[i];
    const x = startX + i * (slotDiameter + gap);
    const y = rowY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + slotDiameter / 2, y + slotDiameter / 2, slotDiameter / 2, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, img, x, y, slotDiameter, slotDiameter);
    ctx.restore();

    dottedBorderPath(ctx, x, y, slotDiameter, slotDiameter, slotDiameter / 2, 14, 3, BRAND.colors.gold);

    const captionY = y + slotDiameter + TEAM_TEXT_LAYOUT.memberCaptionOffset;
    drawFittedText(ctx, member.name.trim(), x + slotDiameter / 2, captionY, slotDiameter + 20, 14, 20, BRAND.colors.paper, "700", BRAND.fonts.body);

    if (showCaptions && member.role?.trim()) {
      drawFittedText(ctx, member.role.trim(), x + slotDiameter / 2, captionY + 24, slotDiameter + 20, 11, 14, "rgba(255,249,238,0.7)", "500", BRAND.fonts.body);
    }
  });

  // 4. Footer hashtag ribbon.
  {
    const l = TEAM_TEXT_LAYOUT.footer;
    ctx.font = `600 ${l.fontSize}px ${BRAND.fonts.mono}`;
    ctx.fillStyle = l.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${BRAND.hashtag}  ·  ${BRAND.studioCredit}`, l.cx, l.y);
  }

  return canvasToBlob(canvas);
}
