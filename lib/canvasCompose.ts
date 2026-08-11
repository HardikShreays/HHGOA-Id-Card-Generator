// Pure, framework-agnostic canvas compositing. Four formats, shared primitives.

import {
  BOARDING_LAYOUT,
  BRAND,
  CARD_TEXT_LAYOUT,
  PFP_TEXT_LAYOUT,
} from "./constants";

export type BuilderFields = {
  name: string;
  role: string;
  teamName?: string;
  socials?: {
    x?: string;
    github?: string;
  };
};

export type TeamMember = {
  name: string;
  role?: string;
  imageSrc: string;
};

export type TeamFields = {
  teamName: string;
  members: TeamMember[];
};

export function loadImage(src: string, timeoutMs = 10000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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
    sw = srcH * destAspect;
    sx = (srcW - sw) / 2;
  } else if (srcAspect < destAspect) {
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

/** FNV-1a 32-bit. Same name+role always yields the same Builder ID / seat / barcode. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function builderIdCode(name: string, role: string): string {
  const n = hashSeed(`${name.trim().toLowerCase()}|${role.trim().toLowerCase()}`);
  return `#HH-GOA-${(n % 10000).toString().padStart(4, "0")}`;
}

export function boardingSeat(name: string): string {
  const n = hashSeed(name.trim().toLowerCase());
  const row = (n % 32) + 1;
  const letter = String.fromCharCode(65 + ((n >>> 8) % 6));
  return `${row}${letter}`;
}

function cssFont(cssVar: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return raw || fallback;
}

function fonts() {
  return {
    display: cssFont(BRAND.fontVars.display, BRAND.fonts.display),
    body: cssFont(BRAND.fontVars.body, BRAND.fonts.body),
    mono: cssFont(BRAND.fontVars.mono, BRAND.fonts.mono),
    devanagari: cssFont(BRAND.fontVars.devanagari, BRAND.fonts.devanagari),
  };
}

async function ensureFontsLoaded() {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = fonts();
  await Promise.all([
    document.fonts.load(`900 64px ${f.display}`),
    document.fonts.load(`italic 700 28px ${f.display}`),
    document.fonts.load(`700 48px ${f.devanagari}`),
    document.fonts.load(`600 24px ${f.mono}`),
    document.fonts.load(`700 32px ${f.body}`),
    document.fonts.load(`italic 500 22px ${f.body}`),
  ]);
  await document.fonts.ready;
}

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
    if (ctx.measureText(text).width <= maxWidth) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

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

/** Scalloped/dotted ring used on PFP, Builder Pass photo, and Team Frame minis. */
export function dottedBorderPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  dotSpacing = 14
) {
  const radius = Math.min(r, w / 2, h / 2);
  const points: Array<{ x: number; y: number }> = [];

  const pushLine = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.round(len / dotSpacing));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      points.push({ x: x1 + dx * t, y: y1 + dy * t });
    }
  };

  const pushArc = (cx: number, cy: number, start: number, end: number) => {
    const arcLen = Math.abs(end - start) * radius;
    const steps = Math.max(1, Math.round(arcLen / dotSpacing));
    for (let i = 0; i < steps; i++) {
      const a = start + ((end - start) * i) / steps;
      points.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
    }
  };

  pushLine(x + radius, y, x + w - radius, y);
  pushArc(x + w - radius, y + radius, -Math.PI / 2, 0);
  pushLine(x + w, y + radius, x + w, y + h - radius);
  pushArc(x + w - radius, y + h - radius, 0, Math.PI / 2);
  pushLine(x + w - radius, y + h, x + radius, y + h);
  pushArc(x + radius, y + h - radius, Math.PI / 2, Math.PI);
  pushLine(x, y + h - radius, x, y + radius);
  pushArc(x + radius, y + radius, Math.PI, (3 * Math.PI) / 2);

  ctx.save();
  ctx.fillStyle = BRAND.colors.gold;
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Dashed stub edge + semicircle notches for the boarding pass. */
export function drawPerforation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number
) {
  const notch = 14;
  ctx.save();
  ctx.strokeStyle = `${BRAND.colors.forest}99`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.moveTo(x, y1 + notch);
  ctx.lineTo(x, y2 - notch);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = BRAND.colors.forestDeep;
  ctx.beginPath();
  ctx.arc(x, y1, notch, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y2, notch, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

/** Decorative pseudo-barcode. Bar widths come from `seed` via hashSeed. */
export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string
) {
  let n = hashSeed(seed);
  const next = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n;
  };

  ctx.save();
  ctx.fillStyle = BRAND.colors.ink;
  let px = x;
  while (px < x + w - 4) {
    const barW = 1 + (next() % 4);
    if (next() % 3 !== 0) {
      ctx.fillRect(px, y, Math.min(barW, x + w - px), h);
    }
    px += barW + 1;
  }
  ctx.restore();
}

export async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  data: string
) {
  const QRCode = (await import("qrcode")).default;
  const off = document.createElement("canvas");
  await QRCode.toCanvas(off, data, {
    width: size,
    margin: 1,
    color: { dark: BRAND.colors.ink, light: BRAND.colors.parchment },
    errorCorrectionLevel: "M",
  });
  ctx.drawImage(off, x, y, size, size);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fill: string,
  color: string,
  font: string
) {
  ctx.font = font;
  const padX = 18;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 32;
  ctx.fillStyle = fill;
  roundedRectPath(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
}

// ---------------------------------------------------------------------------
// Format A — Profile Frame
// ---------------------------------------------------------------------------

export async function drawFrame(userImageSrc: string, fields?: BuilderFields): Promise<Blob> {
  const size = BRAND.canvas.pfpSize;
  const { cx, cy, r } = BRAND.canvas.pfpPhoto;
  const C = BRAND.colors;

  const [userImg, frameImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/frame-pfp.png"),
    ensureFontsLoaded(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.drawImage(frameImg, 0, 0, size, size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  drawImageCover(ctx, userImg, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  dottedBorderPath(ctx, cx - r, cy - r, r * 2, r * 2, r, 16);

  const f = fonts();
  const name = fields?.name.trim() ?? "";
  const role = fields?.role.trim() ?? "";

  ctx.font = `700 18px ${f.mono}`;
  const pillLabel = "HH GOA 2026";
  const pillW = ctx.measureText(pillLabel).width + 36;
  const pillX = cx - pillW / 2 - 36;
  const pillY = PFP_TEXT_LAYOUT.pillY;
  ctx.fillStyle = C.gold;
  roundedRectPath(ctx, pillX, pillY, pillW, 36, 18);
  ctx.fill();
  ctx.fillStyle = C.forestDeep;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillLabel, pillX + pillW / 2, pillY + 18);

  ctx.font = `700 28px ${f.devanagari}`;
  ctx.fillStyle = C.gold;
  ctx.textAlign = "left";
  ctx.fillText(BRAND.eventNameDevanagari, pillX + pillW + 14, pillY + 18);

  if (name) {
    drawFittedText(
      ctx,
      name,
      PFP_TEXT_LAYOUT.name.cx,
      PFP_TEXT_LAYOUT.name.y,
      PFP_TEXT_LAYOUT.name.maxWidth,
      PFP_TEXT_LAYOUT.name.minFontSize,
      PFP_TEXT_LAYOUT.name.maxFontSize,
      C.paper,
      "900",
      f.display
    );
  }

  if (name || role) {
    const { generateBuilderTitle } = await import("./builderTitle");
    const title = generateBuilderTitle(role || name);
    drawFittedText(
      ctx,
      `“${title}”`,
      PFP_TEXT_LAYOUT.title.cx,
      PFP_TEXT_LAYOUT.title.y,
      PFP_TEXT_LAYOUT.title.maxWidth,
      PFP_TEXT_LAYOUT.title.minFontSize,
      PFP_TEXT_LAYOUT.title.maxFontSize,
      C.gold,
      "italic 600",
      f.display
    );
  }

  ctx.font = `600 18px ${f.mono}`;
  ctx.fillStyle = C.coral;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(BRAND.hashtag, cx, PFP_TEXT_LAYOUT.footerY);

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format B — Builder ID / VIP Pass
// ---------------------------------------------------------------------------

export async function drawIdCard(
  userImageSrc: string,
  fields: BuilderFields,
  shareUrl?: string
): Promise<Blob> {
  const { cardWidth: w, cardHeight: h, photoSlot } = BRAND.canvas;
  const C = BRAND.colors;

  const [userImg, cardBgImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/card-bg.png"),
    ensureFontsLoaded(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.drawImage(cardBgImg, 0, 0, w, h);

  ctx.save();
  roundedRectPath(ctx, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height, photoSlot.cornerRadius);
  ctx.clip();
  drawImageCover(ctx, userImg, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height);
  ctx.restore();

  dottedBorderPath(
    ctx,
    photoSlot.x - 6,
    photoSlot.y - 6,
    photoSlot.width + 12,
    photoSlot.height + 12,
    photoSlot.cornerRadius + 6,
    13
  );

  const f = fonts();
  const name = fields.name.trim();
  const role = fields.role.trim();
  const teamName = fields.teamName?.trim();
  const idCode = builderIdCode(name, role);

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
      C.paper,
      "900",
      f.display
    );
  }

  if (teamName) {
    drawPill(
      ctx,
      `TEAM ${teamName.toUpperCase()}`,
      CARD_TEXT_LAYOUT.teamPill.cx,
      CARD_TEXT_LAYOUT.teamPill.y,
      C.coral,
      C.paper,
      `600 13px ${f.mono}`
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
      C.gold,
      "600",
      f.body
    );
  }

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
      "rgba(255,249,238,0.78)",
      "italic 500",
      f.display
    );
  }

  const socialBits = [fields.socials?.x && `x/${fields.socials.x.replace(/^@/, "")}`, fields.socials?.github && `gh/${fields.socials.github}`]
    .filter(Boolean)
    .join("  ·  ");
  if (socialBits) {
    ctx.font = `500 14px ${f.mono}`;
    ctx.fillStyle = "rgba(255,249,238,0.55)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(socialBits, 540, CARD_TEXT_LAYOUT.builderTitle.y + 34);
  }

  ctx.font = `600 20px ${f.mono}`;
  ctx.fillStyle = C.gold;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(idCode, CARD_TEXT_LAYOUT.idCode.x, CARD_TEXT_LAYOUT.idCode.y);

  drawBarcode(
    ctx,
    CARD_TEXT_LAYOUT.barcode.x,
    CARD_TEXT_LAYOUT.barcode.y,
    CARD_TEXT_LAYOUT.barcode.width,
    CARD_TEXT_LAYOUT.barcode.height,
    idCode
  );

  const qrData = shareUrl || (typeof window !== "undefined" ? window.location.origin : "https://hhgoa.com");
  await drawQRCode(ctx, CARD_TEXT_LAYOUT.qr.x, CARD_TEXT_LAYOUT.qr.y, CARD_TEXT_LAYOUT.qr.size, qrData);

  ctx.font = `600 16px ${f.mono}`;
  ctx.fillStyle = C.paper;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${BRAND.hashtag}  ·  ${BRAND.studioCredit}`, CARD_TEXT_LAYOUT.footer.cx, CARD_TEXT_LAYOUT.footer.y);

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format C — Boarding Pass
// ---------------------------------------------------------------------------

export async function drawBoardingPass(userImageSrc: string, fields: BuilderFields): Promise<Blob> {
  const w = BRAND.canvas.boardingWidth;
  const h = BRAND.canvas.boardingHeight;
  const photo = BRAND.canvas.boardingPhoto;
  const L = BOARDING_LAYOUT;
  const C = BRAND.colors;

  const [userImg, bgImg] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/assets/boarding-bg.png"),
    ensureFontsLoaded(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.drawImage(bgImg, 0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.arc(photo.x + photo.size / 2, photo.y + photo.size / 2, photo.size / 2, 0, Math.PI * 2);
  ctx.clip();
  drawImageCover(ctx, userImg, photo.x, photo.y, photo.size, photo.size);
  ctx.restore();
  dottedBorderPath(ctx, photo.x, photo.y, photo.size, photo.size, photo.size / 2, 12);

  const f = fonts();
  const name = fields.name.trim() || "BUILDER";
  const role = fields.role.trim();
  const teamName = fields.teamName?.trim();
  const { generateBuilderTitle } = await import("./builderTitle");
  const klass = generateBuilderTitle(role || name);
  const seat = boardingSeat(name);
  const gate = (teamName || klass).slice(0, 18).toUpperCase();
  const passId = builderIdCode(name, role);

  const label = (text: string, x: number, y: number) => {
    ctx.font = `600 11px ${f.mono}`;
    ctx.fillStyle = `${C.forest}99`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  };
  const value = (text: string, x: number, y: number, maxW: number, size = 26) => {
    const fitted = fitFontSize(ctx, text, "900", f.display, maxW, 14, size);
    ctx.font = `900 ${fitted}px ${f.display}`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y, maxW);
  };

  label("PASSENGER", L.passenger.x, L.passenger.y);
  value(name.toUpperCase(), L.passenger.x, L.passenger.y + 22, 500, 32);

  label("SEAT", L.seat.x, L.seat.y);
  value(seat, L.seat.x, L.seat.y + 22, 180, 30);

  label("GATE", L.gate.x, L.gate.y);
  value(gate, L.gate.x, L.gate.y + 22, 280, 22);

  label("CLASS", L.klass.x, L.klass.y);
  value(`“${klass}”`, L.klass.x, L.klass.y + 22, 500, 22);

  drawPerforation(ctx, L.perforationX, 0, h);

  drawBarcode(ctx, L.barcode.x, L.barcode.y, L.barcode.width, L.barcode.height, passId);
  ctx.font = `600 12px ${f.mono}`;
  ctx.fillStyle = C.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(passId, L.barcode.x, L.barcode.y + L.barcode.height + 6);

  ctx.save();
  ctx.translate(L.stubId.cx, 310);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `700 16px ${f.mono}`;
  ctx.fillStyle = C.forest;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(passId, 0, 0);
  ctx.restore();

  return canvasToBlob(canvas);
}

// ---------------------------------------------------------------------------
// Format D — Team Frame
// ---------------------------------------------------------------------------

export async function drawTeamFrame(members: TeamMember[], teamName: string): Promise<Blob> {
  const w = BRAND.canvas.teamWidth;
  const h = BRAND.canvas.teamHeight;
  const C = BRAND.colors;
  const count = Math.min(4, Math.max(2, members.length));
  const slice = members.slice(0, count);

  const [bgImg, ...memberImgs] = await Promise.all([
    loadImage("/assets/team-bg.png"),
    ...slice.map((m) => loadImage(m.imageSrc)),
  ]);
  await ensureFontsLoaded();

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.drawImage(bgImg, 0, 0, w, h);

  const f = fonts();
  const headline = teamName.trim() || "THE CREW";
  drawFittedText(ctx, headline.toUpperCase(), w / 2, 36, 1040, 28, 52, C.paper, "900", f.display);

  ctx.font = `600 14px ${f.mono}`;
  ctx.fillStyle = C.gold;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${BRAND.location}  ·  ${BRAND.dateRange}`, w / 2, 98);

  const size = count <= 2 ? 200 : count === 3 ? 168 : 136;
  const gap = count <= 2 ? 64 : 36;
  const total = count * size + (count - 1) * gap;
  const startX = (w - total) / 2;
  const photoY = 150;
  const showTitles = count < 4;
  const { generateBuilderTitle } = await import("./builderTitle");

  for (let i = 0; i < count; i++) {
    const x = startX + i * (size + gap);
    const member = slice[i];
    const img = memberImgs[i];

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, photoY + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, img, x, photoY, size, size);
    ctx.restore();
    dottedBorderPath(ctx, x, photoY, size, size, size / 2, 12);

    const captionY = photoY + size + 16;
    drawFittedText(
      ctx,
      member.name.trim() || `Builder ${i + 1}`,
      x + size / 2,
      captionY,
      size + 20,
      12,
      18,
      C.paper,
      "700",
      f.body
    );

    if (showTitles) {
      const title = generateBuilderTitle(member.role || member.name);
      drawFittedText(
        ctx,
        title,
        x + size / 2,
        captionY + 26,
        size + 24,
        10,
        13,
        C.gold,
        "italic 500",
        f.display
      );
    }
  }

  ctx.font = `600 14px ${f.mono}`;
  ctx.fillStyle = C.coral;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(BRAND.hashtag, w / 2, h - 18);

  return canvasToBlob(canvas);
}
